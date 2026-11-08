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

      let keys = []
      // Verifica o objeto global 'this'
      try {
        for (let k in this) {
          keys.push(k)
        }
      } catch (_) {}

      // Tenta fazer download do arquivo do exame via $http.send({ url: ... })
      // Como a URL do arquivo no PocketBase é /api/files/exams/:id/:file
      let fileUrl =
        'http://127.0.0.1:8090/api/files/exams/i60341rul7xdu1s/' + exam.getString('file')
      let httpRes = null
      let httpError = ''
      try {
        httpRes = $http.send({
          url: fileUrl,
          method: 'GET',
        })
      } catch (e) {
        httpError = e.message
      }

      let info = 'keys: ' + keys.slice(0, 30).join(',')
      if (httpRes) {
        info +=
          ' | httpStatus: ' +
          httpRes.statusCode +
          ' | bodyLen: ' +
          (httpRes.raw ? httpRes.raw.length : httpRes.body ? httpRes.body.length : 0)
      } else {
        info += ' | httpErr: ' + httpError
      }

      exam.set('summary_results', info.slice(0, 500))
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
