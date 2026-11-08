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
      // PocketBase file path in storage: collectionId + '/' + recordId + '/' + fileKey
      // or record.baseFilesPath()
      let storagePath = ''
      try {
        storagePath = exam.baseFilesPath() + '/' + fileKey
      } catch (e) {
        storagePath = 'pbc_2725752259/' + exam.id + '/' + fileKey
      }

      let fsys = app.newFilesystem()
      let exists = fsys.exists(storagePath)
      let fileObj = null
      let fileErr = ''
      try {
        fileObj = fsys.getFile(storagePath)
      } catch (e) {
        fileErr = e.message
      }

      let fileKeys = []
      if (fileObj) {
        for (let k in fileObj) {
          fileKeys.push(k)
        }
      }

      exam.set(
        'summary_results',
        'storagePath: ' +
          storagePath +
          ' exists: ' +
          exists +
          ' fileKeys: ' +
          fileKeys.join(',') +
          ' err: ' +
          fileErr,
      )
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
