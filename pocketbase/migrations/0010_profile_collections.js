migrate(
  (app) => {
    // 1. Ampliar user_preferences com dados de perfil pessoal adicionais:
    //    birth_date, gender, blood_type, weight_kg (meta/referência), contact_notes
    const prefs = app.findCollectionByNameOrId('user_preferences')
    if (!prefs.fields.getByName('birth_date')) {
      prefs.fields.add(new TextField({ name: 'birth_date', max: 20 }))
    }
    if (!prefs.fields.getByName('gender')) {
      prefs.fields.add(new TextField({ name: 'gender', max: 50 }))
    }
    if (!prefs.fields.getByName('blood_type')) {
      prefs.fields.add(new TextField({ name: 'blood_type', max: 10 }))
    }
    if (!prefs.fields.getByName('weight_kg')) {
      prefs.fields.add(new NumberField({ name: 'weight_kg', min: 0, max: 500 }))
    }
    if (!prefs.fields.getByName('contact_notes')) {
      prefs.fields.add(new TextField({ name: 'contact_notes', max: 500 }))
    }
    app.save(prefs)

    // Helper de regras padrão de usuário:
    const userRule =
      "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')"
    const userOwnerRule = "@request.auth.id != '' && user = @request.auth.id"

    // 2. biomarkers (Biomarcadores do perfil: nome, valor, unidade, faixa referência, status, data)
    if (!app.hasTable('profile_biomarkers')) {
      const biomarkers = new Collection({
        name: 'profile_biomarkers',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'value', type: 'text', required: true },
          { name: 'unit', type: 'text', required: false },
          { name: 'reference_range', type: 'text', required: false },
          { name: 'category', type: 'text', required: false }, // Lipidograma, Inflamatório, Hormonal, etc.
          { name: 'status', type: 'text', required: false }, // normal, alterado, otimo
          { name: 'date', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_biomarkers_user ON profile_biomarkers (user, date DESC)'],
      })
      app.save(biomarkers)
    }

    // 3. profile_conditions (Conditions & Injuries / Cirurgias e Diagnósticos)
    if (!app.hasTable('profile_conditions')) {
      const conditions = new Collection({
        name: 'profile_conditions',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'type', type: 'text', required: true }, // 'condicao', 'lesao', 'cirurgia', 'cronica'
          { name: 'status', type: 'text', required: false }, // 'ativa', 'resolvida', 'em_tratamento'
          { name: 'date', type: 'text', required: false },
          { name: 'description', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_conditions_user ON profile_conditions (user)'],
      })
      app.save(conditions)
    }

    // 4. profile_allergies (Alergias com gravidade, reação e data)
    if (!app.hasTable('profile_allergies')) {
      const allergies = new Collection({
        name: 'profile_allergies',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'allergen', type: 'text', required: true },
          { name: 'reaction', type: 'text', required: false },
          { name: 'severity', type: 'text', required: false }, // 'Leve', 'Moderada', 'Severa / Anafilaxia'
          { name: 'diagnosed_date', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_allergies_user ON profile_allergies (user)'],
      })
      app.save(allergies)
    }

    // 5. profile_vaccinations (Vacinação: nome, lote, data, dose, local)
    if (!app.hasTable('profile_vaccinations')) {
      const vacs = new Collection({
        name: 'profile_vaccinations',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'vaccine', type: 'text', required: true },
          { name: 'dose', type: 'text', required: false }, // Anual, 1ª dose, Reforço
          { name: 'date', type: 'text', required: true },
          { name: 'next_due_date', type: 'text', required: false },
          { name: 'batch_or_clinic', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_vaccinations_user ON profile_vaccinations (user, date DESC)'],
      })
      app.save(vacs)
    }

    // 6. profile_events (Eventos de saúde / vida relevantes: hospitalização, diagnóstico, viagem, etc.)
    if (!app.hasTable('profile_events')) {
      const events = new Collection({
        name: 'profile_events',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'title', type: 'text', required: true },
          { name: 'category', type: 'text', required: false }, // Diagnóstico, Procedimento, Mudança de Vida, etc.
          { name: 'date', type: 'text', required: true },
          { name: 'description', type: 'text', required: false },
          { name: 'impact', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_events_user ON profile_events (user, date DESC)'],
      })
      app.save(events)
    }

    // 7. profile_genetics (Genética: traço, gene/variante, risco, recomendação, origem)
    if (!app.hasTable('profile_genetics')) {
      const genetics = new Collection({
        name: 'profile_genetics',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'trait', type: 'text', required: true }, // ex: "Metabolismo de Cafeína lento (CYP1A2)"
          { name: 'gene_variant', type: 'text', required: false }, // "CYP1A2 rs762551 (A/C)"
          { name: 'category', type: 'text', required: false }, // Metabolismo, Cardiovascular, Longevidade, etc.
          { name: 'risk_or_status', type: 'text', required: false }, // Típico, Risco Leve, Vantagem
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_genetics_user ON profile_genetics (user)'],
      })
      app.save(genetics)
    }

    // 8. profile_care_providers (Profissionais de Saúde / Care Providers)
    if (!app.hasTable('profile_care_providers')) {
      const providers = new Collection({
        name: 'profile_care_providers',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'specialty', type: 'text', required: true }, // Médico Integrativo, Nutricionista, etc.
          { name: 'clinic_or_hospital', type: 'text', required: false },
          { name: 'phone', type: 'text', required: false },
          { name: 'email', type: 'text', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'is_primary', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_providers_user ON profile_care_providers (user)'],
      })
      app.save(providers)
    }

    // 9. profile_lifestyle (Estilo de Vida: tabagismo, bebidas por semana, exercício/semana, dieta, sono, estresse)
    if (!app.hasTable('profile_lifestyle')) {
      const lifestyle = new Collection({
        name: 'profile_lifestyle',
        type: 'base',
        listRule: userRule,
        viewRule: userRule,
        createRule: "@request.auth.id != ''",
        updateRule: userOwnerRule,
        deleteRule: userRule,
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'smoking_status', type: 'text', required: false }, // 'Não fumante', 'Ex-fumante', 'Fumante ocasional'
          { name: 'alcohol_drinks_per_week', type: 'number', required: false }, // doses/semana
          { name: 'exercise_days_per_week', type: 'number', required: false }, // dias/semana
          { name: 'exercise_minutes_per_week', type: 'number', required: false }, // min/semana
          { name: 'diet_pattern', type: 'text', required: false }, // 'Mediterrânea', 'Anti-inflamatória', 'Low Carb', 'Geral'
          { name: 'sleep_hours_typical', type: 'number', required: false }, // horas
          { name: 'stress_level_typical', type: 'text', required: false }, // 'Baixo', 'Moderado', 'Elevado'
          { name: 'sun_exposure_min_day', type: 'number', required: false },
          { name: 'notes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_lifestyle_user ON profile_lifestyle (user)'],
      })
      app.save(lifestyle)
    }

    // 10. Seed inicial demonstrativo para o usuário cliente 'guivemax@hotmail.com'
    // Se o cliente existir e ainda não tiver dados de perfil, preenche dados consistentes estilo Guava
    try {
      let clientUser
      try {
        clientUser = app.findAuthRecordByEmail('_pb_users_auth_', 'guivemax@hotmail.com')
      } catch (_) {
        const clients = app.findRecordsByFilter('users', "role = 'cliente'", '-created', 1, 0)
        if (clients.length > 0) clientUser = clients[0]
      }

      if (clientUser) {
        // Atualizar user_preferences com idade / dados básicos se vazios
        try {
          const prefRec = app.findFirstRecordByFilter(
            'user_preferences',
            `user = '${clientUser.id}'`,
          )
          let changed = false
          if (!prefRec.getString('birth_date')) {
            prefRec.set('birth_date', '1992-05-14') // ~34 anos
            changed = true
          }
          if (!prefRec.getString('gender')) {
            prefRec.set('gender', 'Masculino')
            changed = true
          }
          if (!prefRec.getString('blood_type')) {
            prefRec.set('blood_type', 'O+')
            changed = true
          }
          if (prefRec.getInt('height_cm') === 0) {
            prefRec.set('height_cm', 180)
            changed = true
          }
          if (prefRec.getFloat('weight_kg') === 0) {
            prefRec.set('weight_kg', 83.0)
            changed = true
          }
          if (changed) app.save(prefRec)
        } catch (_) {}

        // Seed de Care Providers se não houver
        const provCol = app.findCollectionByNameOrId('profile_care_providers')
        const existingProvs = app.findRecordsByFilter(
          'profile_care_providers',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingProvs.length === 0) {
          const p1 = new Record(provCol)
          p1.set('user', clientUser.id)
          p1.set('name', 'Dra. Carolina Silva')
          p1.set('specialty', 'Medicina Integrativa & Longevidade')
          p1.set('clinic_or_hospital', 'Clínica Soul')
          p1.set('phone', '+55 11 99999-1234')
          p1.set('email', 'dra.carolina@clinicasoul.com.br')
          p1.set('notes', 'Médica de referência e acompanhamento metabólico')
          p1.set('is_primary', true)
          app.save(p1)

          const p2 = new Record(provCol)
          p2.set('user', clientUser.id)
          p2.set('name', 'Dr. Lucas Mendes')
          p2.set('specialty', 'Cardiologista')
          p2.set('clinic_or_hospital', 'Hospital Sírio-Libanês')
          p2.set('phone', '+55 11 98888-2233')
          p2.set('notes', 'Check-up anual cardiovascular')
          p2.set('is_primary', false)
          app.save(p2)
        }

        // Seed de Lifestyle se não houver
        const lifeCol = app.findCollectionByNameOrId('profile_lifestyle')
        const existingLife = app.findRecordsByFilter(
          'profile_lifestyle',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingLife.length === 0) {
          const l1 = new Record(lifeCol)
          l1.set('user', clientUser.id)
          l1.set('smoking_status', 'Não fumante')
          l1.set('alcohol_drinks_per_week', 2)
          l1.set('exercise_days_per_week', 4)
          l1.set('exercise_minutes_per_week', 210)
          l1.set('diet_pattern', 'Mediterrânea / Anti-inflamatória')
          l1.set('sleep_hours_typical', 7.5)
          l1.set('stress_level_typical', 'Moderado')
          l1.set('sun_exposure_min_day', 20)
          l1.set('notes', 'Foco em longevidade, treino resistido e sono reparador')
          app.save(l1)
        }

        // Seed de Alergias se não houver
        const allCol = app.findCollectionByNameOrId('profile_allergies')
        const existingAll = app.findRecordsByFilter(
          'profile_allergies',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingAll.length === 0) {
          const a1 = new Record(allCol)
          a1.set('user', clientUser.id)
          a1.set('allergen', 'Dipirona e Frutos do Mar')
          a1.set('reaction', 'Urticária e edema de lábios/face')
          a1.set('severity', 'Moderada a severa')
          a1.set('diagnosed_date', '2018-09-10')
          a1.set('notes', 'Evitar AINEs correlatos e frutos do mar crus')
          app.save(a1)
        }

        // Seed de Condições se não houver
        const condCol = app.findCollectionByNameOrId('profile_conditions')
        const existingCond = app.findRecordsByFilter(
          'profile_conditions',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingCond.length === 0) {
          const c1 = new Record(condCol)
          c1.set('user', clientUser.id)
          c1.set('title', 'Apendicectomia')
          c1.set('type', 'cirurgia')
          c1.set('status', 'resolvida')
          c1.set('date', '2020-04-12')
          c1.set('description', 'Videolaparoscopia eletiva, recuperação total')
          app.save(c1)

          const c2 = new Record(condCol)
          c2.set('user', clientUser.id)
          c2.set('title', 'Resistência Leve à Insulina')
          c2.set('type', 'cronica')
          c2.set('status', 'em_tratamento')
          c2.set('date', '2023-08-15')
          c2.set('description', 'Controlado com Mounjaro 5mg semanal e dieta low carb')
          app.save(c2)
        }

        // Seed de Vacinas se não houver
        const vacCol = app.findCollectionByNameOrId('profile_vaccinations')
        const existingVac = app.findRecordsByFilter(
          'profile_vaccinations',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingVac.length === 0) {
          const v1 = new Record(vacCol)
          v1.set('user', clientUser.id)
          v1.set('vaccine', 'Gripe (Influenza Tetravalente)')
          v1.set('dose', 'Anual 2026')
          v1.set('date', '2026-04-10')
          v1.set('next_due_date', '2027-04-10')
          v1.set('batch_or_clinic', 'Fleury Medicina e Saúde')
          app.save(v1)

          const v2 = new Record(vacCol)
          v2.set('user', clientUser.id)
          v2.set('vaccine', 'Hepatite B')
          v2.set('dose', 'Esquema completo (3 doses)')
          v2.set('date', '2022-03-15')
          v2.set('notes', 'Anti-HBs reagente (>100 mUI/mL)')
          app.save(v2)

          const v3 = new Record(vacCol)
          v3.set('user', clientUser.id)
          v3.set('vaccine', 'Tétano e Difteria (dT)')
          v3.set('dose', 'Reforço decenal')
          v3.set('date', '2021-08-20')
          v3.set('next_due_date', '2031-08-20')
          app.save(v3)
        }

        // Seed de Biomarcadores se não houver
        const bioCol = app.findCollectionByNameOrId('profile_biomarkers')
        const existingBio = app.findRecordsByFilter(
          'profile_biomarkers',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingBio.length === 0) {
          const samples = [
            {
              name: 'Colesterol Total',
              val: '172',
              unit: 'mg/dL',
              ref: '< 190 mg/dL',
              cat: 'Lipidograma',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Colesterol HDL',
              val: '58',
              unit: 'mg/dL',
              ref: '> 40 mg/dL',
              cat: 'Lipidograma',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Colesterol LDL',
              val: '94',
              unit: 'mg/dL',
              ref: '< 100 mg/dL (ótimo)',
              cat: 'Lipidograma',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Triglicerídeos',
              val: '98',
              unit: 'mg/dL',
              ref: '< 150 mg/dL',
              cat: 'Lipidograma',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Glicemia de Jejum',
              val: '88',
              unit: 'mg/dL',
              ref: '70 - 99 mg/dL',
              cat: 'Metabólico',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Hemoglobina Glicada (HbA1c)',
              val: '5.2',
              unit: '%',
              ref: '< 5.7%',
              cat: 'Metabólico',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Proteína C-Reativa ultrassensível (PCR-us)',
              val: '0.4',
              unit: 'mg/L',
              ref: '< 1.0 mg/L',
              cat: 'Inflamatório',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'Vitamina D (25-OH)',
              val: '48',
              unit: 'ng/mL',
              ref: '30 - 60 ng/mL',
              cat: 'Vitaminas',
              st: 'otimo',
              dt: '2026-01-15',
            },
            {
              name: 'TSH Ultra-Sensível',
              val: '1.8',
              unit: 'mUI/L',
              ref: '0.4 - 4.0 mUI/L',
              cat: 'Hormonal',
              st: 'otimo',
              dt: '2026-01-15',
            },
          ]
          for (const s of samples) {
            const b = new Record(bioCol)
            b.set('user', clientUser.id)
            b.set('name', s.name)
            b.set('value', s.val)
            b.set('unit', s.unit)
            b.set('reference_range', s.ref)
            b.set('category', s.cat)
            b.set('status', s.st)
            b.set('date', s.dt)
            app.save(b)
          }
        }

        // Seed de Genetics se não houver
        const genCol = app.findCollectionByNameOrId('profile_genetics')
        const existingGen = app.findRecordsByFilter(
          'profile_genetics',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingGen.length === 0) {
          const g1 = new Record(genCol)
          g1.set('user', clientUser.id)
          g1.set('trait', 'Metabolismo Lento de Cafeína')
          g1.set('gene_variant', 'CYP1A2 rs762551 (A/C)')
          g1.set('category', 'Metabolismo')
          g1.set('risk_or_status', 'Atenção')
          g1.set(
            'notes',
            'Limitar cafeína após as 14h para proteger arquitetura de sono profundo e pressão',
          )
          app.save(g1)

          const g2 = new Record(genCol)
          g2.set('user', clientUser.id)
          g2.set('trait', 'Eficiência de Absorção de Vitamina D')
          g2.set('gene_variant', 'VDR TaqI (t/t)')
          g2.set('category', 'Vitaminas & Micronutrientes')
          g2.set('risk_or_status', 'Típico')
          g2.set('notes', 'Boa resposta à suplementação e banho de sol moderado')
          app.save(g2)

          const g3 = new Record(genCol)
          g3.set('user', clientUser.id)
          g3.set('trait', 'Apolipoproteína E (APOE)')
          g3.set('gene_variant', 'APOE ε3/ε3')
          g3.set('category', 'Longevidade Cardiovascular')
          g3.set('risk_or_status', 'Neutro / Favorável')
          g3.set('notes', 'Genótipo neutro mais comum na população, sem risco aumentado para ApoE4')
          app.save(g3)
        }

        // Seed de Events se não houver
        const evtCol = app.findCollectionByNameOrId('profile_events')
        const existingEvt = app.findRecordsByFilter(
          'profile_events',
          `user = '${clientUser.id}'`,
          '',
          1,
          0,
        )
        if (existingEvt.length === 0) {
          const e1 = new Record(evtCol)
          e1.set('user', clientUser.id)
          e1.set('title', 'Início do Protocolo de Medicina Integrativa na Clínica Soul')
          e1.set('category', 'Protocolo Clínico')
          e1.set('date', '2026-01-10')
          e1.set(
            'description',
            'Início de acompanhamento multidisciplinar com Dra. Carolina Silva: foco em composição corporal, sono e marcadores inflamatórios.',
          )
          e1.set('impact', 'Melhoria de disposição e VFC')
          app.save(e1)

          const e2 = new Record(evtCol)
          e2.set('user', clientUser.id)
          e2.set('title', 'Check-up Cardiológico Anual Completo')
          e2.set('category', 'Exame Preventivo')
          e2.set('date', '2025-11-20')
          e2.set(
            'description',
            'ECG normal, teste ergométrico classe I sem isquemia, score de cálcio zero.',
          )
          e2.set('impact', 'Liberado para treinos de alta intensidade')
          app.save(e2)
        }
      }
    } catch (e) {
      console.log('Aviso ao popular seeds de profile:', e)
    }
  },
  (app) => {
    const list = [
      'profile_lifestyle',
      'profile_care_providers',
      'profile_genetics',
      'profile_events',
      'profile_vaccinations',
      'profile_allergies',
      'profile_conditions',
      'profile_biomarkers',
    ]
    for (const name of list) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
