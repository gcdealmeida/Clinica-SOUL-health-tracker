migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Seed Usuário Cliente (guivemax@hotmail.com)
    let clientUser
    try {
      clientUser = app.findAuthRecordByEmail('_pb_users_auth_', 'guivemax@hotmail.com')
      clientUser.set('role', 'cliente')
      clientUser.set('name', 'Guilherme Max')
      app.save(clientUser)
    } catch (_) {
      clientUser = new Record(users)
      clientUser.setEmail('guivemax@hotmail.com')
      clientUser.setPassword('Skip@Pass')
      clientUser.setVerified(true)
      clientUser.set('name', 'Guilherme Max')
      clientUser.set('role', 'cliente')
      clientUser.set('phone', '+55 11 98888-7777')
      app.save(clientUser)
    }

    // 2. Seed Usuário Profissional (dra.carolina@clinicasoul.com.br)
    let doctorUser
    try {
      doctorUser = app.findAuthRecordByEmail('_pb_users_auth_', 'dra.carolina@clinicasoul.com.br')
    } catch (_) {
      doctorUser = new Record(users)
      doctorUser.setEmail('dra.carolina@clinicasoul.com.br')
      doctorUser.setPassword('Skip@Pass')
      doctorUser.setVerified(true)
      doctorUser.set('name', 'Dra. Carolina Silva - Medicina Integrativa')
      doctorUser.set('role', 'profissional')
      doctorUser.set('phone', '+55 11 99999-1234')
      app.save(doctorUser)
    }

    // 3. Seed Histórico Médico do Cliente
    const medRecordsCol = app.findCollectionByNameOrId('medical_records')
    const existingMed = app.findRecordsByFilter(
      'medical_records',
      `user = '${clientUser.id}'`,
      '',
      10,
      0,
    )
    if (existingMed.length === 0) {
      const med1 = new Record(medRecordsCol)
      med1.set('user', clientUser.id)
      med1.set('type', 'cirurgia')
      med1.set('title', 'Apendicectomia por videolaparoscopia')
      med1.set('date', '2020-04-12')
      med1.set('description', 'Sem intercorrências no pós-operatório.')
      app.save(med1)

      const med2 = new Record(medRecordsCol)
      med2.set('user', clientUser.id)
      med2.set('type', 'alergia')
      med2.set('title', 'Dipirona e Frutos do Mar')
      med2.set('severity', 'Moderada a severa')
      med2.set('description', 'Urticária e edema labial caso ingerido.')
      app.save(med2)
    }

    // 4. Seed Health Metrics (água, café, sono, HRV, pressão, glicemia)
    const healthCol = app.findCollectionByNameOrId('health_metrics')
    const existingHealth = app.findRecordsByFilter(
      'health_metrics',
      `user = '${clientUser.id}'`,
      '',
      10,
      0,
    )
    if (existingHealth.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      const metricsData = [
        {
          category: 'sono',
          date_time: `${today} 07:00`,
          numeric_value: 7.5,
          unit: 'horas',
          notes: 'Sono REM 1h45m, sono profundo 1h30m (Apple Watch)',
        },
        {
          category: 'hrv',
          date_time: `${today} 07:15`,
          numeric_value: 68,
          unit: 'ms',
          notes: 'Variabilidade da frequência cardíaca em repouso',
        },
        {
          category: 'agua',
          date_time: `${today} 08:30`,
          numeric_value: 500,
          unit: 'ml',
          notes: 'Primeiro copo de água ao acordar',
        },
        {
          category: 'cafe',
          date_time: `${today} 09:00`,
          numeric_value: 1,
          unit: 'xícara',
          notes: 'Café expresso sem açúcar',
        },
        {
          category: 'pressao',
          date_time: `${today} 09:30`,
          numeric_value: 120,
          unit: 'mmHg',
          text_value: '120/80',
          notes: 'Aferição em repouso matinal',
        },
        {
          category: 'glicemia',
          date_time: `${today} 07:30`,
          numeric_value: 88,
          unit: 'mg/dL',
          notes: 'Em jejum de 10h',
        },
        {
          category: 'agua',
          date_time: `${today} 11:30`,
          numeric_value: 750,
          unit: 'ml',
          notes: 'Garrafa durante a manhã',
        },
        {
          category: 'atividade',
          date_time: `${yesterday} 18:30`,
          numeric_value: 45,
          unit: 'min',
          notes: 'Treino funcional e caminhada rápida',
        },
        {
          category: 'sauna',
          date_time: `${yesterday} 19:30`,
          numeric_value: 20,
          unit: 'min',
          notes: 'Sauna seca pós-treino',
        },
      ]

      for (const d of metricsData) {
        const rec = new Record(healthCol)
        rec.set('user', clientUser.id)
        rec.set('category', d.category)
        rec.set('date_time', d.date_time)
        rec.set('numeric_value', d.numeric_value)
        rec.set('unit', d.unit)
        if (d.text_value) rec.set('text_value', d.text_value)
        if (d.notes) rec.set('notes', d.notes)
        app.save(rec)
      }
    }

    // 5. Seed Emotional Log
    const emoCol = app.findCollectionByNameOrId('emotional_logs')
    const existingEmo = app.findRecordsByFilter(
      'emotional_logs',
      `user = '${clientUser.id}'`,
      '',
      5,
      0,
    )
    if (existingEmo.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      const rec = new Record(emoCol)
      rec.set('user', clientUser.id)
      rec.set('date', today)
      rec.set('mood_score', 4)
      rec.set('mood_label', 'Bem disposto e focado')
      rec.set('affecting_factors', 'Boa noite de sono de 7h30 e meditação pela manhã')
      rec.set('energy_level', 4)
      rec.set('stress_level', 2)
      rec.set('notes', 'Sensação de clareza mental e boa recuperação muscular.')
      app.save(rec)
    }

    // 6. Seed Diet
    const dietsCol = app.findCollectionByNameOrId('diets')
    const existingDiets = app.findRecordsByFilter('diets', `user = '${clientUser.id}'`, '', 5, 0)
    if (existingDiets.length === 0) {
      const diet = new Record(dietsCol)
      diet.set('user', clientUser.id)
      diet.set('title', 'Protocolo Anti-inflamatório & Equilíbrio Metabólico')
      diet.set(
        'objective',
        'Reduzir picos glicêmicos, melhorar microbiota intestinal e energia vespertina.',
      )
      diet.set(
        'prescription',
        `Café da Manhã: Ovos mexidos com cúrcuma + abacate ou mamão com sementes de chia.
Almoço: Salada de folhas verdes escuras, vegetais cozidos a vapor, 150g de proteína magra (peixe ou frango orgânico), azeite de oliva extra virgem.
Lanche: Castanhas variadas (30g) ou kefir artesanal com mirtilos.
Jantar: Sopa de legumes com gengibre ou salmão grelhado com brócolis.
Hidratação: Mínimo 2.5L de água por dia. Chá de camomila com melissa antes de dormir.`,
      )
      diet.set('active', true)
      diet.set('start_date', '2025-01-10')
      app.save(diet)
    }

    // 7. Seed Exam
    const examsCol = app.findCollectionByNameOrId('exams')
    const existingExams = app.findRecordsByFilter('exams', `user = '${clientUser.id}'`, '', 5, 0)
    if (existingExams.length === 0) {
      const ex1 = new Record(examsCol)
      ex1.set('user', clientUser.id)
      ex1.set('title', 'Painel Metabólico e Hormonal Completo')
      ex1.set('type', 'Exame de Sangue')
      ex1.set('date', '2025-01-05')
      ex1.set('laboratory', 'Laboratório Fleury')
      ex1.set(
        'summary_results',
        'Glicemia de jejum: 88 mg/dL (ótimo). PCR ultrassensível: 0.4 mg/L (baixa inflamação). Vitamina D: 48 ng/mL. TSH: 1.8 mUI/L.',
      )
      ex1.set('status', 'normal')
      app.save(ex1)

      const ex2 = new Record(examsCol)
      ex2.set('user', clientUser.id)
      ex2.set('title', 'Eletrocardiograma de Repouso (ECG)')
      ex2.set('type', 'Eletrocardiograma')
      ex2.set('date', '2024-11-20')
      ex2.set('laboratory', 'Hospital Sírio-Libanês')
      ex2.set(
        'summary_results',
        'Ritmo sinusal regular, frequência 62 bpm. Sem alterações de repolarização ventricular.',
      )
      ex2.set('status', 'normal')
      app.save(ex2)
    }

    // 8. Seed Meal
    const mealsCol = app.findCollectionByNameOrId('meals')
    const existingMeals = app.findRecordsByFilter('meals', `user = '${clientUser.id}'`, '', 5, 0)
    if (existingMeals.length === 0) {
      const today = new Date().toISOString().slice(0, 10)
      const m1 = new Record(mealsCol)
      m1.set('user', clientUser.id)
      m1.set('meal_type', 'almoco')
      m1.set('date_time', `${today} 12:45`)
      m1.set('title', 'Salmão grelhado com quinoa e aspargos')
      m1.set('photo_url', 'https://img.usecurling.com/p/600/400?q=salmon+salad&color=green')
      m1.set(
        'items_detected',
        'Filé de salmão grelhado (160g), Quinoa cozida (100g), Aspargos no vapor (80g), Azeite de oliva (10ml)',
      )
      m1.set('estimated_weight_g', 350)
      m1.set('estimated_calories', 480)
      m1.set('notes', 'Identificado pela IA com precisão. Excelente densidade nutricional.')
      app.save(m1)
    }
  },
  (app) => {
    // Seeds rollback (optional)
  },
)
