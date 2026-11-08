migrate(
  (app) => {
    // 0012: teste / extração direta
    try {
      const exam = app.findRecordById('exams', 'i60341rul7xdu1s')
      if (!exam) return

      let md = ''
      if (typeof $documents !== 'undefined' && $documents.toMarkdown) {
        const doc = $documents.toMarkdown({
          collection: 'exams',
          record: 'i60341rul7xdu1s',
          file: exam.getString('file'),
        })
        if (doc && doc.markdown) {
          md = doc.markdown
        }
      }

      // Gravamos temporariamente no exam.summary_results para inspecionar com db_query!
      if (md) {
        exam.set('summary_results', 'DOC_READ_OK: ' + md.slice(0, 500))
        app.save(exam)
      } else {
        exam.set('summary_results', 'DOC_READ_FAILED: md empty or $documents undefined')
        app.save(exam)
      }
    } catch (err) {
      try {
        const exam = app.findRecordById('exams', 'i60341rul7xdu1s')
        if (exam) {
          exam.set('summary_results', 'DOC_READ_ERR: ' + err.message)
          app.save(exam)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
