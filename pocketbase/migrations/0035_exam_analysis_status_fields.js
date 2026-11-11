// 0035 — Campos de status da análise assíncrona em exams.
// O frontend lê `analysis_status` (pending/running/done/error) e
// `analysis_error` por polling; `analysis_started_at` é usado pelo runner
// para retomar exames travados (ex.: deploy matou o processamento).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const addText = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new TextField({ name: name }))
      }
    }
    addText('analysis_status')
    addText('analysis_error')
    if (!col.fields.getByName('analysis_started_at')) {
      col.fields.add(new DateField({ name: 'analysis_started_at' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    for (const name of ['analysis_status', 'analysis_error', 'analysis_started_at']) {
      const f = col.fields.getByName(name)
      if (f) col.fields.removeByName(name)
    }
    app.save(col)
  },
)
