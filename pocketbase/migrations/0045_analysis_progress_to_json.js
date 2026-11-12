// 0045 — Converte analysis_progress de text (limite 5000 chars) para json.
//
// Sintoma do bug: com laudos de 16 páginas, o JSON do progresso
// {total_pages, pages_done, attempts, summaries, biomarkers, ai_meta} passava
// de 5000 caracteres e o PocketBase RECUSAVA o save — "analysis_progress: Must
// be no more than 5000 character(s)". A fila travava, o cron runner via fila
// vazia e o watchdog do cliente marcava "análise excedeu o tempo máximo".
//
// A 0041 já deveria ter feito isto, mas foi editada DEPOIS de registrada como
// aplicada (o runner de migrations não re-executa versão já aplicada). Esta
// versão nova garante a conversão. Idempotente: só mexe se ainda for text.
// O hook continua gravando JSON.stringify(...) — o campo json aceita string
// serializada e o cliente examStatus.ts lê os dois formatos (string ou objeto).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_progress')
    if (!f) {
      col.fields.add(new JSONField({ name: 'analysis_progress', maxSize: 4194304 }))
      app.save(col)
      console.log('0045: analysis_progress criado como json')
      return
    }
    if (f.type !== 'json') {
      col.fields.removeByName('analysis_progress')
      col.fields.add(new JSONField({ name: 'analysis_progress', maxSize: 4194304 }))
      app.save(col)
      console.log('0045: analysis_progress convertido de ' + f.type + ' para json')
    }
  },
  (app) => {
    // down: volta a text SEM limite de chars conhecido (comportamento anterior).
    const col = app.findCollectionByNameOrId('exams')
    const f = col.fields.getByName('analysis_progress')
    if (f && f.type === 'json') {
      col.fields.removeByName('analysis_progress')
      col.fields.add(new TextField({ name: 'analysis_progress' }))
      app.save(col)
    }
  },
)
