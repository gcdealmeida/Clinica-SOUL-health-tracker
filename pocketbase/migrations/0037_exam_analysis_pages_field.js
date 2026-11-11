// 0037 — Fila das páginas renderizadas no cliente para a análise assíncrona.
// No kickoff (POST analyze-exam com analyze_async=1), o app envia as páginas
// JPEG renderizadas; o hook grava em exams.analysis_pages (JSON) e responde
// 202 na hora. O cron runner processa os lotes (MAX_PAGES=5 por requisição de
// IA) e consolida só no último, como no fluxo síncrono de partial_batch.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    if (!col.fields.getByName('analysis_pages')) {
      col.fields.add(new JSONField({ name: 'analysis_pages', maxSize: 41943040 }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_pages')
    if (f) col.fields.removeByName('analysis_pages')
    app.save(col)
  },
)
