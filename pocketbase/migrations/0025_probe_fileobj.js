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
        // fileObj methods: close, contentType, modTime, read, seek, size, writeTo
        // Test if writeTo works with another object, or if read returns bytes
        res.push('read type: ' + typeof fileObj.read)
        res.push('writeTo type: ' + typeof fileObj.writeTo)
        res.push('contentType: ' + fileObj.contentType())
      } catch (e) {
        res.push('read err: ' + e.message)
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
