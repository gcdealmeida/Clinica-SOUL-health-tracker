// 0050 — Desbloqueio dos exames presos pelo bug do summary_results (>5000).
//
// Sintoma (v0.0.73, laudo de 16 páginas): o runner conclui TODOS os lotes de
// IA (progresso 15/16) mas o SAVE FINAL falha — summary_results é text (limite
// 5000) e o resumo consolidado de um laudo longo (~10k chars) não cabe:
// "summary_results: Must be no more than 5000 character(s)". O failExam da era
// também falhava (o record em memória carregava o summary_results inválido), o
// exame ficava preso em 'running' reprocessando o último lote a cada minuto e
// o watchdog do cliente marcava "A análise excedeu o tempo máximo".
//
// Aqui: desbloqueia exames marcados com as mensagens deste bug (pelo watchdog
// do cliente OU pelo failExam que conseguiu salvar), limpando os campos de
// análise para liberar o "Reanalisar com IA". Idempotente: só mexe em
// registros cujo analysis_error contém as assinaturas do bug; nunca apaga
// registros ou coleções. Tudo usa o `app` do callback (lição das 0042/0043).
migrate(
  (app) => {
    let rows = []
    try {
      rows = app.findRecordsByFilter('exams', "analysis_status = 'error'", '-updated', 200, 0)
    } catch (err) {
      console.log('0050: erro ao buscar exames em error: ' + err.message)
      return
    }
    const signatures = [
      'excedeu o tempo máximo',
      'demorou mais que o esperado',
      'Falha ao consolidar a análise',
      '5000 character',
    ]
    for (let i = 0; i < rows.length; i++) {
      const exam = rows[i]
      const errMsg = exam.getString('analysis_error') || ''
      let matches = false
      for (let s = 0; s < signatures.length; s++) {
        if (errMsg.indexOf(signatures[s]) !== -1) {
          matches = true
          break
        }
      }
      if (!matches) continue
      try {
        exam.set('analysis_status', '')
        exam.set('analysis_error', '')
        exam.set('analysis_pages', '')
        exam.set('analysis_progress', '')
        exam.set('analysis_stats', '')
        app.save(exam)
        console.log('0050: exame ' + exam.id + ' desbloqueado (reanálise liberada)')
      } catch (err) {
        console.log('0050: falha ao desbloquear exame ' + exam.id + ': ' + err.message)
      }
    }
  },
  (app) => {
    // down: sem volta determinística (restauraria o erro do bug) — sem efeito.
  },
)
