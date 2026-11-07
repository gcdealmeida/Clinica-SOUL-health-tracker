// PocketBase pb_hook: busca rápida de medicamentos BRASILEIROS (nome comercial
// + princípio ativo) para o cadastro de medicações da Clínica Soul.
//
// IMPORTANTE (JSVM PocketBase): TODO código útil vive DENTRO dos callbacks de
// routerAdd/cronAdd — declarações top-level (const, function) referenciadas em
// callbacks geram erro de deploy e/ou ReferenceError (pool de VM separado). As
// duplicações abaixo são intencionais: cada callback é autocontido.
//
// Fontes:
//  1. Índice fresco em $app.store() ("medSearchIndexV2", array plana de strings
//     [key, label, ingredient, cat, ...] — objetos aninhados atravessam a
//     fronteira JS->Go->JS do JSVM como wrappers Go e quebram a iteração).
//  2. Reconstrução rápida: CMED TA_PRECO_MEDICAMENTO.csv (UTF-8, ~40k linhas,
//     índice pronto em segundos) — cobre os remédios comerciais brasileiros,
//     incluindo biológicos modernos (ex.: Mounjaro/tirzepatida).
//  3. Enriquecimento diário: DADOS_ABERTOS_MEDICAMENTOS.csv (~46 MB, todos os
//     registros ativos) — construído pelo cron das 04:00, nunca em request.
//  4. OpenFDA (rótulos dos EUA) — último recurso, só em request.
//
// A API REST de consultas.anvisa.gov.br é bloqueada por Cloudflare Turnstile —
// NUNCA usar. Crons mantêm o índice quente: diário (dataset rico) e a cada
// 5 minutos (CMED, cobre restart/pós-deploy), então a primeira digitação do
// usuário quase nunca espera reconstrução.
//
// Rota: POST /backend/v1/meds/search  { term: "dipirona" }
// Resposta: 200 { source, results: [{label, activeIngredient, category}] }

// =================== ROTA DE BUSCA ===================
routerAdd(
  'POST',
  '/backend/v1/meds/search',
  (e) => {
    if (!e.auth) {
      return e.forbiddenError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const normKey = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[çÇ]/g, 'c')
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const parseCsvLine = (line) => {
      const parts = []
      let cur = ''
      let inQuotes = false
      for (let c = 0; c < line.length; c++) {
        const ch = line[c]
        if (ch === '"') {
          if (inQuotes && line[c + 1] === '"') {
            cur += '"'
            c++
          } else inQuotes = !inQuotes
        } else if (ch === ';' && !inQuotes) {
          parts.push(cur)
          cur = ''
        } else cur += ch
      }
      parts.push(cur)
      return parts
    }
    const cleanIngredient = (raw) => {
      let prin = String(raw || '').trim()
      prin = prin.replace(/\s*\d[\d.,]*\s*(MG|MCG|G|ML|UI|%).*$/i, '').trim()
      prin = prin.replace(/[,;].*$/, '').trim()
      if (!prin) prin = String(raw || '').trim()
      return prin.slice(0, 160)
    }

    const term = normKey(String(body.term || ''))
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(' ')
    if (term.length < 3) {
      return e.json(200, { source: 'none', results: [] })
    }

    const started = new Date().getTime()
    const fresh = (index) => {
      if (!index || !index.loadedAt || !Array.isArray(index.array)) return false
      return new Date().getTime() - index.loadedAt < 24 * 60 * 60 * 1000
    }
    // Reconstrução rápida (só CMED — segundos; o dataset de 46MB nunca roda em request)
    const buildCmed = () => {
      const res = $http.send({
        url: 'https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv',
        method: 'GET',
        headers: { Accept: 'text/csv, */*' },
        timeout: 60,
      })
      if (res.statusCode !== 200 || !res.body) throw new Error('cmed csv: HTTP ' + res.statusCode)
      const lines = res.body.toString().split('\n')
      if (lines.length < 2) throw new Error('cmed csv: vazio')
      const header = lines[0].split(';')
      const idxSub = header.indexOf('SUBSTÂNCIA')
      const idxProd = header.indexOf('PRODUTO')
      const idxTipo = header.indexOf('TIPO DE PRODUTO (STATUS DO PRODUTO)')
      if (idxSub === -1 || idxProd === -1)
        throw new Error('cmed csv: colunas ausentes — ' + lines[0].slice(0, 120))
      const array = []
      const seen = {}
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue
        const parts = parseCsvLine(line)
        const sub = (parts[idxSub] || '').trim()
        const name = (parts[idxProd] || '').trim()
        if (!name || !sub) continue
        const key = normKey(name)
        if (!key || seen[key]) continue
        seen[key] = true
        array.push(
          key,
          name,
          cleanIngredient(sub),
          idxTipo !== -1 ? (parts[idxTipo] || '').trim() : '',
        )
      }
      if (array.length < 4000) throw new Error('cmed csv: índice pequeno demais')
      const built = {
        loadedAt: new Date().getTime(),
        array: array,
        n: array.length / 4,
        source: 'cmed',
      }
      console.log('med-search: índice CMED construído — ' + built.n + ' produtos')
      $app.store().set('medSearchIndexV2', built)
      return built
    }

    try {
      let index = $app.store().get('medSearchIndexV2') || null
      if (!fresh(index)) {
        try {
          index = buildCmed()
        } catch (cErr) {
          console.log('med-search: reconstrução CMED falhou — ' + cErr.message)
          index = null
        }
      }

      if (index && Array.isArray(index.array)) {
        const array = index.array
        const n = array.length / 4
        const termWords = term.split(/\s+/)
        const starts = []
        const contains = []
        for (let i = 0; i < n && starts.length + contains.length < 60; i++) {
          const key = array[i * 4]
          let ok = true
          for (let w = 0; w < termWords.length; w++) {
            if (key.indexOf(termWords[w]) === -1) {
              ok = false
              break
            }
          }
          if (!ok) continue
          const hit = {
            label: array[i * 4 + 1],
            activeIngredient: array[i * 4 + 2],
            category: array[i * 4 + 3],
          }
          if (key.indexOf(term) === 0) starts.push(hit)
          else contains.push(hit)
        }
        starts.sort((a, b) => a.label.length - b.label.length)
        contains.sort((a, b) => a.label.length - b.label.length)
        const results = starts.concat(contains).slice(0, 5)
        if (results.length > 0) {
          const elapsed = new Date().getTime() - started
          if (elapsed > 300) console.log('med-search: busca lenta ' + elapsed + 'ms — ' + term)
          return e.json(200, { source: index.source, results: results })
        }
      }

      // Nada na base brasileira (ou índice indisponível): OpenFDA como último recurso.
      try {
        const search = term
          .split(/\s+/)
          .map((w) => '(openfda.brand_name:' + w + '* OR openfda.generic_name:' + w + '*)')
          .join(' AND ')
        const res = $http.send({
          url:
            'https://api.fda.gov/drug/label.json?search=' +
            encodeURIComponent(search) +
            '&limit=10',
          method: 'GET',
          timeout: 15,
        })
        if (res.statusCode === 404) return e.json(200, { source: 'none', results: [] })
        if (res.statusCode !== 200) throw new Error('openfda: HTTP ' + res.statusCode)
        const data = JSON.parse(res.body.toString())
        const out = []
        const seen = {}
        const list = (data && data.results) || []
        for (let i = 0; i < list.length && out.length < 5; i++) {
          const r = list[i]
          const ingredient = Array.isArray(r && r.active_ingredient)
            ? String(r.active_ingredient[0] || '').trim()
            : ''
          const openfda = (r && r.openfda) || {}
          const brand = Array.isArray(openfda.brand_name) ? openfda.brand_name[0] : undefined
          const generic = Array.isArray(openfda.generic_name) ? openfda.generic_name[0] : undefined
          const label = brand || generic
          if (!ingredient || !label) continue
          const key = (label + '|' + ingredient).toLowerCase()
          if (seen[key]) continue
          seen[key] = true
          out.push({
            label: String(label),
            activeIngredient: ingredient.slice(0, 160),
            category: '',
          })
        }
        return e.json(200, { source: 'openfda', results: out })
      } catch (fErr) {
        console.log('med-search: fallback OpenFDA falhou — ' + fErr.message)
        return e.json(200, { source: 'none', results: [] })
      }
    } finally {
      const elapsed = new Date().getTime() - started
      if (elapsed > 300) console.log('med-search: busca lenta ' + elapsed + 'ms — ' + term)
    }
  },
  $apis.requireAuth(),
)

// =================== CRON DIÁRIO: dataset completo da ANVISA ===================
cronAdd('medSearchDaily', '0 4 * * *', () => {
  const normKey = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[çÇ]/g, 'c')
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const parseCsvLine = (line) => {
    const parts = []
    let cur = ''
    let inQuotes = false
    for (let c = 0; c < line.length; c++) {
      const ch = line[c]
      if (ch === '"') {
        if (inQuotes && line[c + 1] === '"') {
          cur += '"'
          c++
        } else inQuotes = !inQuotes
      } else if (ch === ';' && !inQuotes) {
        parts.push(cur)
        cur = ''
      } else cur += ch
    }
    parts.push(cur)
    return parts
  }
  const cleanIngredient = (raw) => {
    let prin = String(raw || '').trim()
    prin = prin.replace(/\s*\d[\d.,]*\s*(MG|MCG|G|ML|UI|%).*$/i, '').trim()
    prin = prin.replace(/[,;].*$/, '').trim()
    if (!prin) prin = String(raw || '').trim()
    return prin.slice(0, 160)
  }
  try {
    const res = $http.send({
      url: 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
      method: 'GET',
      headers: { Accept: 'text/csv, */*' },
      timeout: 120,
    })
    if (res.statusCode !== 200 || !res.body) throw new Error('anvisa csv: HTTP ' + res.statusCode)
    const lines = res.body.toString().split('\n')
    if (lines.length < 2) throw new Error('anvisa csv: vazio')
    const header = lines[0].split(';')
    const idxName = header.indexOf('NOME_PRODUTO')
    const idxSit = header.indexOf('SITUACAO_REGISTRO')
    const idxCat = header.indexOf('CATEGORIA_REGULATORIA')
    const idxPrin = header.indexOf('PRINCIPIO_ATIVO')
    if (idxName === -1 || idxPrin === -1 || idxSit === -1)
      throw new Error('anvisa csv: colunas ausentes — ' + lines[0].slice(0, 120))
    const array = []
    const seen = {}
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const parts = parseCsvLine(line)
      if ((parts[idxSit] || '').trim().toUpperCase() !== 'ATIVO') continue
      const name = (parts[idxName] || '').trim()
      const prin = (parts[idxPrin] || '').trim()
      if (!name || !prin) continue
      const key = normKey(name)
      if (!key || seen[key]) continue
      seen[key] = true
      array.push(
        key,
        name,
        cleanIngredient(prin),
        idxCat !== -1 ? (parts[idxCat] || '').trim() : '',
      )
    }
    if (array.length < 4000) throw new Error('anvisa csv: índice pequeno demais')
    const built = {
      loadedAt: new Date().getTime(),
      array: array,
      n: array.length / 4,
      source: 'anvisa',
    }
    console.log(
      'med-search (cron diário): índice ANVISA carregado — ' + built.n + ' registros ativos',
    )
    $app.store().set('medSearchIndexV2', built)
  } catch (aErr) {
    console.log(
      'med-search (cron diário): dataset ANVISA falhou — ' +
        aErr.message +
        ' — mantendo índice atual',
    )
  }
})

// =================== CRON 5 MIN: mantém índice quente (pós-restart/deploy) ===================
cronAdd('medSearchWarmup', '*/5 * * * *', () => {
  try {
    const index = $app.store().get('medSearchIndexV2') || null
    if (
      index &&
      index.loadedAt &&
      Array.isArray(index.array) &&
      new Date().getTime() - index.loadedAt < 24 * 60 * 60 * 1000
    )
      return
    const normKey = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[çÇ]/g, 'c')
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    const parseCsvLine = (line) => {
      const parts = []
      let cur = ''
      let inQuotes = false
      for (let c = 0; c < line.length; c++) {
        const ch = line[c]
        if (ch === '"') {
          if (inQuotes && line[c + 1] === '"') {
            cur += '"'
            c++
          } else inQuotes = !inQuotes
        } else if (ch === ';' && !inQuotes) {
          parts.push(cur)
          cur = ''
        } else cur += ch
      }
      parts.push(cur)
      return parts
    }
    const cleanIngredient = (raw) => {
      let prin = String(raw || '').trim()
      prin = prin.replace(/\s*\d[\d.,]*\s*(MG|MCG|G|ML|UI|%).*$/i, '').trim()
      prin = prin.replace(/[,;].*$/, '').trim()
      if (!prin) prin = String(raw || '').trim()
      return prin.slice(0, 160)
    }
    const res = $http.send({
      url: 'https://dados.anvisa.gov.br/dados/TA_PRECO_MEDICAMENTO.csv',
      method: 'GET',
      headers: { Accept: 'text/csv, */*' },
      timeout: 60,
    })
    if (res.statusCode !== 200 || !res.body) throw new Error('cmed csv: HTTP ' + res.statusCode)
    const lines = res.body.toString().split('\n')
    if (lines.length < 2) throw new Error('cmed csv: vazio')
    const header = lines[0].split(';')
    const idxSub = header.indexOf('SUBSTÂNCIA')
    const idxProd = header.indexOf('PRODUTO')
    const idxTipo = header.indexOf('TIPO DE PRODUTO (STATUS DO PRODUTO)')
    if (idxSub === -1 || idxProd === -1)
      throw new Error('cmed csv: colunas ausentes — ' + lines[0].slice(0, 120))
    const array = []
    const seen = {}
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line) continue
      const parts = parseCsvLine(line)
      const sub = (parts[idxSub] || '').trim()
      const name = (parts[idxProd] || '').trim()
      if (!name || !sub) continue
      const key = normKey(name)
      if (!key || seen[key]) continue
      seen[key] = true
      array.push(
        key,
        name,
        cleanIngredient(sub),
        idxTipo !== -1 ? (parts[idxTipo] || '').trim() : '',
      )
    }
    if (array.length < 4000) throw new Error('cmed csv: índice pequeno demais')
    const built = {
      loadedAt: new Date().getTime(),
      array: array,
      n: array.length / 4,
      source: 'cmed',
    }
    console.log('med-search (warmup): índice CMED reconstruído — ' + built.n + ' produtos')
    $app.store().set('medSearchIndexV2', built)
  } catch (err) {
    console.log('med-search (warmup): falhou — ' + err.message)
  }
})
