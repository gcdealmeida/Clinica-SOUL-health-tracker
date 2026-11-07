///
/// Toma pontual de medicação: acrescenta o valor "once" ao select `routine`
/// da coleção `medications`. Uma medicação "once" não tem rotina — dias e
/// horários cadastrados ficam vazios; cada toma registrada cria um
/// health_metrics (category 'remedio') com notes "pontual HH:MM".
///
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('medications')
    const field = col.fields.getByName('routine')
    if (field && !field.values.includes('once')) {
      field.values.push('once')
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('medications')
    const field = col.fields.getByName('routine')
    if (field) {
      field.values = field.values.filter((v) => v !== 'once')
    }
    app.save(col)
  },
)
