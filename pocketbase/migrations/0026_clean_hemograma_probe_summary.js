migrate(
  (app) => {
    try {
      const exam = app.findRecordById('exams', 'i60341rul7xdu1s')
      if (exam) {
        exam.set('summary_results', '')
        app.save(exam)
      }
    } catch (_) {}
  },
  (app) => {},
)
