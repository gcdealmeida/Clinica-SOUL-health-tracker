//
// clear-test-data.js — "Limpar dados de teste" (Settings, menu do usuário).
//
// Ferramenta permanente da clínica para ZERAR o perfil entre testes de
// clientes: apaga SOMENTE os REGISTROS (linhas) do usuário logado nas
// coleções de dados do app. NUNCA apaga:
//   - o usuário (auth), sessões ou tokens;
//   - o perfil do usuário (users.*, campos do próprio registro);
//   - user_preferences (preferências do painel);
//   - nenhuma COLEÇÃO inteira — a estrutura do banco fica intacta.
//
// Após a limpeza, Painel Hoje, Biomarcadores, Exames e Sources aparecem
// vazios/estado inicial, como um perfil de cliente novo.
//
// JSVM: helpers INLINE dentro do callback (pool de VM separado — o código
// top-level do arquivo não é visível dentro do routerAdd).
//

routerAdd(
  'POST',
  '/backend/v1/data/clear-test-data',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.id) {
      return e.json(401, { error: 'Autenticação obrigatória.' })
    }

    const body = e.requestInfo().body || {}
    const dryRun = body.dry_run === true

    // Coleções de DADOS do app (todas com campo relation "user" no schema).
    // NUNCA entram aqui: users, user_preferences (preferências do painel).
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

    const results = {}
    let total = 0
    const failures = []

    for (let i = 0; i < COLLECTIONS.length; i++) {
      const name = COLLECTIONS[i]
      let found = null
      try {
        found = $app.findRecordsByFilter(name, 'user = {:u}', '-created', 0, 0, { u: auth.id })
      } catch (err) {
        // Coleção indisponível/renomeada: registra e segue (nunca interrompe).
        results[name] = 0
        failures.push(name + ': ' + err.message)
        continue
      }
      const count = found ? found.length : 0
      results[name] = count
      total += count
      if (dryRun) continue
      let errors = 0
      for (let j = 0; j < found.length; j++) {
        try {
          $app.delete(found[j])
        } catch (delErr) {
          errors++
          console.log(
            'clear-test-data: falha ao apagar ' + name + '/' + found[j].id + ': ' + delErr.message,
          )
        }
      }
      if (errors > 0) failures.push(name + ': ' + errors + ' registro(s) não apagados')
    }

    console.log(
      'clear-test-data: usuário ' +
        auth.id +
        (dryRun ? ' — DRY RUN' : ' — LIMPEZA EXECUTADA') +
        ' — ' +
        total +
        ' registro(s) em ' +
        COLLECTIONS.length +
        ' coleções' +
        (failures.length > 0 ? ' | falhas: ' + failures.join(' ; ') : ''),
    )

    return e.json(200, {
      ok: true,
      dry_run: dryRun,
      totals: results,
      total_deleted: total,
      failures: failures,
    })
  },
  $apis.requireAuth(),
)
