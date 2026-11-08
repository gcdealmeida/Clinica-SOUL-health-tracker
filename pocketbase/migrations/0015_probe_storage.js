migrate(
  (app) => {
    try {
      let exam = null
      try {
        exam = app.findRecordById('exams', 'i60341rul7xdu1s')
      } catch (_) {
        return
      }
      if (!exam) return

      let result = ''
      let fileKey = exam.getString('file')

      // No app do PocketBase (Go), como acessar o arquivo do record?
      // 1. app.createFileRef(record, fileKey) ou similar?
      // 2. Ou ler via $os.readFile? Qual diretório de storage?
      let dirFiles = []
      try {
        dirFiles = $os.readDir('./pb_data/storage')
      } catch (e1) {
        try {
          dirFiles = $os.readDir('./')
        } catch (e2) {
          dirFiles = [e1.message, e2.message]
        }
      }

      exam.set('summary_results', 'storage dir: ' + JSON.stringify(dirFiles))
      app.save(exam)
    } catch (err) {
      try {
        const exam = app.findRecordById('exams', 'i60341rul7xdu1s')
        if (exam) {
          exam.set('summary_results', 'ERR: ' + err.message)
          app.save(exam)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
