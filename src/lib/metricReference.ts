import { HealthMetric } from '@/types'
import { MetricMeta, dailyTotals, computeStats, dayKey, recordValues } from '@/lib/metricDetail'

/**
 * Notas de referência, classificações (LASH/OMS) e estatísticas de longo prazo
 * para o painel de detalhe da métrica — padrão visual do Guava.
 */

// ---------- Notas de referência (traduzidas e fidedignas às fontes) ----------

export interface ReferenceNote {
  /** parágrafo principal da nota (texto corrido) */
  text: string
  /** faixas estruturadas (LASH, OMS etc.) — opcional */
  ranges?: Array<{ label: string; range: string; color?: string }>
  /** nome da fonte exibida no selo "Fonte:" */
  source?: string
}

const LASH_RANGES = [
  { label: 'ÓTIMO', range: 'menos de 120 sistólica E menos de 80 diastólica', color: '#10b981' },
  { label: 'NORMAL', range: '120–129 sistólica OU 80–84 diastólica', color: '#22c55e' },
  { label: 'ALTO-NORMAL', range: '130–139 sistólica OU 85–89 diastólica', color: '#eab308' },
  {
    label: 'GRAU 1 (LEVE) HIPERTENSÃO',
    range: '140–159 sistólica OU 90–99 diastólica',
    color: '#f97316',
  },
  {
    label: 'GRAU 2 (MODERADA) HIPERTENSÃO',
    range: '160–179 sistólica OU 100–109 diastólica',
    color: '#ef4444',
  },
  {
    label: 'GRAU 3 (SEVERA) HIPERTENSÃO',
    range: '180+ sistólica OU 110+ diastólica',
    color: '#dc2626',
  },
]

const BMI_RANGES = [
  { label: 'ABAIXO DO PESO', range: 'IMC abaixo de 18,5', color: '#3b82f6' },
  { label: 'NORMAL', range: 'IMC 18,5–24,9', color: '#10b981' },
  { label: 'SOBREPESO', range: 'IMC 25–29,9', color: '#eab308' },
  { label: 'OBESIDADE GRAU I', range: 'IMC 30–34,9', color: '#f97316' },
  { label: 'OBESIDADE GRAU II', range: 'IMC 35–39,9', color: '#ef4444' },
  { label: 'OBESIDADE GRAU III', range: 'IMC 40+', color: '#dc2626' },
]

export function referenceNoteFor(metricId: string): ReferenceNote | null {
  switch (metricId) {
    case 'cafe':
      return {
        text: 'Até 400 mg de cafeína por dia é considerado geralmente seguro para adultos saudáveis (fda.gov). O teor de cafeína por porção depende de vários fatores e, por isso, pode variar bastante, mesmo para o mesmo tipo de bebida (por exemplo, diferentes marcas de café).',
        source: 'FDA',
      }
    case 'pressao':
      return {
        text: 'As Diretrizes 2024 da Sociedade Latino-Americana de Hipertensão (LASH) sobre o manejo da hipertensão arterial e comorbidades relacionadas definem a hipertensão com base em medidas de pressão arterial de toda a região, incluindo (mas não se limitando a) Argentina, Brasil, Colômbia, México, Uruguai e República Dominicana. A sistólica é o número de cima e a diastólica, o de baixo.',
        ranges: LASH_RANGES,
        source: 'LASH',
      }
    case 'peso':
      return {
        text: 'O Índice de Massa Corporal (IMC) relaciona peso e altura — peso (kg) dividido pela altura ao quadrado (m²). A classificação da OMS para adultos é:',
        ranges: BMI_RANGES,
        source: 'OMS',
      }
    case 'agua':
      return {
        text: 'A Academia Nacional de Medicina sugere uma ingestão diária total de água de cerca de 3,7 L para homens e 2,7 L para mulheres — incluindo a água de alimentos e outras bebidas. Necessidades individuais variam com peso, clima e nível de atividade física.',
        source: 'NAM',
      }
    case 'sono':
      return {
        text: 'Adultos (18–64 anos) devem dormir de 7 a 9 horas por noite, segundo a National Sleep Foundation. Dormir regularmente menos de 7 horas está associado a maior risco cardiovascular e metabólico.',
        source: 'NSF',
      }
    case 'hrv':
      return {
        text: 'A Variabilidade da Frequência Cardíaca (VFC/HRV) é altamente individual: não existe uma faixa universal "boa". O mais relevante é a sua própria tendência ao longo do tempo — quedas persistentes em relação à sua média podem indicar estresse, má recuperação ou problema de saúde.',
      }
    case 'atividade':
      return {
        text: 'A OMS recomenda ao menos 150 minutos de atividade física moderada (ou 75 minutos vigorosa) por semana para adultos — cerca de 21 minutos por dia.',
        source: 'OMS',
      }
    case 'glicemia':
      return {
        text: 'A glicemia em jejum saudável fica entre 70 e 99 mg/dL (SBD). Valores persistentemente acima de 126 mg/dL em jejum sugerem diabetes e exigem avaliação médica.',
        source: 'SBD',
      }
    case 'saturacao':
      return {
        text: 'A saturação de oxigênio (SpO2) saudável fica entre 95% e 100%. Valores persistentemente abaixo de 92% merecem atenção médica.',
        source: 'OMS',
      }
    case 'alcool':
      return {
        text: 'O consumo de baixo risco é de até 1 dose por dia para mulheres e até 2 doses por dia para homens, com dias sem consumo na semana.',
        source: 'OMS',
      }
    case 'meditacao':
      return {
        text: 'Práticas regulares de meditação e respiração ajudam a reduzir o estresse e melhorar o foco e a qualidade do sono. Não há uma "dose" universal — a regularidade importa mais que a duração.',
      }
    case 'sauna':
      return {
        text: 'O uso regular de sauna (4–7 vezes por semana) foi associado a benefícios cardiovasculares em estudos de coorte finlandeses. Hidrate-se antes e evite sessões prolongadas em caso de hipotensão.',
      }
    default:
      return null
  }
}

// ---------- Classificação do valor atual ----------

export function lashClassify(sys: number, dia: number): { label: string; color: string } {
  if (sys >= 180 || dia >= 110) return { label: 'GRAU 3 (SEVERA)', color: '#dc2626' }
  if (sys >= 160 || dia >= 100) return { label: 'GRAU 2 (MODERADA)', color: '#ef4444' }
  if (sys >= 140 || dia >= 90) return { label: 'GRAU 1 (LEVE)', color: '#f97316' }
  if (sys >= 130 || dia >= 85) return { label: 'ALTO-NORMAL', color: '#eab308' }
  if (sys >= 120 || dia >= 80) return { label: 'NORMAL', color: '#22c55e' }
  return { label: 'ÓTIMO', color: '#10b981' }
}

export function bmiClassify(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'ABAIXO DO PESO', color: '#3b82f6' }
  if (bmi < 25) return { label: 'NORMAL', color: '#10b981' }
  if (bmi < 30) return { label: 'SOBREPESO', color: '#eab308' }
  if (bmi < 35) return { label: 'OBESIDADE GRAU I', color: '#f97316' }
  if (bmi < 40) return { label: 'OBESIDADE GRAU II', color: '#ef4444' }
  return { label: 'OBESIDADE GRAU III', color: '#dc2626' }
}

export const bmiFrom = (weightKg: number, heightCm: number): number | null =>
  heightCm > 0 && weightKg > 0 ? weightKg / Math.pow(heightCm / 100, 2) : null

// ---------- Metas / limites usados no painel ----------

export function goalFor(metricId: string): { value: number; label: string } | null {
  switch (metricId) {
    case 'cafe':
      return { value: 400, label: 'limite diário' }
    case 'agua':
      return { value: 2700, label: 'meta diária' }
    case 'sono':
      return { value: 8, label: 'faixa ideal' }
    case 'atividade':
      return { value: 30, label: 'meta diária' }
    case 'glicemia':
      return { value: 99, label: 'limite em jejum' }
    default:
      return null
  }
}

export interface RefLine {
  value: number
  label: string
  color?: string
  dashed?: boolean
}

export function refLinesFor(metricId: string): RefLine[] {
  switch (metricId) {
    case 'cafe':
      return [{ value: 400, label: '400 mg', color: '#dc2626', dashed: true }]
    case 'pressao':
      return [
        { value: 80, label: '80', color: '#94a3b8', dashed: true },
        { value: 120, label: '120', color: '#94a3b8', dashed: true },
        { value: 140, label: '140', color: '#dc2626', dashed: true },
      ]
    case 'agua':
      return [{ value: 2700, label: '2,7 L', color: '#22c55e', dashed: true }]
    case 'sono':
      return [
        { value: 7, label: '7h', color: '#22c55e', dashed: true },
        { value: 9, label: '9h', color: '#f97316', dashed: true },
      ]
    default:
      return []
  }
}

// ---------- Estatísticas de longo prazo (estilo All-time Stats do Guava) ----------

export interface AllTimeStats {
  max: { value: number; day: string } | null
  /** soma total (métricas de somatório) — null para contínuas */
  total: number | null
  /** média diária (contínuas) — null para somatórios */
  avg: number | null
  count: number
  /** primeiro dia com registro */
  since: string | null
}

export function computeAllTimeStats(items: HealthMetric[], meta: MetricMeta): AllTimeStats {
  const s = computeStats(items, meta)
  return { max: s.max, total: s.total, avg: s.avg, count: s.count, since: s.firstDay }
}

// ---------- Por dia da semana: mediana / média / total ----------

const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']

export interface WeekdayStat {
  label: string
  median: number | null
  mean: number | null
  total: number | null
}

export function weekdayStats(items: HealthMetric[], meta: MetricMeta): WeekdayStat[] {
  const totals = dailyTotals(items, meta)
  const byWd = new Map<number, number[]>()
  for (const t of totals) {
    // getDay(): 0 = Dom … 6 = Sáb → índice SEG=0
    const idx = (new Date(`${t.day}T00:00:00`).getDay() + 6) % 7
    const arr = byWd.get(idx) ?? []
    arr.push(t.value)
    byWd.set(idx, arr)
  }
  return WEEKDAY_LABELS.map((label, i) => {
    const arr = byWd.get(i)
    if (!arr || !arr.length) return { label, median: null, mean: null, total: null }
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    return {
      label,
      median,
      mean: arr.reduce((s, v) => s + v, 0) / arr.length,
      total: arr.reduce((s, v) => s + v, 0),
    }
  })
}

// ---------- Por ano ----------

export interface YearStat {
  label: string
  value: number
}

export function yearStats(items: HealthMetric[], meta: MetricMeta): YearStat[] {
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
    .map(([year, vals]) => ({
      label: year,
      value: meta.dailySum ? vals.reduce((s, v) => s + v, 0) : mean(vals),
    }))
}

// ---------- Por hora do dia (métricas com horário) ----------

export interface HourStat {
  label: string
  value: number
}

/** Histograma por faixa de 4h: 0h, 4h, 8h, 12h, 16h, 20h. */
export function hourStats(items: HealthMetric[], meta: MetricMeta): HourStat[] {
  const labels = ['00h', '04h', '08h', '12h', '16h', '20h']
  const sums = new Array(6).fill(0)
  const counts = new Array(6).fill(0)
  for (const m of items) {
    const h = Number((m.date_time || '').slice(11, 13))
    if (isNaN(h)) continue
    const vals = recordValues(m)
    if (!vals.length) continue
    const v = meta.dailySum ? vals.reduce((s, x) => s + x, 0) : mean(vals)
    const idx = Math.min(5, Math.floor(h / 4))
    sums[idx] += v
    counts[idx] += 1
  }
  return labels.map((label, i) => ({ label, value: counts[i] ? sums[i] : 0 }))
}

// ---------- Helpers numéricos ----------

function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
}

export function median(arr: number[]): number {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// ---------- Séries auxiliares para o painel do peso ----------

export interface WeightTabSeries {
  label: string
  value: number | null
}

/** Série de gordura corporal (%) a partir de body_fat_pct nos registros de peso. */
export function bodyFatSeries(items: HealthMetric[]): WeightTabSeries[] {
  return items
    .filter((m) => (m as any).body_fat_pct !== undefined && (m as any).body_fat_pct !== null)
    .sort((a, b) => a.date_time.localeCompare(b.date_time))
    .map((m) => ({ label: dayKey(m.date_time), value: (m as any).body_fat_pct }))
}

/** Série de massa magra (kg) a partir de lean_mass_kg, ou derivada do peso e da gordura %. */
export function leanMassSeries(items: HealthMetric[]): WeightTabSeries[] {
  const out: WeightTabSeries[] = []
  for (const m of items) {
    const rec = m as any
    const w = m.numeric_value
    if (rec.lean_mass_kg !== undefined && rec.lean_mass_kg !== null) {
      out.push({ label: dayKey(m.date_time), value: rec.lean_mass_kg })
    } else if (w && rec.body_fat_pct !== undefined && rec.body_fat_pct !== null) {
      out.push({ label: dayKey(m.date_time), value: w * (1 - rec.body_fat_pct / 100) })
    }
  }
  return out.sort((a, b) => a.label.localeCompare(b.label))
}

export const hasBodyFatData = (items: HealthMetric[]): boolean =>
  items.some((m) => (m as any).body_fat_pct !== undefined && (m as any).body_fat_pct !== null)

export const hasLeanMassData = (items: HealthMetric[]): boolean => leanMassSeries(items).length > 0

// ---------- Stats atuais (cabeçalho, pressão e peso) ----------

/** Par sistólica/diastólica do registro mais recente de pressão. */
export function latestBloodPressure(
  items: HealthMetric[],
): { sys: number; dia: number; day: string } | null {
  for (const m of items) {
    const vals = recordValues(m)
    if (vals.length >= 2 && !isNaN(vals[0]) && !isNaN(vals[1])) {
      return { sys: vals[0], dia: vals[1], day: dayKey(m.date_time) }
    }
  }
  return null
}
