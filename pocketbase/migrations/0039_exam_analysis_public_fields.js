// 0039 — Exposição dos campos de análise assíncrona (0035–0038) via API.
//
// Os campos analysis_* foram criados como hidden=true (só superusuário via
// painel). O app (frontend) precisa LER o status/progresso para acompanhar o
// processamento em segundo plano (polling em /sources) — esta migration os
// torna visíveis (hidden=false). Nenhum campo permite escrita direta pelo app:
// o updateRule da coleção exams continua restringindo ao dono, e a escrita dos
// analysis_* só acontece no hook assíncrono (pocketbase/hooks/ai_features_exam_async.js).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const names = [
      'analysis_status',
      'analysis_error',
      'analysis_started_at',
      'analysis_stats',
      'analysis_pages',
      'analysis_progress',
    ]
    let changed = 0
    for (let i = 0; i < names.length; i++) {
      const f = col.fields.getByName(names[i])
      if (!f) continue
      f.hidden = false
      changed++
    }
    app.save(col)
    console.log('0039: campos analysis_* de exams agora visíveis na API (' + changed + ')')
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const names = [
      'analysis_status',
      'analysis_error',
      'analysis_started_at',
      'analysis_stats',
      'analysis_pages',
      'analysis_progress',
    ]
    for (let i = 0; i < names.length; i++) {
      const f = col.fields.getByName(names[i])
      if (!f) continue
      f.hidden = true
    }
    app.save(col)
  },
)
