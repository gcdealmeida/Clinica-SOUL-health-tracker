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

      let secKeys = []
      for (let k in $security) {
        if (
          k.toLowerCase().includes('base64') ||
          k.toLowerCase().includes('encode') ||
          k.toLowerCase().includes('decode') ||
          k.toLowerCase().includes('file')
        ) {
          secKeys.push(k)
        }
      }

      exam.set('summary_results', '$security matched: ' + secKeys.join(','))
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
