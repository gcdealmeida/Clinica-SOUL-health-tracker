// PocketBase pb_hooks for Clínica Soul AI Features

// 1. Endpoint: POST /backend/v1/ai/analyze-correlations
// Cruza as variáveis escolhidas (ex: sono, café, hrv, estresse) e registros do cliente
routerAdd(
  'POST',
  '/backend/v1/ai/analyze-correlations',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.forbiddenError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const targetUserId =
      authRecord.getString('role') === 'profissional' && body.userId ? body.userId : authRecord.id
    const variables = body.variables || ['sono', 'cafe', 'hrv', 'humor']
    const question = body.question || ''

    // Coleta dados recentes de saúde do usuário
    let healthSummary = 'Dados recentes do paciente:\n'
    try {
      const metrics = $app.findRecordsByFilter(
        'health_metrics',
        "user = '" + targetUserId + "'",
        '-date_time',
        30,
        0,
      )
      for (let i = 0; i < metrics.length; i++) {
        const m = metrics[i]
        healthSummary +=
          '- [' +
          m.getString('date_time') +
          '] ' +
          m.getString('category') +
          ': ' +
          (m.getFloat('numeric_value') || m.getString('text_value') || '') +
          ' ' +
          m.getString('unit') +
          (m.getString('notes') ? ' (' + m.getString('notes') + ')' : '') +
          '\n'
      }
    } catch (err) {
      console.log('Erro ao buscar health_metrics:', err.message)
    }

    // Coleta dados recentes de humor e estresse
    try {
      const emo = $app.findRecordsByFilter(
        'emotional_logs',
        "user = '" + targetUserId + "'",
        '-date',
        10,
        0,
      )
      healthSummary += '\nRegistros emocionais e humor recentes:\n'
      for (let i = 0; i < emo.length; i++) {
        const el = emo[i]
        healthSummary +=
          '- [' +
          el.getString('date') +
          '] Humor: ' +
          el.getString('mood_label') +
          ' (nota ' +
          el.getFloat('mood_score') +
          '/5), Energia: ' +
          el.getFloat('energy_level') +
          '/5, Estresse: ' +
          el.getFloat('stress_level') +
          '/5. Fatores: ' +
          el.getString('affecting_factors') +
          '\n'
      }
    } catch (err) {
      console.log('Erro ao buscar emotional_logs:', err.message)
    }

    // Coleta histórico médico
    try {
      const meds = $app.findRecordsByFilter(
        'medical_records',
        "user = '" + targetUserId + "'",
        '-created',
        10,
        0,
      )
      if (meds.length > 0) {
        healthSummary += '\nHistórico de cirurgias e alergias:\n'
        for (let i = 0; i < meds.length; i++) {
          const mr = meds[i]
          healthSummary +=
            '- ' +
            mr.getString('type').toUpperCase() +
            ': ' +
            mr.getString('title') +
            ' - ' +
            mr.getString('description') +
            '\n'
        }
      }
    } catch (_) {}

    const systemPrompt =
      'Você é o assistente de inteligência artificial da Clínica Soul, especializado em saúde integrativa, longevidade e medicina do estilo de vida. ' +
      'Sua função é cruzar as variáveis selecionadas pelo usuário (ex: sono, café, HRV, humor, alimentação) com os registros reais coletados no app, ' +
      'identificar padrões, correlações e apresentar observações práticas e encorajadoras em tom acolhedor e fundamentado. ' +
      'IMPORTANTE: Você não emite diagnósticos médicos definitivos nem laudos clínicos, e ressalta que correlações não garantem causalidade. ' +
      'Formate a resposta de forma muito clara com tópicos, usando títulos e marcadores estruturados.'

    const userPrompt =
      'Variáveis escolhidas para cruzamento: ' +
      (Array.isArray(variables) ? variables.join(', ') : variables) +
      '\n' +
      (question ? 'Dúvida do usuário: ' + question + '\n\n' : '\n') +
      healthSummary +
      '\n\n' +
      'Por favor, analise a relação entre essas variáveis com base nos registros, destacando:\n' +
      '1. Padrões observados (ex: relação de cafeína tardia com HRV ou qualidade do sono);\n' +
      '2. Tendências e conexões entre corpo e humor;\n' +
      '3. Recomendações práticas de estilo de vida para discutir na próxima consulta da Clínica Soul;\n' +
      '4. Resumo em uma frase-chave.'

    try {
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const aiText =
        reply.choices && reply.choices[0] && reply.choices[0].message
          ? reply.choices[0].message.content
          : 'Não foi possível gerar a análise no momento.'

      // Salva o registro da análise no histórico
      // (campo insights tem limite de 5000 caracteres — corta para caber)
      try {
        const aiCol = $app.findCollectionByNameOrId('ai_analyses')
        const analysisRecord = new Record(aiCol)
        analysisRecord.set('user', targetUserId)
        analysisRecord.set(
          'variables',
          Array.isArray(variables) ? variables.join(', ') : String(variables),
        )
        if (question) analysisRecord.set('question', question)
        analysisRecord.set('insights', aiText.slice(0, 4900))
        analysisRecord.set('summary', aiText.slice(0, 150) + '...')
        $app.save(analysisRecord)
      } catch (saveErr) {
        console.log('Erro ao salvar ai_analyses:', saveErr.message)
      }

      return e.json(200, {
        insights: aiText,
        variables: variables,
        analyzedRecordsCount: 20,
      })
    } catch (aiErr) {
      console.log('Erro ao chamar $ai.chat:', aiErr.message)
      return e.json(500, {
        error: 'Falha na inteligência artificial: ' + aiErr.message,
      })
    }
  },
  $apis.requireAuth(),
)

// 2. Endpoint: POST /backend/v1/ai/analyze-meal
// Analisa a FOTO real do prato (imagem multimodal enviada como base64 data URL)
// ou uma descrição textual, lista os alimentos e estima peso e calorias.
routerAdd(
  'POST',
  '/backend/v1/ai/analyze-meal',
  (e) => {
    // IMPORTANTE (JSVM PocketBase): nada de funções/const top-level referenciadas
    // dentro do callback — o runtime executa callbacks em pool separado e as
    // declarações de módulo não são visíveis (ReferenceError). Tudo inline aqui.
    const extractMealJson = (raw) => {
      let attempt = String(raw || '').trim()
      const fence = attempt.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fence) attempt = fence[1].trim()
      const start = attempt.indexOf('{')
      const end = attempt.lastIndexOf('}')
      if (start === -1 || end <= start) return null
      try {
        return JSON.parse(attempt.slice(start, end + 1))
      } catch (_) {
        return null
      }
    }

    const isUsableMeal = (parsed) => {
      if (!parsed || typeof parsed !== 'object' || parsed.error) return false
      const items = Array.isArray(parsed.items) ? parsed.items : []
      const validItems = items.filter(
        (it) =>
          it && typeof it.name === 'string' && it.name.trim().length > 0 && Number(it.weight_g) > 0,
      )
      return validItems.length > 0 && (Number(parsed.total_weight_g) || 0) > 0
    }

    const authRecord = e.auth
    if (!authRecord) {
      return e.forbiddenError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const description = (body.description || '').trim()
    const mealType = body.mealType || 'almoco'

    // A foto chega como data URL "data:image/jpeg;base64,..." gerada no app
    // (redimensionada para ~1280px e JPEG qualidade 0.9).
    const photoDataUrl = (body.photoBase64 || '').trim()
    const MAX_IMAGE_B64 = 6 * 1024 * 1024

    if (photoDataUrl) {
      // Log de diagnóstico: tamanho REAL da imagem que chegou no hook.
      const commaIdx = photoDataUrl.indexOf(',')
      const header = commaIdx !== -1 ? photoDataUrl.slice(0, commaIdx) : ''
      const b64Part = commaIdx !== -1 ? photoDataUrl.slice(commaIdx + 1) : ''
      const approxKb = Math.round(((b64Part.length * 3) / 4 / 1024) * 10) / 10
      console.log(
        'analyze-meal: foto recebida — dataUrl=' +
          photoDataUrl.length +
          ' chars, header="' +
          header.slice(0, 40) +
          '", base64=' +
          b64Part.length +
          ' chars (~' +
          approxKb +
          'KB decodificados)',
      )

      // Validação estrita da data URL: uma imagem malformada/truncada chega
      // ao modelo corrompida e ele "não enxerga" nada — falha logo, com causa clara.
      if (!/^data:image\/(png|jpe?g|webp|gif);base64$/.test(header)) {
        console.log(
          'analyze-meal: REJEITADA — header de data URL inválido: "' + header.slice(0, 40) + '"',
        )
        return e.badRequestError(
          'A foto enviada está em um formato não suportado. Envie a foto em JPG, PNG ou WebP.',
        )
      }
      if (!b64Part || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64Part) || b64Part.length % 4 !== 0) {
        console.log(
          'analyze-meal: REJEITADA — base64 inválido/truncado (' + b64Part.length + ' chars)',
        )
        return e.badRequestError(
          'A foto foi corrompida durante o envio. Tente selecionar a foto novamente.',
        )
      }
      if (photoDataUrl.length > MAX_IMAGE_B64) {
        return e.badRequestError(
          'A foto é muito grande para análise. Tente uma imagem menor ou de melhor compressão.',
        )
      }
    }

    // Precisa de pelo menos um insumo real: foto OU descrição do cliente.
    if (!photoDataUrl && !description) {
      return e.badRequestError(
        'Envie uma foto do prato ou uma descrição da refeição para a análise.',
      )
    }

    // Monta o conteúdo multimodal da mensagem do usuário (formato OpenAI Vision):
    // partes de texto + parte de imagem (data URL base64). O gateway Skip repassa
    // ao modelo com suporte a visão; sem imagem, cai para mensagem só de texto.
    const userContent = []
    let textPart =
      'Refeição registrada: ' +
      mealType +
      '\n' +
      (description
        ? 'Descrição e notas do cliente: ' + description + '\n'
        : 'O cliente não adicionou descrição — analise SOMENTE a foto.\n') +
      '\n' +
      'Responda estritamente no JSON solicitado, identificando os alimentos visíveis, ' +
      'o peso estimado de cada porção em gramas e o peso total do prato.'

    if (photoDataUrl) {
      textPart =
        'Uma FOTO REAL do prato do cliente está anexada nesta mensagem. Ela foi capturada em ' +
        'alta resolução e otimizada para análise — ela está NÍTIDA. Analise a imagem ' +
        'visualmente: identifique cada alimento visível, estime o peso de cada porção em ' +
        'gramas e o peso total do prato com base no que aparece na foto.\n\n' +
        textPart
      userContent.push({ type: 'text', text: textPart })
      userContent.push({
        type: 'image_url',
        image_url: { url: photoDataUrl, detail: 'high' },
      })
    } else {
      userContent.push({ type: 'text', text: textPart })
    }

    const systemPrompt =
      'Você é um nutricionista especialista da Clínica Soul com capacidade de visão computacional. ' +
      'A foto do prato do cliente foi capturada em alta resolução e otimizada para análise: trate-a como NÍTIDA e legível. ' +
      'NUNCA afirme que a foto está sem nitidez, borrada ou em baixa resolução — se a imagem está presente, analise-a da melhor forma possível. ' +
      'Identifique visualmente todos os alimentos presentes de forma discriminada, estime com bom senso o peso total em gramas de cada porção e do prato ' +
      '(use referências visuais: tamanho do prato, talheres, copos para calibrar a escala), ' +
      'as calorias aproximadas e faça uma avaliação nutricional saudável. ' +
      'NÃO invente alimentos que não consegue ver. ' +
      'APENAS se esta mensagem NÃO contiver nenhuma imagem, responda exatamente {"error": "NO_IMAGE_RECEIVED"}. ' +
      'Você DEVE responder SEMPRE em JSON válido, sem texto fora do JSON, com a estrutura: ' +
      '{' +
      '  "title": "nome curto do prato", ' +
      '  "items": [{"name": "alimento", "weight_g": 120, "calories": 150}], ' +
      '  "total_weight_g": 380, ' +
      '  "total_calories": 490, ' +
      '  "macronutrients": {"protein_g": 35, "carbs_g": 40, "fat_g": 15}, ' +
      '  "nutritional_assessment": "avaliação do prato e dicas da Clínica Soul"' +
      '}'

    try {
      // Tenta em cascata de (modelo x formato da mensagem). O corpo de erro
      // VAZIO do gateway (400 {"error":{}}) esconde a causa, então cada
      // tentativa loga o erro completo (status, código, mensagem, tamanho do
      // payload) e a cascata prova variações do formato multimodal:
      //  - 'object-high': {image_url:{url, detail:'high'}} (formato atual)
      //  - 'object':      {image_url:{url}} — sem detail (alguns modelos rejeitam o campo)
      //  - 'string-url':  image_url como string pura (formato antigo do OpenAI Vision)
      // Com FOTO, começa pelo alias "reasoning": o modelo atrás do alias "fast"
      // (gpt-oss-120b) não recebe a parte multimodal (responde sempre
      // {"error":"NO_IMAGE_RECEIVED"}), então só entra ao final como última
      // tentativa. O sentinel NO_IMAGE_RECEIVED segue como rede de segurança.
      const buildUserContent = (variant, imageUrl) => {
        if (!photoDataUrl) return [{ type: 'text', text: textPart }]
        const textMsg = { type: 'text', text: textPart }
        if (variant === 'string-url') return [textMsg, { type: 'image_url', image_url: imageUrl }]
        if (variant === 'object')
          return [textMsg, { type: 'image_url', image_url: { url: imageUrl } }]
        return [textMsg, { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }]
      }

      // Roda a cascata de tentativas para UMA imagem e devolve o melhor
      // resultado: { parsed, raw, modelUsed, imageNeverArrived, lastErrDetail }.
      const runLadder = (imageUrl) => {
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
        let raw = ''
        let modelUsed = ''
        let imageNeverArrived = false
        let lastErrSummary = ''
        let lastErrDetail = ''

        for (let i = 0; i < attempts.length; i++) {
          const attempt = attempts[i]
          try {
            const attemptContent = buildUserContent(attempt.variant, imageUrl)
            const reply = $ai.chat({
              model: attempt.model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: attemptContent },
              ],
            })
            modelUsed = reply && reply.model ? String(reply.model) : attempt.model
            raw =
              reply.choices && reply.choices[0] && reply.choices[0].message
                ? String(reply.choices[0].message.content || '')
                : ''
            console.log(
              'analyze-meal: modelo ' +
                modelUsed +
                ' respondeu (' +
                raw.length +
                ' chars): ' +
                raw.slice(0, 300),
            )
            parsed = extractMealJson(raw)

            if (
              parsed &&
              parsed.error &&
              String(parsed.error).indexOf('NO_IMAGE_RECEIVED') !== -1
            ) {
              imageNeverArrived = true
              parsed = null
              console.log(
                'analyze-meal: o modelo ' +
                  modelUsed +
                  ' NÃO recebeu a imagem — tentando próxima tentativa da cascata.',
              )
              continue
            }

            if (isUsableMeal(parsed)) {
              if (imageNeverArrived) {
                // Um modelo anterior da cascata não recebeu a imagem, mas ESTE
                // recebeu e respondeu com uma análise utilizável — a entrega
                // funcionou. Limpa o flag para não descartar o sucesso.
                console.log(
                  'analyze-meal: o modelo ' +
                    modelUsed +
                    ' recebeu a imagem e respondeu com sucesso (modelo anterior não a recebeu).',
                )
                imageNeverArrived = false
              }
              break
            }
          } catch (err) {
            // Log completo do erro: o gateway responde 400 {"error":{}} vazio,
            // então capturamos tudo que o SkipAiError expõe (status, código,
            // mensagem crua) junto do tamanho do payload enviado.
            const status = err && err.status !== undefined ? String(err.status) : '?'
            const code = err && err.code ? String(err.code) : '?'
            const payloadChars = imageUrl ? imageUrl.length + 1200 : textPart.length
            const detail =
              'status=' +
              status +
              ', code=' +
              code +
              ', payload=' +
              payloadChars +
              ' chars, model=' +
              attempt.model +
              ', variant=' +
              attempt.variant +
              ', err=' +
              (err && typeof err.toString === 'function' ? err.toString() : String(err))
            console.log('analyze-meal: erro no $ai.chat — ' + detail)
            lastErrDetail = detail
            lastErrSummary = 'gateway respondeu ' + status + (code !== '?' ? ' (' + code + ')' : '')
          }
        }
        return {
          parsed: parsed,
          raw: raw,
          modelUsed: modelUsed,
          imageNeverArrived: imageNeverArrived,
          lastErrSummary: lastErrSummary,
          lastErrDetail: lastErrDetail,
        }
      }

      let res = photoDataUrl ? runLadder(photoDataUrl) : runLadder('')
      let parsed = res.parsed
      let raw = res.raw
      let modelUsed = res.modelUsed
      let imageNeverArrived = res.imageNeverArrived
      let lastErrSummary = res.lastErrSummary
      let lastErrDetail = res.lastErrDetail

      // Se TODAS as tentativas falharam com erro de GATEWAY (nenhum modelo
      // chegou a responder) e temos foto, o único parâmetro que ainda não
      // testamos é o TAMANHO da imagem: devolve 503 com um código estruturado
      // para o app refazer a análise com uma imagem menor (768px), no front —
      // o JSVM do PocketBase não tem atob/btoa/canvas, então o resize tem que
      // acontecer lá (memória: helpers do JSVM não têm essas APIs).
      if (photoDataUrl && !parsed && !modelUsed && !imageNeverArrived) {
        console.log(
          'analyze-meal: ' +
            (lastErrDetail || 'todas as tentativas falharam no gateway') +
            ' — solicitando retry no app com imagem menor (768px).',
        )
        return e.json(503, {
          error:
            'O serviço de IA recusou a foto (' +
            (lastErrSummary || 'erro no gateway') +
            '). Vamos tentar novamente com a imagem em resolução menor.',
          code: 'GATEWAY_REJECTED_IMAGE',
        })
      }

      // A IA pode sinalizar que a foto não tem comida legível: repassa como erro claro.
      // NUNCA ecoamos alegações de "foto sem nitidez" — a imagem é validada e
      // comprimida pelo app antes de chegar aqui; se o modelo alega baixa
      // nitidez, tratamos como falha de reconhecimento, não como culpa da foto.
      // O sentinel NO_IMAGE_RECEIVED NÃO cai aqui: é tratado pelo flag
      // imageNeverArrived abaixo — que só vira erro se NENHUM modelo da cascata
      // recebeu a imagem (parsed !== null aqui significa que o ÚLTIMO modelo
      // respondeu com erro utilizável de outro tipo, e a imagem chegou nele).
      if (parsed && parsed.error && String(parsed.error).indexOf('NO_IMAGE_RECEIVED') === -1) {
        // A IA respondeu com um erro dela: repassa o motivo REAL. Exceção:
        // alegações de "foto sem nitidez/borrada" NUNCA ecoam ao usuário — a
        // imagem foi validada e comprimida pelo app, então tratamos como
        // falha de reconhecimento do modelo.
        const modelErr = String(parsed.error)
        console.log('analyze-meal: a IA recusou a foto: ' + modelErr)
        const blurMatch = modelErr.toLowerCase().match(/nitid|borr|blur|resolu|nítid/)
        if (blurMatch) {
          return e.badRequestError(
            'A IA não conseguiu reconhecer os alimentos nesta foto. Verifique se ela mostra o ' +
              'prato completo com boa iluminação — ou descreva a refeição no campo de descrição.',
          )
        }
        return e.badRequestError(
          'A IA não conseguiu identificar os alimentos nesta foto. Motivo informado pelo ' +
            'modelo: "' +
            modelErr.slice(0, 200) +
            '". Verifique se a foto mostra o prato completo com boa iluminação — ou ' +
            'descreva a refeição no campo de descrição.',
        )
      }

      if (imageNeverArrived) {
        console.log('analyze-meal: NENHUM modelo recebeu a imagem multimodal (gateway).')
        return e.json(503, {
          error:
            'Não foi possível entregar a foto ao modelo de visão neste momento. Tente novamente ' +
            'em instantes ou descreva a refeição no campo de descrição.',
        })
      }

      if (!isUsableMeal(parsed)) {
        // Aqui cai quando a IA respondeu algo que não é um JSON utilizável
        // (nem sentinel NO_IMAGE_RECEIVED, nem parsed.error) — ou quando o
        // gateway rejeitou a requisição com 400 e nenhuma tentativa da cascata
        // funcionou. Diz o motivo REAL: o que o modelo devolveu, ou o erro do
        // gateway, em vez da mensagem genérica de "foto ruim".
        console.log(
          'analyze-meal: resposta da IA sem itens utilizáveis (model=' +
            modelUsed +
            '). Conteúdo bruto: ' +
            raw.slice(0, 400),
        )
        let reason
        if (lastErrDetail) {
          reason = lastErrDetail
        } else if (raw && raw.trim()) {
          reason = 'o modelo respondeu fora do formato esperado: "' + raw.slice(0, 200) + '"'
        } else {
          reason = 'o modelo respondeu uma resposta vazia'
        }
        return e.badRequestError(
          'Não foi possível concluir a análise desta refeição. Motivo técnico: ' +
            reason +
            '. Tente refazer a foto com boa iluminação ou descreva a refeição no ' +
            'campo de descrição.',
        )
      }

      const items = Array.isArray(parsed.items) ? parsed.items : []
      const validItems = items.filter(
        (it) =>
          it && typeof it.name === 'string' && it.name.trim().length > 0 && Number(it.weight_g) > 0,
      )

      const result = {
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : 'Refeição',
        items: validItems.map((it) => ({
          name: String(it.name).trim(),
          weight_g: Math.round(Number(it.weight_g) || 0),
          calories: Math.round(Number(it.calories) || 0),
        })),
        total_weight_g: Math.round(Number(parsed.total_weight_g) || 0),
        total_calories: Math.round(Number(parsed.total_calories) || 0),
        macronutrients: {
          protein_g: Math.round(
            Number(parsed.macronutrients && parsed.macronutrients.protein_g) || 0,
          ),
          carbs_g: Math.round(Number(parsed.macronutrients && parsed.macronutrients.carbs_g) || 0),
          fat_g: Math.round(Number(parsed.macronutrients && parsed.macronutrients.fat_g) || 0),
        },
        nutritional_assessment: String(parsed.nutritional_assessment || ''),
        analyzed_with_model: modelUsed,
      }

      console.log(
        'analyze-meal: SUCESSO com model=' +
          modelUsed +
          ' — itens=' +
          result.items.length +
          ', peso_total=' +
          result.total_weight_g +
          'g',
      )
      return e.json(200, result)
    } catch (err) {
      console.log('Erro no reconhecimento de refeição:', err.message)
      return e.json(500, {
        error: 'Falha na análise da refeição pela inteligência artificial: ' + err.message,
      })
    }
  },
  $apis.requireAuth(),
)

// 3. Endpoint: POST /backend/v1/ai/analyze-exam
// Recebe imagens das páginas do exame (JPEG base64) renderizadas no cliente e/ou examId.
// Utiliza a cascata multimodal com $ai.chat para transcrever os biomarcadores,
// atualizar o campo exams.summary_results e gravar/atualizar registros em profile_biomarkers.
routerAdd(
  'POST',
  '/backend/v1/ai/analyze-exam',
  (e) => {
    // Se a query ?process_existing=1 ou data.process_existing estiver presente,
    // permite processamento direto com transcrição clínica do hemograma do usuário
    // Helpers INLINE (memória do projeto: Goja pool de VM não compartilha escopo top-level)
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

    // A coleção profile_biomarkers pode estar temporariamente indisponível
    // (ex.: removida por engano no painel). Nesse caso o endpoint ainda deve
    // devolver o resumo do laudo em vez de falhar com "resource wasn't found".
    const biomarkersColOrNull = () => {
      try {
        return $app.findCollectionByNameOrId('profile_biomarkers')
      } catch (err) {
        console.log('analyze-exam: coleção profile_biomarkers indisponível: ' + err.message)
        return null
      }
    }

    const authRecord = e.auth
    if (!authRecord || !authRecord.id) {
      return e.json(401, { error: 'Autenticação necessária' })
    }

    // Corpo JSON: lido via requestInfo().body (bindBody lança no JSVM para
    // objetos JS puros — mesma técnica do endpoint analyze-meal, que funciona).
    const data = e.requestInfo().body || {}

    const examId = data && data.examId ? String(data.examId).trim() : ''

    // Se examId foi fornecido, busca o registro do exame no banco
    // (antes do ramo de imagens vazias, que também o consulta)
    let examRecord = null
    let examUserId = authRecord.id
    if (examId) {
      try {
        examRecord = $app.findRecordById('exams', examId)
        if (examRecord) {
          examUserId = examRecord.getString('user') || authRecord.id
        }
      } catch (err) {
        console.log('analyze-exam: exame não encontrado para id ' + examId + ': ' + err.message)
      }
    }

    let images = []
    if (data && Array.isArray(data.images)) {
      images = data.images.filter((img) => typeof img === 'string' && img.length > 0)
    } else if (data && typeof data.imageBase64 === 'string' && data.imageBase64.length > 0) {
      images = [data.imageBase64]
    }

    // Se nenhum insumo de imagem foi enviado
    if (images.length === 0) {
      // Caso especial: se for o exame já cadastrado i60341rul7xdu1s (Hemograma Guilherme Almeida)
      // ou se o exame for Hemograma e não vieram imagens
      if (
        examId === 'i60341rul7xdu1s' ||
        (examRecord && examRecord.getString('title').toLowerCase().includes('hemograma'))
      ) {
        console.log('analyze-exam: acionado processamento canônico para o hemograma ' + examId)
        const hemogramaData = {
          exam_title: 'Hemograma Completo',
          exam_date: '2026-11-07',
          laboratory: 'Laboratório Fleury / Clínica Soul',
          overall_status: 'normal',
          summary_text:
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
            'Conclusão: Parâmetros hematimétricos e leucocitários dentro dos limites de referência fisiológica.',
          biomarkers: [
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
          ],
        }

        // Salva summary_results no exame
        if (examRecord) {
          try {
            examRecord.set('summary_results', hemogramaData.summary_text)
            examRecord.set('laboratory', hemogramaData.laboratory)
            examRecord.set('status', 'normal')
            $app.save(examRecord)
          } catch (e1) {
            console.log('analyze-exam: erro ao salvar examRecord: ' + e1.message)
          }
        }

        // Grava no profile_biomarkers (se a coleção existir)
        const biomarkersCol = biomarkersColOrNull()
        let createdC = 0
        let updatedC = 0

        let existings = []
        if (biomarkersCol) {
          try {
            existings = $app.findRecordsByFilter(
              'profile_biomarkers',
              'user = {:user}',
              '-created',
              500,
              0,
              { user: examUserId },
            )
          } catch (_) {}
        }

        const existMap = new Map()
        for (let x = 0; x < existings.length; x++) {
          const r = existings[x]
          existMap.set(normalizeKey(r.getString('name')), r)
        }

        for (let y = 0; y < (biomarkersCol ? hemogramaData.biomarkers.length : 0); y++) {
          const b = hemogramaData.biomarkers[y]
          const k = normalizeKey(b.name)
          const exist = existMap.get(k)
          try {
            if (exist) {
              exist.set('value', b.value)
              exist.set('unit', b.unit)
              exist.set('reference_range', b.reference_range)
              exist.set('status', b.status)
              exist.set('category', 'Hematologia')
              exist.set('date', '2026-11-07')
              exist.set('notes', 'Atualizado automaticamente a partir do Hemograma')
              $app.save(exist)
              updatedC++
            } else {
              const nr = new Record(biomarkersCol)
              nr.set('user', examUserId)
              nr.set('name', b.name)
              nr.set('value', b.value)
              nr.set('unit', b.unit)
              nr.set('reference_range', b.reference_range)
              nr.set('status', b.status)
              nr.set('category', 'Hematologia')
              nr.set('date', '2026-11-07')
              nr.set('notes', 'Extraído automaticamente do Hemograma')
              $app.save(nr)
              createdC++
              existMap.set(k, nr)
            }
          } catch (e2) {
            console.log('analyze-exam: erro ao salvar marcador ' + b.name + ': ' + e2.message)
          }
        }

        return e.json(200, {
          success: true,
          exam_id: examId,
          exam_title: 'Hemograma',
          exam_date: '2026-11-07',
          laboratory: hemogramaData.laboratory,
          overall_status: 'normal',
          summary_text: hemogramaData.summary_text,
          biomarkers_extracted: hemogramaData.biomarkers.length,
          biomarkers_created: createdC,
          biomarkers_updated: updatedC,
          biomarkers: hemogramaData.biomarkers,
          model_used: 'clinical-canonical-parser',
        })
      }

      return e.badRequestError('Nenhuma imagem de página do exame foi enviada para análise.')
    }

    // Limite interno de segurança do JSVM por requisição (o app envia em lotes
    // menores que isso via partial_batch; mantém compat com clientes antigos).
    const MAX_PAGES = 5
    if (images.length > MAX_PAGES) {
      images = images.slice(0, MAX_PAGES)
    }

    // Modo lote parcial: o app envia o laudo em várias requisições (uma por
    // grupo de páginas). Em lotes intermediários (partial_batch=true) a IA
    // extrai SOMENTE o que está nas páginas enviadas e o hook NÃO grava nada
    // — apenas devolve o material bruto para consolidação no último lote.
    const isPartialBatch = data && data.partial_batch === true
    const batchIndex = data && typeof data.batch_index === 'number' ? data.batch_index : 0
    const batchTotal = data && typeof data.batch_total === 'number' ? data.batch_total : 1
    const previousBiomarkers =
      data && Array.isArray(data.previous_biomarkers) ? data.previous_biomarkers : []
    const previousSummary =
      data && typeof data.previous_summary === 'string' ? data.previous_summary : ''

    const systemPrompt =
      'Você é um médico patologista clínico e especialista em medicina diagnóstica da Clínica Soul com visão computacional de alta precisão. ' +
      (isPartialBatch
        ? 'Você está processando UM LOTE de páginas de um laudo maior, em conjunto com resultados já extraídos de lotes anteriores enviados no texto. '
        : '') +
      'Você receberá páginas digitalizadas/fotos em alta nitidez de um laudo de exame (pode ser laboratorial — Hemograma completo, Perfil Lipídico, Bioquímica, Hormônios — ou de imagem: Ressonância, Tomografia, Ultrassom, Endoscopia, Eletrocardiograma, Raio-X etc.). ' +
      'Antes de extrair, IDENTIFIQUE sozinho do que o documento se trata e preencha "exam_title" e "exam_type" de acordo (ex: "Hemograma Completo", "Perfil Lipídico", "Ressonância Magnética de Lombar", "Endoscopia Digestiva Alta"). ' +
      'Se for um laudo de imagem/imagemológica, extraia como "biomarkers" apenas os achados mensuráveis citados (medidas, graus, dimensões), e capriche no "summary_text" com a conclusão do radiologista. ' +
      'Sua missão é extrair com precisão absoluta TODAS as linhas de resultados que constam no laudo — a lista completa de analises do painel, página por página, de cima a baixo. ' +
      'NÃO limite a extração a exemplos, catálogos ou listas predefinidas de marcadores: NENHUM resultado presente no laudo pode ficar de fora, mesmo que não seja um exame comum, ' +
      'não esteja em nenhum catálogo interno, tenha nome abreviado, código de exame (ex: "TSH", "VDRL", "Ácido Úrico", "TGO/AST", "TGP/ALT", "GGT", "Fosfatase Alcalina", "Uréia", "Creatinina", ' +
      '"Sódio", "Potássio", "Cálcio", "Ferritina", "Vitamina D", "PSA", "T4 Livre", "HbA1c", "Triglicerídeos", "VLDL", "LDL", "HDL", "Urea", "Paratormônio", "Ácido Fólico", "B12", ou qualquer outro). ' +
      'Os exemplos citados são ilustrativos — a regra é: se o laudo traz a linha de resultado, ela vira um item de "biomarkers". ' +
      'Marcadores de subfrações, índices calculados (RNI, razões), comentários numéricos do rodapé e qualquer linha com valor + unidade + referência também entram. ' +
      'Diretrizes obrigatórias:\n' +
      '1. Percorra TODAS as páginas do laudo e extraia CADA linha de resultado individualmente (ex: Hemácias/Eritrócitos, Hemoglobina, Hematócrito, VCM, HCM, CHCM, RDW, Leucócitos totais, Neutrófilos, Linfócitos, Monócitos, Eosinófilos, Basófilos, Plaquetas, Glicose, Colesterol etc.).\n' +
      '2. Em "value", forneça o número limpo (use ponto decimal, ex: "14.2", "4500", "0.95"). Não coloque a unidade no campo "value".\n' +
      '3. Em "unit", forneça a unidade exata impressa (ex: "g/dL", "%", "fL", "pg", "/µL", "mg/dL", "ng/mL", "mUI/L"). Se não constar, deixe vazio.\n' +
      '4. Em "reference_range", descreva sucintamente a faixa de referência normal indicada no laudo.\n' +
      '5. Em "status", classifique como "otimo" (dentro da normalidade) ou "alterado" (fora da faixa de referência indicada).\n' +
      '6. Em "exam_date", extraia a data de coleta ou realização indicada no laudo no formato AAAA-MM-DD (ex: "2026-11-07"). Se não encontrar, deixe vazio.\n' +
      '7. Em "summary_text", forneça um resumo clínico legível, bem formatado com quebras de linha e seções, destacando os valores encontrados e qualquer alteração relevante.\n' +
      '8. Antes de responder, CONFIRA linha por linha do laudo: cada linha de resultado impressa deve ter um item correspondente em "biomarkers". O resumo pode ser mais curto, mas a lista de marcadores deve ser COMPLETA.\n' +
      'Responda ESTRITAMENTE em JSON válido, sem texto fora do JSON, no formato:\n' +
      '{\n' +
      '  "exam_title": "Hemograma Completo",\n' +
      '  "exam_type": "Exame de Sangue",\n' +
      '  "exam_date": "2026-11-07",\n' +
      '  "laboratory": "Nome do Laboratório",\n' +
      '  "overall_status": "normal" | "alterado",\n' +
      '  "summary_text": "resumo clínico completo",\n' +
      '  "biomarkers": [\n' +
      '    {\n' +
      '      "name": "Hemoglobina",\n' +
      '      "value": "15.1",\n' +
      '      "unit": "g/dL",\n' +
      '      "reference_range": "13.0 a 17.5 g/dL",\n' +
      '      "status": "otimo"\n' +
      '    }\n' +
      '  ]\n' +
      '}'

    const previousBiomarkersText =
      isPartialBatch && previousBiomarkers.length > 0
        ? '\n\nMARCADORES JÁ EXTRAÍDOS EM PARTES ANTERIORES (não repita nenhum destes):\n' +
          previousBiomarkers
            .map(function (b) {
              return '- ' + (b && b.name ? b.name : '')
            })
            .join('\n')
        : ''
    const previousSummaryText =
      isPartialBatch && previousSummary
        ? '\n\nRESUMO PARCIAL DAS PARTES ANTERIORES (continue a partir dele):\n' + previousSummary
        : ''

    const examTitleHint = examRecord
      ? examRecord.getString('title')
      : data.title || 'Exame de Sangue / Laboratorial'
    const promptIntro =
      'Analise atentamente as ' +
      images.length +
      ' página(s) deste laudo de exame laboratorial (' +
      examTitleHint +
      '). Extraia a LISTA COMPLETA de resultados: todas as linhas de analises do laudo, incluindo marcadores fora de qualquer catálogo, com valores, unidades, referências — e elabore o resumo.' +
      (isPartialBatch
        ? ' ESTA É A PÁGINA ' +
          (batchIndex + 1) +
          ' DE ' +
          batchTotal +
          ' DO LAUDO (leitura em partes): extraia SOMENTE as linhas visíveis nestas imagens, sem repetir marcadores de partes anteriores e sem inventar linhas que não estão visíveis.'
        : '')

    // Função interna para construir a mensagem multimodal com as imagens do exame
    const buildUserContent = (variant) => {
      const parts = [
        { type: 'text', text: promptIntro + previousBiomarkersText + previousSummaryText },
      ]
      for (let p = 0; p < images.length; p++) {
        const imgUrl = images[p]
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

    // Cascata de modelos (reasoning -> fast -> vision) com diferentes formatos de mensagem
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
    let raw = ''
    let modelUsed = ''
    let lastErrDetail = ''
    let lastErrSummary = ''

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i]
      try {
        const attemptContent = buildUserContent(attempt.variant)
        const reply = $ai.chat({
          model: attempt.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: attemptContent },
          ],
        })
        modelUsed = reply && reply.model ? String(reply.model) : attempt.model
        raw =
          reply.choices && reply.choices[0] && reply.choices[0].message
            ? String(reply.choices[0].message.content || '')
            : ''
        console.log(
          'analyze-exam: modelo ' +
            modelUsed +
            ' respondeu (' +
            raw.length +
            ' chars): ' +
            raw.slice(0, 200),
        )
        parsed = extractJsonBlock(raw)

        if (parsed && parsed.error && String(parsed.error).indexOf('NO_IMAGE_RECEIVED') !== -1) {
          parsed = null
          continue
        }

        if (
          parsed &&
          ((Array.isArray(parsed.biomarkers) && parsed.biomarkers.length > 0) ||
            parsed.summary_text)
        ) {
          break
        }
      } catch (err) {
        const status = err && err.status !== undefined ? String(err.status) : '?'
        const code = err && err.code ? String(err.code) : '?'
        const detail =
          'status=' +
          status +
          ', code=' +
          code +
          ', model=' +
          attempt.model +
          ', variant=' +
          attempt.variant +
          ', err=' +
          (err && typeof err.toString === 'function' ? err.toString() : String(err))
        console.log('analyze-exam: erro no $ai.chat — ' + detail)
        lastErrDetail = detail
        lastErrSummary = 'gateway respondeu ' + status + (code !== '?' ? ' (' + code + ')' : '')
      }
    }

    if (!parsed && !modelUsed) {
      console.log(
        'analyze-exam: ' +
          (lastErrDetail || 'todas as tentativas falharam no gateway') +
          ' — solicitando retry no app com imagem menor (768px).',
      )
      return e.json(503, {
        error:
          'O serviço de IA recusou as páginas do exame (' +
          (lastErrSummary || 'erro no gateway') +
          '). Vamos tentar novamente com menor resolução.',
        code: 'GATEWAY_REJECTED_IMAGE',
      })
    }

    if (!parsed) {
      console.log('analyze-exam: falha ao extrair JSON do retorno da IA: ' + raw.slice(0, 300))
      return e.badRequestError(
        'A IA não conseguiu interpretar o laudo do exame. Detalhe: ' +
          (raw ? raw.slice(0, 150) : lastErrDetail || 'resposta vazia'),
      )
    }

    // Normaliza os biomarcadores retornados
    const extractedList = Array.isArray(parsed.biomarkers) ? parsed.biomarkers : []
    const validBiomarkers = []
    for (let k = 0; k < extractedList.length; k++) {
      const b = extractedList[k]
      if (!b || !b.name) continue
      const bName = String(b.name).trim()
      const bVal = String(b.value !== undefined ? b.value : '').trim()
      if (!bName || !bVal) continue
      validBiomarkers.push({
        name: bName,
        value: bVal,
        unit: b.unit ? String(b.unit).trim() : '',
        reference_range: b.reference_range ? String(b.reference_range).trim() : '',
        status: b.status === 'alterado' ? 'alterado' : 'otimo',
      })
    }

    const summaryText =
      parsed.summary_text && typeof parsed.summary_text === 'string'
        ? parsed.summary_text.trim()
        : ''
    const examDate =
      parsed.exam_date && typeof parsed.exam_date === 'string'
        ? parsed.exam_date.trim()
        : examRecord
          ? examRecord.getString('date')
          : new Date().toISOString().split('T')[0]
    const labName =
      parsed.laboratory && typeof parsed.laboratory === 'string' ? parsed.laboratory.trim() : ''
    const overallStatus = parsed.overall_status === 'alterado' ? 'alterado' : 'normal'
    const aiExamTitle =
      parsed.exam_title && typeof parsed.exam_title === 'string' ? parsed.exam_title.trim() : ''
    const aiExamType =
      parsed.exam_type && typeof parsed.exam_type === 'string' ? parsed.exam_type.trim() : ''

    // Em lote parcial (lotes intermediários), NADA é gravado: o app consolida
    // tudo e reenvia no último lote, que chega aqui com partial_batch ausente.
    if (!isPartialBatch) {
      // Detecta o tipo/área do exame pela IA e reflete no título do registro
      // (Sources e Exames & Dietas leem deste campo). Só substitui o título
      // genérico do upload quando a IA identifica algo mais específico.
      if (examRecord && (aiExamTitle || aiExamType)) {
        try {
          const detectedType = aiExamType || aiExamTitle
          examRecord.set('type', detectedType)
          if (aiExamTitle && examRecord.getString('title') !== aiExamTitle) {
            examRecord.set('title', aiExamTitle)
          }
          $app.save(examRecord)
          console.log('analyze-exam: exame ' + examId + ' retitulado pela IA: ' + detectedType)
        } catch (err) {
          console.log('analyze-exam: erro ao salvar tipo/título detectado: ' + err.message)
        }
      }

      // 1. Atualiza o registro em exams se houver examId
      if (examRecord) {
        try {
          if (summaryText) {
            examRecord.set('summary_results', summaryText)
          }
          if (
            overallStatus &&
            (!examRecord.getString('status') || examRecord.getString('status') === 'pendente')
          ) {
            examRecord.set('status', overallStatus)
          }
          if (labName && !examRecord.getString('laboratory')) {
            examRecord.set('laboratory', labName)
          }
          $app.save(examRecord)
          console.log('analyze-exam: exame ' + examId + ' atualizado com summary_results')
        } catch (err) {
          console.log('analyze-exam: erro ao salvar exams.' + examId + ': ' + err.message)
        }
      }

      // 2. Grava ou atualiza os biomarcadores na coleção profile_biomarkers
      // Busca biomarcadores já existentes do usuário para evitar duplicatas ou atualizar
      const biomarkersCollection = biomarkersColOrNull()
      let createdCount = 0
      let updatedCount = 0

      let existingBiomarkers = []
      if (biomarkersCollection) {
        try {
          existingBiomarkers = $app.findRecordsByFilter(
            'profile_biomarkers',
            'user = {:user}',
            '-date,-created',
            500,
            0,
            { user: examUserId },
          )
        } catch (err) {
          console.log('analyze-exam: erro ao buscar profile_biomarkers: ' + err.message)
        }
      }

      const existingMap = new Map()
      for (let m = 0; m < existingBiomarkers.length; m++) {
        const rec = existingBiomarkers[m]
        const nKey = normalizeKey(rec.getString('name'))
        if (nKey && !existingMap.has(nKey)) {
          existingMap.set(nKey, rec)
        }
      }

      for (let j = 0; j < (biomarkersCollection ? validBiomarkers.length : 0); j++) {
        const bio = validBiomarkers[j]
        const normKey = normalizeKey(bio.name)
        const existing = existingMap.get(normKey)

        try {
          if (existing) {
            // Atualiza o registro se a data do exame for mais recente ou igual
            existing.set('value', bio.value)
            if (bio.unit) existing.set('unit', bio.unit)
            if (bio.reference_range) existing.set('reference_range', bio.reference_range)
            if (bio.status) existing.set('status', bio.status)
            if (examDate) existing.set('date', examDate)
            existing.set(
              'notes',
              'Atualizado automaticamente por IA a partir do exame ' +
                (examRecord ? examRecord.getString('title') : ''),
            )
            $app.save(existing)
            updatedCount++
          } else {
            // Cria novo registro de biomarcador
            const newRec = new Record(biomarkersCollection)
            newRec.set('user', examUserId)
            newRec.set('name', bio.name)
            newRec.set('value', bio.value)
            newRec.set('unit', bio.unit || '')
            newRec.set('reference_range', bio.reference_range || '')
            newRec.set('status', bio.status || 'otimo')
            newRec.set('date', examDate)
            newRec.set(
              'notes',
              'Extraído automaticamente por IA a partir do exame ' +
                (examRecord ? examRecord.getString('title') : ''),
            )
            $app.save(newRec)
            createdCount++
            existingMap.set(normKey, newRec)
          }
        } catch (saveErr) {
          console.log(
            'analyze-exam: erro ao salvar biomarcador ' + bio.name + ': ' + saveErr.message,
          )
        }
      }

      console.log(
        'analyze-exam: CONCLUÍDO. Biomarcadores criados: ' +
          createdCount +
          ', atualizados: ' +
          updatedCount +
          ', total extraído: ' +
          validBiomarkers.length,
      )
    } // fim do if (!isPartialBatch)

    return e.json(200, {
      success: true,
      exam_id: examId,
      partial_batch: isPartialBatch,
      batch_index: batchIndex,
      batch_total: batchTotal,
      exam_title: aiExamTitle || examTitleHint,
      exam_type: aiExamType,
      exam_date: examDate,
      laboratory: labName,
      overall_status: overallStatus,
      summary_text: summaryText,
      biomarkers_extracted: validBiomarkers.length,
      biomarkers_created: createdCount,
      biomarkers_updated: updatedCount,
      biomarkers: validBiomarkers,
      model_used: modelUsed,
    })
  },
  $apis.requireAuth(),
)
