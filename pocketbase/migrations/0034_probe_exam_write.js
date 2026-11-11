// Probe: prova que o caminho de escrita em exams voltou a funcionar após a
// recriação da coleção (0032). Cria um registro de teste pelos mesmos campos
// que o app envia em Sources → "Upload Files / Downloads Exames" e o apaga em
// seguida — não deixa dados para trás. Idempotente em replay (create+delete).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('exams')
    let userId = ''
    try {
      userId = app.findAuthRecordByEmail('_pb_users_auth_', 'guivemax@hotmail.com').id
    } catch (_) {
      const clients = app.findRecordsByFilter('users', "role = 'cliente'", '-created', 1, 0)
      if (clients.length > 0) userId = clients[0].id
    }
    if (!userId) {
      console.log('0034_probe_exam_write: sem usuário para o probe — pulando')
      return
    }
    const rec = new Record(col)
    rec.set('user', userId)
    rec.set('title', 'Probe — teste de escrita (apagado automaticamente)')
    rec.set('type', 'Exame de Sangue')
    rec.set('date', '2026-11-11')
    rec.set('status', 'pendente')
    app.save(rec)
    console.log('0034_probe_exam_write: criação em exams OK (id ' + rec.id + ')')
    app.delete(rec)
    console.log('0034_probe_exam_write: registro de teste apagado — escrita em exams OK')
  },
  (app) => {
    try {
      const probes = app.findRecordsByFilter(
        'exams',
        "title ~ 'Probe — teste de escrita'",
        '',
        10,
        0,
      )
      for (let i = 0; i < probes.length; i++) app.delete(probes[i])
    } catch (_) {}
  },
)
