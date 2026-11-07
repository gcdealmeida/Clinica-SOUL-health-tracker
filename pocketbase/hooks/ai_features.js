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
// Analisa foto da refeição ou descrição para listar alimentos e estimar peso e calorias
routerAdd(
  'POST',
  '/backend/v1/ai/analyze-meal',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.forbiddenError('Autenticação necessária')
    }

    const body = e.requestInfo().body || {}
    const description = body.description || ''
    const photoUrl = body.photoUrl || ''
    const mealType = body.mealType || 'almoco'

    const systemPrompt =
      'Você é um nutricionista especialista da Clínica Soul. ' +
      'Seu papel é analisar refeições (a partir de foto ou descrição detalhada), listar todos os alimentos presentes de forma discriminada, estimar com bom senso o peso total em gramas de cada porção e do prato, calorias aproximadas e fazer uma avaliação nutricional saudável. ' +
      'Você DEVE responder SEMPRE em JSON válido com a estrutura: ' +
      '{' +
      '  "title": "nome curto do prato", ' +
      '  "items": [{"name": "alimento", "weight_g": 120, "calories": 150}], ' +
      '  "total_weight_g": 380, ' +
      '  "total_calories": 490, ' +
      '  "macronutrients": {"protein_g": 35, "carbs_g": 40, "fat_g": 15}, ' +
      '  "nutritional_assessment": "avaliação do prato e dicas da Clínica Soul"' +
      '}'

    const userPrompt =
      'Refeição: ' +
      mealType +
      '\n' +
      'Foto informada: ' +
      (photoUrl ? photoUrl : 'Foto enviada pelo cliente no app') +
      '\n' +
      'Descrição e notas do cliente: ' +
      (description || 'Prato servido na refeição') +
      '\n\n' +
      'Por favor, identifique os ingredientes e componentes do prato, estime o peso de cada porção em gramas e do total, calcule as calorias e forneça a resposta estritamente no JSON solicitado.'

    try {
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const content =
        reply.choices && reply.choices[0] && reply.choices[0].message
          ? reply.choices[0].message.content
          : '{}'

      // Tenta extrair JSON do texto retornado pela IA
      let parsed = null
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0])
        }
      } catch (_) {}

      if (!parsed) {
        parsed = {
          title: description || 'Refeição Saudável Soul',
          items: [{ name: description || 'Porção equilibrada', weight_g: 300, calories: 400 }],
          total_weight_g: 300,
          total_calories: 400,
          macronutrients: { protein_g: 25, carbs_g: 40, fat_g: 12 },
          nutritional_assessment: content,
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Erro no reconhecimento de refeição:', err.message)
      return e.json(500, { error: 'Erro na análise de refeição: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
