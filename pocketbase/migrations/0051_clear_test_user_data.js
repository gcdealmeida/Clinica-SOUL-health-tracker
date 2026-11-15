// 0051 — Limpeza única (cortesia) dos dados de teste do usuário 320xpj6xqc4x4qr,
// pedida pelo usuário ("deixar o painel em branco para testar com perfil de cliente").
//
// Apaga SOMENTE REGISTROS (linhas) das coleções de dados, via API de registros
// ($app.delete) — nunca coleções, campos, o usuário (auth) nem user_preferences.
// Reexecutar não muda nada (idempotente: em base limpa, o filtro não encontra
// linhas). Esta migration é a execução pontual da cortesia; a limpeza PERMANENTE
// fica no endpoint autenticado /backend/v1/data/clear-test-data (clear-test-data.js).
migrate(
  (app) => {
    const TARGET = '320xpj6xqc4x4qr'
    const COLLECTIONS = [
      'health_metrics',
      'medical_records',
      'emotional_logs',
      'diets',
      'meals',
      'ai_analyses',
      'medications',
      'profile_conditions',
      'profile_allergies',
      'profile_vaccinations',
      'profile_events',
      'profile_genetics',
      'profile_care_providers',
      'profile_lifestyle',
      'reminders',
      'exams',
      'profile_biomarkers',
      'exam_imports',
    ]

    let total = 0
    for (let i = 0; i < COLLECTIONS.length; i++) {
      const name = COLLECTIONS[i]
      let found = []
      try {
        found = $app.findRecordsByFilter(name, 'user = {:u}', '-created', 0, 0, { u: TARGET })
      } catch (err) {
        console.log('0051: coleção ' + name + ' indisponível (' + err.message + ') — segue')
        continue
      }
      if (!found || found.length === 0) continue
      let errors = 0
      for (let j = 0; j < found.length; j++) {
        try {
          $app.delete(found[j])
          total++
        } catch (delErr) {
          errors++
          console.log('0051: falha ao apagar ' + name + '/' + found[j].id + ': ' + delErr.message)
        }
      }
      console.log('0051: ' + name + ' — ' + (found.length - errors) + ' registro(s) apagado(s)')
    }
    console.log('0051: limpeza do usuário ' + TARGET + ' concluída — ' + total + ' registro(s)')
  },
  (app) => {
    // down: sem volta determinística (os dados apagados não são restauráveis).
  },
)
