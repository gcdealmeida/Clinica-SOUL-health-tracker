migrate(
  (app) => {
    // medications: medicações em uso cadastradas pelo paciente em /medicamentos.
    // routine = 'daily' (todos os dias) ou 'weekly' (weekdays = 0..6, 0 = domingo).
    // times = horários das tomas ("HH:MM"). active_ingredient = princípio ativo (OpenFDA ou manual).
    let existing = null
    try {
      existing = app.findCollectionByNameOrId('medications')
    } catch (_) {
      existing = null
    }
    if (!existing) {
      const collection = new Collection({
        name: 'medications',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true, max: 200 },
          { name: 'active_ingredient', type: 'text', max: 300 },
          { name: 'dosage', type: 'text', max: 100 },
          {
            name: 'routine',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['daily', 'weekly'],
          },
          { name: 'weekdays', type: 'json', maxSize: 2000 },
          { name: 'times', type: 'json', maxSize: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_medications_user ON medications (user)'],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('medications')
      app.delete(col)
    } catch (_) {}
  },
)
