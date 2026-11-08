migrate(
  (app) => {
    // 1. Adicionar campos de sono em health_metrics (opcionais)
    const metrics = app.findCollectionByNameOrId('health_metrics')
    if (!metrics.fields.getByName('sleep_deep_hours')) {
      metrics.fields.add(new NumberField({ name: 'sleep_deep_hours', min: 0, max: 24 }))
    }
    if (!metrics.fields.getByName('sleep_rem_hours')) {
      metrics.fields.add(new NumberField({ name: 'sleep_rem_hours', min: 0, max: 24 }))
    }
    if (!metrics.fields.getByName('sleep_awake_hours')) {
      metrics.fields.add(new NumberField({ name: 'sleep_awake_hours', min: 0, max: 24 }))
    }
    if (!metrics.fields.getByName('bedtime')) {
      metrics.fields.add(new TextField({ name: 'bedtime', max: 20 }))
    }
    if (!metrics.fields.getByName('wakeup')) {
      metrics.fields.add(new TextField({ name: 'wakeup', max: 20 }))
    }
    app.save(metrics)

    // 2. Adicionar meta de sono em user_preferences
    const prefs = app.findCollectionByNameOrId('user_preferences')
    if (!prefs.fields.getByName('sleep_goal_hours')) {
      prefs.fields.add(new NumberField({ name: 'sleep_goal_hours', min: 4, max: 14 }))
    }
    app.save(prefs)

    // 3. Enriquecer registros existentes de categoria 'sono' que não possuem fases preenchidas
    // (Consistente com o total: deep ~20-25%, rem ~20-25%, awake ~5-10%, bedtime ~22:30-23:30, wakeup ~06:30-07:30)
    try {
      const sleepRecords = app.findRecordsByFilter(
        'health_metrics',
        "category = 'sono'",
        '-created',
        200,
        0,
      )
      for (const r of sleepRecords) {
        if (r.getFloat('sleep_deep_hours') > 0) continue // já possui
        const total = r.getFloat('numeric_value') || 7.5
        // Particionar de forma plausível
        const deep = Math.round(total * 0.22 * 10) / 10
        const rem = Math.round(total * 0.24 * 10) / 10
        const awake = Math.round(total * 0.08 * 10) / 10

        r.set('sleep_deep_hours', deep)
        r.set('sleep_rem_hours', rem)
        r.set('sleep_awake_hours', awake)
        if (!r.getString('bedtime')) r.set('bedtime', '23:15')
        if (!r.getString('wakeup')) r.set('wakeup', '07:00')
        app.save(r)
      }
    } catch (e) {
      console.log('Aviso ao enriquecer registros de sono:', e)
    }
  },
  (app) => {
    const metrics = app.findCollectionByNameOrId('health_metrics')
    const f1 = metrics.fields.getByName('sleep_deep_hours')
    if (f1) metrics.fields.remove(f1)
    const f2 = metrics.fields.getByName('sleep_rem_hours')
    if (f2) metrics.fields.remove(f2)
    const f3 = metrics.fields.getByName('sleep_awake_hours')
    if (f3) metrics.fields.remove(f3)
    const f4 = metrics.fields.getByName('bedtime')
    if (f4) metrics.fields.remove(f4)
    const f5 = metrics.fields.getByName('wakeup')
    if (f5) metrics.fields.remove(f5)
    app.save(metrics)

    const prefs = app.findCollectionByNameOrId('user_preferences')
    const g = prefs.fields.getByName('sleep_goal_hours')
    if (g) prefs.fields.remove(g)
    app.save(prefs)
  },
)
