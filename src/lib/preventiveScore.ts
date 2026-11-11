import { HealthMetric, Exam, ProfileBiomarker, ProfileVaccination, ProfileLifestyle } from '@/types'
import { daysAgoStr } from '@/lib/localDate'

/**
 * Motor do Preventive Health Score (Clínica Soul).
 * Cruza idade (Basic Info) e histórico com recomendações oficiais e pontua três pilares.
 * Cada subitem recebe status (cumprido / parcial / atrasado / sem dados), pontos ganhos
 * sobre o máximo e a recomendação oficial que o fundamenta.
 * Regras que não se aplicam à idade do usuário não entram no cálculo (não punem a nota).
 *
 * PREVENÇÃO (rastreamento, peso 35%) — janelas de recência:
 *   - Lipídios: a partir de 20 anos, a cada 4 anos; a partir de 45, anual (USPSTF / AHA).
 *   - Glicemia / HbA1c: a partir de 35 anos, a cada 3 anos; a partir de 45, anual (ADA).
 *   - Avaliação cardiovascular / ECG: a partir de 40 anos, a cada 2 anos (AHA/ACC).
 *   - Painel sanguíneo geral: a partir de 18 anos, anual.
 *   - Vacinação (influenza anual): todas as idades.
 *   - Pressão arterial em consulta: a cada 6 meses (AHA).
 *
 * MONITORAMENTO (sinais vitais, 30 dias, peso 35%):
 *   - Pressão: normal < 130/80 (AHA/ACC), parcial < 140/90.
 *   - Glicemia: < 100 mg/dL (ADA), parcial < 126 mg/dL.
 *   - Sono: média >= 7 h (OMS/AASM), parcial >= 6 h.
 *   - VFC (HRV) e peso: presença de registros.
 *
 * HÁBITOS (últimos 7 dias, peso 30%):
 *   - Sono >= 7 h, atividade >= 150 min/semana (OMS), álcool <= 4 doses/semana,
 *     hidratação em >= 5 dias, estilo de vida (não fumante e padrão alimentar).
 */

export type PillarItemStatus = 'cumprido' | 'parcial' | 'atrasado' | 'sem dados'

export interface PillarItem {
  id: string
  title: string
  description: string
  status: PillarItemStatus
  fulfilled: boolean
  points: number
  maxPoints: number
  reference: string
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
  earnedPoints: number
  maxPoints: number
  weightPct: number
  contributionPct: number // participação do pilar na nota final (%)
}

export interface PreventiveHealthScoreData {
  overallScore: number // 0 a 10 (média ponderada dos 3 pilares)
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
  meals?: { date_time: string }[]
  /** Meta diária de sono definida pelo usuário (horas). Padrão: 7 h. */
  sleepGoalHours?: number
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const day = (d?: string) => (d ? d.slice(0, 10) : '')

function latestDate(dates: (string | undefined)[]): string | undefined {
  const ds = dates
    .filter((d): d is string => Boolean(d))
    .map((d) => d.slice(0, 10))
    .sort()
  return ds[ds.length - 1]
}

function latestOf<T>(rows: T[], date: (r: T) => string | undefined): T | undefined {
  return rows.reduce<T | undefined>(
    (best, r) => (!best || day(date(r)) > day(date(best)) ? r : best),
    undefined,
  )
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const round1 = (n: number) => Math.round(n * 10) / 10
const half = (max: number) => round1(max / 2)

function fmtBr(d?: string): string {
  const p = day(d).split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : day(d)
}

function bpOf(m: HealthMetric): { sys: number; dia: number } | null {
  const r = (m.text_value || '').match(/(\d{2,3})\s*[/x]\s*(\d{2,3})/)
  return r ? { sys: Number(r[1]), dia: Number(r[2]) } : null
}

/** Maior valor é melhor: >= full → cumprido; >= partial → parcial; senão atrasado. */
function higherBetter(v: number | undefined, full: number, partial: number): PillarItemStatus {
  if (v === undefined) return 'sem dados'
  if (v >= full) return 'cumprido'
  if (v >= partial) return 'parcial'
  return 'atrasado'
}

/** Menor valor é melhor: <= full → cumprido; < partial → parcial; senão atrasado. */
function lowerBetter(v: number | undefined, full: number, partial: number): PillarItemStatus {
  if (v === undefined) return 'sem dados'
  if (v < full) return 'cumprido'
  if (v < partial) return 'parcial'
  return 'atrasado'
}

function scoreBy(status: PillarItemStatus, max: number): number {
  if (status === 'cumprido') return max
  if (status === 'parcial') return half(max)
  return 0
}

function recFor(status: PillarItemStatus, last: string | undefined, due: string): string {
  if (status === 'cumprido') return `Em dia${last ? ` — último registro ${fmtBr(last)}` : ''}`
  if (status === 'parcial') return `Parcial — ${due}`
  if (status === 'atrasado')
    return `Fora da meta${last ? ` (último em ${fmtBr(last)})` : ''} — ${due}`
  return due
}

function makeItem(
  id: string,
  title: string,
  description: string,
  status: PillarItemStatus,
  maxPoints: number,
  reference: string,
  recommendation: string,
  extra: { lastDate?: string; valueLabel?: string } = {},
): PillarItem {
  return {
    id,
    title,
    description,
    status,
    fulfilled: status === 'cumprido',
    points: scoreBy(status, maxPoints),
    maxPoints,
    reference,
    recommendation,
    ...extra,
  }
}

function buildPillar(
  name: string,
  title: string,
  description: string,
  weightPct: number,
  items: PillarItem[],
): PillarScore {
  const earned = items.reduce((a, i) => a + i.points, 0)
  const max = items.reduce((a, i) => a + i.maxPoints, 0)
  return {
    name,
    title,
    description,
    score: max > 0 ? Math.round((earned / max) * 100) / 10 : 0,
    items,
    completedCount: items.filter((i) => i.status === 'cumprido').length,
    totalCount: items.length,
    earnedPoints: round1(earned),
    maxPoints: max,
    weightPct,
    contributionPct: 0,
  }
}

// ---------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------
const LIPID_NAMES = ['colesterol total', 'hdl', 'ldl', 'trigliceri', 'vldl', 'não-hdl', 'nao-hdl']

export function computePreventiveHealthScore(input: ComputeScoreInput): PreventiveHealthScoreData {
  const { metrics, exams, biomarkers, vaccinations, lifestyle, meals = [] } = input
  const sleepGoal = input.sleepGoalHours && input.sleepGoalHours > 0 ? input.sleepGoalHours : 7
  // Regras por sexo biológico só se aplicam ao sexo feminino (Basic Info); outros casos não pontuam.
  const isFemale = input.userGender === 'Feminino'
  const cut1095 = daysAgoStr(1095)
  const age = input.userAge
  const adult = (min: number) => age === undefined || age >= min
  const cut7 = daysAgoStr(7)
  const cut30 = daysAgoStr(30)
  const cut180 = daysAgoStr(180)
  const cut365 = daysAgoStr(365)
  const cut730 = daysAgoStr(730)
  const cutLipid = daysAgoStr(age !== undefined && age >= 45 ? 365 : 1460)
  const cutGlic = daysAgoStr(age !== undefined && age >= 45 ? 365 : 1095)

  // -------------------------------------------------------------
  // PILAR 1 — PREVENÇÃO ATIVA (rastreamento)
  // -------------------------------------------------------------
  const prevention: PillarItem[] = []

  // Lipídios
  const lipidExams = exams.filter((e) => {
    const t = e.title.toLowerCase()
    return (
      t.includes('lipid') ||
      t.includes('sangue') ||
      t.includes('metabólico') ||
      (e.summary_results || '').toLowerCase().includes('colesterol')
    )
  })
  const lipidBios = biomarkers.filter((b) => {
    const n = b.name.toLowerCase()
    return (
      n.includes('colesterol') ||
      (b.category || '').toLowerCase().includes('lipid') ||
      LIPID_NAMES.some((k) => n.includes(k))
    )
  })
  const lipidValues = lipidBios.filter((b) =>
    LIPID_NAMES.some((k) => b.name.toLowerCase().includes(k)),
  )
  const lipidLast = latestDate([...lipidExams.map((e) => e.date), ...lipidBios.map((b) => b.date)])
  const lipidStatus: PillarItemStatus = !lipidLast
    ? 'sem dados'
    : lipidLast >= cutLipid
      ? 'cumprido'
      : 'atrasado'
  prevention.push(
    makeItem(
      'prev-lipid',
      'Painel Lipídico & Colesterol',
      `HDL, LDL e triglicerídeos — ${age !== undefined && age >= 45 ? 'anual (45+)' : 'a cada 4 anos (20+)'}`,
      lipidStatus,
      2,
      'USPSTF / AHA: rastreamento de lipídios a cada 4–6 anos em adultos; anual a partir de 45 anos',
      recFor(lipidStatus, lipidLast, 'Agende um painel lipídico'),
      {
        lastDate: lipidLast,
        valueLabel: lipidValues.length
          ? `${lipidValues
              .slice(0, 4)
              .map((b) => `${b.name}: ${b.value}${b.unit ? ` ${b.unit}` : ''}`)
              .join(' · ')} (${fmtBr(latestDate(lipidValues.map((b) => b.date)) || lipidLast)})`
          : undefined,
      },
    ),
  )

  // Glicemia / HbA1c (a partir de 35 anos)
  if (adult(35)) {
    const glicExams = exams.filter((e) => {
      const s = (e.summary_results || '').toLowerCase()
      return (
        e.title.toLowerCase().includes('glic') ||
        s.includes('glicose') ||
        s.includes('glicemia') ||
        s.includes('hba1c')
      )
    })
    const glicBios = biomarkers.filter((b) => {
      const n = b.name.toLowerCase()
      return n.includes('glicose') || n.includes('glicemia') || n.includes('hba1c')
    })
    const glicMetrics = metrics.filter((m) => m.category === 'glicemia')
    const last = latestDate([
      ...glicExams.map((e) => e.date),
      ...glicBios.map((b) => b.date),
      ...glicMetrics.map((m) => m.date_time),
    ])
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cutGlic ? 'cumprido' : 'atrasado'
    prevention.push(
      makeItem(
        'prev-diabetes',
        'Rastreamento de Diabetes & Glicemia',
        'Glicemia de jejum ou HbA1c — a cada 3 anos (35+), anual com risco ou a partir de 45',
        status,
        2,
        'ADA: rastreamento de glicemia/HbA1c a partir de 35 anos, a cada 3 anos; anual com risco ou 45+',
        recFor(status, last, 'Solicite glicemia de jejum e HbA1c'),
        { lastDate: last },
      ),
    )
  }

  // Cardiovascular / ECG (a partir de 40 anos)
  if (adult(40)) {
    const cardioExams = exams.filter((e) => {
      const t = e.title.toLowerCase()
      return (
        (e.type || '').toLowerCase().includes('eletro') ||
        t.includes('eletro') ||
        t.includes('ecg') ||
        t.includes('cardio') ||
        t.includes('ergométrico')
      )
    })
    const last = latestDate(cardioExams.map((e) => e.date))
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cut730 ? 'cumprido' : 'atrasado'
    prevention.push(
      makeItem(
        'prev-cardio',
        'Avaliação Cardiovascular (ECG)',
        'Eletrocardiograma ou avaliação cardiológica — a cada 2 anos a partir de 40 anos',
        status,
        1,
        'AHA/ACC: avaliação cardiovascular periódica a partir de 40 anos (intervalo de 2 anos adotado)',
        recFor(status, last, 'Agende avaliação cardiovascular com seu médico'),
        { lastDate: last },
      ),
    )
  }

  // Painel sanguíneo geral (a partir de 18 anos)
  if (adult(18)) {
    const bloodExams = exams.filter((e) => {
      const t = e.title.toLowerCase()
      return (
        (e.type || '').toLowerCase().includes('sangue') ||
        t.includes('sangue') ||
        t.includes('hemograma') ||
        t.includes('painel')
      )
    })
    const last = latestDate([...bloodExams.map((e) => e.date), ...biomarkers.map((b) => b.date)])
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cut365 ? 'cumprido' : 'atrasado'
    prevention.push(
      makeItem(
        'prev-blood',
        'Painel Metabólico & Biomarcadores',
        'Hemograma, marcadores hepáticos e inflamatórios — anual',
        status,
        1,
        'Diretrizes de check-up anual para adultos (Ministério da Saúde / OMS)',
        recFor(status, last, 'Solicite um painel de sangue com seu médico'),
        { lastDate: last },
      ),
    )
  }

  // Vacinação (todas as idades)
  {
    const last = latestDate(vaccinations.map((v) => v.date))
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cut365 ? 'cumprido' : 'atrasado'
    const latestVac = latestOf(vaccinations, (v) => v.date)
    prevention.push(
      makeItem(
        'prev-vaccine',
        'Carteira de Vacinação Preventiva',
        'Influenza anual e demais vacinas do calendário',
        status,
        1,
        'Ministério da Saúde / OMS: vacinação de influenza anual e calendário vacinal',
        recFor(status, last, 'Atualize suas vacinas na aba Vacinação'),
        { lastDate: last, valueLabel: latestVac?.vaccine },
      ),
    )
  }

  // Pressão de base em consulta (a cada 6 meses)
  {
    const bpAll = metrics.filter((m) => m.category === 'pressao')
    const latest = latestOf(bpAll, (m) => m.date_time)
    const last = latest ? day(latest.date_time) : undefined
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cut180 ? 'cumprido' : 'atrasado'
    prevention.push(
      makeItem(
        'prev-bp',
        'Aferição de Pressão de Base',
        'Pressão arterial aferida ao menos a cada 6 meses (consulta ou farmácia)',
        status,
        1,
        'AHA/ACC: aferição de pressão arterial em cada consulta de rotina',
        recFor(status, last, 'Faça uma aferição na consulta ou farmácia'),
        {
          lastDate: last,
          valueLabel: latest ? latest.text_value || `${latest.numeric_value} mmHg` : undefined,
        },
      ),
    )
  }

  // -------------------------------------------------------------
  // Rastreamentos específicos por sexo biológico (aplicáveis só ao sexo feminino na faixa etária)
  if (isFemale && age !== undefined && age >= 40 && age <= 74) {
    const mammo = exams.filter((e) =>
      `${e.title} ${e.type || ''} ${e.summary_results || ''}`.toLowerCase().includes('mamograf'),
    )
    const last = latestDate(mammo.map((e) => e.date))
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cut730 ? 'cumprido' : 'atrasado'
    prevention.push(
      makeItem(
        'prev-mammo',
        'Mamografia de Rastreamento',
        'Mamografia a cada 2 anos dos 40 aos 74 anos (sexo feminino)',
        status,
        2,
        'USPSTF (2024): mamografia a cada 2 anos dos 40 aos 74 anos; Ministério da Saúde / INCA: rastreamento de mama',
        recFor(status, last, 'Agende uma mamografia'),
        { lastDate: last },
      ),
    )
  }

  if (isFemale && age !== undefined && age >= 25 && age <= 64) {
    const cerv = exams.filter((e) => {
      const t = `${e.title} ${e.type || ''} ${e.summary_results || ''}`.toLowerCase()
      return (
        t.includes('papanicolau') ||
        t.includes('citolog') ||
        t.includes('hpv') ||
        t.includes('colo do útero')
      )
    })
    const last = latestDate(cerv.map((e) => e.date))
    const status: PillarItemStatus = !last ? 'sem dados' : last >= cut1095 ? 'cumprido' : 'atrasado'
    prevention.push(
      makeItem(
        'prev-cervical',
        'Rastreamento do Colo do Útero',
        'Papanicolau ou teste de HPV a cada 3 anos dos 25 aos 64 anos (sexo feminino)',
        status,
        2,
        'USPSTF / Ministério da Saúde (INCA): rastreamento do câncer do colo do útero dos 25 aos 64 anos, a cada 3 anos',
        recFor(status, last, 'Agende o exame de colo do útero (papanicolau ou HPV)'),
        { lastDate: last },
      ),
    )
  }

  // -------------------------------------------------------------
  // PILAR 2 — MONITORAMENTO DE SINAIS VITAIS (últimos 30 dias)
  // -------------------------------------------------------------
  const recent30 = metrics.filter((m) => day(m.date_time) >= cut30)
  const monitoring: PillarItem[] = []

  // Pressão (zonas AHA)
  {
    const bpLatest = latestOf(
      recent30.filter((m) => m.category === 'pressao'),
      (m) => m.date_time,
    )
    const parsed = bpLatest ? bpOf(bpLatest) : null
    let status: PillarItemStatus = 'sem dados'
    if (parsed) {
      if (parsed.sys < 130 && parsed.dia < 80) status = 'cumprido'
      else if (parsed.sys < 140 && parsed.dia < 90) status = 'parcial'
      else status = 'atrasado'
    }
    monitoring.push(
      makeItem(
        'mon-bp',
        'Pressão Arterial em Zona Saudável',
        'Última pressão dos 30 dias: normal abaixo de 130/80 mmHg',
        status,
        2,
        'AHA/ACC: normal < 120/80; meta de controle < 130/80 mmHg; parcial até 139/89',
        status === 'sem dados'
          ? 'Registre sua pressão nos últimos 30 dias'
          : recFor(status, day(bpLatest?.date_time), 'Confirme a aferição com seu médico'),
        {
          lastDate: day(bpLatest?.date_time) || undefined,
          valueLabel: parsed ? `${parsed.sys}/${parsed.dia} mmHg` : undefined,
        },
      ),
    )
  }

  // Glicemia (ADA)
  {
    const glicLatest = latestOf(
      recent30.filter((m) => m.category === 'glicemia'),
      (m) => m.date_time,
    )
    const value = glicLatest ? num(glicLatest.numeric_value) : undefined
    const status = lowerBetter(value, 100, 126)
    monitoring.push(
      makeItem(
        'mon-glic',
        'Glicemia em Zona Saudável',
        'Última glicemia dos 30 dias: abaixo de 100 mg/dL em jejum',
        status,
        2,
        'ADA: glicemia de jejum normal < 100 mg/dL; 100–125 mg/dL indica pré-diabetes',
        recFor(status, day(glicLatest?.date_time) || undefined, 'Monitore a glicemia de jejum'),
        {
          lastDate: day(glicLatest?.date_time) || undefined,
          valueLabel: value !== undefined ? `${value} mg/dL` : undefined,
        },
      ),
    )
  }

  // Sono (7 h+)
  {
    const sleepLogs = recent30.filter((m) => m.category === 'sono')
    const values = sleepLogs
      .map((s) => num(s.numeric_value))
      .filter((v): v is number => v !== undefined)
    const avg = values.length ? round1(mean(values)) : undefined
    const status = higherBetter(avg, 7, 6)
    monitoring.push(
      makeItem(
        'mon-sleep',
        'Sono Reparador nos 30 dias',
        'Média de sono dos últimos 30 dias: 7 horas ou mais',
        status,
        2,
        'OMS / AASM: adultos devem dormir 7 horas ou mais por noite',
        recFor(status, undefined, 'Priorize 7 a 8 horas de sono por noite'),
        { valueLabel: avg !== undefined ? `${avg}h de média` : undefined },
      ),
    )
  }

  // VFC / HRV
  {
    const hrvCount = recent30.filter((m) => m.category === 'hrv').length
    const status: PillarItemStatus =
      hrvCount >= 3 ? 'cumprido' : hrvCount >= 1 ? 'parcial' : 'sem dados'
    monitoring.push(
      makeItem(
        'mon-hrv',
        'VFC / HRV Monitorada',
        'Pelo menos 3 medições de variabilidade da frequência cardíaca em 30 dias',
        status,
        1,
        'Acompanhamento de VFC como marcador de recuperação (tendência individual, sem faixa fixa)',
        recFor(status, undefined, 'Registre a VFC via smartwatch ou faixa de frequência'),
        { valueLabel: hrvCount ? `${hrvCount} medições` : undefined },
      ),
    )
  }

  // Peso
  {
    const weightLogs = recent30.filter((m) => m.category === 'peso')
    const latest = latestOf(weightLogs, (m) => m.date_time)
    const status: PillarItemStatus = weightLogs.length ? 'cumprido' : 'sem dados'
    monitoring.push(
      makeItem(
        'mon-weight',
        'Acompanhamento do Peso',
        'Ao menos 1 registro de peso nos últimos 30 dias',
        status,
        1,
        'OMS: acompanhamento periódico de peso e IMC como marcador de risco metabólico',
        recFor(status, day(latest?.date_time) || undefined, 'Pese-se e registre seu peso'),
        {
          lastDate: day(latest?.date_time) || undefined,
          valueLabel: latest ? `${latest.numeric_value} kg` : undefined,
        },
      ),
    )
  }

  // -------------------------------------------------------------
  // PILAR 3 — HÁBITOS DE ESTILO DE VIDA (últimos 7 dias)
  // -------------------------------------------------------------
  const recent7 = metrics.filter((m) => day(m.date_time) >= cut7)
  const action: PillarItem[] = []

  // Sono 7 h+
  {
    const logs = recent7.filter((m) => m.category === 'sono')
    const values = logs.map((s) => num(s.numeric_value)).filter((v): v is number => v !== undefined)
    const avg = values.length ? round1(mean(values)) : num(lifestyle?.sleep_hours_typical) // fallback: perfil
    const status = higherBetter(avg, sleepGoal, sleepGoal - 1)
    action.push(
      makeItem(
        'act-sleep',
        `Meta de Sono (${sleepGoal}h+ por noite)`,
        'Média de sono dos últimos 7 dias',
        status,
        2,
        'OMS / AASM: 7 horas ou mais de sono por noite para adultos; a meta usada é a definida pelo usuário',
        recFor(status, undefined, `Priorize dormir mais cedo para atingir ${sleepGoal} horas`),
        { valueLabel: avg !== undefined ? `${avg}h de média` : 'Sem registros' },
      ),
    )
  }

  // Atividade física (150 min/semana)
  {
    const logs = recent7.filter((m) => m.category === 'atividade')
    const minutes = logs.length
      ? logs.reduce((a, w) => a + (num(w.numeric_value) || 0), 0)
      : num(lifestyle?.exercise_minutes_per_week)
    const status = higherBetter(minutes, 150, 75)
    action.push(
      makeItem(
        'act-exercise',
        'Atividade Física Consistente',
        'Minutos de atividade na semana — meta de 150 min',
        status,
        2,
        'OMS: 150–300 min/semana de atividade aeróbica moderada para adultos',
        recFor(status, undefined, 'Busque 150 minutos de atividade por semana'),
        { valueLabel: minutes !== undefined ? `${Math.round(minutes)} min/semana` : undefined },
      ),
    )
  }

  // Álcool (<= 4 doses/semana)
  {
    const logs = recent7.filter((m) => m.category === 'alcool')
    const doses = logs.length
      ? logs.reduce((a, l) => a + (num(l.numeric_value) || 0), 0)
      : num(lifestyle?.alcohol_drinks_per_week)
    const status: PillarItemStatus =
      doses === undefined ? 'sem dados' : doses <= 4 ? 'cumprido' : 'atrasado'
    action.push(
      makeItem(
        'act-alcohol',
        'Moderação de Álcool',
        'Até 4 doses por semana',
        status,
        1,
        'OMS: reduzir o consumo de álcool para o menor nível possível; limite de referência de 4 doses/semana',
        recFor(status, undefined, 'Reduza o consumo para diminuir risco'),
        { valueLabel: doses !== undefined ? `${Math.round(doses)} dose(s)/semana` : undefined },
      ),
    )
  }

  // Hidratação (dias com registro de água)
  {
    const days = new Set(recent7.filter((m) => m.category === 'agua').map((m) => day(m.date_time)))
      .size
    const value = days > 0 ? days : undefined
    const status = higherBetter(value, 5, 1)
    action.push(
      makeItem(
        'act-water',
        'Hidratação Consistente',
        'Dias com registro de água na última semana (meta: 5 dias)',
        status,
        1,
        'OMS: ingestão adequada de água diariamente como prevenção primária',
        recFor(status, undefined, 'Registre sua água diariamente'),
        { valueLabel: value !== undefined ? `${days} dia(s) na semana` : undefined },
      ),
    )
  }

  // Estilo de vida (não fumante e padrão alimentar)
  {
    let status: PillarItemStatus = 'sem dados'
    if (lifestyle) {
      const smoking = (lifestyle.smoking_status || '').toLowerCase()
      const nonSmoker = !smoking || smoking.includes('não') || smoking.includes('ex')
      status = nonSmoker && Boolean(lifestyle.diet_pattern) ? 'cumprido' : 'atrasado'
    }
    action.push(
      makeItem(
        'act-lifestyle',
        'Estilo de Vida Anti-inflamatório',
        'Não fumar e padrão alimentar definido no perfil',
        status,
        1,
        'OMS / Ministério da Saúde: alimentação saudável e não tabagismo como prevenção primária',
        recFor(status, undefined, 'Configure seu padrão alimentar no perfil'),
        { valueLabel: lifestyle?.diet_pattern || undefined },
      ),
    )
  }

  // -------------------------------------------------------------
  // Registro de alimentação e de sintomas (últimos 7 dias)
  {
    const mealDays = new Set(
      meals.filter((m) => day(m.date_time) >= cut7).map((m) => day(m.date_time)),
    ).size
    const value = mealDays > 0 ? mealDays : undefined
    const status = higherBetter(value, 5, 2)
    action.push(
      makeItem(
        'act-meals',
        'Registro de Alimentação',
        'Dias com refeições registradas na última semana (meta: 5 dias)',
        status,
        1,
        'OMS / Guia Alimentar para a População Brasileira: alimentação regular e saudável como prevenção primária',
        recFor(status, undefined, 'Registre suas refeições diariamente'),
        { valueLabel: value !== undefined ? `${mealDays} dia(s) na semana` : undefined },
      ),
    )
  }
  {
    const symptomDays = new Set(
      recent7.filter((m) => m.category === 'sintoma').map((m) => day(m.date_time)),
    ).size
    const value = symptomDays > 0 ? symptomDays : undefined
    const status = higherBetter(value, 3, 1)
    action.push(
      makeItem(
        'act-symptoms',
        'Registro de Sintomas',
        'Dias com sintomas registrados na última semana (meta: 3 dias)',
        status,
        1,
        'Ministério da Saúde: acompanhar sinais e sintomas com regularidade para detecção precoce',
        recFor(status, undefined, 'Registre sintomas sempre que sentir algo'),
        { valueLabel: value !== undefined ? `${symptomDays} dia(s) na semana` : undefined },
      ),
    )
  }

  // -------------------------------------------------------------
  // NOTA GERAL — pesos: Prevenção 35%, Monitoramento 35%, Hábitos 30%
  // -------------------------------------------------------------
  const prevPillar = buildPillar(
    'prevention',
    'Prevenção Ativa (Rastreamento)',
    'Exames e vacinas exigidos para a sua idade, dentro da recência recomendada',
    35,
    prevention,
  )
  const monPillar = buildPillar(
    'monitoring',
    'Monitoramento de Sinais Vitais',
    'Pressão, glicemia, sono, VFC e peso dos últimos 30 dias, comparados a zonas saudáveis',
    35,
    monitoring,
  )
  const actPillar = buildPillar(
    'action',
    'Hábitos de Estilo de Vida',
    'Metas de sono, atividade, álcool, hidratação e estilo de vida dos últimos 7 dias',
    30,
    action,
  )

  const overallScore =
    Math.round((prevPillar.score * 0.35 + monPillar.score * 0.35 + actPillar.score * 0.3) * 10) / 10

  for (const p of [prevPillar, monPillar, actPillar]) {
    p.contributionPct =
      overallScore > 0 ? Math.round(((p.score * p.weightPct) / 100 / overallScore) * 1000) / 10 : 0
  }

  let overallLevel: PreventiveHealthScoreData['overallLevel'] = 'Bom'
  let overallColor = '#10b981'

  if (overallScore >= 8.5) {
    overallLevel = 'Excelente'
    overallColor = '#059669'
  } else if (overallScore >= 7.0) {
    overallLevel = 'Muito Bom'
    overallColor = '#10b981'
  } else if (overallScore >= 5.5) {
    overallLevel = 'Bom'
    overallColor = '#3b82f6'
  } else if (overallScore >= 3.5) {
    overallLevel = 'Atenção'
    overallColor = '#f59e0b'
  } else {
    overallLevel = 'Inicial'
    overallColor = '#ef4444'
  }

  return {
    overallScore,
    overallLevel,
    overallColor,
    prevention: prevPillar,
    monitoring: monPillar,
    action: actPillar,
    completedTotal: prevPillar.completedCount + monPillar.completedCount + actPillar.completedCount,
    totalItems: prevPillar.totalCount + monPillar.totalCount + actPillar.totalCount,
  }
}
