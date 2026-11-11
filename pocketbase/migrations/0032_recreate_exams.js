// Recria a coleção `exams`, apagada por engano (migration manual "deleted_exams"
// aplicada no painel sem verificar dependências). Sem ela, o upload de exames em
// Sources → "Upload Files / Downloads Exames" e em Exames & Dietas falha com 404
// ("resource wasn't found") antes mesmo da análise de IA, e o hook analyze-exam
// não consegue gravar o resumo do laudo.
// Schema idêntico ao da migration 0002 (nunca alterar a funcionalidade) e
// idempotente: pula se a coleção já existir.
migrate(
  (app) => {
    try {
      app.findCollectionByNameOrId('exams')
      console.log('0032_recreate_exams: coleção exams já existe — nada a fazer')
      return
    } catch (_) {
      // não existe: recria
    }

    const exams = new Collection({
      name: 'exams',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      viewRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      createRule: "@request.auth.id != ''",
      updateRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      deleteRule:
        "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'type', type: 'text', required: true },
        { name: 'date', type: 'text', required: true },
        { name: 'laboratory', type: 'text', required: false },
        { name: 'summary_results', type: 'text', required: false },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 20971520 },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['normal', 'alterado', 'pendente'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_exams_user_date ON exams (user, date DESC)'],
    })
    app.save(exams)
    console.log('0032_recreate_exams: coleção exams recriada')
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('exams')
      app.delete(col)
    } catch (_) {}
  },
)
