migrate(
  (app) => {
    // 1. health_metrics: Registros de saúde e hábitos (água, café, pressão, sono, HRV, saturação, peso, glicemia, etc.)
    const healthMetrics = new Collection({
      name: 'health_metrics',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: [
            'agua',
            'cafe',
            'sono',
            'hrv',
            'atividade',
            'pressao',
            'peso',
            'glicemia',
            'saturacao',
            'remedio',
            'alcool',
            'sauna',
            'meditacao',
            'outro',
          ],
          maxSelect: 1,
        },
        { name: 'date_time', type: 'text', required: true },
        { name: 'numeric_value', type: 'number', required: false },
        { name: 'text_value', type: 'text', required: false },
        { name: 'unit', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'attachment', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_health_metrics_user_date ON health_metrics (user, date_time DESC)',
        'CREATE INDEX idx_health_metrics_user_cat ON health_metrics (user, category)',
      ],
    })
    app.save(healthMetrics)

    // 2. medical_records: Histórico médico (cirurgias e alergias)
    const medicalRecords = new Collection({
      name: 'medical_records',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['cirurgia', 'alergia', 'doenca_previa', 'medicamento_continuo'],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'date', type: 'text', required: false },
        { name: 'description', type: 'text', required: false },
        { name: 'severity', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_medical_records_user ON medical_records (user)'],
    })
    app.save(medicalRecords)

    // 3. emotional_logs: Diário emocional (como estou hoje, o que tem afetado)
    const emotionalLogs = new Collection({
      name: 'emotional_logs',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'date', type: 'text', required: true },
        { name: 'mood_score', type: 'number', required: true }, // 1 a 5
        { name: 'mood_label', type: 'text', required: true },
        { name: 'affecting_factors', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'energy_level', type: 'number', required: false }, // 1 a 5
        { name: 'stress_level', type: 'number', required: false }, // 1 a 5
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_emotional_logs_user_date ON emotional_logs (user, date DESC)'],
    })
    app.save(emotionalLogs)

    // 4. exams: Exames laboratoriais e diagnósticos (sangue, endoscopia, eletrocardiograma etc.)
    const exams = new Collection({
      name: 'exams',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
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
        { name: 'type', type: 'text', required: true }, // Sangue, Endoscopia, Eletrocardiograma, Imagem, etc.
        { name: 'date', type: 'text', required: true },
        { name: 'laboratory', type: 'text', required: false },
        { name: 'summary_results', type: 'text', required: false },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 20971520 },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['normal', 'alterado', 'pendente'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_exams_user_date ON exams (user, date DESC)'],
    })
    app.save(exams)

    // 5. diets: Dietas e prescrições
    const diets = new Collection({
      name: 'diets',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
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
        { name: 'objective', type: 'text', required: false },
        { name: 'prescription', type: 'text', required: false }, // texto estruturado da dieta
        { name: 'photo', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'active', type: 'bool', required: false },
        { name: 'start_date', type: 'text', required: false },
        { name: 'end_date', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_diets_user ON diets (user)'],
    })
    app.save(diets)

    // 6. meals: Refeições com foto do prato, alimentos identificados e peso estimado
    const meals = new Collection({
      name: 'meals',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'meal_type',
          type: 'select',
          required: true,
          values: ['cafe_da_manha', 'almoco', 'lanche', 'jantar', 'ceia', 'extra'],
          maxSelect: 1,
        },
        { name: 'date_time', type: 'text', required: true },
        { name: 'title', type: 'text', required: false },
        { name: 'photo', type: 'file', maxSelect: 1, maxSize: 15728640 },
        { name: 'photo_url', type: 'text', required: false },
        { name: 'items_detected', type: 'text', required: false }, // Lista de alimentos em texto / JSON
        { name: 'estimated_weight_g', type: 'number', required: false },
        { name: 'estimated_calories', type: 'number', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_meals_user_date ON meals (user, date_time DESC)'],
    })
    app.save(meals)

    // 7. ai_analyses: Histórico de análises de correlação entre variáveis
    const aiAnalyses = new Collection({
      name: 'ai_analyses',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'variables', type: 'text', required: true }, // ex: "sono, cafe, hrv"
        { name: 'question', type: 'text', required: false },
        { name: 'insights', type: 'text', required: true },
        { name: 'summary', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_ai_analyses_user ON ai_analyses (user, created DESC)'],
    })
    app.save(aiAnalyses)
  },
  (app) => {
    const collections = [
      'ai_analyses',
      'meals',
      'diets',
      'exams',
      'emotional_logs',
      'medical_records',
      'health_metrics',
    ]
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
