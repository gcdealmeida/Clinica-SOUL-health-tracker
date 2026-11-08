migrate(
  (app) => {
    // 1. Identificar usuário cliente de teste / demo
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let clientUser
    try {
      clientUser = app.findAuthRecordByEmail('_pb_users_auth_', 'guivemax@hotmail.com')
    } catch (_) {
      try {
        const clients = app.findRecordsByFilter('users', "role = 'cliente'", '-created', 1, 0)
        if (clients.length > 0) {
          clientUser = clients[0]
        }
      } catch (e) {
        console.log('Nenhum usuário cliente encontrado:', e)
      }
    }

    if (!clientUser) {
      console.log('Sem cliente para seed 30d — ignorando')
      return
    }

    // 2. Regra de idempotência: se o usuário já tem >50 registros em health_metrics, não sobrescrever / não duplicar
    const existingMetrics = app.findRecordsByFilter(
      'health_metrics',
      `user = '${clientUser.id}'`,
      '-created',
      55,
      0,
    )
    if (existingMetrics.length > 50) {
      console.log(
        `health_metrics já possui ${existingMetrics.length} registros (>50). Ignorando seed 30d.`,
      )
      return
    }

    const healthCol = app.findCollectionByNameOrId('health_metrics')
    const emoCol = app.findCollectionByNameOrId('emotional_logs')
    const mealsCol = app.findCollectionByNameOrId('meals')
    const medsCol = app.findCollectionByNameOrId('medications')

    // Gerador de datas locais YYYY-MM-DD
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const getDateStr = (daysAgo) => {
      const d = new Date(Date.now() - daysAgo * 86400000)
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    }

    // Pseudo-random com seed para consistência e variedade natural
    const pseudoRand = (seed) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }

    console.log(
      `Iniciando seed de 30 dias para usuário ${clientUser.id} (${clientUser.getString('email')})`,
    )

    // ==========================================
    // A) HEALTH METRICS (30 dias de histórico)
    // ==========================================
    for (let dayOffset = 0; dayOffset <= 29; dayOffset++) {
      const day = getDateStr(dayOffset)
      const dayFactor = 30 - dayOffset // 1 a 30

      // 1. Sono (diário ao acordar ~07:00)
      const sleepHours = Math.round((6.8 + pseudoRand(dayFactor * 1.1) * 1.8) * 10) / 10 // 6.8h a 8.5h
      const remMin = Math.round(70 + pseudoRand(dayFactor * 1.2) * 50)
      const deepMin = Math.round(60 + pseudoRand(dayFactor * 1.3) * 45)
      const sRec = new Record(healthCol)
      sRec.set('user', clientUser.id)
      sRec.set('category', 'sono')
      sRec.set('date_time', `${day} 07:00`)
      sRec.set('numeric_value', sleepHours)
      sRec.set('unit', 'horas')
      sRec.set(
        'notes',
        `Sono total: ${sleepHours}h • REM ${remMin}m • Profundo ${deepMin}m (Smartwatch)`,
      )
      app.save(sRec)

      // 2. HRV / VFC (diário ~07:15)
      const hrvVal = Math.round(58 + pseudoRand(dayFactor * 2.1) * 26) // 58 a 84 ms
      const hrvRec = new Record(healthCol)
      hrvRec.set('user', clientUser.id)
      hrvRec.set('category', 'hrv')
      hrvRec.set('date_time', `${day} 07:15`)
      hrvRec.set('numeric_value', hrvVal)
      hrvRec.set('unit', 'ms')
      hrvRec.set('notes', 'Medição matinal em repouso')
      app.save(hrvRec)

      // 3. Glicemia de jejum (diário ou a cada 2 dias ~07:30)
      if (dayOffset % 2 === 0 || dayOffset === 0) {
        const glicVal = Math.round(82 + pseudoRand(dayFactor * 3.1) * 16) // 82 a 98 mg/dL
        const glicRec = new Record(healthCol)
        glicRec.set('user', clientUser.id)
        glicRec.set('category', 'glicemia')
        glicRec.set('date_time', `${day} 07:30`)
        glicRec.set('numeric_value', glicVal)
        glicRec.set('unit', 'mg/dL')
        glicRec.set('notes', 'Glicemia capilar em jejum')
        app.save(glicRec)
      }

      // 4. Peso Corporal (a cada 2-3 dias ou semanal com tendência leve de redução)
      if (dayOffset % 3 === 0 || dayOffset === 0) {
        const pesoVal =
          Math.round(
            (84.2 - (30 - dayOffset) * 0.05 + (pseudoRand(dayFactor * 4.1) - 0.5) * 0.4) * 10,
          ) / 10
        const fatPct =
          Math.round(
            (22.8 - (30 - dayOffset) * 0.03 + (pseudoRand(dayFactor * 4.2) - 0.5) * 0.3) * 10,
          ) / 10
        const leanKg = Math.round(pesoVal * (1 - fatPct / 100) * 10) / 10
        const pesoRec = new Record(healthCol)
        pesoRec.set('user', clientUser.id)
        pesoRec.set('category', 'peso')
        pesoRec.set('date_time', `${day} 07:45`)
        pesoRec.set('numeric_value', pesoVal)
        pesoRec.set('unit', 'kg')
        pesoRec.set('body_fat_pct', fatPct)
        pesoRec.set('lean_mass_kg', leanKg)
        pesoRec.set('notes', 'Balança de bioimpedância pela manhã')
        app.save(pesoRec)
      }

      // 5. Água (2 a 4 ingestões por dia: manhã, almoço, tarde, noite)
      const waterAmounts = [500, 350, 500, 250]
      const waterTimes = ['08:00', '11:30', '15:30', '19:00']
      const numWaters = dayOffset % 4 === 0 ? 3 : 4
      for (let w = 0; w < numWaters; w++) {
        const wRec = new Record(healthCol)
        wRec.set('user', clientUser.id)
        wRec.set('category', 'agua')
        wRec.set('date_time', `${day} ${waterTimes[w]}`)
        wRec.set('numeric_value', waterAmounts[w])
        wRec.set('unit', 'ml')
        wRec.set('notes', w === 0 ? 'Primeiro copo em jejum' : 'Hidratação garrafa')
        app.save(wRec)
      }

      // 6. Café (1 a 2 doses/dia, ~08:45 e ~14:15)
      const c1 = new Record(healthCol)
      c1.set('user', clientUser.id)
      c1.set('category', 'cafe')
      c1.set('date_time', `${day} 08:45`)
      c1.set('numeric_value', 1)
      c1.set('unit', 'xíc')
      c1.set('notes', 'Café espresso duplo (~150mg cafeína)')
      app.save(c1)

      if (dayOffset % 3 !== 0) {
        const c2 = new Record(healthCol)
        c2.set('user', clientUser.id)
        c2.set('category', 'cafe')
        c2.set('date_time', `${day} 14:15`)
        c2.set('numeric_value', 1)
        c2.set('unit', 'xíc')
        c2.set('notes', 'Café coado pós-almoço (~95mg cafeína)')
        app.save(c2)
      }

      // 7. Pressão Arterial (quase diária ~09:30)
      if (dayOffset % 5 !== 1) {
        const sys = Math.round(116 + pseudoRand(dayFactor * 5.1) * 10) // 116 a 126
        const dia = Math.round(76 + pseudoRand(dayFactor * 5.2) * 8) // 76 a 84
        const pRec = new Record(healthCol)
        pRec.set('user', clientUser.id)
        pRec.set('category', 'pressao')
        pRec.set('date_time', `${day} 09:30`)
        pRec.set('numeric_value', sys)
        pRec.set('text_value', `${sys}/${dia}`)
        pRec.set('unit', 'mmHg')
        pRec.set('notes', 'Em repouso matinal (Omron)')
        app.save(pRec)
      }

      // 8. Saturação SpO2 (a cada 3-4 dias)
      if (dayOffset % 3 === 1) {
        const spo2 = Math.round(97 + pseudoRand(dayFactor * 6.1) * 2) // 97 a 99
        const spRec = new Record(healthCol)
        spRec.set('user', clientUser.id)
        spRec.set('category', 'saturacao')
        spRec.set('date_time', `${day} 10:00`)
        spRec.set('numeric_value', spo2)
        spRec.set('unit', '%')
        spRec.set('notes', 'Oximetria em repouso')
        app.save(spRec)
      }

      // 9. Atividade Física (cerca de 4 a 5x por semana)
      const isWorkoutDay = dayOffset % 7 !== 2 && dayOffset % 7 !== 5
      if (isWorkoutDay) {
        const activities = [
          { name: 'Musculação Hipertrofia', min: 50 },
          { name: 'Treino Funcional + Corrida', min: 45 },
          { name: 'Caminhada Rápida / Zona 2', min: 40 },
          { name: 'Ciclismo Indoor / Spinning', min: 45 },
        ]
        const act = activities[dayOffset % activities.length]
        const actRec = new Record(healthCol)
        actRec.set('user', clientUser.id)
        actRec.set('category', 'atividade')
        actRec.set('date_time', `${day} 18:30`)
        actRec.set('numeric_value', act.min)
        actRec.set('unit', 'min')
        actRec.set('notes', act.name)
        app.save(actRec)
      }

      // 10. Meditação / Respiração (3x na semana ~07:20 ou ~21:30)
      if (dayOffset % 7 === 1 || dayOffset % 7 === 4 || dayOffset % 7 === 6) {
        const medRec = new Record(healthCol)
        medRec.set('user', clientUser.id)
        medRec.set('category', 'meditacao')
        medRec.set('date_time', `${day} 21:30`)
        medRec.set('numeric_value', 15)
        medRec.set('unit', 'min')
        medRec.set('notes', 'Respiração diafragmática 4-7-8 antes de dormir')
        app.save(medRec)
      }

      // 11. Sauna / Banho Frio (1 a 2x por semana pós treino)
      if (dayOffset % 7 === 3 || dayOffset % 7 === 0) {
        const sauRec = new Record(healthCol)
        sauRec.set('user', clientUser.id)
        sauRec.set('category', 'sauna')
        sauRec.set('date_time', `${day} 19:30`)
        sauRec.set('numeric_value', 20)
        sauRec.set('unit', 'min')
        sauRec.set('notes', 'Sauna seca 80°C + ducha fria')
        app.save(sauRec)
      }

      // 12. Álcool (apenas fins de semana esporádicos: sextas/sábados)
      const dObj = new Date(Date.now() - dayOffset * 86400000)
      const weekDay = dObj.getDay() // 5 = sexta, 6 = sábado
      if ((weekDay === 5 || weekDay === 6) && dayOffset % 2 === 0) {
        const alcRec = new Record(healthCol)
        alcRec.set('user', clientUser.id)
        alcRec.set('category', 'alcool')
        alcRec.set('date_time', `${day} 21:00`)
        alcRec.set('numeric_value', 2)
        alcRec.set('unit', 'doses')
        alcRec.set('notes', '2 taças de vinho tinto seco com o jantar')
        app.save(alcRec)
      }

      // 13. Sintomas ocasionais (dor de cabeça leve, refluxo, ansiedade)
      if (dayOffset === 2 || dayOffset === 9 || dayOffset === 17 || dayOffset === 24) {
        const sympRec = new Record(healthCol)
        sympRec.set('user', clientUser.id)
        sympRec.set('category', 'sintoma')
        sympRec.set('date_time', `${day} 16:30`)
        const sympOptions = [
          { text: 'Cefaleia tensional leve', sev: 3 },
          { text: 'Ansiedade vespertina', sev: 4 },
          { text: 'Refluxo pós-almoço', sev: 3 },
          { text: 'Cansaço muscular acentuado', sev: 5 },
        ]
        const pick = sympOptions[dayOffset % sympOptions.length]
        sympRec.set('numeric_value', pick.sev)
        sympRec.set('text_value', pick.text)
        sympRec.set('unit', '/10')
        sympRec.set('notes', 'Relato pontual no final da tarde')
        app.save(sympRec)
      }
    }

    // ==========================================
    // B) MEDICAÇÕES & TOMAS RECORRENTES / PONTUAIS
    // ==========================================
    // Garantir medicações cadastradas
    let reconterMed
    let mounjaroMed
    try {
      const existingMeds = app.findRecordsByFilter(
        'medications',
        `user = '${clientUser.id}'`,
        '',
        10,
        0,
      )
      for (const m of existingMeds) {
        const n = m.getString('name').toLowerCase()
        if (n.includes('reconter')) reconterMed = m
        if (n.includes('mounjaro')) mounjaroMed = m
      }
    } catch (_) {}

    if (!reconterMed) {
      reconterMed = new Record(medsCol)
      reconterMed.set('user', clientUser.id)
      reconterMed.set('name', 'reconter')
      reconterMed.set('active_ingredient', 'Oxalato de Escitalopram')
      reconterMed.set('dosage', '10mg')
      reconterMed.set('routine', 'daily')
      reconterMed.set('weekdays', [0, 1, 2, 3, 4, 5, 6])
      reconterMed.set('times', ['08:00'])
      app.save(reconterMed)
    }

    if (!mounjaroMed) {
      mounjaroMed = new Record(medsCol)
      mounjaroMed.set('user', clientUser.id)
      mounjaroMed.set('name', 'Mounjaro')
      mounjaroMed.set('active_ingredient', 'Tirzepatida')
      mounjaroMed.set('dosage', '5mg')
      mounjaroMed.set('routine', 'weekly')
      mounjaroMed.set('weekdays', [3]) // Quarta-feira
      mounjaroMed.set('times', ['08:00'])
      app.save(mounjaroMed)
    }

    // Tomas de medicação nos últimos 30 dias (health_metrics category 'remedio')
    for (let dayOffset = 0; dayOffset <= 29; dayOffset++) {
      const day = getDateStr(dayOffset)
      const dObj = new Date(Date.now() - dayOffset * 86400000)
      const wDay = dObj.getDay()

      // Reconter: diário (95% de adesão)
      if (dayOffset !== 7 && dayOffset !== 21) {
        const medLog = new Record(healthCol)
        medLog.set('user', clientUser.id)
        medLog.set('category', 'remedio')
        medLog.set('date_time', `${day} 08:05`)
        medLog.set('numeric_value', 0)
        medLog.set('text_value', 'reconter')
        medLog.set('unit', 'dose')
        medLog.set('notes', 'rotina • 10mg')
        app.save(medLog)
      }

      // Mounjaro: quarta-feira (wDay = 3)
      if (wDay === 3) {
        const mjLog = new Record(healthCol)
        mjLog.set('user', clientUser.id)
        mjLog.set('category', 'remedio')
        mjLog.set('date_time', `${day} 08:15`)
        mjLog.set('numeric_value', 0)
        mjLog.set('text_value', 'Mounjaro')
        mjLog.set('unit', 'dose')
        mjLog.set('notes', 'rotina • 5mg caneta semanal')
        app.save(mjLog)
      }

      // Dipirona pontual (esporádica nos dias de cefaleia)
      if (dayOffset === 2 || dayOffset === 17) {
        const dipLog = new Record(healthCol)
        dipLog.set('user', clientUser.id)
        dipLog.set('category', 'remedio')
        dipLog.set('date_time', `${day} 17:00`)
        dipLog.set('numeric_value', 0)
        dipLog.set('text_value', 'Dipirona')
        dipLog.set('unit', 'dose')
        dipLog.set('notes', 'pontual • 1g para cefaleia')
        app.save(dipLog)
      }
    }

    // ==========================================
    // C) REFEIÇÕES (MEALS) - 30 dias
    // ==========================================
    const mealTemplates = [
      {
        type: 'cafe_da_manha',
        time: '08:15',
        title: 'Ovos mexidos com azeite, chia e mamão',
        items:
          '2 ovos caipiras mexidos com cúrcuma (100g), 1 fatia de mamão formosa (120g), 1 colher de sementes de chia (15g)',
        cal: 320,
        wt: 235,
        notes: 'Café da manhã rico em proteína e gorduras boas',
      },
      {
        type: 'almoco',
        time: '12:30',
        title: 'Filé de frango grelhado com quinoa e brócolis',
        items:
          'Peito de frango grelhado (160g), Quinoa cozida (100g), Brócolis ao vapor (120g), Salada verde com azeite (80g)',
        cal: 520,
        wt: 460,
        notes: 'Refeição anti-inflamatória bem equilibrada',
      },
      {
        type: 'lanche',
        time: '16:00',
        title: 'Mix de castanhas e iogurte natural',
        items:
          'Iogurte natural sem açúcar (150g), Mix de nozes e amêndoas (30g), Mirtilos frescos (40g)',
        cal: 260,
        wt: 220,
        notes: 'Lanche intermediário com baixo índice glicêmico',
      },
      {
        type: 'jantar',
        time: '20:00',
        title: 'Salmão grelhado com legumes assados',
        items:
          'Salmão selvagem grelhado (170g), Abobrinha e cenoura assadas no alecrim (150g), Azeite de oliva (10ml)',
        cal: 490,
        wt: 330,
        notes: 'Jantar leve com ômega 3 abundante',
      },
    ]

    for (let dayOffset = 0; dayOffset <= 29; dayOffset++) {
      const day = getDateStr(dayOffset)

      // Registrar almoço todo dia
      const almoco = mealTemplates[1]
      const m1 = new Record(mealsCol)
      m1.set('user', clientUser.id)
      m1.set('meal_type', 'almoco')
      m1.set('date_time', `${day} ${almoco.time}`)
      m1.set('title', almoco.title)
      m1.set('items_detected', almoco.items)
      m1.set(
        'estimated_calories',
        almoco.cal + Math.round((pseudoRand(dayOffset * 7.1) - 0.5) * 60),
      )
      m1.set('estimated_weight_g', almoco.wt + Math.round((pseudoRand(dayOffset * 7.2) - 0.5) * 40))
      m1.set('notes', almoco.notes)
      app.save(m1)

      // Registrar jantar na maioria dos dias
      if (dayOffset % 3 !== 1) {
        const jantar = mealTemplates[3]
        const m2 = new Record(mealsCol)
        m2.set('user', clientUser.id)
        m2.set('meal_type', 'jantar')
        m2.set('date_time', `${day} ${jantar.time}`)
        m2.set('title', jantar.title)
        m2.set('items_detected', jantar.items)
        m2.set(
          'estimated_calories',
          jantar.cal + Math.round((pseudoRand(dayOffset * 7.3) - 0.5) * 50),
        )
        m2.set(
          'estimated_weight_g',
          jantar.wt + Math.round((pseudoRand(dayOffset * 7.4) - 0.5) * 30),
        )
        m2.set('notes', jantar.notes)
        app.save(m2)
      }

      // Café da manhã a cada 2 dias
      if (dayOffset % 2 === 0) {
        const cafe = mealTemplates[0]
        const m3 = new Record(mealsCol)
        m3.set('user', clientUser.id)
        m3.set('meal_type', 'cafe_da_manha')
        m3.set('date_time', `${day} ${cafe.time}`)
        m3.set('title', cafe.title)
        m3.set('items_detected', cafe.items)
        m3.set('estimated_calories', cafe.cal)
        m3.set('estimated_weight_g', cafe.wt)
        m3.set('notes', cafe.notes)
        app.save(m3)
      }
    }

    // ==========================================
    // D) DIÁRIO EMOCIONAL (EMOTIONAL_LOGS) - 30 dias
    // ==========================================
    const moodOptions = [
      {
        score: 5,
        label: 'Excelente / Inspirado',
        energy: 5,
        stress: 1,
        notes: 'Dia produtivo, treino rendeu muito bem e sono reparador.',
      },
      {
        score: 4,
        label: 'Bem disposto e focado',
        energy: 4,
        stress: 2,
        notes: 'Sensação de clareza mental e foco estável ao longo do dia.',
      },
      {
        score: 3,
        label: 'Neutro / Estável',
        energy: 3,
        stress: 3,
        notes: 'Dia de rotina normal, sem grandes oscilações.',
      },
      {
        score: 2,
        label: 'Cansado / Sobrecarregado',
        energy: 2,
        stress: 4,
        notes: 'Prazos apertados no trabalho geraram tensão no final da tarde.',
      },
    ]

    for (let dayOffset = 0; dayOffset <= 29; dayOffset++) {
      const day = getDateStr(dayOffset)

      // Diário a cada 1 ou 2 dias
      if (dayOffset % 3 === 2) continue

      const pickIdx = Math.floor(pseudoRand(dayOffset * 8.3) * moodOptions.length)
      const opt = moodOptions[pickIdx]

      const el = new Record(emoCol)
      el.set('user', clientUser.id)
      el.set('date', day)
      el.set('mood_score', opt.score)
      el.set('mood_label', opt.label)
      el.set('energy_level', opt.energy)
      el.set('stress_level', opt.stress)
      el.set('affecting_factors', 'Sono, rotina de treinos e alimentação saudável')
      el.set('notes', opt.notes)
      app.save(el)
    }

    console.log('Seed de 30 dias de dados concluído com sucesso!')
  },
  (app) => {
    // rollback opcional
  },
)
