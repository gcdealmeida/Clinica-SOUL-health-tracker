import { HealthMetric } from '@/types'
import { METRIC_CARDS, MetricCardDef, todayStr } from '@/lib/dashboard'

/**
 * Agregação de séries temporais de uma métrica de saúde (health_metrics)
 * para o painel de detalhe /metrics/:tipo — estilo Guava.
 */

export type PeriodId = 'hoje' | '2s' | '1m' | '3m' | '6m' | '1a'

export interface PeriodOption {
  id: PeriodId
  label: string
  days: number // tamanho da janela em dias (hoje = 1)
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'hoje', label: 'Hoje', days: 1 },
  { id: '2s', label: '2 semanas', days: 14 },
  { id: '1m', label: '1 mês', days: 30 },
  { id: '3m', label: '3 meses', days: 90 },
  { id: '6m', label: '6 meses', days: 182 },
  { id: '1a', label: '1 ano', days: 365 },
]

export type MetricChartType = 'line' | 'bars' | 'dualLine'

export interface MetricMeta {
  /** tipo de gráfico adequado à natureza da métrica */
  chart: MetricChartType
  /** rótulo legível da métrica */
  title: string
  /** unidade */
  unit: string
  /** true = somatório diário (água ml, café, álcool, minutos de atividade) */
  dailySum: boolean
  /** descrição curta de contexto clínico mostrada no painel */
  description?: string
  color: string // classe tailwind de texto para a série
  stroke: string // classe tailwind da linha/série
  fill: string // classe tailwind da área/barras
}

const desc = {
  agua: 'A ingestão adequada de água auxilia na regulação da temperatura corporal, no transporte de nutrientes e na função renal. O ideal varia com peso, clima e nível de atividade física.',
  cafe: 'A cafeína aumenta o estado de alerta, mas o excesso pode elevar a frequência cardíaca e atrapalhar o sono. O consumo recomendado para adultos é de até 400 mg por dia.',
  sono: 'Adultos devem dormir de 7 a 9 horas por noite. Dormir bem regula hormônios, memória, humor e a recuperação do corpo.',
  hrv: 'A Variabilidade da Frequência Cardíaca (VFC) é a diferença de tempo entre batimentos consecutivos. Valores mais altos indicam boa adaptação do corpo ao estresse; valores baixos podem indicar fadiga ou problemas de saúde.',
  atividade:
    'A OMS recomenda ao menos 150 minutos de atividade física moderada por semana para adultos — cerca de 21 minutos por dia.',
  pressao:
    'A pressão arterial ideal para adultos é em torno de 120/80 mmHg. Valores frequentemente acima de 140/90 indicam hipertensão e merecem avaliação médica.',
  peso: 'O acompanhamento do peso corporal ajuda a avaliar tendências ao longo do tempo — foco na direção, não em variações de um dia.',
  glicemia:
    'A glicemia em jejum saudável fica entre 70 e 99 mg/dL. Valores persistentemente acima de 126 mg/dL em jejum sugerem diabetes e exigem avaliação médica.',
  saturacao:
    'A saturação de oxigênio (SpO2) saudável fica entre 95% e 100%. Valores abaixo de 92% merecem atenção médica.',
  alcool:
    'O consumo de álcool deve ser moderado: até 1 dose por dia para mulheres e até 2 para homens, com dias sem consumo.',
  meditacao:
    'Práticas de meditação e respiração ajudam a reduzir o estresse e melhorar o foco e a qualidade do sono.',
  sauna:
    'Sauna e banho gelado podem auxiliar na recuperação muscular e na saúde cardiovascular quando praticados com moderação.',
}

export function metricMeta(def: MetricCardDef): MetricMeta {
  const id = def.id
  const title =
    id === 'hrv'
      ? 'Variabilidade Cardíaca (HRV)'
      : id === 'sauna'
        ? 'Sauna / Banho Gelado'
        : def.name
  const unit = def.unit

  // métricas somadas por dia → barras; contínuas → linha/área; pressão → dupla linha
  let chart: MetricChartType = 'line'
  let dailySum = !!def.isDailySum
  if (id === 'pressao') chart = 'dualLine'
  else if (dailySum) chart = 'bars'

  const colors: Record<string, { stroke: string; fill: string; color: string }> = {
    agua: { stroke: '#2563eb', fill: '#3b82f6', color: 'text-blue-600' },
    cafe: { stroke: '#b45309', fill: '#d97706', color: 'text-amber-700' },
    sono: { stroke: '#4f46e5', fill: '#6366f1', color: 'text-indigo-600' },
    hrv: { stroke: '#059669', fill: '#10b981', color: 'text-emerald-600' },
    atividade: { stroke: '#ea580c', fill: '#f97316', color: 'text-orange-600' },
    pressao: { stroke: '#e11d48', fill: '#f43f5e', color: 'text-rose-600' },
    peso: { stroke: '#475569', fill: '#64748b', color: 'text-slate-600' },
    glicemia: { stroke: '#0d9488', fill: '#14b8a6', color: 'text-teal-600' },
    saturacao: { stroke: '#0891b2', fill: '#06b6d4', color: 'text-cyan-600' },
    alcool: { stroke: '#b91c1c', fill: '#dc2626', color: 'text-red-700' },
    meditacao: { stroke: '#047857', fill: '#059669', color: 'text-emerald-700' },
    sauna: { stroke: '#d97706', fill: '#f59e0b', color: 'text-amber-600' },
  }
  const c = colors[id] ?? { stroke: '#059669', fill: '#10b981', color: 'text-emerald-600' }

  return { chart, dailySum, title, unit, description: desc[id], ...c }
}

export interface ChartPoint {
  /** rótulo curto do eixo X: "Hoje" / "3 out" / "Sem 40" / "out" */
  label: string
  /** valor agregado da métrica no bucket */
  value: number | null
  /** dia(s) cobertos pelo bucket — ISO YYYY-MM-DD (ou o último dia do bucket) */
  day: string
}

export interface DualPoint extends Omit<ChartPoint, 'value'> {
  /** dia(s) cobertos pelo bucket — ISO YYYY-MM-DD */
  sys: number | null
  dia: number | null
}

const DAY_MS = 86400000

export const dayKey = (dt: string) => dt.slice(0, 10)

export function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDayLabel(day: string, periodId: PeriodId): string {
  const d = new Date(`${day}T00:00:00`)
  if (isNaN(d.getTime())) return day
  const p = (n: number) => String(n).padStart(2, '0')
  if (periodId === 'hoje')
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
  if (periodId === '2s' || periodId === '1m')
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (periodId === '3m') return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (periodId === '6m') return d.toLocaleDateString('pt-BR', { month: 'short' })
  return d.toLocaleDateString('pt-BR', { month: 'short' })
}

/** Número de buckets por período (comprimindo períodos longos). */
function bucketCount(period: PeriodOption): number {
  switch (period.id) {
    case 'hoje':
      return 8 // faixas de 3h ao longo do dia
    case '2s':
      return 14
    case '1m':
      return 30
    case '3m':
      return 26 // ~ semanas
    case '6m':
      return 26
    case '1a':
      return 12
  }
}

/** Tamanho (em dias) de cada bucket do período. */
function bucketSizeDays(period: PeriodOption): number {
  switch (period.id) {
    case 'hoje':
      return 1
    case '2s':
      return 1
    case '1m':
      return 1
    case '3m':
      return 7
    case '6m':
      return 7
    case '1a':
      return 30
  }
}

/** Valores numéricos de um registro (pressão deriva de text_value "120/81"). */
export function recordValues(m: HealthMetric): number[] {
  if (m.category === 'pressao') {
    const text = m.text_value || m.notes || ''
    const mm = text.match(/(\d{2,3})\s*[/x×-]\s*(\d{2,3})/)
    if (mm) return [Number(mm[1]), Number(mm[2])]
    if (m.numeric_value) return [m.numeric_value, NaN]
    return []
  }
  if (m.numeric_value !== undefined && m.numeric_value !== null) return [m.numeric_value]
  return []
}

/**
 * Série principal: buckets regulares cobrindo a janela do período.
 * Para métricas de somatório diário, soma; para contínuas, média.
 * Buckets sem registros ficam com null (quebra de linha no gráfico).
 */
export function buildSeries(
  items: HealthMetric[],
  period: PeriodOption,
  def: MetricCardDef,
): ChartPoint[] {
  const today = todayStr()
  const meta = metricMeta(def)

  // ---- Hoje: faixas de 3 horas ----
  if (period.id === 'hoje') {
    const todays = items.filter((m) => dayKey(m.date_time) === today)
    const buckets: ChartPoint[] = []
    const labels = ['00-03h', '03-06h', '06-09h', '09-12h', '12-15h', '15-18h', '18-21h', '21-24h']
    for (let i = 0; i < 8; i++) {
      const from = i * 3
      const to = from + 3
      const inRange = todays.filter((m) => {
        const h = Number((m.date_time || '').slice(11, 13))
        return h >= from && h < to
      })
      let value: number | null = null
      if (inRange.length) {
        const vals = inRange.flatMap(recordValues)
        value = meta.dailySum
          ? vals.reduce((s, v) => s + v, 0)
          : vals.reduce((s, v) => s + v, 0) / vals.length
      }
      buckets.push({ label: labels[i], value, day: today })
    }
    return buckets
  }

  // ---- Períodos com dias ----
  const size = bucketSizeDays(period)
  const count = bucketCount(period)
  const end = today
  const start = addDaysStr(today, -(period.days - 1))
  const out: ChartPoint[] = []

  for (let b = 0; b < count; b++) {
    const bStart = addDaysStr(start, b * size)
    // último bucket pode ser menor (janela não alinha com múltiplos de 7/30)
    const daysLeft = addDaysStr(end, 1) <= bStart ? 0 : Math.min(size, diffDays(bStart, today) + 1)
    if (daysLeft <= 0) break
    const bEnd = addDaysStr(bStart, daysLeft - 1)
    const inBucket = items.filter((m) => {
      const d = dayKey(m.date_time)
      return d >= bStart && d <= bEnd
    })
    let value: number | null = null
    if (inBucket.length) {
      const vals = inBucket.flatMap(recordValues)
      value = meta.dailySum
        ? vals.reduce((s, v) => s + v, 0)
        : vals.reduce((s, v) => s + v, 0) / vals.length
    }
    out.push({ label: formatDayLabel(bStart, period.id), value, day: bStart })
  }
  return out
}

/** Série para pressão arterial: sistólica e diastólica por bucket. */
export function buildDualSeries(items: HealthMetric[], period: PeriodOption): DualPoint[] {
  const today = todayStr()
  if (period.id === 'hoje') {
    const todays = items.filter((m) => dayKey(m.date_time) === today)
    const labels = ['00-03h', '03-06h', '06-09h', '09-12h', '12-15h', '15-18h', '18-21h', '21-24h']
    return labels.map((label, i) => {
      const inRange = todays.filter((m) => {
        const h = Number((m.date_time || '').slice(11, 13))
        return h >= i * 3 && h < i * 3 + 3
      })
      const vals = inRange.flatMap(recordValues).filter((v) => !isNaN(v))
      return {
        label,
        day: today,
        sys: vals.length ? Math.round(mean(vals.filter((_, k) => k % 2 === 0))) : null,
        dia: vals.length ? Math.round(mean(vals.filter((_, k) => k % 2 === 1))) : null,
      }
    })
  }

  const size = bucketSizeDays(period)
  const count = bucketCount(period)
  const end = today
  const start = addDaysStr(today, -(period.days - 1))
  const out: DualPoint[] = []
  for (let b = 0; b < count; b++) {
    const bStart = addDaysStr(start, b * size)
    const daysLeft = addDaysStr(end, 1) <= bStart ? 0 : Math.min(size, diffDays(bStart, today) + 1)
    if (daysLeft <= 0) break
    const bEnd = addDaysStr(bStart, daysLeft - 1)
    const inBucket = items.filter((m) => {
      const d = dayKey(m.date_time)
      return d >= bStart && d <= bEnd
    })
    const vals = inBucket.flatMap(recordValues).filter((v) => !isNaN(v))
    out.push({
      label: formatDayLabel(bStart, period.id),
      day: bStart,
      sys: vals.length ? Math.round(mean(vals.filter((_, k) => k % 2 === 0))) : null,
      dia: vals.length ? Math.round(mean(vals.filter((_, k) => k % 2 === 1))) : null,
    })
  }
  return out
}

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / DAY_MS,
  )
}

/** Agrupa registros por dia e reduz com a estratégia da métrica. */
export function dailyTotals(
  items: HealthMetric[],
  meta: MetricMeta,
): Array<{ day: string; value: number }> {
  const byDay = new Map<string, number[]>()
  for (const m of items) {
    const d = dayKey(m.date_time)
    const vals = recordValues(m)
    if (!vals.length) continue
    const arr = byDay.get(d) ?? []
    arr.push(...vals)
    byDay.set(d, arr)
  }
  return [...byDay.entries()]
    .map(([day, vals]) => ({
      day,
      value: meta.dailySum ? vals.reduce((s, v) => s + v, 0) : mean(vals),
    }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

// ---------- Estatísticas resumidas (All-time / do período) ----------

export interface RangeStats {
  max: { value: number; day: string } | null
  avg: number | null
  total: number | null
  count: number
  since: string | null // primeiro dia com registro
  firstDay: string | null
}

export function computeStats(items: HealthMetric[], meta: MetricMeta): RangeStats {
  const totals = dailyTotals(items, meta)
  if (!totals.length) {
    return { max: null, avg: null, total: null, count: 0, since: null, firstDay: null }
  }
  let max: { value: number; day: string } | null = null
  let sum = 0
  for (const t of totals) {
    if (!max || t.value > max.value) max = { value: t.value, day: t.day }
    sum += t.value
  }
  const avg = sum / totals.length
  return {
    max,
    avg,
    total: meta.dailySum ? sum : null,
    count: items.length,
    since: totals[0].day,
    firstDay: totals[0].day,
  }
}

// ---------- Média por dia da semana ----------

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function weekdayAverages(
  items: HealthMetric[],
  meta: MetricMeta,
): Array<{ label: string; value: number | null }> {
  const totals = dailyTotals(items, meta)
  const byWd = new Map<number, number[]>()
  for (const t of totals) {
    const wd = new Date(`${t.day}T00:00:00`).getDay()
    const arr = byWd.get(wd) ?? []
    arr.push(t.value)
    byWd.set(wd, arr)
  }
  return WEEKDAYS.map((label, i) => {
    const arr = byWd.get(i)
    return { label, value: arr && arr.length ? mean(arr) : null }
  })
}

// ---------- Total por mês/ano (para janelas de 1 ano) ----------

export function monthlyTotals(
  items: HealthMetric[],
  meta: MetricMeta,
): Array<{ label: string; value: number | null }> {
  const totals = dailyTotals(items, meta)
  const byMonth = new Map<string, number[]>()
  for (const t of totals) {
    const key = t.day.slice(0, 7)
    const arr = byMonth.get(key) ?? []
    arr.push(t.value)
    byMonth.set(key, arr)
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([key, vals]) => ({
      label: new Date(`${key}-01T00:00:00`).toLocaleDateString('pt-BR', { month: 'short' }),
      value: meta.dailySum ? vals.reduce((s, v) => s + v, 0) : mean(vals),
    }))
}

// ---------- Formatação de valores ----------

/** Formata valor conforme a métrica (hora decimal → "7h 30m" para sono). */
export function formatValue(id: string, v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return '--'
  if (id === 'sono') {
    const h = Math.floor(v)
    const min = Math.round((v - h) * 60)
    return min > 0 ? `${h}h ${String(min).padStart(2, '0')}m` : `${h}h`
  }
  const decimals = v < 10 && !Number.isInteger(v) ? 1 : 0
  return v.toLocaleString('pt-BR', { maximumFractionDigits: decimals })
}

/** Total (somatório diário) ou média por ano (últimos 5 anos). */
export function yearlyTotals(
  items: HealthMetric[],
  meta: MetricMeta,
): Array<{ label: string; value: number | null }> {
  const totals = dailyTotals(items, meta)
  const byYear = new Map<string, number[]>()
  for (const t of totals) {
    const key = t.day.slice(0, 4)
    const arr = byYear.get(key) ?? []
    arr.push(t.value)
    byYear.set(key, arr)
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-5)
    .map(([label, vals]) => ({
      label,
      value: meta.dailySum ? vals.reduce((s, v) => s + v, 0) : mean(vals),
    }))
}

// ---------- Busca da definição do card ----------

export function findCardDef(id: string): MetricCardDef | undefined {
  return METRIC_CARDS.find((c) => c.id === id)
}
