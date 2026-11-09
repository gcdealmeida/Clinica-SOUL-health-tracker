import { HealthMetric, Exam, ProfileBiomarker, ProfileVaccination, ProfileLifestyle } from '@/types'
import { todayStr, daysAgoStr } from '@/lib/localDate'

/**
 * Motor de cálculo do Preventive Health Score estilo Guava / Clínica Soul.
 * Dividido em 3 pilares fundamentais:
 *
 * 1. PREVENTION (Exames de Checkup & Rastreios Preventivos):
 *    - Pressão arterial aferida (clínica ou recente)
 *    - Perfil Lipídico / Colesterol (exame de sangue ou biomarcador nos últimos 12 meses)
 *    - Rastreamento de Diabetes (Glicemia de jejum ou HbA1c nos últimos 12 meses)
 *    - Rastreamento Metabólico / Renal / Hepático (exame de sangue recente)
 *    - Avaliação Cardiovascular / Eletrocardiograma (exame ECG nos últimos 24 meses)
 *    - Rastreamento Dermatológico / Pele (exame ou condição/evento recente)
 *    - Exame Odontológico / Limpeza (rastreio/evento)
 *    - Exame de Visão / Oftalmológico (rastreio/evento)
 *    - Vacinação em dia (Influenza, dT, Hepatite etc.)
 *
 * 2. MONITORING (Monitoramento Ativo / Contínuo nos últimos 30 dias):
 *    - Pressão Arterial frequente (>= 2 registros nos últimos 30 dias)
 *    - Peso Corporal acompanhado (>= 1 registro nos últimos 30 dias)
 *    - Sono rastreado (>= 5 noites nos últimos 30 dias)
 *    - Glicemia de jejum ou capilar monitorada (>= 2 registros nos últimos 30 dias)
 *    - Frequência Cardíaca de Repouso / HRV (>= 3 registros nos últimos 30 dias)
 *
 * 3. ACTION (Hábitos de Saúde & Metas Cumpridas nos últimos 30 dias):
 *    - Sono adequado (média recente >= 7.0 horas)
 *    - Atividade física consistente (>= 120 min/semana ou >= 3 treinos/semana)
 *    - Consumo moderado de álcool (<= 4 doses/semana nos registros ou perfil)
 *    - Padrão alimentar equilibrado (registro de refeições ou dieta anti-inflamatória/mediterrânea no perfil)
 *    - Hidratação ativa (registros de água presentes)
 */

export interface PillarItem {
  id: string
  title: string
  description: string
  fulfilled: boolean
  lastDate?: string
  valueLabel?: string
  recommendation?: string
}

export interface PillarScore {
  name: string
  title: string
  description: string
  score: number // 0 a 10
  items: PillarItem[]
  completedCount: number
  totalCount: number
}

export interface PreventiveHealthScoreData {
  overallScore: number // 0 a 10 (média ponderada ou aritmética dos 3 pilares)
  overallLevel: 'Excelente' | 'Muito Bom' | 'Bom' | 'Atenção' | 'Inicial'
  overallColor: string
  prevention: PillarScore
  monitoring: PillarScore
  action: PillarScore
  completedTotal: number
  totalItems: number
}

interface ComputeScoreInput {
  metrics: HealthMetric[]
  exams: Exam[]
  biomarkers: ProfileBiomarker[]
  vaccinations: ProfileVaccination[]
  lifestyle?: ProfileLifestyle | null
  userAge?: number
  userGender?: string
}

export function computePreventiveHealthScore(input: ComputeScoreInput): PreventiveHealthScoreData {
  const { metrics, exams, biomarkers, vaccinations, lifestyle } = input
  const today = todayStr()
  const cutoff30d = daysAgoStr(30)
  const cutoff365d = daysAgoStr(365)
  const cutoff730d = daysAgoStr(730)

  // -------------------------------------------------------------
  // PILAR 1: PREVENÇÃO (Checkups, Exames, Vacinas)
  // -------------------------------------------------------------
  // 1. Colesterol / Perfil Lipídico
  const lipidExam = exams.find(
    (e) =>
      e.date >= cutoff365d &&
      (e.title.toLowerCase().includes('lipid') ||
        e.title.toLowerCase().includes('sangue') ||
        e.title.toLowerCase().includes('metabólico') ||
        e.summary_results?.toLowerCase().includes('colesterol')),
  )
  const lipidBio = biomarkers.find(
    (b) =>
      b.name.toLowerCase().includes('colesterol') || b.category?.toLowerCase().includes('lipid'),
  )
  const hasLipid = Boolean(lipidExam || lipidBio)
  const lipidDate = lipidExam?.date || lipidBio?.date

  // Valores reais do perfil lipídico (colesterol, HDL, LDL, triglicerídeos) com data
  const lipidNames = ['colesterol total', 'hdl', 'ldl', 'trigliceri', 'vldl', 'não-hdl', 'nao-hdl']
  const lipidRecords = biomarkers.filter((b) => {
    const n = b.name.toLowerCase()
    return lipidNames.some((k) => n.includes(k))
  })
  const fmtLip = (b: ProfileBiomarker) => `${b.name}: ${b.value}${b.unit ? ` ${b.unit}` : ''}`
  const lipidValueLabel = lipidRecords.length
    ? `${lipidRecords.slice(0, 4).map(fmtLip).join(' · ')} (${(() => {
        const d = (lipidRecords.find((b) => b.date)?.date || lipidDate || '').slice(0, 10)
        const p = d.split('-')
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d
      })()})`
    : undefined

  // 2. Rastreamento de Diabetes (Glicemia ou HbA1c)
  const diabetesExam = exams.find(
    (e) =>
      e.date >= cutoff365d &&
      (e.title.toLowerCase().includes('glic') ||
        e.summary_results?.toLowerCase().includes('glicose') ||
        e.summary_results?.toLowerCase().includes('glicemia') ||
        e.summary_results?.toLowerCase().includes('hba1c')),
  )
  const diabetesBio = biomarkers.find(
    (b) =>
      b.name.toLowerCase().includes('glicose') ||
      b.name.toLowerCase().includes('glicemia') ||
      b.name.toLowerCase().includes('hba1c'),
  )
  const diabetesMetric = metrics.find((m) => m.category === 'glicemia' && m.date_time >= cutoff365d)
  const hasDiabetesScreening = Boolean(diabetesExam || diabetesBio || diabetesMetric)
  const diabetesDate =
    diabetesExam?.date || diabetesBio?.date || diabetesMetric?.date_time.slice(0, 10)

  // 3. Avaliação Cardiovascular / ECG
  const cardioExam = exams.find(
    (e) =>
      e.date >= cutoff730d &&
      (e.type.toLowerCase().includes('eletro') ||
        e.title.toLowerCase().includes('eletro') ||
        e.title.toLowerCase().includes('ecg') ||
        e.title.toLowerCase().includes('cardio') ||
        e.title.toLowerCase().includes('ergométrico')),
  )
  const hasCardio = Boolean(cardioExam)

  // 4. Painel Metabólico Geral / Sangue Anual
  const bloodExam = exams.find(
    (e) =>
      e.date >= cutoff365d &&
      (e.type.toLowerCase().includes('sangue') ||
        e.title.toLowerCase().includes('sangue') ||
        e.title.toLowerCase().includes('hemograma') ||
        e.title.toLowerCase().includes('painel')),
  )
  const hasBloodPanel = Boolean(bloodExam || biomarkers.length >= 3)
  const bloodDate = bloodExam?.date || (biomarkers[0]?.date ? biomarkers[0].date : undefined)

  // 5. Vacinação Preventiva (pelo menos 1 vacina nos últimos 12 meses ou vacina ativa)
  const hasVaccine = vaccinations.length > 0
  const recentVaccine = vaccinations.find((v) => v.date >= cutoff365d) || vaccinations[0]

  // 6. Rastreamento de Pressão Clínica / de Base (pressão nos últimos 6 meses)
  const cutoff180d = daysAgoStr(180)
  const bpRecent = metrics.find((m) => m.category === 'pressao' && m.date_time >= cutoff180d)
  const hasBpPrevention = Boolean(bpRecent)

  // 7. Avaliação Odontológica / Dental ou Visão (Exame ou preventivo registrado)
  const otherExam = exams.find(
    (e) =>
      e.title.toLowerCase().includes('odonto') ||
      e.title.toLowerCase().includes('dental') ||
      e.title.toLowerCase().includes('visão') ||
      e.title.toLowerCase().includes('oftalmo') ||
      e.title.toLowerCase().includes('pele') ||
      e.title.toLowerCase().includes('dermat'),
  )
  const hasOtherScreening = Boolean(otherExam)

  const preventionItems: PillarItem[] = [
    {
      id: 'prev-lipid',
      title: 'Painel Lipídico & Colesterol',
      description: 'Avaliação de HDL, LDL e Triglicerídeos nos últimos 12 meses',
      fulfilled: hasLipid,
      lastDate: lipidDate,
      valueLabel: lipidValueLabel,
      recommendation: hasLipid
        ? 'Em dia (anual)'
        : 'Recomendado agendar exame de sangue preventivo',
    },
    {
      id: 'prev-diabetes',
      title: 'Rastreamento de Diabetes & Glicemia',
      description: 'Glicemia de jejum ou Hemoglobina Glicada (HbA1c) anual',
      fulfilled: hasDiabetesScreening,
      lastDate: diabetesDate,
      recommendation: hasDiabetesScreening
        ? 'Dentro da faixa preventiva'
        : 'Importante verificar taxa glicêmica anual',
    },
    {
      id: 'prev-cardio',
      title: 'Avaliação Cardiovascular (ECG)',
      description: 'Eletrocardiograma ou avaliação cardiológica nos últimos 24 meses',
      fulfilled: hasCardio,
      lastDate: cardioExam?.date,
      recommendation: hasCardio
        ? 'Cardiovascular avaliado'
        : 'Recomendado para prevenção preventiva',
    },
    {
      id: 'prev-blood',
      title: 'Painel Metabólico & Biomarcadores',
      description: 'Hemograma completo, marcadores hepáticos e inflamatórios',
      fulfilled: hasBloodPanel,
      lastDate: bloodDate,
      recommendation: hasBloodPanel ? 'Painel realizado' : 'Solicite com seu médico integrativo',
    },
    {
      id: 'prev-vaccine',
      title: 'Carteira de Vacinação Preventiva',
      description: 'Vacinas em dia (Influenza anual, Tétano, Hepatite B)',
      fulfilled: hasVaccine,
      lastDate: recentVaccine?.date,
      valueLabel: recentVaccine ? recentVaccine.vaccine : undefined,
      recommendation: hasVaccine
        ? `${vaccinations.length} vacina(s) registradas`
        : 'Cadastre suas vacinas recentes',
    },
    {
      id: 'prev-bp',
      title: 'Aferição de Pressão de Base',
      description: 'Pressão arterial conferida e documentada nos últimos 6 meses',
      fulfilled: hasBpPrevention,
      lastDate: bpRecent?.date_time.slice(0, 10),
      valueLabel: bpRecent ? bpRecent.text_value || `${bpRecent.numeric_value} mmHg` : undefined,
      recommendation: hasBpPrevention
        ? 'Pressão avaliada'
        : 'Faça uma medição de controle na farmácia ou consulta',
    },
  ]

  const prevCompleted = preventionItems.filter((i) => i.fulfilled).length
  const prevScore = Math.round((prevCompleted / preventionItems.length) * 100) / 10

  // -------------------------------------------------------------
  // PILAR 2: MONITORING (Monitoramento Ativo nos últimos 30 dias)
  // -------------------------------------------------------------
  const recent30Metrics = metrics.filter((m) => m.date_time >= cutoff30d)

  // 1. Pressão arterial regular (>= 2 medições em 30d)
  const bpCount = recent30Metrics.filter((m) => m.category === 'pressao').length
  const hasBpMon = bpCount >= 2
  const latestBp = recent30Metrics.find((m) => m.category === 'pressao')

  // 2. Peso corporal (>= 1 registro em 30d)
  const weightLogs = recent30Metrics.filter((m) => m.category === 'peso')
  const hasWeightMon = weightLogs.length >= 1
  const latestWeight = weightLogs[0]

  // 3. Sono contínuo (>= 5 registros em 30d)
  const sleepLogs = recent30Metrics.filter((m) => m.category === 'sono')
  const hasSleepMon = sleepLogs.length >= 5
  const latestSleep = sleepLogs[0]

  // 4. Glicemia monitorada (>= 2 registros em 30d)
  const glicLogs = recent30Metrics.filter((m) => m.category === 'glicemia')
  const hasGlicMon = glicLogs.length >= 2
  const latestGlic = glicLogs[0]

  // 5. HRV / Frequência cardíaca (>= 3 registros em 30d)
  const hrvLogs = recent30Metrics.filter((m) => m.category === 'hrv')
  const hasHrvMon = hrvLogs.length >= 3
  const latestHrv = hrvLogs[0]

  const monitoringItems: PillarItem[] = [
    {
      id: 'mon-bp',
      title: 'Pressão Arterial Frequente',
      description: 'Pelo menos 2 medições nos últimos 30 dias para rastrear variações',
      fulfilled: hasBpMon,
      lastDate: latestBp?.date_time.slice(0, 10),
      valueLabel: latestBp ? latestBp.text_value || `${latestBp.numeric_value} mmHg` : undefined,
      recommendation: hasBpMon
        ? `${bpCount} registros em 30 dias`
        : 'Registre sua pressão arterial periodicamente',
    },
    {
      id: 'mon-weight',
      title: 'Acompanhamento do Peso',
      description: 'Ao menos 1 registro de peso/bioimpedância no último mês',
      fulfilled: hasWeightMon,
      lastDate: latestWeight?.date_time.slice(0, 10),
      valueLabel: latestWeight ? `${latestWeight.numeric_value} kg` : undefined,
      recommendation: hasWeightMon
        ? `${weightLogs.length} medições recentes`
        : 'Pese-se pela manhã em jejum para atualizar seu perfil',
    },
    {
      id: 'mon-sleep',
      title: 'Rastreamento do Sono',
      description: 'Pelo menos 5 noites monitoradas nos últimos 30 dias',
      fulfilled: hasSleepMon,
      lastDate: latestSleep?.date_time.slice(0, 10),
      valueLabel: latestSleep ? `${latestSleep.numeric_value}h` : undefined,
      recommendation: hasSleepMon
        ? `${sleepLogs.length} noites registradas`
        : 'Registre suas horas de sono para análise de recuperação',
    },
    {
      id: 'mon-glic',
      title: 'Monitoramento Glicêmico',
      description: 'Pelo menos 2 aferições de glicemia capilar ou sensor em 30 dias',
      fulfilled: hasGlicMon,
      lastDate: latestGlic?.date_time.slice(0, 10),
      valueLabel: latestGlic ? `${latestGlic.numeric_value} mg/dL` : undefined,
      recommendation: hasGlicMon
        ? `${glicLogs.length} medições em 30d`
        : 'Monitore sua glicose de jejum após refeições-chave',
    },
    {
      id: 'mon-hrv',
      title: 'VFC / HRV Matinal',
      description: 'Variabilidade da frequência cardíaca para monitorar estresse e recuperação',
      fulfilled: hasHrvMon,
      lastDate: latestHrv?.date_time.slice(0, 10),
      valueLabel: latestHrv ? `${latestHrv.numeric_value} ms` : undefined,
      recommendation: hasHrvMon
        ? `${hrvLogs.length} medições de VFC`
        : 'Registre a VFC via smartwatch ou faixa de frequência',
    },
  ]

  const monCompleted = monitoringItems.filter((i) => i.fulfilled).length
  const monScore = Math.round((monCompleted / monitoringItems.length) * 100) / 10

  // -------------------------------------------------------------
  // PILAR 3: ACTION (Hábitos Saudáveis & Ações Ativas)
  // -------------------------------------------------------------
  // 1. Sono Médio Adequado (>= 7.0 horas)
  let avgSleep = 0
  if (sleepLogs.length > 0) {
    const sum = sleepLogs.reduce((acc, s) => acc + (s.numeric_value || 0), 0)
    avgSleep = Math.round((sum / sleepLogs.length) * 10) / 10
  } else if (lifestyle?.sleep_hours_typical) {
    avgSleep = lifestyle.sleep_hours_typical
  }
  const hasAdequateSleep = avgSleep >= 7.0

  // 2. Exercício Físico Consistente (>= 120 min/semana ou >= 8 treinos nos últimos 30d ou lifestyle informado)
  const workoutLogs = recent30Metrics.filter((m) => m.category === 'atividade')
  const totalWorkoutMin = workoutLogs.reduce((acc, w) => acc + (w.numeric_value || 0), 0)
  const lifestyleWorkoutMin = (lifestyle?.exercise_minutes_per_week || 0) * 4
  const effectiveWorkoutMin = Math.max(totalWorkoutMin, lifestyleWorkoutMin)
  const hasConsistentExercise =
    effectiveWorkoutMin >= 480 ||
    workoutLogs.length >= 8 ||
    (lifestyle?.exercise_days_per_week || 0) >= 3

  // 3. Consumo Moderado / Controlado de Álcool (<= 4 doses por semana)
  const alcoholLogs = recent30Metrics.filter((m) => m.category === 'alcool')
  const totalAlcoholDoses = alcoholLogs.reduce((acc, a) => acc + (a.numeric_value || 0), 0)
  const monthlyDoses =
    totalAlcoholDoses > 0 ? totalAlcoholDoses : (lifestyle?.alcohol_drinks_per_week || 0) * 4
  const hasModerateAlcohol = monthlyDoses <= 16 // <= 4 doses/semana

  // 4. Hidratação Diária (>= 10 registros de água nos últimos 30d)
  const waterLogs = recent30Metrics.filter((m) => m.category === 'agua')
  const hasGoodHydration = waterLogs.length >= 10

  // 5. Dieta Saudável / Não Fumante
  const isNonSmoker =
    !lifestyle?.smoking_status ||
    lifestyle.smoking_status.toLowerCase().includes('não') ||
    lifestyle.smoking_status.toLowerCase().includes('ex')
  const hasDietHabit =
    Boolean(lifestyle?.diet_pattern) ||
    Boolean(recent30Metrics.find((m) => m.category === 'meditacao' || m.category === 'sauna'))
  const hasHealthyHabits = isNonSmoker && hasDietHabit

  const actionItems: PillarItem[] = [
    {
      id: 'act-sleep',
      title: 'Meta de Sono (7h+ por noite)',
      description: 'Média de descanso reparador para longevidade e regeneração celular',
      fulfilled: hasAdequateSleep,
      valueLabel: avgSleep > 0 ? `${avgSleep}h de média` : 'Sem registros',
      recommendation: hasAdequateSleep
        ? 'Excelente arquitetura de descanso'
        : 'Priorize dormir mais cedo para atingir 7h a 8h',
    },
    {
      id: 'act-exercise',
      title: 'Atividade Física Consistente',
      description: 'Pelo menos 120-150 min/semana de treinos resistidos e aeróbicos',
      fulfilled: hasConsistentExercise,
      valueLabel:
        effectiveWorkoutMin > 0
          ? `${Math.round(effectiveWorkoutMin / 4)} min/semana`
          : `${workoutLogs.length} treinos no mês`,
      recommendation: hasConsistentExercise
        ? 'Rotina de treino exemplar'
        : 'Busque ao menos 3 sessões semanais de exercícios',
    },
    {
      id: 'act-alcohol',
      title: 'Moderação de Álcool',
      description: 'Consumo reduzido (<= 4 doses por semana) para proteger fígado e sono REM',
      fulfilled: hasModerateAlcohol,
      valueLabel: `~${Math.round(monthlyDoses / 4)} dose(s)/semana`,
      recommendation: hasModerateAlcohol
        ? 'Consumo seguro e equilibrado'
        : 'Reduza o consumo para diminuir inflamação',
    },
    {
      id: 'act-water',
      title: 'Hidratação Consistente',
      description: 'Consumo regular de água registrado ao longo dos dias',
      fulfilled: hasGoodHydration,
      valueLabel: `${waterLogs.length} registros no mês`,
      recommendation: hasGoodHydration
        ? 'Hidratação ativa'
        : 'Mantenha uma garrafa de água por perto e registre as tomadas',
    },
    {
      id: 'act-lifestyle',
      title: 'Estilo de Vida Anti-inflamatório',
      description: 'Dieta equilibrada, não-tabagismo e práticas regenerativas (sauna/respiração)',
      fulfilled: hasHealthyHabits,
      valueLabel: lifestyle?.diet_pattern || 'Estilo Saudável',
      recommendation: hasHealthyHabits
        ? 'Hábitos alinhados à longevidade'
        : 'Configure seu padrão alimentar no perfil',
    },
  ]

  const actCompleted = actionItems.filter((i) => i.fulfilled).length
  const actScore = Math.round((actCompleted / actionItems.length) * 100) / 10

  // -------------------------------------------------------------
  // NOTA GERAL: Média ponderada (Prevenção 35%, Monitoramento 35%, Ação 30%)
  // -------------------------------------------------------------
  const weighted = prevScore * 0.35 + monScore * 0.35 + actScore * 0.3
  const overallScore = Math.round(weighted * 10) / 10

  let overallLevel: PreventiveHealthScoreData['overallLevel'] = 'Bom'
  let overallColor = '#10b981' // emerald

  if (overallScore >= 8.5) {
    overallLevel = 'Excelente'
    overallColor = '#059669' // emerald-600
  } else if (overallScore >= 7.0) {
    overallLevel = 'Muito Bom'
    overallColor = '#10b981' // emerald-500
  } else if (overallScore >= 5.5) {
    overallLevel = 'Bom'
    overallColor = '#3b82f6' // blue-500
  } else if (overallScore >= 3.5) {
    overallLevel = 'Atenção'
    overallColor = '#f59e0b' // amber-500
  } else {
    overallLevel = 'Inicial'
    overallColor = '#ef4444' // red-500
  }

  const completedTotal = prevCompleted + monCompleted + actCompleted
  const totalItems = preventionItems.length + monitoringItems.length + actionItems.length

  return {
    overallScore,
    overallLevel,
    overallColor,
    prevention: {
      name: 'prevention',
      title: 'Prevenção (Checkups & Exames)',
      description: 'Rastreios clínicos, perfil lipídico, glicêmico, cardiovascular e vacinação',
      score: prevScore,
      items: preventionItems,
      completedCount: prevCompleted,
      totalCount: preventionItems.length,
    },
    monitoring: {
      name: 'monitoring',
      title: 'Monitoramento (Controle 30d)',
      description: 'Acompanhamento frequente de pressão, peso, sono, glicemia e VFC',
      score: monScore,
      items: monitoringItems,
      completedCount: monCompleted,
      totalCount: monitoringItems.length,
    },
    action: {
      name: 'action',
      title: 'Ação (Hábitos & Metas)',
      description: 'Sono regular 7h+, atividade física, moderação de álcool e alimentação',
      score: actScore,
      items: actionItems,
      completedCount: actCompleted,
      totalCount: actionItems.length,
    },
    completedTotal,
    totalItems,
  }
}
