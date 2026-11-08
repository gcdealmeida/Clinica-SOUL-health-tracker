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

      let fileKey = exam.getString('file')
      let storagePath = exam.baseFilesPath() + '/' + fileKey
      let fsys = app.newFilesystem()
      let fileObj = fsys.getFile(storagePath)

      let res = []
      try {
        // Testa se $ai existe
        res.push('has $ai: ' + (typeof $ai !== 'undefined'))
        if (typeof $ai !== 'undefined') {
          res.push('$ai keys: ' + Object.keys($ai).join(','))
        }
      } catch (e) {
        res.push('$ai err: ' + e.message)
      }

      exam.set('summary_results', res.join(' | '))
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
