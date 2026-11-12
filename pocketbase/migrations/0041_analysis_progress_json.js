// 0041 — Correção do limite de 5000 chars no campo analysis_progress (text).
//
// Sintoma: com laudos de 16 páginas o JSON do progresso
// {total_pages, pages_done, attempts, summaries, biomarkers, ai_meta}
// passava de 5000 caracteres e o PocketBase RECUSAVA o PATCH — o hook via
// "Falha ao salvar o progresso da análise: analysis_progress: Must be no more
// than 5000 character(s)..", a fila nunca avançava, o cron runner tratava como
// fila vazia e o watchdog do cliente marcava "análise excedeu o tempo máximo".
//
// Correção: o campo vira json (maxSize 4MB) — mesmo tipo de analysis_pages.
// O hook continuará gravando strings JSON (JSON.stringify); agora o JSON
// grande também cabe, sem depender de truncamento. Idempotente: só mexe
// quando o campo ainda é text.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_progress')
    if (f && f.type === 'text') {
      col.fields.removeByName('analysis_progress')
      col.fields.add(new JSONField({ name: 'analysis_progress', maxSize: 4194304 }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_progress')
    if (f && f.type === 'json') {
      col.fields.removeByName('analysis_progress')
      col.fields.add(new TextField({ name: 'analysis_progress' }))
      app.save(col)
    }
  },
)
