//
// 0049 — Importação inteligente de arquivos com IA (rastreabilidade).
//
// Prepara o schema para o fluxo completo da área "Enviar Exame" (/sources):
// 1. exams: content_hash (dedupe por conteúdo), file_type, file_size e
//    supplementary_info (JSON) — "Informações complementares" do laudo
//    (conclusão, observações do laboratório, sem destino no app).
// 2. profile_biomarkers: campos de rastreabilidade — source_exam, source_page,
//    evidence (trecho do laudo), processing_date, validation_status
//    (approved | pending | uncertain | rejected), uncertainty_reason e
//    raw_content (valor original, sem normalizar).
// 3. Coleção exam_imports: log por ARQUIVO importado — status por etapa
//    (recebido/em leitura/em extração/aguardando revisão/salvo/erro), páginas,
//    contadores, resumo de duplicados e de cobertura (páginas não processadas).
//
// Todas as mudanças são idempotentes (guarda if (!fields.getByName(...))) —
// seguras em replay em banco vazio ou já migrado.
//
migrate(
  (app) => {
    // ---- 1. exams ----
    const exams = app.findCollectionByNameOrId('exams')
    if (!exams.fields.getByName('content_hash')) {
      exams.fields.add(new TextField({ name: 'content_hash', max: 128 }))
    }
    if (!exams.fields.getByName('file_type')) {
      exams.fields.add(new TextField({ name: 'file_type', max: 100 }))
    }
    if (!exams.fields.getByName('file_size')) {
      exams.fields.add(new NumberField({ name: 'file_size', onlyInt: true }))
    }
    if (!exams.fields.getByName('supplementary_info')) {
      exams.fields.add(new JSONField({ name: 'supplementary_info', maxSize: 2000000 }))
    }
    exams.addIndex('idx_exams_user_hash', false, 'user', 'content_hash')
    app.save(exams)

    // ---- 2. profile_biomarkers ----
    const bio = app.findCollectionByNameOrId('profile_biomarkers')
    if (!bio.fields.getByName('source_exam')) {
      bio.fields.add(
        new RelationField({
          name: 'source_exam',
          collectionId: app.findCollectionByNameOrId('exams').id,
          maxSelect: 1,
        }),
      )
    }
    if (!bio.fields.getByName('source_page')) {
      bio.fields.add(new TextField({ name: 'source_page', max: 100 }))
    }
    if (!bio.fields.getByName('evidence')) {
      bio.fields.add(new TextField({ name: 'evidence', max: 2000 }))
    }
    if (!bio.fields.getByName('processing_date')) {
      bio.fields.add(new TextField({ name: 'processing_date', max: 40 }))
    }
    if (!bio.fields.getByName('validation_status')) {
      bio.fields.add(
        new SelectField({
          name: 'validation_status',
          values: ['approved', 'pending', 'uncertain', 'rejected'],
          maxSelect: 1,
        }),
      )
    }
    if (!bio.fields.getByName('uncertainty_reason')) {
      bio.fields.add(new TextField({ name: 'uncertainty_reason', max: 500 }))
    }
    if (!bio.fields.getByName('raw_content')) {
      bio.fields.add(new TextField({ name: 'raw_content', max: 2000 }))
    }
    app.save(bio)

    // ---- 3. exam_imports (nova coleção) ----
    let hasImports = false
    try {
      app.findCollectionByNameOrId('exam_imports')
      hasImports = true
    } catch (_) {
      hasImports = false
    }
    if (!hasImports) {
      const examsId = app.findCollectionByNameOrId('exams').id
      const imports = new Collection({
        name: 'exam_imports',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
        viewRule:
          "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule:
          "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'exam', type: 'relation', collectionId: examsId, maxSelect: 1, minSelect: 1 },
          { name: 'filename', type: 'text', required: true, max: 300 },
          { name: 'file_type', type: 'text', max: 100 },
          { name: 'file_size', type: 'number', onlyInt: true },
          { name: 'content_hash', type: 'text', max: 128 },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['received', 'reading', 'extracting', 'awaiting_review', 'saved', 'error'],
            maxSelect: 1,
          },
          { name: 'error_message', type: 'text', max: 2000 },
          { name: 'pages_total', type: 'number', onlyInt: true },
          { name: 'pages_done', type: 'number', onlyInt: true },
          { name: 'items_extracted', type: 'number', onlyInt: true },
          { name: 'items_approved', type: 'number', onlyInt: true },
          { name: 'items_rejected', type: 'number', onlyInt: true },
          { name: 'duplicates_found', type: 'number', onlyInt: true },
          { name: 'coverage', type: 'json', maxSize: 500000 },
          { name: 'extracted_text', type: 'text', maxSize: 2000000 },
          {
            name: 'review_state',
            type: 'select',
            values: ['not_started', 'in_progress', 'approved'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_exam_imports_user ON exam_imports (user, created DESC)',
          'CREATE INDEX idx_exam_imports_exam ON exam_imports (exam)',
        ],
      })
      app.save(imports)
    }
  },
  (app) => {
    // down — remove só o que a up criou (a coleção, se existir; os campos ficam,
    // pois dados gravados neles podem ser valiosos para o usuário).
    try {
      const imports = app.findCollectionByNameOrId('exam_imports')
      app.delete(imports)
    } catch (_) {}
  },
)
