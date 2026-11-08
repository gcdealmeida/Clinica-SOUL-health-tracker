migrate(
  (app) => {
    const metrics = app.findCollectionByNameOrId('health_metrics')
    if (!metrics.fields.getByName('body_fat_pct')) {
      metrics.fields.add(new NumberField({ name: 'body_fat_pct', min: 0, max: 100 }))
    }
    if (!metrics.fields.getByName('lean_mass_kg')) {
      metrics.fields.add(new NumberField({ name: 'lean_mass_kg', min: 0, max: 400 }))
    }
    app.save(metrics)

    const prefs = app.findCollectionByNameOrId('user_preferences')
    if (!prefs.fields.getByName('height_cm')) {
      prefs.fields.add(new NumberField({ name: 'height_cm', min: 50, max: 260 }))
    }
    app.save(prefs)
  },
  (app) => {
    const metrics = app.findCollectionByNameOrId('health_metrics')
    const bf = metrics.fields.getByName('body_fat_pct')
    if (bf) metrics.fields.remove(bf)
    const lm = metrics.fields.getByName('lean_mass_kg')
    if (lm) metrics.fields.remove(lm)
    app.save(metrics)

    const prefs = app.findCollectionByNameOrId('user_preferences')
    const h = prefs.fields.getByName('height_cm')
    if (h) prefs.fields.remove(h)
    app.save(prefs)
  },
)
