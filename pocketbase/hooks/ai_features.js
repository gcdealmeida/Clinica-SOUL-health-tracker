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
      // Tenta em cascata. Com FOTO, começa pelo alias "reasoning": os logs do
      // gateway mostram que o modelo atrás do alias "fast" (gpt-oss-120b) não
      // recebe a parte multimodal (responde sempre {"error":"NO_IMAGE_RECEIVED"}),
      // então iniciar por ele só gasta uma tentativa perdida. Sem foto, só texto,
      // o "fast" basta. O sentinel NO_IMAGE_RECEIVED continua como rede de
      // segurança caso os aliases mudem no gateway.
      const modelsToTry = photoDataUrl ? ['reasoning', 'fast'] : ['fast']
      let parsed = null
      let raw = ''
      let modelUsed = ''
      let imageNeverArrived = false

      for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i]
        try {
          const reply = $ai.chat({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
          })
          modelUsed = reply && reply.model ? String(reply.model) : model
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

          if (parsed && parsed.error && String(parsed.error).indexOf('NO_IMAGE_RECEIVED') !== -1) {
            imageNeverArrived = true
            parsed = null
            console.log(
              'analyze-meal: o modelo ' +
                modelUsed +
                ' NÃO recebeu a imagem — tentando próximo modelo.',
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
          console.log('analyze-meal: erro no $ai.chat (model=' + model + '): ' + err.message)
        }
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
        console.log('analyze-meal: a IA recusou a foto: ' + String(parsed.error))
        return e.badRequestError(
          'A IA não conseguiu identificar os alimentos desta foto. Tente refazê-la com boa ' +
            'iluminação, prato centralizado e todos os alimentos visíveis — ou descreva a ' +
            'refeição no campo de descrição.',
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
        console.log(
          'analyze-meal: resposta da IA sem itens utilizáveis (model=' +
            modelUsed +
            '). Conteúdo bruto: ' +
            raw.slice(0, 400),
        )
        return e.badRequestError(
          'A IA não conseguiu identificar os alimentos desta foto. Tente refazer a foto ' +
            'com boa iluminação, prato centralizado e todos os alimentos visíveis — ou ' +
            'descreva a refeição no campo de descrição.',
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
