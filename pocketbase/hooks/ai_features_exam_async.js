// 3b. Análise ASSÍNCRONA de exames (v0.0.62+) — Clínica Soul.
//
// Problema: o analyze-exam síncrono demora até ~40s por requisição no gateway
// de IA e o ingress encerra conexões longas — o usuário via "Failed to fetch".
// Solução: o cliente renderiza as páginas e faz o UPLOAD em pedaços pequenos
// (kickoff 202 imediato); um runner em cron processa os lotes de até
// MAX_PAGES=5 páginas em background, persistindo o progresso em
// exams.analysis_progress — quedas/deploy não perdem o trabalho.
//
// Campos (migrations 0035–0038): analysis_status (running/done/error),
// analysis_error, analysis_started_at, analysis_stats (JSON final com
// contadores para o aviso do app), analysis_pages (JSON com as páginas JPEG),
// analysis_progress (JSON {total_pages, pages_done, attempts, summaries,
// biomarkers, ai_meta}).
//
// Regra JSVM: TODOS os helpers são declarados INLINE dentro dos callbacks
// (routerAdd/cronAdd) — declarações top-level não são visíveis entre pools.

routerAdd(
  'POST',
  '/backend/v1/ai/analyze-exam-async',
  (e) => {
    const authRecord = e.auth
    if (!authRecord || !authRecord.id) {
      return e.json(401, { error: 'Autenticação necessária' })
    }

    const data = e.requestInfo().body || {}
    const examId = data && data.examId ? String(data.examId).trim() : ''
    if (!examId) {
      return e.badRequestError('examId é obrigatório.')
    }

    let examRecord = null
    try {
      examRecord = $app.findRecordById('exams', examId)
    } catch (err) {
      return e.json(404, { error: 'Exame não encontrado: ' + err.message })
    }
    if (
      examRecord.getString('user') !== authRecord.id &&
      authRecord.getString('role') !== 'profissional'
    ) {
      return e.json(403, { error: 'Sem permissão para analisar este exame.' })
    }

    // Páginas deste pedaço (data URLs JPEG). O cliente envia em pedaços de
    // ~700KB para nunca estourar o limite do ingress (fonte do 413 original).
    let chunk = []
    if (data && Array.isArray(data.images)) {
      chunk = data.images.filter((img) => typeof img === 'string' && img.length > 0)
    } else if (data && typeof data.imageBase64 === 'string' && data.imageBase64.length > 0) {
      chunk = [data.imageBase64]
    }
    if (chunk.length === 0) {
      return e.badRequestError('Nenhuma página foi enviada para a leitura assíncrona.')
    }
    const totalPages =
      data && typeof data.total_pages === 'number' && data.total_pages > 0
        ? Math.floor(data.total_pages)
        : 0
    // restart=true (reenvio em resolução menor após recusa do gateway) limpa a
    // fila antes de anexar.
    const restart = data && data.restart === true

    // Anexa o pedaço às páginas já enfileiradas.
    let pages = []
    if (!restart) {
      try {
        const prevRaw = examRecord.getString('analysis_pages') || ''
        if (prevRaw) {
          const prev = JSON.parse(prevRaw)
          if (Array.isArray(prev)) pages = prev
        }
      } catch (_) {
        pages = []
      }
    }
    for (let i = 0; i < chunk.length; i++) pages.push(chunk[i])

    const wasRunning = examRecord.getString('analysis_status') === 'running'
    try {
      examRecord.set('analysis_status', 'running')
      examRecord.set('analysis_error', '')
      examRecord.set('analysis_stats', '')
      // Mantém o started_at original se a análise já estava correndo (retomada
      // de pedaço); novo kickoff (venha de done/error/vazio) recomeça o relógio.
      const currentStarted = examRecord.getString('analysis_started_at') || ''
      if (!wasRunning || !currentStarted || restart) {
        examRecord.set('analysis_started_at', new Date().toISOString())
      }
      // O campo analysis_pages é TEXT: gravar o array JS cru faz o PocketBase
      // cast para "" — o runner lia fila vazia e abortava. Serializar SEMPRE.
      examRecord.set('analysis_pages', JSON.stringify(pages))

      // Novo envio (kickoff/restart) zera o progresso; pedaço de continuação
      // preserva o que já foi enfileirado.
      let progress = null
      try {
        const rawProgress = examRecord.getString('analysis_progress') || ''
        if (rawProgress) progress = JSON.parse(rawProgress)
      } catch (_) {
        progress = null
      }
      if (
        !progress ||
        typeof progress !== 'object' ||
        typeof progress.pages_done !== 'number' ||
        restart
      ) {
        progress = {
          total_pages: totalPages,
          pages_done: 0,
          attempts: 0,
          summaries: [],
          biomarkers: [],
          ai_meta: null,
        }
      }
      if (totalPages > 0) progress.total_pages = totalPages
      // O campo analysis_progress é TEXT: gravar o objeto JS cru faz o
      // PocketBase cast para "" — o runner nunca lia o progresso e o exame
      // ficava em "Analisando…" para sempre. Serializar SEMPRE como JSON.
      examRecord.set('analysis_progress', JSON.stringify(progress))
      $app.save(examRecord)
    } catch (err) {
      return e.json(500, { error: 'Falha ao enfileirar a análise: ' + err.message })
    }

    console.log(
      'analyze-exam-async: exame ' +
        examId +
        ' — pedaço com ' +
        chunk.length +
        ' página(s) enfileirado (total ' +
        pages.length +
        ' de ' +
        totalPages +
        ')',
    )
    return e.json(202, {
      success: true,
      accepted: true,
      exam_id: examId,
      analysis_status: 'running',
      pages_queued: pages.length,
      total_pages: totalPages,
    })
  },
  $apis.requireAuth(),
)

// Runner: a cada minuto processa até 2 lotes de até MAX_PAGES páginas por
// exame em análise (novos primeiro). Só começa quando TODOS os pedaços do
// cliente chegaram (pages.length >= total_pages).
cronAdd('examAnalysisRunner', '* * * * *', () => {
  const MAX_PAGES = 5
  const MAX_BATCHES_PER_TICK = 2
  const STALE_MS = 20 * 60 * 1000
  const EMPTY_STALE_MS = 2 * 60 * 1000

  // ---- helpers INLINE (pool de VM do JSVM) ----
  const extractJsonBlock = (text) => {
    if (!text || typeof text !== 'string') return null
    let cleaned = text.trim()
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenceMatch && fenceMatch[1]) cleaned = fenceMatch[1].trim()
    try {
      return JSON.parse(cleaned)
    } catch (_) {
      const first = cleaned.indexOf('{')
      const last = cleaned.lastIndexOf('}')
      if (first !== -1 && last !== -1 && last > first) {
        try {
          return JSON.parse(cleaned.slice(first, last + 1))
        } catch (_) {}
      }
    }
    return null
  }

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

  const failExam = (exam, message) => {
    try {
      exam.set('analysis_status', 'error')
      exam.set('analysis_error', message)
      exam.set('analysis_pages', '')
      exam.set('analysis_progress', '')
      $app.save(exam)
      console.log('examAnalysisRunner: exame ' + exam.id + ' marcado como erro: ' + message)
    } catch (err) {
      console.log(
        'examAnalysisRunner: falha ao marcar erro do exame ' + exam.id + ': ' + err.message,
      )
    }
  }

  const startedToMs = (raw) => {
    if (!raw) return NaN
    let s = String(raw).trim().replace(' ', 'T')
    // getString de um campo date já vem com 'Z' — acrescentar outro 'Z'
    // gerava "…ZZ", Date inválido e a expiração STALE_MS nunca disparava.
    if (!/Z$/.test(s) && !/[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z'
    const t = Date.parse(s)
    return isNaN(t) ? NaN : t
  }

  const parseJsonField = (raw, fallback) => {
    if (raw === null || raw === undefined || raw === '') return fallback
    // O SDK pode devolver o campo JSON já decodificado (array/objeto JS).
    if (Array.isArray(raw) || typeof raw === 'object') return raw
    try {
      const v = JSON.parse(String(raw))
      return v === null || v === undefined ? fallback : v
    } catch (_) {
      return fallback
    }
  }

  let queued = []
  try {
    queued = $app.findRecordsByFilter(
      'exams',
      "analysis_status = 'running'",
      'analysis_started_at',
      5,
      0,
    )
  } catch (err) {
    console.log('examAnalysisRunner: erro ao buscar fila: ' + err.message)
    return
  }
  if (queued.length === 0) return

  for (let q = 0; q < queued.length; q++) {
    const exam = queued[q]
    const nowMs = Date.now()

    // ---- Expiração ----
    try {
      const startedRaw = exam.getString('analysis_started_at') || ''
      if (startedRaw) {
        const startedMs = startedToMs(startedRaw)
        if (!isNaN(startedMs) && nowMs - startedMs > STALE_MS) {
          failExam(
            exam,
            'A análise excedeu o tempo máximo e foi interrompida. Use "Reanalisar com IA" para tentar novamente.',
          )
          continue
        }
      }
    } catch (_) {}

    const pages = parseJsonField(exam.getString('analysis_pages') || '', [])
    let progress = parseJsonField(exam.getString('analysis_progress') || '', null)
    if (!progress || typeof progress !== 'object') {
      if (pages.length > 0) {
        // Páginas chegaram mas o progresso se perdeu (kickoff antigo que gravava
        // objeto cru num campo text): reconstrói e processa em vez de ignorar.
        progress = {
          total_pages: pages.length,
          pages_done: 0,
          attempts: 0,
          summaries: [],
          biomarkers: [],
          ai_meta: null,
        }
      } else {
        // Sem páginas e sem progresso: o kickoff nunca completou.
        try {
          const startedRaw2 = exam.getString('analysis_started_at') || ''
          const startedMs2 = startedRaw2 ? startedToMs(startedRaw2) : 0
          if (!startedMs2 || isNaN(startedMs2) || nowMs - startedMs2 > EMPTY_STALE_MS) {
            failExam(exam, 'A fila de páginas da análise está vazia. Use "Reanalisar com IA".')
          }
        } catch (_) {}
        continue
      }
    }

    const totalPages = typeof progress.total_pages === 'number' ? progress.total_pages : 0
    if (totalPages > 0 && pages.length < totalPages) {
      // O cliente ainda está enviando os pedaços — espera o próximo tick.
      continue
    }
    if (pages.length === 0) {
      if (totalPages === 0) {
        try {
          const startedRaw3 = exam.getString('analysis_started_at') || ''
          const startedMs3 = startedRaw3 ? startedToMs(startedRaw3) : 0
          if (!startedMs3 || isNaN(startedMs3) || nowMs - startedMs3 > EMPTY_STALE_MS) {
            failExam(exam, 'Nenhuma página recebida para análise. Use "Reanalisar com IA".')
          }
        } catch (_) {}
      }
      continue
    }
    if (typeof progress.pages_done !== 'number' || progress.pages_done < 0) progress.pages_done = 0
    if (!Array.isArray(progress.summaries)) progress.summaries = []
    if (!Array.isArray(progress.biomarkers)) progress.biomarkers = []
    if (typeof progress.attempts !== 'number') progress.attempts = 0

    // ---- Processa até MAX_BATCHES_PER_TICK lotes ----
    let consolidated = false
    for (let batch = 0; batch < MAX_BATCHES_PER_TICK; batch++) {
      if (progress.pages_done >= pages.length) break
      const batchStart = progress.pages_done
      const batchPages = pages.slice(batchStart, batchStart + MAX_PAGES)
      const batchIndex = Math.floor(batchStart / MAX_PAGES)
      const batchTotal = Math.ceil(pages.length / MAX_PAGES)
      const isLastBatch = batchStart + batchPages.length >= pages.length
      const hasPrevious = progress.biomarkers.length > 0 || progress.summaries.length > 0
      const userId = exam.getString('user')
      const titleHint = exam.getString('title')

      console.log(
        'examAnalysisRunner: exame ' +
          exam.id +
          ' — lote ' +
          (batchIndex + 1) +
          '/' +
          batchTotal +
          ' (páginas ' +
          (batchStart + 1) +
          '-' +
          (batchStart + batchPages.length) +
          ' de ' +
          pages.length +
          ')',
      )

      // ---- Prompt (mesmo do fluxo síncrono) ----
      const systemPrompt =
        'Você é um médico patologista clínico e especialista em medicina diagnóstica da Clínica Soul com visão computacional de alta precisão. ' +
        (hasPrevious
          ? 'Você está processando UM LOTE de páginas de um laudo maior, em conjunto com resultados já extraídos de lotes anteriores enviados no texto. '
          : '') +
        'Você receberá páginas digitalizadas/fotos em alta nitidez de um laudo de exame (pode ser laboratorial — Hemograma completo, Perfil Lipídico, Bioquímica, Hormônios — ou de imagem: Ressonância, Tomografia, Ultrassom, Endoscopia, Eletrocardiograma, Raio-X etc.). ' +
        'Antes de extrair, IDENTIFIQUE sozinho do que o documento se trata e preencha "exam_title" e "exam_type" de acordo (ex: "Hemograma Completo", "Perfil Lipídico", "Ressonância Magnética de Lombar", "Endoscopia Digestiva Alta"). ' +
        'Se for um laudo de imagem/imagemológica, extraia como "biomarkers" apenas os achados mensuráveis citados (medidas, graus, dimensões), e capriche no "summary_text" com a conclusão do radiologista. ' +
        'Sua missão é extrair com precisão absoluta TODAS as linhas de resultados que constam no laudo — a lista completa de analises do painel, página por página, de cima a baixo. ' +
        'NÃO limite a extração a exemplos, catálogos ou listas predefinidas de marcadores: NENHUM resultado presente no laudo pode ficar de fora, mesmo que não seja um exame comum, ' +
        'não esteja em nenhum catálogo interno, tenha nome abreviado ou código de exame. ' +
        'Os exemplos citados são ilustrativos — a regra é: se o laudo traz a linha de resultado, ela vira um item de "biomarkers". ' +
        'Marcadores de subfrações, índices calculados (RNI, razões), comentários numéricos do rodapé e qualquer linha com valor + unidade + referência também entram. ' +
        'Diretrizes obrigatórias:\n' +
        '1. Percorra TODAS as páginas do laudo e extraia CADA linha de resultado individualmente.\n' +
        '2. Em "value", forneça o número limpo (use ponto decimal). Não coloque a unidade no campo "value".\n' +
        '3. Em "unit", forneça a unidade exata impressa (ex: "g/dL", "%", "fL", "pg", "/µL", "mg/dL"). Se não constar, deixe vazio.\n' +
        '4. Em "reference_range", descreva sucintamente a faixa de referência normal indicada no laudo.\n' +
        '5. em "status", classifique como "otimo" (dentro da normalidade) ou "alterado" (fora da faixa indicada).\n' +
        '6. Em "exam_date", extraia a data de coleta no formato AAAA-MM-DD. Se não encontrar, deixe vazio.\n' +
        '7. Em "summary_text", forneça um resumo clínico legível, bem formatado com quebras de linha e seções.\n' +
        '8. Antes de responder, CONFIRA linha por linha do laudo: cada linha de resultado impressa deve ter um item correspondente em "biomarkers".\n' +
        'Responda ESTRITAMENTE em JSON válido, sem texto fora do JSON, no formato:\n' +
        '{\n' +
        '  "exam_title": "Hemograma Completo",\n' +
        '  "exam_type": "Exame de Sangue",\n' +
        '  ' +
        '"exam_date": "2026-11-07",\n' +
        '  "laboratory": "Nome do Laboratório",\n' +
        '  "overall_status": "normal" | "alterado",\n' +
        '  "summary_text": "resumo clínico completo",\n' +
        '  "biomarkers": [ { "name": "Hemoglobina", "value": "15.1", "unit": "g/dL", "reference_range": "13.0 a 17.5 g/dL", "status": "otimo" } ]\n' +
        '}'

      const meta = progress.ai_meta || {}
      const previousBiomarkersText = hasPrevious
        ? '\n\nMARCADORES JÁ EXTRAÍDOS EM PARTES ANTERIORES (não repita nenhum destes):\n' +
          progress.biomarkers
            .map(function (b) {
              return '- ' + (b && b.name ? b.name : '')
            })
            .join('\n')
        : ''
      const lastSummary =
        progress.summaries.length > 0 ? progress.summaries[progress.summaries.length - 1] : ''
      const previousSummaryText =
        hasPrevious && lastSummary
          ? '\n\nRESUMO PARCIAL DAS PARTES ANTERIORES (continue a partir dele):\n' + lastSummary
          : ''
      const promptIntro =
        'Analise atentamente as ' +
        batchPages.length +
        ' página(s) deste laudo de exame (' +
        titleHint +
        '). Extraia a LISTA COMPLETA de resultados: todas as linhas de analises do laudo, incluindo marcadores fora de qualquer catálogo, com valores, unidades e referências — e elabore o resumo.' +
        (hasPrevious
          ? ' ESTA É A PÁGINA ' +
            (batchStart + 1) +
            ' EM DIANTE DE ' +
            pages.length +
            ' DO LAUDO (leitura em partes): extraia SOMENTE as linhas visíveis nestas imagens, sem repetir marcadores de partes anteriores e sem inventar linhas que não estão visíveis.'
          : '')

      const buildUserContent = (variant) => {
        const parts = [
          { type: 'text', text: promptIntro + previousBiomarkersText + previousSummaryText },
        ]
        for (let p = 0; p < batchPages.length; p++) {
          const imgUrl = batchPages[p]
          if (variant === 'string-url') {
            parts.push({ type: 'image_url', image_url: imgUrl })
          } else if (variant === 'object') {
            parts.push({ type: 'image_url', image_url: { url: imgUrl } })
          } else {
            parts.push({ type: 'image_url', image_url: { url: imgUrl, detail: 'high' } })
          }
        }
        return parts
      }

      const attempts = [
        { model: 'reasoning', variant: 'object-high' },
        { model: 'reasoning', variant: 'object' },
        { model: 'reasoning', variant: 'string-url' },
        { model: 'fast', variant: 'object' },
        { model: 'fast', variant: 'string-url' },
        { model: 'vision', variant: 'object' },
        { model: 'vision', variant: 'string-url' },
      ]

      let parsed = null
      let lastErrDetail = ''
      for (let i = 0; i < attempts.length && !parsed; i++) {
        const attempt = attempts[i]
        try {
          const reply = $ai.chat({
            model: attempt.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: buildUserContent(attempt.variant) },
            ],
          })
          const raw =
            reply.choices && reply.choices[0] && reply.choices[0].message
              ? String(reply.choices[0].message.content || '')
              : ''
          console.log(
            'examAnalysisRunner: modelo ' +
              attempt.model +
              '/' +
              attempt.variant +
              ' respondeu (' +
              raw.length +
              ' chars)',
          )
          parsed = extractJsonBlock(raw)
          if (parsed && parsed.error && String(parsed.error).indexOf('NO_IMAGE_RECEIVED') !== -1) {
            parsed = null
            continue
          }
          if (
            parsed &&
            !(
              (Array.isArray(parsed.biomarkers) && parsed.biomarkers.length > 0) ||
              parsed.summary_text
            )
          ) {
            parsed = null
          }
        } catch (err) {
          const detail =
            'modelo=' +
            attempt.model +
            ', variante=' +
            attempt.variant +
            ', erro=' +
            (err && err.message ? err.message : String(err))
          console.log('examAnalysisRunner: falha na tentativa de IA — ' + detail)
          lastErrDetail = detail
        }
      }

      if (!parsed) {
        progress.attempts = (progress.attempts || 0) + 1
        if (progress.attempts >= 3) {
          failExam(
            exam,
            'O serviço de IA não conseguiu ler o laudo (' +
              (lastErrDetail || 'todas as tentativas falharam') +
              '). Use "Reanalisar com IA" para tentar novamente.',
          )
          consolidated = true
          break
        }
        // Erro transitório do gateway: persiste o progresso e tenta no próximo tick.
        try {
          exam.set('analysis_progress', JSON.stringify(progress))
          $app.save(exam)
        } catch (err) {
          console.log('examAnalysisRunner: falha ao salvar progresso: ' + err.message)
        }
        consolidated = true
        break
      }

      // ---- Acumula o material do lote ----
      if (
        parsed.summary_text &&
        typeof parsed.summary_text === 'string' &&
        parsed.summary_text.trim()
      ) {
        progress.summaries.push(parsed.summary_text.trim())
      }
      const batchList = Array.isArray(parsed.biomarkers) ? parsed.biomarkers : []
      for (let k = 0; k < batchList.length; k++) {
        const b = batchList[k]
        if (!b || !b.name || !b.value) continue
        progress.biomarkers.push({
          name: String(b.name).trim(),
          value: String(b.value).trim(),
          unit: b.unit ? String(b.unit).trim() : '',
          reference_range: b.reference_range ? String(b.reference_range).trim() : '',
          status: b.status === 'alterado' ? 'alterado' : 'otimo',
        })
      }
      const aiMeta = {}
      if (parsed.exam_title && typeof parsed.exam_title === 'string')
        aiMeta.exam_title = parsed.exam_title.trim()
      if (parsed.exam_type && typeof parsed.exam_type === 'string')
        aiMeta.exam_type = parsed.exam_type.trim()
      if (parsed.laboratory && typeof parsed.laboratory === 'string')
        aiMeta.laboratory = parsed.laboratory.trim()
      if (parsed.exam_date && typeof parsed.exam_date === 'string')
        aiMeta.exam_date = parsed.exam_date.trim()
      if (parsed.overall_status === 'alterado' || parsed.overall_status === 'normal') {
        aiMeta.overall_status = parsed.overall_status
      }
      progress.ai_meta = Object.assign({}, meta, aiMeta)
      progress.pages_done = batchStart + batchPages.length

      if (!isLastBatch) {
        try {
          // Mesmo bug do kickoff: gravar objeto JS num campo text faz o
          // PocketBase cast para "". Serializar SEMPRE como JSON string.
          exam.set('analysis_progress', JSON.stringify(progress))
          $app.save(exam)
        } catch (err) {
          failExam(exam, 'Falha ao salvar o progresso da análise: ' + err.message)
          consolidated = true
          break
        }
        console.log(
          'examAnalysisRunner: lote ' +
            (batchIndex + 1) +
            '/' +
            batchTotal +
            ' concluído; aguardando próximo tick',
        )
        continue
      }

      // ---- Último lote: consolida exams + profile_biomarkers ----
      let biomarkersCollection = null
      try {
        biomarkersCollection = $app.findCollectionByNameOrId('profile_biomarkers')
      } catch (err) {
        console.log('examAnalysisRunner: coleção profile_biomarkers indisponível: ' + err.message)
      }

      const summaryText = progress.summaries.join('\n\n')
      const finalMeta = progress.ai_meta || {}
      const examDate =
        finalMeta.exam_date && finalMeta.exam_date.trim()
          ? finalMeta.exam_date.trim()
          : exam.getString('date')
      const labName = finalMeta.laboratory || ''
      const overallStatus = finalMeta.overall_status === 'alterado' ? 'alterado' : 'normal'
      const aiExamTitle = finalMeta.exam_title || ''
      const aiExamType = finalMeta.exam_type || ''

      let createdCount = 0
      let updatedCount = 0
      if (biomarkersCollection) {
        let existingBiomarkers = []
        try {
          existingBiomarkers = $app.findRecordsByFilter(
            'profile_biomarkers',
            'user = {:user}',
            '-date,-created',
            500,
            0,
            { user: userId },
          )
        } catch (err) {
          console.log('examAnalysisRunner: erro ao buscar profile_biomarkers: ' + err.message)
        }
        const existingMap = new Map()
        for (let m = 0; m < existingBiomarkers.length; m++) {
          const rec = existingBiomarkers[m]
          const nKey = normalizeKey(rec.getString('name'))
          if (nKey && !existingMap.has(nKey)) existingMap.set(nKey, rec)
        }
        for (let j = 0; j < progress.biomarkers.length; j++) {
          const bio = progress.biomarkers[j]
          const normKey = normalizeKey(bio.name)
          const existing = existingMap.get(normKey)
          try {
            if (existing) {
              existing.set('value', bio.value)
              if (bio.unit) existing.set('unit', bio.unit)
              if (bio.reference_range) existing.set('reference_range', bio.reference_range)
              if (bio.status) existing.set('status', bio.status)
              if (examDate) existing.set('date', examDate)
              existing.set(
                'notes',
                'Atualizado automaticamente por IA a partir do exame ' + titleHint,
              )
              $app.save(existing)
              updatedCount++
            } else {
              const newRec = new Record(biomarkersCollection)
              newRec.set('user', userId)
              newRec.set('name', bio.name)
              newRec.set('value', bio.value)
              newRec.set('unit', bio.unit || '')
              newRec.set('reference_range', bio.reference_range || '')
              newRec.set('status', bio.status || 'otimo')
              newRec.set('date', examDate)
              newRec.set('notes', 'Extraído automaticamente por IA a partir do exame ' + titleHint)
              $app.save(newRec)
              createdCount++
              existingMap.set(normKey, newRec)
            }
          } catch (saveErr) {
            console.log(
              'examAnalysisRunner: erro ao salvar biomarcador ' + bio.name + ': ' + saveErr.message,
            )
          }
        }
      }

      try {
        if (summaryText) exam.set('summary_results', summaryText)
        if (
          overallStatus &&
          (!exam.getString('status') || exam.getString('status') === 'pendente')
        ) {
          exam.set('status', overallStatus)
        }
        if (labName && !exam.getString('laboratory')) exam.set('laboratory', labName)
        if (aiExamType) exam.set('type', aiExamType)
        if (aiExamTitle && exam.getString('title') !== aiExamTitle) exam.set('title', aiExamTitle)
        exam.set('analysis_status', 'done')
        exam.set('analysis_error', '')
        exam.set('analysis_pages', '')
        exam.set('analysis_progress', '')
        exam.set(
          'analysis_stats',
          JSON.stringify({
            extracted: progress.biomarkers.length,
            created: createdCount,
            updated: updatedCount,
            pages_analyzed: pages.length,
          }),
        )
        $app.save(exam)
        console.log(
          'examAnalysisRunner: CONCLUÍDO exame ' +
            exam.id +
            '. Extraídos: ' +
            progress.biomarkers.length +
            ', criados: ' +
            createdCount +
            ', atualizados: ' +
            updatedCount,
        )
      } catch (err) {
        failExam(exam, 'Falha ao consolidar a análise: ' + err.message)
      }
      consolidated = true
      break
    }
    if (consolidated) continue
  }
})
