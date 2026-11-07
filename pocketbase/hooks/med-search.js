// PocketBase pb_hook: busca rápida de medicamentos BRASILEIROS (nome comercial
// + princípio ativo) para o cadastro de medicações da Clínica Soul.
//
// Fonte primária: dataset aberto oficial da ANVISA "DADOS_ABERTOS_MEDICAMENTOS.csv"
// (https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv, ~46 MB) —
// registros de medicamentos com nome do produto, categoria regulatória e
// princípio ativo. A API REST de consultas da ANVISA é bloqueada por
// Cloudflare Turnstile, então o hook baixa o CSV de dados abertos, filtra por
// registros ATIVOS e monta um índice em memória (nome comercial -> princípio
// ativo), recarregado no máximo uma vez por dia.
//
// Fallback: se o dataset da ANVISA falhar/estiver vazio, o hook consulta a API
// pública OpenFDA (rótulos dos EUA) — último recurso, mantém o comportamento
// anterior da v0.0.10.
//
// IMPORTANTE (JSVM PocketBase): helpers usados dentro do callback de routerAdd
// precisam ser declarados INLINE no callback — declarações top-level do arquivo
// geram ReferenceError (pool de VM separado).
//
// Rota: POST /backend/v1/meds/search  { term: "dipirona" }
// Resposta: 200 { source: "anvisa" | "openfda", results: [{label, activeIngredient}] }

routerAdd(
  'POST',
  '/backend/v1/meds/search',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.forbiddenError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const term = String(body.term || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join(' ')

    if (term.length < 3) {
      return e.json(200, { source: 'none', results: [] })
    }

    // ---------- cache em memória do índice ANVISA (variáveis de MÓDULO do
    // hook, compartilhadas entre as requisições do pool de VM; helpers não
    // podem ser top-level, mas estado simples pode) ----------
    const CACHE = $app.store().get('medSearchCache') || null
    const DAY_MS = 24 * 60 * 60 * 1000
    const now = new Date().getTime()
    const cacheFresh = CACHE && CACHE.loadedAt && now - CACHE.loadedAt < DAY_MS && CACHE.rows

    // ---------- helper inline: carrega/constroi o índice ANVISA ----------
    const loadAnvisaIndex = () => {
      if (cacheFresh) return CACHE

      const MAX_BYTES = 90 * 1024 * 1024
      const res = $http.send({
        url: 'https://dados.anvisa.gov.br/dados/DADOS_ABERTOS_MEDICAMENTOS.csv',
        method: 'GET',
        headers: { Accept: 'text/csv, */*' },
        timeout: 120,
      })

      if (res.statusCode !== 200 || !res.body) {
        throw new Error('anvisa csv: HTTP ' + res.statusCode)
      }
      const csv = res.body.toString()
      if (csv.length > MAX_BYTES) {
        console.log('med-search: CSV da ANVISA maior que o esperado (' + csv.length + ' chars)')
      }

      // O CSV da ANVISA usa ";" como separador e aspas duplas. Primeira linha
      // esperada: NOME_PRODUTO;DATA_VENCIMENTO_REGISTRO;CATEGORIA_REGULATORIA;NUMERO_REGISTRO;CLASSE_TERAPEUTICA;CNPJ_EMPRESA;SITUACAO_REGISTRO;PRINCIPIO_ATIVO
      const lines = csv.split('\n')
      if (lines.length < 2) throw new Error('anvisa csv: vazio')

      const header = lines[0].split(';')
      const idxName = header.indexOf('NOME_PRODUTO')
      const idxSit = header.indexOf('SITUACAO_REGISTRO')
      const idxCat = header.indexOf('CATEGORIA_REGULATORIA')
      const idxPrin = header.indexOf('PRINCIPIO_ATIVO')
      if (idxName === -1 || idxPrin === -1 || idxSit === -1) {
        throw new Error('anvisa csv: colunas esperadas não encontradas')
      }

      const rows = {}
      let loaded = 0
      const started = new Date().getTime()
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        if (!line) continue
        // Split simples respeitando aspas (os campos da ANVISA podem conter ";")
        const parts = []
        let cur = ''
        let inQuotes = false
        for (let c = 0; c < line.length; c++) {
          const ch = line[c]
          if (ch === '"') {
            inQuotes = !inQuotes
          } else if (ch === ';' && !inQuotes) {
            parts.push(cur)
            cur = ''
          } else {
            cur += ch
          }
        }
        parts.push(cur)

        const sit = (parts[idxSit] || '').trim().toUpperCase()
        if (sit !== 'ATIVO') continue

        const name = (parts[idxName] || '').trim()
        let prin = (parts[idxPrin] || '').trim()
        if (!name || !prin) continue

        // O princípio ativo vem completo com concentrações ("DIPIRONA SÓDICA 500MG")
        // — corta tudo a partir do primeiro número para ficar só a substância.
        prin = prin.replace(/\s*\d[\d.,]*\s*(MG|MCG|G|ML|UI|MCG\/ML|MG\/ML).*$/i, '').trim()
        prin = prin.replace(/[,;].*$/, '').trim()
        if (!prin) prin = (parts[idxPrin] || '').trim()

        const cat = idxCat !== -1 ? (parts[idxCat] || '').trim() : ''
        const key = name.toLowerCase()
        if (!rows[key]) {
          rows[key] = {
            label: name,
            activeIngredient: prin.slice(0, 160),
            category: cat,
          }
          loaded++
          // Teto de memória do JSVM: 300 mil registros ≈ o suficiente para a
          // busca por nome (o CSV tem ~250 mil linhas de registros ativos).
          if (loaded >= 400000) break
        }
      }

      const elapsed = new Date().getTime() - started
      console.log(
        'med-search: índice ANVISA carregado — ' +
          loaded +
          ' registros ativos em ' +
          elapsed +
          'ms',
      )
      if (loaded < 1000) throw new Error('anvisa csv: índice muito pequeno (' + loaded + ')')

      const index = { loadedAt: now, rows: rows }
      $app.store().set('medSearchCache', index)
      return index
    }

    // ---------- helper inline: busca no índice ANVISA ----------
    const searchAnvisa = (index) => {
      const termWords = term.split(/\s+/)
      const results = []
      const rows = index.rows
      for (const key in rows) {
        if (results.length >= 8) break
        const row = rows[key]
        // match: todos os termos digitados aparecem no nome (prefixo ou substring)
        let ok = true
        for (let w = 0; w < termWords.length; w++) {
          if (key.indexOf(termWords[w]) === -1) {
            ok = false
            break
          }
        }
        if (!ok) continue
        results.push({
          label: row.label,
          activeIngredient: row.activeIngredient,
          category: row.category,
        })
      }
      // Ordena: nomes que COMEÇAM com o termo primeiro, depois por tamanho
      results.sort((a, b) => {
        const aStarts = a.label.toLowerCase().indexOf(term) === 0 ? 0 : 1
        const bStarts = b.label.toLowerCase().indexOf(term) === 0 ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return a.label.length - b.label.length
      })
      return results.slice(0, 5)
    }

    // ---------- helper inline: fallback OpenFDA (rótulos dos EUA) ----------
    const searchOpenFda = () => {
      const words = term.split(/\s+/)
      const search = words
        .map((w) => '(openfda.brand_name:' + w + '* OR openfda.generic_name:' + w + '*)')
        .join(' AND ')
      const url =
        'https://api.fda.gov/drug/label.json?search=' + encodeURIComponent(search) + '&limit=10'
      const res = $http.send({ url: url, method: 'GET', timeout: 15 })
      if (res.statusCode === 404) return []
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
      return out
    }

    // ---------- fluxo principal ----------
    try {
      const index = loadAnvisaIndex()
      const results = searchAnvisa(index)
      if (results.length > 0) {
        return e.json(200, { source: 'anvisa', results: results })
      }
      // Nada na base brasileira: tenta OpenFDA como último recurso.
      try {
        const fallback = searchOpenFda()
        return e.json(200, { source: 'openfda', results: fallback })
      } catch (fErr) {
        console.log('med-search: fallback OpenFDA falhou — ' + fErr.message)
        return e.json(200, { source: 'none', results: [] })
      }
    } catch (err) {
      console.log('med-search: falha na fonte ANVISA — ' + err.message + ' — tentando OpenFDA')
      try {
        const fallback = searchOpenFda()
        return e.json(200, { source: 'openfda', results: fallback })
      } catch (fErr) {
        console.log('med-search: fallback OpenFDA também falhou — ' + fErr.message)
        return e.json(200, { source: 'none', results: [] })
      }
    }
  },
  $apis.requireAuth(),
)
