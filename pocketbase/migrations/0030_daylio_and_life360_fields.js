migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('emotional_logs')

    // Helper para adicionar campo somente se não existir
    const addFieldIfMissing = (field) => {
      try {
        if (!col.fields.getByName(field.name)) {
          col.fields.add(field)
        }
      } catch (_) {
        col.fields.add(field)
      }
    }

    // 1. Emoções selecionadas (chips Daylio)
    addFieldIfMissing(
      new JSONField({
        name: 'emotions',
        maxSize: 524288, // 512KB
      }),
    )

    // 2. Sono (bom, medio, ruim)
    addFieldIfMissing(
      new TextField({
        name: 'sleep_status',
      }),
    )

    // 3. Atividade física (muito_otimo, mais_ou_menos, pouco, nada)
    addFieldIfMissing(
      new TextField({
        name: 'physical_activity',
      }),
    )

    // 4. Alimentação (otima, boa, razoavel, ruim, pessima)
    addFieldIfMissing(
      new TextField({
        name: 'nutrition',
      }),
    )

    // 5. Social amigos (alta, media, baixa, nada)
    addFieldIfMissing(
      new TextField({
        name: 'social_status',
      }),
    )

    // 6. Família (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'family_status',
      }),
    )

    // 7. Conjugal (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'partner_status',
      }),
    )

    // 8. Hobbies (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'hobbies_status',
      }),
    )

    // 9. Espiritualidade (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'spirituality_status',
      }),
    )

    // 10. Intelecto (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'intellect_status',
      }),
    )

    // 11. Servir (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'service_status',
      }),
    )

    // 12. Financeiro (alta, media, baixa)
    addFieldIfMissing(
      new TextField({
        name: 'financial_status',
      }),
    )

    // 13. Snapshot / Avaliação dos 11 Aspectos da Vida 360 (notas calculadas ou avaliadas 0 a 100)
    addFieldIfMissing(
      new JSONField({
        name: 'life_aspects',
        maxSize: 524288,
      }),
    )

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('emotional_logs')
    const fieldsToRemove = [
      'emotions',
      'sleep_status',
      'physical_activity',
      'nutrition',
      'social_status',
      'family_status',
      'partner_status',
      'hobbies_status',
      'spirituality_status',
      'intellect_status',
      'service_status',
      'financial_status',
      'life_aspects',
    ]
    for (let i = 0; i < fieldsToRemove.length; i++) {
      try {
        const f = col.fields.getByName(fieldsToRemove[i])
        if (f) col.fields.remove(f)
      } catch (_) {}
    }
    app.save(col)
  },
)
