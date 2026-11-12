// Recria a coleção profile_biomarkers, apagada novamente (404 "Missing
// collection context" nos logs de request de 2026-11-12 e ausente no schema
// vivo). Estrutura, regras e índices idênticos aos da 0033 (que copiou a
// 0031/0010). Idempotente: se a coleção já existe, não faz nada.
migrate(
  (app) => {
    if (app.hasTable('profile_biomarkers')) {
      console.log('0040_recreate_profile_biomarkers: coleção já existe — nada a fazer')
      return
    }

    const userRule =
      "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')"
    const userOwnerRule = "@request.auth.id != '' && user = @request.auth.id"

    const biomarkers = new Collection({
      name: 'profile_biomarkers',
      type: 'base',
      listRule: userRule,
      viewRule: userRule,
      createRule: "@request.auth.id != ''",
      updateRule: userOwnerRule,
      deleteRule: userRule,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'value', type: 'text', required: true },
        { name: 'unit', type: 'text', required: false },
        { name: 'reference_range', type: 'text', required: false },
        { name: 'category', type: 'text', required: false }, // Lipidograma, Inflamatório, Hormonal, etc.
        { name: 'status', type: 'text', required: false }, // normal, alterado, otimo
        { name: 'date', type: 'text', required: false },
        { name: 'notes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_biomarkers_user ON profile_biomarkers (user, date DESC)'],
    })
    app.save(biomarkers)
    console.log('0040_recreate_profile_biomarkers: coleção recriada')

    // Restaura os seeds de demonstração perdidos junto com a coleção
    // (mesma regra da 0033: só popula se o cliente não tiver nenhum).
    let clientUser
    try {
      clientUser = app.findAuthRecordByEmail('_pb_users_auth_', 'guivemax@hotmail.com')
    } catch (_) {
      try {
        const clients = app.findRecordsByFilter('users', "role = 'cliente'", '-created', 1, 0)
        if (clients.length > 0) clientUser = clients[0]
      } catch (_) {}
    }
    if (!clientUser) return

    let hasBio = false
    try {
      hasBio =
        app.findRecordsByFilter('profile_biomarkers', `user = '${clientUser.id}'`, '', 1, 0)
          .length > 0
    } catch (_) {}
    if (hasBio) return

    const bioCol = app.findCollectionByNameOrId('profile_biomarkers')
    const samples = [
      {
        name: 'Colesterol Total',
        val: '172',
        unit: 'mg/dL',
        ref: '< 190 mg/dL',
        cat: 'Lipidograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Colesterol HDL',
        val: '58',
        unit: 'mg/dL',
        ref: '> 40 mg/dL',
        cat: 'Lipidograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Colesterol LDL',
        val: '94',
        unit: 'mg/dL',
        ref: '< 100 mg/dL (ótimo)',
        cat: 'Lipidograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Triglicerídeos',
        val: '138',
        unit: 'mg/dL',
        ref: '< 150 mg/dL',
        cat: 'Lipidograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Glicose em Jejum',
        val: '96',
        unit: 'mg/dL',
        ref: '70 a 99 mg/dL',
        cat: 'Metabolismo',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Hemoglobina',
        val: '15.1',
        unit: 'g/dL',
        ref: '13.0 a 17.5 g/dL',
        cat: 'Hemograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Hematócrito',
        val: '44',
        unit: '%',
        ref: '40 a 50 %',
        cat: 'Hemograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Leucócitos',
        val: '6.800',
        unit: '/µL',
        ref: '4.500 a 11.000 /µL',
        cat: 'Hemograma',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'Creatinina',
        val: '0.95',
        unit: 'mg/dL',
        ref: '0.70 a 1.30 mg/dL',
        cat: 'Função Renal',
        st: 'otimo',
        dt: '2026-01-15',
      },
      {
        name: 'TSH',
        val: '2.10',
        unit: 'µUI/mL',
        ref: '0.40 a 4.00 µUI/mL',
        cat: 'Hormonal',
        st: 'otimo',
        dt: '2026-01-15',
      },
    ]
    for (const s of samples) {
      const rec = new Record(bioCol)
      rec.set('user', clientUser.id)
      rec.set('name', s.name)
      rec.set('value', s.val)
      rec.set('unit', s.unit)
      rec.set('reference_range', s.ref)
      rec.set('category', s.cat)
      rec.set('status', s.st)
      rec.set('date', s.dt)
      rec.set('notes', 'Seed de demonstração (0040)')
      app.save(rec)
    }
    console.log('0040_recreate_profile_biomarkers: seeds de demonstração restaurados')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('profile_biomarkers'))
    } catch (_) {}
  },
)
