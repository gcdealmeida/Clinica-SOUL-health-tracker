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

      let methods = []
      for (let k in app) {
        if (
          k.toLowerCase().includes('file') ||
          k.toLowerCase().includes('blob') ||
          k.toLowerCase().includes('fs')
        ) {
          methods.push(k)
        }
      }

      exam.set('summary_results', 'file methods: ' + methods.join(','))
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
