// 0052 — Execução efetiva da limpeza única (cortesia) dos dados de teste do
// usuário 320xpj6xqc4x4qr, pedida pelo usuário ("deixar o painel em branco
// para testar com perfil de cliente").
//
// A 0051 rodou antes do bug do parâmetro `app` ser corrigido — esta versão
// usa o `app` recebido no callback (padrão das migrations 0002/0027) e loga
// cada passo. Apaga SOMENTE REGISTROS (linhas) das coleções de dados, via API
// de registros — nunca coleções, campos, o usuário (auth) nem user_preferences.
// Idempotente: em base limpa, o filtro não encontra linhas e nada acontece.
// A limpeza PERMANENTE fica no endpoint autenticado
// /backend/v1/data/clear-test-data (pocketbase/hooks/clear-test-data.js).
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
        found = app.findRecordsByFilter(name, 'user = {:u}', '-created', 0, 0, { u: TARGET })
      } catch (err) {
        console.log('0052: coleção ' + name + ' indisponível (' + err.message + ') — segue')
        continue
      }
      if (!found || found.length === 0) {
        console.log('0052: ' + name + ' — 0 registros para o usuário')
        continue
      }
      let errors = 0
      for (let j = 0; j < found.length; j++) {
        try {
          app.delete(found[j])
          total++
        } catch (delErr) {
          errors++
          console.log('0052: falha ao apagar ' + name + '/' + found[j].id + ': ' + delErr.message)
        }
      }
      console.log('0052: ' + name + ' — ' + (found.length - errors) + ' registro(s) apagado(s)')
    }
    console.log('0052: limpeza do usuário ' + TARGET + ' concluída — ' + total + ' registro(s)')
  },
  (app) => {
    // down: sem volta determinística (os dados apagados não são restauráveis).
  },
)
