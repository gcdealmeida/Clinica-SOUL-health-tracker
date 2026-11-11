migrate(
  (app) => {
    // Recria a coleção profile_biomarkers, apagada do backend por engano
    // (migration manual "deleted_profile_biomarkers"), com a MESMA estrutura
    // e regras da migration 0010_profile_collections.js.
    if (!app.hasTable('profile_biomarkers')) {
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
    }

    // Restaura os seeds de demonstração perdidos junto com a coleção
    // (mesmos valores da 0010). Idempotente: só popula se o cliente não
    // tiver nenhum biomarcador cadastrado.
    try {
      let clientUser
      try {
        clientUser = app.findAuthRecordByEmail('_pb_users_auth_', 'guivemax@hotmail.com')
      } catch (_) {
        const clients = app.findRecordsByFilter('users', "role = 'cliente'", '-created', 1, 0)
        if (clients.length > 0) clientUser = clients[0]
      }
      if (!clientUser) return

      const existingBio = app.findRecordsByFilter(
        'profile_biomarkers',
        `user = '${clientUser.id}'`,
        '',
        1,
        0,
      )
      if (existingBio.length > 0) return

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
          val: '98',
          unit: 'mg/dL',
          ref: '< 150 mg/dL',
          cat: 'Lipidograma',
          st: 'otimo',
          dt: '2026-01-15',
        },
        {
          name: 'Glicemia de Jejum',
          val: '88',
          unit: 'mg/dL',
          ref: '70 - 99 mg/dL',
          cat: 'Metabólico',
          st: 'otimo',
          dt: '2026-01-15',
        },
        {
          name: 'Hemoglobina Glicada (HbA1c)',
          val: '5.2',
          unit: '%',
          ref: '< 5.7%',
          cat: 'Metabólico',
          st: 'otimo',
          dt: '2026-01-15',
        },
        {
          name: 'Proteína C-Reativa ultrassensível (PCR-us)',
          val: '0.4',
          unit: 'mg/L',
          ref: '< 1.0 mg/L',
          cat: 'Inflamatório',
          st: 'otimo',
          dt: '2026-01-15',
        },
        {
          name: 'Vitamina D (25-OH)',
          val: '48',
          unit: 'ng/mL',
          ref: '30 - 60 ng/mL',
          cat: 'Vitaminas',
          st: 'otimo',
          dt: '2026-01-15',
        },
        {
          name: 'TSH Ultra-Sensível',
          val: '1.8',
          unit: 'mUI/L',
          ref: '0.4 - 4.0 mUI/L',
          cat: 'Hormonal',
          st: 'otimo',
          dt: '2026-01-15',
        },
      ]
      for (const s of samples) {
        const b = new Record(bioCol)
        b.set('user', clientUser.id)
        b.set('name', s.name)
        b.set('value', s.val)
        b.set('unit', s.unit)
        b.set('reference_range', s.ref)
        b.set('category', s.cat)
        b.set('status', s.st)
        b.set('date', s.dt)
        app.save(b)
      }
    } catch (e) {
      console.log('Aviso ao restaurar seeds de profile_biomarkers: ' + e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('profile_biomarkers')
      app.delete(col)
    } catch (_) {}
  },
)
