migrate(
  (app) => {
    try {
      const exam = app.findRecordById('exams', 'i60341rul7xdu1s')
      if (!exam) return

      const normalizeKey = (str) => {
        if (!str || typeof str !== 'string') return ''
        return str
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      const summaryText =
        'SÉRIE VERMELHA (ERITROGRAMA):\n' +
        '• Hemácias: 4.85 milhões/µL (Normal: 4.30 - 5.80)\n' +
        '• Hemoglobina: 15.2 g/dL (Normal: 13.5 - 17.5)\n' +
        '• Hematócrito: 44.8 % (Normal: 40.0 - 52.0)\n' +
        '• VCM: 92.4 fL (Normal: 80.0 - 100.0)\n' +
        '• HCM: 31.3 pg (Normal: 27.0 - 33.0)\n' +
        '• CHCM: 33.9 g/dL (Normal: 31.5 - 36.0)\n' +
        '• RDW: 12.8 % (Normal: 11.5 - 14.5)\n\n' +
        'SÉRIE BRANCA (LEUCOGRAMA):\n' +
        '• Leucócitos Totais: 6.250 /µL (Normal: 4.000 - 11.000)\n' +
        '• Neutrófilos: 3.680 /µL (58.9% - Normal: 1.800 - 7.700)\n' +
        '• Linfócitos: 1.950 /µL (31.2% - Normal: 1.000 - 4.800)\n' +
        '• Monócitos: 430 /µL (6.9% - Normal: 200 - 1.000)\n' +
        '• Eosinófilos: 150 /µL (2.4% - Normal: 20 - 500)\n' +
        '• Basófilos: 40 /µL (0.6% - Normal: 0 - 200)\n\n' +
        'PLAQUETAS:\n' +
        '• Contagem de Plaquetas: 245.000 /µL (Normal: 150.000 - 450.000)\n' +
        '• VPM: 9.8 fL (Normal: 7.0 - 11.5)\n\n' +
        'Conclusão: Parâmetros hematimétricos e leucocitários dentro dos limites de referência fisiológica.'

      exam.set('summary_results', summaryText)
      exam.set('laboratory', 'Laboratório Fleury / Clínica Soul')
      exam.set('status', 'normal')
      app.save(exam)

      const userId = exam.getString('user') || '320xpj6xqc4x4qr'
      const biomarkersCol = app.findCollectionByNameOrId('profile_biomarkers')

      const hemogramaBiomarkers = [
        {
          name: 'Hemácias (Eritrócitos)',
          value: '4.85',
          unit: 'milhões/µL',
          reference_range: '4.30 - 5.80 milhões/µL',
          status: 'otimo',
        },
        {
          name: 'Hemoglobina',
          value: '15.2',
          unit: 'g/dL',
          reference_range: '13.5 - 17.5 g/dL',
          status: 'otimo',
        },
        {
          name: 'Hematócrito',
          value: '44.8',
          unit: '%',
          reference_range: '40.0 - 52.0 %',
          status: 'otimo',
        },
        {
          name: 'Volume Corpuscular Médio (VCM)',
          value: '92.4',
          unit: 'fL',
          reference_range: '80.0 - 100.0 fL',
          status: 'otimo',
        },
        {
          name: 'Hemoglobina Corpuscular Média (HCM)',
          value: '31.3',
          unit: 'pg',
          reference_range: '27.0 - 33.0 pg',
          status: 'otimo',
        },
        {
          name: 'Concentração de Hemoglobina Corpuscular Média (CHCM)',
          value: '33.9',
          unit: 'g/dL',
          reference_range: '31.5 - 36.0 g/dL',
          status: 'otimo',
        },
        {
          name: 'RDW (Variação do Tamanho das Hemácias)',
          value: '12.8',
          unit: '%',
          reference_range: '11.5 - 14.5 %',
          status: 'otimo',
        },
        {
          name: 'Leucócitos Totais',
          value: '6250',
          unit: '/µL',
          reference_range: '4000 - 11000 /µL',
          status: 'otimo',
        },
        {
          name: 'Neutrófilos',
          value: '3680',
          unit: '/µL',
          reference_range: '1800 - 7700 /µL',
          status: 'otimo',
        },
        {
          name: 'Linfócitos',
          value: '1950',
          unit: '/µL',
          reference_range: '1000 - 4800 /µL',
          status: 'otimo',
        },
        {
          name: 'Monócitos',
          value: '430',
          unit: '/µL',
          reference_range: '200 - 1000 /µL',
          status: 'otimo',
        },
        {
          name: 'Eosinófilos',
          value: '150',
          unit: '/µL',
          reference_range: '20 - 500 /µL',
          status: 'otimo',
        },
        {
          name: 'Basófilos',
          value: '40',
          unit: '/µL',
          reference_range: '0 - 200 /µL',
          status: 'otimo',
        },
        {
          name: 'Plaquetas',
          value: '245000',
          unit: '/µL',
          reference_range: '150000 - 450000 /µL',
          status: 'otimo',
        },
        {
          name: 'Volume Plaquetário Médio (VPM)',
          value: '9.8',
          unit: 'fL',
          reference_range: '7.0 - 11.5 fL',
          status: 'otimo',
        },
      ]

      let existing = []
      try {
        existing = app.findRecordsByFilter(
          'profile_biomarkers',
          'user = {:user}',
          '-created',
          500,
          0,
          { user: userId },
        )
      } catch (_) {}

      const existMap = new Map()
      for (let i = 0; i < existing.length; i++) {
        const r = existing[i]
        existMap.set(normalizeKey(r.getString('name')), r)
      }

      for (let j = 0; j < hemogramaBiomarkers.length; j++) {
        const b = hemogramaBiomarkers[j]
        const k = normalizeKey(b.name)
        const rec = existMap.get(k)
        if (rec) {
          rec.set('value', b.value)
          rec.set('unit', b.unit)
          rec.set('reference_range', b.reference_range)
          rec.set('status', b.status)
          rec.set('category', 'Hematologia')
          rec.set('date', '2026-11-07')
          rec.set('notes', 'Atualizado automaticamente a partir do Hemograma')
          app.save(rec)
        } else {
          const newRec = new Record(biomarkersCol)
          newRec.set('user', userId)
          newRec.set('name', b.name)
          newRec.set('value', b.value)
          newRec.set('unit', b.unit)
          newRec.set('reference_range', b.reference_range)
          newRec.set('status', b.status)
          newRec.set('category', 'Hematologia')
          newRec.set('date', '2026-11-07')
          newRec.set('notes', 'Extraído automaticamente do Hemograma')
          app.save(newRec)
          existMap.set(k, newRec)
        }
      }
    } catch (e) {
      console.log('0027_sync_hemograma_results err: ' + e.message)
    }
  },
  (app) => {},
)
