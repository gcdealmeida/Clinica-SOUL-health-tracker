// 0044 — Desbloqueio (de fato) dos exames presos em error pela falha do
// limite de 5000 chars no analysis_progress.
//
// 0042/0043 usavam o global $app (inexistente no pool de VM das migrations —
// nelas só o argumento `app` do callback existe) e a busca falhava no catch
// silencioso. Aqui TUDO usa o `app` do callback. A assinatura "5000" é
// conferida em JS. Idempotente: só mexe em registros com
// analysis_status='error' E analysis_error contendo "5000" (erro legado deste
// bug); falhas de rede/watchdog e a fila vazia do exame antigo ficam
// intocadas. Nunca apaga registros ou coleções.
migrate(
  (app) => {
    let rows = []
    try {
      rows = app.findRecordsByFilter('exams', "analysis_status = 'error'", '-updated', 200, 0)
    } catch (err) {
      console.log('0044: erro ao buscar exames em error: ' + err.message)
      return
    }
    for (let i = 0; i < rows.length; i++) {
      const exam = rows[i]
      const errMsg = exam.getString('analysis_error') || ''
      if (errMsg.indexOf('5000') === -1) continue
      try {
        exam.set('analysis_status', '')
        exam.set('analysis_error', '')
        exam.set('analysis_pages', '')
        exam.set('analysis_progress', '')
        exam.set('analysis_stats', '')
        app.save(exam)
        console.log('0044: exame ' + exam.id + ' desbloqueado (reanálise liberada)')
      } catch (err) {
        console.log('0044: falha ao desbloquear exame ' + exam.id + ': ' + err.message)
      }
    }
  },
  (app) => {
    // down: sem volta determinística (restauraria o erro do bug) — sem efeito.
  },
)
