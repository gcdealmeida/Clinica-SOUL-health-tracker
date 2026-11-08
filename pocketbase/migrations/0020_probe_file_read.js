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

      let size = fileObj.size()
      // Como ler os bytes em JS?
      // Em Goja / PocketBase JSVM, fileObj tem read ou podemos usar io.ReadAll se existir
      // Vamos testar como ler
      let readInfo = ''
      try {
        // Testa se fileObj tem métodos de leitura ou se bytes são retornados
        let buf = new ArrayBuffer(Math.min(size, 500000))
        // ou $os / $security / etc
        readInfo = 'size: ' + size
      } catch (e) {
        readInfo = 'read err: ' + e.message
      }

      exam.set('summary_results', 'fileObj size: ' + size + ' info: ' + readInfo)
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
