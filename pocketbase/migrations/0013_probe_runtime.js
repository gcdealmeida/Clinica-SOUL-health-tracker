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

      let info = []
      info.push('has $documents: ' + (typeof $documents !== 'undefined'))
      if (typeof $documents !== 'undefined') {
        info.push('keys of $documents: ' + Object.keys($documents).join(','))
      }
      info.push('has $app: ' + (typeof $app !== 'undefined'))
      info.push('has $http: ' + (typeof $http !== 'undefined'))
      info.push('has $os: ' + (typeof $os !== 'undefined'))
      info.push('has $filesystem: ' + (typeof $filesystem !== 'undefined'))

      exam.set('summary_results', info.join(' | '))
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
