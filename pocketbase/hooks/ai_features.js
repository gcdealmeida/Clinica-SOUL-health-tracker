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
      try {
        const aiCol = $app.findCollectionByNameOrId('ai_analyses')
        const analysisRecord = new Record(aiCol)
        analysisRecord.set('user', targetUserId)
        analysisRecord.set(
          'variables',
          Array.isArray(variables) ? variables.join(', ') : String(variables),
        )
        if (question) analysisRecord.set('question', question)
        analysisRecord.set('insights', aiText)
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
    const authRecord = e.auth
    if (!authRecord) {
      return e.forbiddenError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const description = (body.description || '').trim()
    const mealType = body.mealType || 'almoco'

    // A foto chega como data URL "data:image/jpeg;base64,..." gerada no app.
    // O app comprime/redimensiona a imagem antes de enviar (limite ~4MB em base64).
    const photoDataUrl = (body.photoBase64 || '').trim()
    const MAX_IMAGE_B64 = 5 * 1024 * 1024 // ~5MB de base64 decodificado ≈ 3.7MB de imagem
    if (photoDataUrl && photoDataUrl.length > MAX_IMAGE_B64) {
      return e.badRequestError(
        'A foto é muito grande para análise. Tente uma imagem menor ou de melhor compressão.',
      )
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
      'Analise a foto do prato anexada e responda estritamente no JSON solicitado, ' +
      'identificando os alimentos visíveis, o peso estimado de cada porção em gramas ' +
      'e o peso total do prato.'

    if (photoDataUrl) {
      textPart =
        'Uma FOTO REAL do prato do cliente está anexada nesta mensagem. Analise a imagem ' +
        'visualmente — identifique cada alimento visível, estime o peso de cada porção em ' +
        'gramas e o peso total do prato com base no que aparece na foto.\n\n' +
        textPart
      userContent.push({ type: 'text', text: textPart })
      userContent.push({ type: 'image_url', image_url: { url: photoDataUrl } })
    } else {
      userContent.push({ type: 'text', text: textPart })
    }

    const systemPrompt =
      'Você é um nutricionista especialista da Clínica Soul com capacidade de visão computacional. ' +
      'Seu papel é analisar a FOTO anexada da refeição (e a descrição do cliente, se houver), identificar visualmente ' +
      'todos os alimentos presentes de forma discriminada, estimar com bom senso o peso total em gramas de cada porção e do prato ' +
      '(use referências visuais: tamanho do prato, talheres, copos para calibrar a escala), ' +
      'calorias aproximadas e fazer uma avaliação nutricional saudável. ' +
      'Se a imagem não mostrar comida, ou estiver ilegível/borrada demais para análise, NÃO invente alimentos: ' +
      'responda exatamente {"error": "Não foi possível identificar alimentos legíveis na foto. Envie uma foto mais nítida do prato."} ' +
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
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      })

      const raw =
        reply.choices && reply.choices[0] && reply.choices[0].message
          ? String(reply.choices[0].message.content || '')
          : ''

      // Parse defensivo: tira cercas de código ```json ... ``` e pega o 1º objeto balanceado.
      let parsed = null
      let parseAttempt = raw.trim()
      const fence = parseAttempt.match(/```(?:json)?\s*([\s\S]*?)```/i)
      if (fence) parseAttempt = fence[1].trim()
      // Primeiro "{" até o último "}" — cobre preâmbulos curtos antes do JSON.
      const start = parseAttempt.indexOf('{')
      const end = parseAttempt.lastIndexOf('}')
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(parseAttempt.slice(start, end + 1))
        } catch (_) {
          parsed = null
        }
      }

      // A IA pode sinalizar que a foto não tem comida legível: repassa como erro claro.
      if (parsed && parsed.error) {
        return e.badRequestError(String(parsed.error))
      }

      // Validação estrita: um resultado sem itens identificáveis NÃO é sucesso.
      const items = parsed && Array.isArray(parsed.items) ? parsed.items : []
      const validItems = items.filter(
        (it) =>
          it && typeof it.name === 'string' && it.name.trim().length > 0 && Number(it.weight_g) > 0,
      )
      const totalWeight = parsed ? Number(parsed.total_weight_g) || 0 : 0

      if (!parsed || validItems.length === 0 || totalWeight <= 0) {
        console.log(
          'analyze-meal: resposta da IA sem itens utilizáveis. Conteúdo bruto: ' +
            raw.slice(0, 400),
        )
        return e.badRequestError(
          'A IA não conseguiu identificar os alimentos desta foto. Tente refazer a foto ' +
            'com boa iluminação, prato centralizado e todos os alimentos visíveis — ou ' +
            'descreva a refeição no campo de descrição.',
        )
      }

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
        total_weight_g: Math.round(totalWeight),
        total_calories: Math.round(Number(parsed.total_calories) || 0),
        macronutrients: {
          protein_g: Math.round(
            Number(parsed.macronutrients && parsed.macronutrients.protein_g) || 0,
          ),
          carbs_g: Math.round(Number(parsed.macronutrients && parsed.macronutrients.carbs_g) || 0),
          fat_g: Math.round(Number(parsed.macronutrients && parsed.macronutrients.fat_g) || 0),
        },
        nutritional_assessment: String(parsed.nutritional_assessment || ''),
      }

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
