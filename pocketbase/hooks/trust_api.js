//
// trust_api.js — API DE CONFIANÇA para o app institucional da Clínica Soul.
//
// O app institucional (cadastros, prontuários, avaliações, evoluções,
// frequência, agenda, gestão) consome ESTE app por HTTP:
//
//   1. POST /backend/v1/trust/token                      → login único
//      corpo: { email, ts, sig }  onde sig = HMAC-SHA256(email + ts)
//      calculado com o secret compartilhado INSTITUTIONAL_TRUST_SECRET.
//      Devolve o token de autenticação PocketBase do usuário (sem senha).
//
//   2. GET /backend/v1/trust/patients/{email}/summary    → leitura completa
//   3. POST /backend/v1/trust/patients/{email}/records   → escrita com origem
//
// As rotas de leitura/escrita aceitam o token devolvido no passo 1 (ou um
// token PocketBase normal). A rota de troca de token NÃO usa e.auth — a
// assinatura HMAC é a única prova de confiança.
//
// REVOGAÇÃO / RECUSA:
//   - secret errado ou ausente      → 401 INVALID_SIGNATURE (recusa imediata);
//   - timestamp com mais de 5 min   → 401 STALE_TIMESTAMP;
//   - e-mail inválido               → 400;
//   - sem sessão válida nas rotas de pacientes → 401.
//   Para REVOCAR a integração inteira: trocar/limpar a env var
//   INSTITUTIONAL_TRUST_SECRET no painel Skip Cloud (os dois apps precisam
//   combinar o novo valor) — todas as assinaturas antigas passam a falhar.
//
// RESTRIÇÕES JSVM respeitadas aqui:
//   - routerAdd('MÉTODO', '/caminho') em DOIS argumentos separados;
//   - helpers usados nos callbacks declarados INLINE no callback
//     (declarações top-level do arquivo geram ReferenceError — pool de VM
//     separado);
//   - $security.hs256 / $security.randomString são os únicos primitivos de
//     crypto/JWT do JSVM (não existe criação manual de auth token).
//

// ═══════════════════════════════════════════════════════════════════════
// LOGIN ÚNICO — troca de assinatura HMAC por sessão PocketBase
// ═══════════════════════════════════════════════════════════════════════
routerAdd('POST', '/backend/v1/trust/token', (e) => {
  // Helpers INLINE (pool de VM separado do top-level do arquivo).
  const safeString = (v) => (typeof v === 'string' ? v : '')
  const normalizeEmail = (v) => safeString(v).trim().toLowerCase()

  const body = e.requestInfo().body || {}
  const email = normalizeEmail(body.email)
  const ts = safeString(body.ts)
  const sig = safeString(body.sig)

  if (!email || !ts || !sig) {
    return e.json(400, {
      error: 'Corpo obrigatório: { email, ts, sig } (sig = HMAC-SHA256 hex de email + ts).',
      code: 'MISSING_FIELDS',
    })
  }

  if (email.indexOf('@') <= 0) {
    return e.json(400, { error: 'E-mail inválido.', code: 'INVALID_EMAIL' })
  }

  // Tolerância de relógio: 5 minutos (300s) — replay fora da janela é recusado.
  const TOLERANCE_SEC = 300
  let tsMs = NaN
  if (/^\d+$/.test(ts)) {
    if (ts.length > 13) ts = ts.substring(0, 13)
    tsMs = Number(ts)
    if (ts.length <= 10) tsMs = tsMs * 1000
  } else {
    // ISO 8601 também é aceito.
    tsMs = Date.parse(ts)
    if (isNaN(tsMs)) tsMs = NaN
  }
  if (isNaN(tsMs)) {
    return e.json(400, {
      error: 'Timestamp inválido: use epoch em milissegundos (ou ISO 8601).',
      code: 'INVALID_TIMESTAMP',
    })
  }
  const now = new Date().getTime()
  if (Math.abs(now - tsMs) > TOLERANCE_SEC * 1000) {
    return e.json(401, {
      error: 'Timestamp fora da janela de 5 minutos — gere uma nova assinatura.',
      code: 'STALE_TIMESTAMP',
    })
  }

  // Secret compartilhado (env var da plataforma, definida no painel Skip Cloud).
  // Fallback: $secrets.get (mesma origem no JSVM, tolera variação de injeção).
  let secret = $os.getenv('INSTITUTIONAL_TRUST_SECRET')
  if (!secret) {
    try {
      if ($secrets.has('INSTITUTIONAL_TRUST_SECRET')) {
        secret = $secrets.get('INSTITUTIONAL_TRUST_SECRET')
      }
    } catch (_) {
      secret = ''
    }
  }
  if (!secret) {
    return e.json(503, {
      error: 'Integração não configurada: secret INSTITUTIONAL_TRUST_SECRET ausente.',
      code: 'TRUST_NOT_CONFIGURED',
    })
  }

  const expected = $security.hs256(email + '|' + ts, secret)
  if (!expected || expected.toLowerCase() !== sig.toLowerCase()) {
    return e.json(401, {
      error: 'Assinatura inválida — verifique o secret compartilhado e o formato email|ts.',
      code: 'INVALID_SIGNATURE',
    })
  }

  // Localiza (ou cria) o usuário por e-mail. Cliente novo entra como "cliente".
  let user = null
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    user = null
  }

  if (!user) {
    const usersCol = $app.findCollectionByNameOrId('users')
    user = new Record(usersCol)
    user.setEmail(email)
    user.setPassword($security.randomString(24) + 'aB1!')
    user.setVerified(true)
    user.set('name', email.split('@')[0])
    user.set('role', 'cliente')
    try {
      $app.save(user)
      console.log('trust/token: usuário criado para ' + email + ' (id ' + user.id + ')')
    } catch (cErr) {
      return e.json(500, {
        error: 'Falha ao criar usuário: ' + cErr.message,
        code: 'USER_CREATE_FAILED',
      })
    }
  }

  if (user.getBool('verified') === false) {
    user.setVerified(true)
    $app.save(user)
  }

  // Sessão PocketBase real do usuário — o app institucional passa a chamá-lo
  // com o header Authorization deste token.
  try {
    const token = user.newAuthToken()
    return e.json(200, {
      token: token,
      user: {
        id: user.id,
        email: user.email(),
        name: user.getString('name'),
        role: user.getString('role'),
      },
    })
  } catch (tErr) {
    return e.json(500, {
      error: 'Falha ao emitir a sessão: ' + tErr.message,
      code: 'TOKEN_FAILED',
    })
  }
}) // rota PÚBLICA de propósito: a prova de confiança é a assinatura HMAC.

// ═══════════════════════════════════════════════════════════════════════
// Autoteste/diagnóstico: GET /backend/v1/trust/selftest?email=...
// Exercita o fluxo completo (token → summary → records → casos negativos)
// via HTTP real e devolve o resultado passo a passo. Útil para o app
// institucional validar a implementação do HMAC dele contra este backend.
// NÃO deixa dados no banco (apaga o que criou). PÚBLICA de propósito: nada
// sensível é devolvido e os casos de escrita usam um usuário de teste.
// ═══════════════════════════════════════════════════════════════════════
routerAdd('GET', '/backend/v1/trust/selftest', (e) => {
  const results = []
  const step = (name, ok, detail) => {
    results.push({ step: name, ok: ok, detail: detail })
  }

  const base = (
    $os.getenv('PB_INSTANCE_URL') ||
    'https://clinica-soul-health-tracker-333e7.shrd01.internal.goskip.dev'
  ).replace(/\/$/, '')
  let email = String(e.request.pathValue('email') || '')
  if (!email) {
    const q = e.requestInfo().query || {}
    email = String(q.email || '')
  }
  email = decodeURIComponent(email).trim().toLowerCase()
  if (!email || email.indexOf('@') <= 0) email = 'trust-selftest@soultest.dev'

  let secret = $os.getenv('INSTITUTIONAL_TRUST_SECRET') || ''
  if (!secret) {
    try {
      if ($secrets.has('INSTITUTIONAL_TRUST_SECRET'))
        secret = $secrets.get('INSTITUTIONAL_TRUST_SECRET')
    } catch (_) {
      secret = ''
    }
  }
  const secretOk = !!secret
  const ts = String(new Date().getTime())
  const sigOk = secretOk ? $security.hs256(email + '|' + ts, secret) : ''
  step('secret_configurado', secretOk, secretOk ? 'secret visível no runtime' : 'secret AUSENTE')

  const post = (path, payload, headers) => {
    const res = $http.send({
      url: base + path,
      method: 'POST',
      headers: headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    let body = res.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (_) {
        body = body
      }
    }
    return { status: res.statusCode !== undefined ? res.statusCode : res.status, body: body }
  }
  const get = (path, headers) => {
    const res = $http.send({ url: base + path, method: 'GET', headers: headers || {} })
    let body = res.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body)
      } catch (_) {
        body = body
      }
    }
    return { status: res.statusCode !== undefined ? res.statusCode : res.status, body: body }
  }

  // 1. Token inválido (secret errado) → 401
  let r = post('/backend/v1/trust/token', { email: email, ts: ts, sig: 'deadbeef' })
  step(
    'token_sig_errada_recusada',
    r.status === 401,
    'status=' + r.status + ' code=' + (r.body && r.body.code),
  )

  // 2. Timestamp antigo (10 min) → 401
  const tsOld = String(new Date().getTime() - 10 * 60 * 1000)
  r = post('/backend/v1/trust/token', {
    email: email,
    ts: tsOld,
    sig: $security.hs256(email + '|' + tsOld, secret),
  })
  step(
    'token_ts_antigo_recusado',
    r.status === 401,
    'status=' + r.status + ' code=' + (r.body && r.body.code),
  )

  // 3. Corpo faltando → 400
  r = post('/backend/v1/trust/token', { email: email })
  step('token_sem_campos_400', r.status === 400, 'status=' + r.status)

  // 4. Token válido → 200 + token PocketBase
  r = post('/backend/v1/trust/token', { email: email, ts: ts, sig: sigOk })
  step(
    'token_valido_200',
    r.status === 200 && r.body && r.body.token,
    'status=' + r.status + ' role=' + (r.body && r.body.user && r.body.user.role),
  )
  const token = r.body && r.body.token
  const userId = r.body && r.body.user && r.body.user.id

  if (token) {
    const authHeader = { Authorization: token, 'Content-Type': 'application/json' }

    // 5. Sem header → 401
    r = get('/backend/v1/trust/patients/' + encodeURIComponent(email) + '/summary')
    step('summary_sem_token_401', r.status === 401, 'status=' + r.status)

    // 6. Summary completo → 200 com todas as coleções
    r = get('/backend/v1/trust/patients/' + encodeURIComponent(email) + '/summary', authHeader)
    const cols = r.body && r.body.collections ? Object.keys(r.body.collections).length : 0
    step(
      'summary_200_com_colecoes',
      r.status === 200 && cols >= 15,
      'status=' + r.status + ' colecoes=' + cols,
    )

    // 7. Escrita: nova medição (peso) → 201 com origem
    r = post(
      '/backend/v1/trust/patients/' + encodeURIComponent(email) + '/records',
      {
        collection: 'health_metrics',
        professional_name: 'Dra. Teste Integração',
        data: {
          category: 'peso',
          numeric_value: 71.5,
          date_time: new Date().toISOString().slice(0, 16),
          notes: 'Peso aferido na consulta',
        },
      },
      authHeader,
    )
    const recId = r.body && r.body.record_id
    step(
      'records_criado_201',
      r.status === 201 && recId,
      'status=' + r.status + ' id=' + recId + ' origem=' + (r.body && r.body.origin),
    )

    // 8. O registro gravado contém a identificação de origem?
    let foundOrigin = false
    if (recId) {
      try {
        const rec = $app.findRecordById('health_metrics', recId)
        const notes = rec.getString('notes')
        foundOrigin = notes.indexOf('app institucional') !== -1
        step('registro_identificado_origem', foundOrigin, 'notes=' + notes.substring(0, 90))
      } catch (vErr) {
        step('registro_identificado_origem', false, vErr.message)
      }
    } else {
      step('registro_identificado_origem', false, 'sem record_id')
    }

    // 9. Sessão do paciente NÃO pode gravar em outro paciente → 403
    r = post(
      '/backend/v1/trust/patients/outro@soultest.dev/records',
      { collection: 'health_metrics', data: { category: 'peso' } },
      authHeader,
    )
    step('escrita_em_outro_paciente_403', r.status === 403, 'status=' + r.status)

    // 10. Coleção não permitida → 400
    r = post(
      '/backend/v1/trust/patients/' + encodeURIComponent(email) + '/records',
      { collection: 'exams', data: {} },
      authHeader,
    )
    step('colecao_proibida_400', r.status === 400, 'status=' + r.status)

    // Limpeza: apaga o que o teste criou (registro + usuário de teste).
    try {
      if (recId) {
        const rec = $app.findRecordById('health_metrics', recId)
        $app.delete(rec)
      }
    } catch (_) {}
    try {
      if (userId) {
        const u = $app.findRecordById('users', userId)
        $app.delete(u)
      }
    } catch (_) {}
  }

  const passed = results.filter((x) => x.ok).length
  return e.json(200, { passed: passed, total: results.length, results: results })
})
// ═══════════════════════════════════════════════════════════════════════
// Leitura/escrita de pacientes — autenticação por sessão PocketBase
// (token devolvido pelo /trust/token, ou token normal de um profissional).
// ═══════════════════════════════════════════════════════════════════════

// GET /backend/v1/trust/patients/{email}/summary — TODOS os dados do cliente.
routerAdd(
  'GET',
  '/backend/v1/trust/patients/{email}/summary',
  (e) => {
    // Helpers INLINE — pool de VM separado do top-level do arquivo.
    const jsonOrEmpty = (field) => {
      const raw = typeof field === 'string' ? field : ''
      if (!raw || raw === 'null') return []
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch (_) {
        return []
      }
    }

    const collectSummary = (patientId, patient) => {
      const result = {
        patient: {
          id: patient.id,
          email: patient.email(),
          name: patient.getString('name'),
          role: patient.getString('role'),
          phone: patient.getString('phone'),
          created: patient.getString('created'),
        },
        collections: {},
        counts: {},
        generated_at: new Date().toISOString(),
      }
      const LIST = [
        'user_preferences',
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
      for (let i = 0; i < LIST.length; i++) {
        const name = LIST[i]
        try {
          const rows = $app.findRecordsByFilter(name, 'user = {:u}', '-created', 500, 0, {
            u: patientId,
          })
          const out = []
          for (let j = 0; j < rows.length; j++) {
            const r = rows[j]
            const obj = {}
            const fields = r.collection().fields
            for (let k = 0; k < fields.length; k++) {
              const fname = fields[k].name
              if (fname === 'user') continue
              const raw = r.get(fname)
              // json fields chegam como bytes crus: normaliza para objeto/array.
              if (raw && raw.constructor === Array && fname !== 'id') {
                try {
                  obj[fname] = JSON.parse(
                    String.fromCharCode.apply(
                      null,
                      raw.length > 100000 ? raw.slice(0, 100000) : raw,
                    ),
                  )
                } catch (_) {
                  obj[fname] = null
                }
              } else if (raw instanceof Date) {
                obj[fname] = raw.toISOString()
              } else {
                obj[fname] = raw
              }
            }
            out.push(obj)
          }
          result.collections[name] = out
          result.counts[name] = out.length
        } catch (cErr) {
          result.collections[name] = []
          result.counts[name] = 0
          result.counts[name + '_error'] = cErr.message
        }
      }
      return result
    }

    const auth = e.auth
    if (!auth || !auth.id) {
      return e.json(401, {
        error:
          'Autenticação obrigatória — use o token do /backend/v1/trust/token no header Authorization.',
        code: 'UNAUTHENTICATED',
      })
    }

    let email = decodeURIComponent(String(e.request.pathValue('email') || ''))
      .trim()
      .toLowerCase()
    if (!email || email.indexOf('@') <= 0) {
      return e.json(400, { error: 'E-mail do paciente ausente na rota.', code: 'MISSING_EMAIL' })
    }

    const isProfessional = auth.getString('role') === 'profissional'
    if (!isProfessional && auth.email().toLowerCase() !== email) {
      return e.json(403, {
        error: 'Sessão sem permissão para ler os dados de outro paciente.',
        code: 'FORBIDDEN',
      })
    }

    let patient = null
    try {
      patient = $app.findAuthRecordByEmail('users', email)
    } catch (_) {
      patient = null
    }
    if (!patient) {
      return e.json(404, { error: 'Paciente não encontrado.', code: 'PATIENT_NOT_FOUND' })
    }

    const summary = collectSummary(patient.id, patient)
    console.log(
      'trust/summary: ' +
        auth.email() +
        ' (' +
        auth.getString('role') +
        ') leu ' +
        email +
        ' — ' +
        Object.keys(summary.collections).length +
        ' coleções',
    )
    return e.json(200, summary)
  },
  $apis.requireAuth(),
)

// POST /backend/v1/trust/patients/{email}/records — grava/atualiza dados do
// cliente a partir do app institucional. NÃO sobrescreve silenciosamente:
// cria um NOVO registro (mesmo padrão do app) e apenas preenche campos vazios
// de um alvo existente quando body.target_id é enviado.
routerAdd(
  'POST',
  '/backend/v1/trust/patients/{email}/records',
  (e) => {
    const body = e.requestInfo().body || {}

    const auth = e.auth
    if (!auth || !auth.id) {
      return e.json(401, {
        error:
          'Autenticação obrigatória — use o token do /backend/v1/trust/token no header Authorization.',
        code: 'UNAUTHENTICATED',
      })
    }

    let email = decodeURIComponent(String(e.request.pathValue('email') || ''))
      .trim()
      .toLowerCase()
    if (!email || email.indexOf('@') <= 0) {
      return e.json(400, { error: 'E-mail do paciente ausente na rota.', code: 'MISSING_EMAIL' })
    }

    const isProfessional = auth.getString('role') === 'profissional'
    if (!isProfessional && auth.email().toLowerCase() !== email) {
      return e.json(403, {
        error: 'Sessão sem permissão para gravar dados de outro paciente.',
        code: 'FORBIDDEN',
      })
    }

    let patient = null
    try {
      patient = $app.findAuthRecordByEmail('users', email)
    } catch (_) {
      patient = null
    }
    if (!patient) {
      return e.json(404, { error: 'Paciente não encontrado.', code: 'PATIENT_NOT_FOUND' })
    }

    const WRITEABLE = [
      'health_metrics',
      'medical_records',
      'emotional_logs',
      'diets',
      'reminders',
      'profile_conditions',
      'profile_allergies',
      'profile_vaccinations',
      'profile_events',
      'profile_genetics',
      'profile_care_providers',
      'profile_lifestyle',
      'medications',
      'profile_biomarkers',
    ]
    const collection = String(body.collection || '')
    if (WRITEABLE.indexOf(collection) === -1) {
      return e.json(400, {
        error: 'collection inválida. Permitidas: ' + WRITEABLE.join(', '),
        code: 'INVALID_COLLECTION',
      })
    }

    const professionalName =
      (typeof body.professional_name === 'string' && body.professional_name.trim()) ||
      auth.getString('name') ||
      ''
    const professionalEmail = auth.email() || ''

    // Metadado de ORIGEM: toda gravação vinda da integração é identificável
    // como "app institucional" + profissional responsável.
    let originMeta = null
    try {
      originMeta = JSON.stringify({
        source: 'app_institucional',
        professional_name: professionalName,
        professional_email: professionalEmail,
        recorded_at: new Date().toISOString(),
      })
    } catch (_) {
      originMeta = '{"source":"app_institucional"}'
    }

    // Campos de metadado de origem por coleção (o que existir é preenchido).
    const ORIGIN_FIELDS = {
      notes: null, // texto: prefixado com a origem
      evidence: null,
      description: null,
      notes_meta: originMeta,
    }

    const data = typeof body.data === 'object' && body.data !== null ? body.data : {}
    const nowIso = new Date().toISOString().slice(0, 10)

    const col = $app.findCollectionByNameOrId(collection)

    // Modo alvo: atualizar um registro existente — só campos vazios (nunca
    // sobrescreve silenciosamente).
    const targetId = String(body.target_id || '')
    if (targetId) {
      let target = null
      try {
        target = $app.findRecordById(collection, targetId)
      } catch (_) {
        target = null
      }
      if (!target || target.getString('user') !== patient.id) {
        return e.json(404, {
          error: 'target_id não encontrado nesta coleção para este paciente.',
          code: 'TARGET_NOT_FOUND',
        })
      }
      let filled = []
      for (const key in data) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) continue
        if (key === 'id' || key === 'user' || key === 'created' || key === 'updated') continue
        const current = target.getString(key)
        if (current === '' || current === '0' || current === 'null' || current === 'undefined') {
          target.set(key, data[key])
          filled.push(key)
        }
      }
      try {
        $app.save(target)
      } catch (sErr) {
        return e.json(400, {
          error: 'Falha ao salvar: ' + sErr.message,
          code: 'SAVE_FAILED',
        })
      }
      return e.json(200, {
        ok: true,
        mode: 'update_empty_fields',
        collection: collection,
        record_id: target.id,
        filled_fields: filled,
        origin: 'app_institucional',
        professional: professionalName,
      })
    }

    // Modo padrão: criar NOVO registro (nunca sobrescreve o que já existe).
    const record = new Record(col)
    record.set('user', patient.id)

    let blocked = []
    for (const key in data) {
      if (!Object.prototype.hasOwnProperty.call(data, key)) continue
      if (key === 'id' || key === 'user' || key === 'created' || key === 'updated') continue
      try {
        record.set(key, data[key])
      } catch (setErr) {
        blocked.push(key)
      }
    }
    // Sinaliza campos que falharam (nome errado, tipo errado, select inválido).
    const presentable = []
    const fields = col.fields
    for (let i = 0; i < fields.length; i++) presentable.push(fields[i].name)

    if (typeof record.get('notes') === 'string' && record.get('notes') !== '') {
      record.set(
        'notes',
        record.get('notes') +
          ' — via app institucional' +
          (professionalName ? ' (' + professionalName + ')' : ''),
      )
    } else if (record.collection().fields.getByName('notes')) {
      record.set(
        'notes',
        'Registrado via app institucional' +
          (professionalName ? ' por ' + professionalName : '') +
          '.',
      )
    }
    if (record.collection().fields.getByName('evidence')) {
      record.set('evidence', 'app_institucional' + (professionalName ? ':' + professionalName : ''))
    }

    try {
      $app.save(record)
    } catch (sErr) {
      return e.json(400, {
        error:
          'Falha ao salvar: ' +
          sErr.message +
          (blocked.length ? ' | campos recusados: ' + blocked.join(', ') : ''),
        code: 'SAVE_FAILED',
      })
    }

    console.log(
      'trust/records: ' +
        professionalEmail +
        ' gravou ' +
        collection +
        '/' +
        record.id +
        ' para ' +
        email +
        ' (origem app institucional)',
    )
    return e.json(201, {
      ok: true,
      mode: 'created',
      collection: collection,
      record_id: record.id,
      origin: 'app_institucional',
      professional: professionalName,
      professional_email: professionalEmail,
      ignored_fields: blocked,
      record: record.get('id') ? { id: record.id } : null,
    })
  },
  $apis.requireAuth(),
)
