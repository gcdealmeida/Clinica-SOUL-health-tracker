migrate(
  (app) => {
    // 1. health_metrics: nova categoria 'sintoma' (text_value = nome do sintoma,
    //    numeric_value = severidade 0-10) para alimentar a seção de sintomas do painel.
    const health = app.findCollectionByNameOrId('health_metrics')
    const catField = health.fields.getByName('category')
    if (catField && !catField.values.includes('sintoma')) {
      catField.values = catField.values.concat(['sintoma'])
    }
    app.save(health)

    // 2. user_preferences: guarda por usuário a lista ordenada de métricas
    //    exibidas nos cards do painel "Hoje" (customização estilo Guava).
    let prefs = null
    try {
      prefs = app.findCollectionByNameOrId('user_preferences')
    } catch (_) {
      prefs = null
    }
    if (!prefs) {
      const collection = new Collection({
        name: 'user_preferences',
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
          { name: 'dashboard_metrics', type: 'json', maxSize: 20000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_user_preferences_user ON user_preferences (user)'],
      })
      app.save(collection)
    }
  },
  (app) => {
    try {
      const prefs = app.findCollectionByNameOrId('user_preferences')
      app.delete(prefs)
    } catch (_) {}

    try {
      const health = app.findCollectionByNameOrId('health_metrics')
      const catField = health.fields.getByName('category')
      if (catField && catField.values.includes('sintoma')) {
        catField.values = catField.values.filter((v) => v !== 'sintoma')
      }
      app.save(health)
    } catch (_) {}
  },
)
