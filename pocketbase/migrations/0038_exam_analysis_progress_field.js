// 0038 — Progresso persistido do runner assíncrono em exams.
// O cron runner guarda {pages_done, attempts, summaries, biomarkers} entre
// execuções (um lote de até MAX_PAGES=5 páginas por tick); sem este campo
// cada queda reiniciaria a análise do zero.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    if (!col.fields.getByName('analysis_progress')) {
      col.fields.add(new TextField({ name: 'analysis_progress' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_progress')
    if (f) col.fields.removeByName('analysis_progress')
    app.save(col)
  },
)
