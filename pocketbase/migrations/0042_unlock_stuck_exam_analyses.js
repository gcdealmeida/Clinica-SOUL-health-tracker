// 0042 — Desbloqueio idempotente dos exames presos em error pela falha do
// limite de 5000 chars no analysis_progress (bug corrigido na 0041).
//
// O erro legado tem assinatura única ("Must be no more than 5000
// character(s)") — só registros marcados com ELE são reabertos (campos de
// análise limpos). Erros de rede/watchdog ("A conexão falhou...", "fila
// vazia", "tempo máximo") NÃO casam com o filtro e ficam intocados. Nunca
// apaga registros ou coleções; reexecutar não muda nada (idempotente).
migrate(
  (app) => {
    const LEGACY_ERR = '5000'
    let records = []
    try {
      records = $app.findRecordsByFilter(
        'exams',
        "analysis_status = 'error' && analysis_error ~ {:sig}",
        '-updated',
        200,
        0,
        { sig: LEGACY_ERR },
      )
    } catch (err) {
      console.log('0042: erro ao buscar exames presos: ' + err.message)
      return
    }
    for (let i = 0; i < records.length; i++) {
      const exam = records[i]
      try {
        exam.set('analysis_status', '')
        exam.set('analysis_error', '')
        exam.set('analysis_pages', '')
        exam.set('analysis_progress', '')
        exam.set('analysis_stats', '')
        exam.set('analysis_started_at', '')
        $app.save(exam)
        console.log('0042: exame ' + exam.id + ' desbloqueado (reanálise liberada)')
      } catch (err) {
        console.log('0042: falha ao desbloquear exame ' + exam.id + ': ' + err.message)
      }
    }
  },
  (app) => {
    // down: sem volta determinística (não há como restaurar a mensagem de erro
    // antiga sem recriar o bug) — operação deliberadamente sem efeito.
  },
)
