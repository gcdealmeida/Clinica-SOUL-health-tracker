// 0036 — Contadores consolidados da análise assíncrona em exams.
// O polling do frontend lê `analysis_stats` (JSON) para montar o aviso
// "IA extraiu N marcadores: X novos, Y atualizados" quando a análise
// conclui em segundo plano. Campo novo — 0035 é imutável (já aplicada).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    if (!col.fields.getByName('analysis_stats')) {
      col.fields.add(new TextField({ name: 'analysis_stats' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_stats')
    if (f) col.fields.removeByName('analysis_stats')
    app.save(col)
  },
)
