//
// 0053 — Identificação do laudo + campos de revisão da importação.
//
// 1. exams: campos de IDENTIFICAÇÃO lidos do documento pelo agente
//    "Extrator de Exames SOUL" (seção 1 do prompt) — paciente, médico
//    solicitante e laboratório já tinham destino; data de nascimento, idade,
//    sexo, convênio, unidade e responsável técnico entram como text, para a
//    revisão mostrar a identificação completa como impressa no laudo.
// 2. profile_biomarkers: sinalizacao (H/L/ALTO/BAIXO/* impresso no laudo) e
//    anteriores (resultados anteriores impressos na mesma linha).
//
// Idempotente (guarda if (!fields.getByName(...))); usa o parâmetro `app` do
// callback up() — NUNCA $app top-level (lição da 0051).
//
migrate(
  (app) => {
    const exams = app.findCollectionByNameOrId('exams')
    const idents = [
      ['patient_birth_date', 40],
      ['patient_age', 40],
      ['patient_sex', 40],
      ['convenio', 200],
      ['requesting_doctor', 200],
      ['lab_unit', 200],
      ['tech_responsible', 200],
    ]
    for (let i = 0; i < idents.length; i++) {
      if (!exams.fields.getByName(idents[i][0])) {
        exams.fields.add(new TextField({ name: idents[i][0], max: idents[i][1] }))
      }
    }
    app.save(exams)

    const bio = app.findCollectionByNameOrId('profile_biomarkers')
    if (!bio.fields.getByName('sinalizacao')) {
      bio.fields.add(new TextField({ name: 'sinalizacao', max: 40 }))
    }
    if (!bio.fields.getByName('anteriores')) {
      bio.fields.add(new TextField({ name: 'anteriores', max: 500 }))
    }
    app.save(bio)
  },
  (app) => {
    const exams = app.findCollectionByNameOrId('exams')
    const names = [
      'patient_birth_date',
      'patient_age',
      'patient_sex',
      'convenio',
      'requesting_doctor',
      'lab_unit',
      'tech_responsible',
    ]
    for (let i = 0; i < names.length; i++) {
      const f = exams.fields.getByName(names[i])
      if (f) exams.fields.removeByName(names[i])
    }
    app.save(exams)

    const bio = app.findCollectionByNameOrId('profile_biomarkers')
    for (const n of ['sinalizacao', 'anteriores']) {
      if (bio.fields.getByName(n)) bio.fields.removeByName(n)
    }
    app.save(bio)
  },
)
