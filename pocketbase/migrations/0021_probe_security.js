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
      // Verifica $security
      if (typeof $security !== 'undefined') {
        res.push('$security keys: ' + Object.keys($security).join(','))
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
