migrate(
  (app) => {
    const reminders = new Collection({
      name: 'reminders',
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
          values: ['remedio', 'exame', 'consulta', 'habito', 'outro'],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'date', type: 'text', required: true },
        { name: 'time', type: 'text', required: false },
        {
          name: 'repeat',
          type: 'select',
          required: false,
          values: ['none', 'daily', 'weekly', 'monthly'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['pending', 'completed', 'cancelled'],
          maxSelect: 1,
        },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_reminders_user_date ON reminders (user, date)',
        'CREATE INDEX idx_reminders_user_status ON reminders (user, status)',
      ],
    })
    app.save(reminders)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('reminders')
      app.delete(collection)
    } catch (_) {}
  },
)
