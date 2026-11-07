import { HealthMetric, Meal, EmotionalLog } from '@/types'
import { CATEGORY_DEFINITIONS } from '@/pages/RegisterMetric'

/**
 * Helpers de derivação de dados do painel "Hoje" (estilo Guava):
 * cards de métricas, timeline do dia, medicações e sintomas da semana.
 */

// ---------- Metadados dos cards de métricas ----------

export interface MetricCardDef {
  id: string
  name: string
  unit: string
  categories: string[] // categorias de health_metrics agregadas pelo card
  icon: any
  colorClass: string // cor do texto/ícone
  bgClass: string // fundo do chip do ícone
  /** valor formatado a partir dos registros agregados */
  format: (items: HealthMetric[]) => string
  /** true quando o card mostra o somatório de hoje, não o último registro */
  isDailySum?: boolean
}

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: n < 10 ? 1 : 0 })

const sumToday = (items: HealthMetric[]) => items.reduce((s, m) => s + (m.numeric_value || 0), 0)

const lastOf = (items: HealthMetric[]) =>
  [...items].sort((a, b) => b.date_time.localeCompare(a.date_time))[0]

export const METRIC_CARDS: MetricCardDef[] = [
  {
    id: 'agua',
    name: 'Água',
    unit: 'ml',
    categories: ['agua'],
    icon: null,
    colorClass: 'text-blue-600',
    bgClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40',
    isDailySum: true,
    format: (items) => fmtNum(sumToday(items)),
  },
  {
    id: 'sono',
    name: 'Sono',
    unit: 'h',
    categories: ['sono'],
    icon: null,
    colorClass: 'text-indigo-600',
    bgClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40',
    format: (items) => {
      const last = lastOf(items)
      if (!last?.numeric_value) return '--'
      const h = Math.floor(last.numeric_value)
      const min = Math.round((last.numeric_value - h) * 60)
      return min > 0 ? `${h}h ${String(min).padStart(2, '0')}m` : `${h}h`
    },
  },
  {
    id: 'hrv',
    name: 'HRV (VFC)',
    unit: 'ms',
    categories: ['hrv'],
    icon: null,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
    format: (items) =>
      lastOf(items)?.numeric_value ? String(Math.round(lastOf(items)!.numeric_value!)) : '--',
  },
  {
    id: 'pressao',
    name: 'Pressão',
    unit: 'mmHg',
    categories: ['pressao'],
    icon: null,
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40',
    format: (items) => {
      const last = lastOf(items)
      return last?.text_value || (last?.numeric_value ? `${last.numeric_value}` : '--')
    },
  },
  {
    id: 'peso',
    name: 'Peso',
    unit: 'kg',
    categories: ['peso'],
    icon: null,
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-100 text-slate-600 dark:bg-slate-900/60',
    format: (items) => {
      const v = lastOf(items)?.numeric_value
      return v ? fmtNum(v) : '--'
    },
  },
  {
    id: 'cafe',
    name: 'Café',
    unit: 'xíc',
    categories: ['cafe'],
    icon: null,
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40',
    isDailySum: true,
    format: (items) => fmtNum(sumToday(items)),
  },
  {
    id: 'atividade',
    name: 'Atividade',
    unit: 'min',
    categories: ['atividade'],
    icon: null,
    colorClass: 'text-orange-600',
    bgClass: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40',
    isDailySum: true,
    format: (items) => fmtNum(sumToday(items)),
  },
  {
    id: 'glicemia',
    name: 'Glicemia',
    unit: 'mg/dL',
    categories: ['glicemia'],
    icon: null,
    colorClass: 'text-teal-600',
    bgClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/40',
    format: (items) =>
      lastOf(items)?.numeric_value ? String(Math.round(lastOf(items)!.numeric_value!)) : '--',
  },
  {
    id: 'saturacao',
    name: 'Saturação',
    unit: '%',
    categories: ['saturacao'],
    icon: null,
    colorClass: 'text-cyan-600',
    bgClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40',
    format: (items) =>
      lastOf(items)?.numeric_value ? String(Math.round(lastOf(items)!.numeric_value!)) : '--',
  },
  {
    id: 'alcool',
    name: 'Álcool',
    unit: 'doses',
    categories: ['alcool'],
    icon: null,
    colorClass: 'text-red-700',
    bgClass: 'bg-red-50 text-red-700 dark:bg-red-950/40',
    isDailySum: true,
    format: (items) => fmtNum(sumToday(items)),
  },
  {
    id: 'meditacao',
    name: 'Meditação',
    unit: 'min',
    categories: ['meditacao'],
    icon: null,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40',
    isDailySum: true,
    format: (items) => fmtNum(sumToday(items)),
  },
  {
    id: 'sauna',
    name: 'Sauna',
    unit: 'min',
    categories: ['sauna'],
    icon: null,
    colorClass: 'text-amber-600',
    bgClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40',
    isDailySum: true,
    format: (items) => fmtNum(sumToday(items)),
  },
]

// Resolve o ícone real (definido no RegisterMetric) sem duplicar os imports
for (const card of METRIC_CARDS) {
  const def = CATEGORY_DEFINITIONS.find((c) => c.id === card.categories[0])
  card.icon = def?.icon ?? null
}

export const METRIC_CARD_MAP = new Map(METRIC_CARDS.map((c) => [c.id, c]))

// ---------- Cards ----------

export interface MetricCardData {
  def: MetricCardDef
  value: string
  when: string // "hoje", "11h atrás", ...
}

const minutesAgo = (dateStr: string): number => {
  // date_time no formato "AAAA-MM-DD HH:MM"
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return NaN
  return Math.round((Date.now() - d.getTime()) / 60000)
}

export const relativeWhen = (dateStr?: string): string => {
  if (!dateStr) return ''
  const mins = minutesAgo(dateStr)
  if (isNaN(mins)) return ''
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  if (mins < 60 * 24) {
    const h = Math.round(mins / 60)
    return h === 1 ? '1h atrás' : `${h}h atrás`
  }
  const d = Math.round(mins / (60 * 24))
  return d === 1 ? 'ontem' : `${d}d atrás`
}

export const todayStr = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** Deriva os dados de cada card a partir dos registros de saúde. */
export function buildMetricCards(cardIds: string[], metrics: HealthMetric[]): MetricCardData[] {
  const today = todayStr()
  const out: MetricCardData[] = []
  for (const id of cardIds) {
    const def = METRIC_CARD_MAP.get(id)
    if (!def) continue
    const items = metrics.filter((m) => def.categories.includes(m.category))
    const relevant = def.isDailySum ? items.filter((m) => m.date_time.startsWith(today)) : items
    const latest = lastOf(items)
    out.push({
      def,
      value: def.format(relevant),
      when: latest ? relativeWhen(latest.date_time) : 'sem registro',
    })
  }
  return out
}

// ---------- Timeline do dia ----------

export interface TimelineEntry {
  id: string
  time: string // "HH:MM"
  minutes: number // minutos desde 00:00 (para ordenar)
  icon: any
  colorClass: string
  title: string
  detail?: string
}

const HHMM = /(\d{2}):(\d{2})/

const timeParts = (s?: string): { hh: number; mm: number } | null => {
  if (!s) return null
  const m = s.match(HHMM)
  if (!m) return null
  return { hh: Number(m[1]), mm: Number(m[2]) }
}

export function buildTimeline(
  metrics: HealthMetric[],
  meals: Meal[],
  emotionalLogs: EmotionalLog[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const push = (
    id: string,
    dateStr: string | undefined,
    icon: any,
    colorClass: string,
    title: string,
    detail?: string,
  ) => {
    const tp = timeParts(dateStr)
    if (!tp) return
    entries.push({
      id,
      time: `${String(tp.hh).padStart(2, '0')}:${String(tp.mm).padStart(2, '0')}`,
      minutes: tp.hh * 60 + tp.mm,
      icon,
      colorClass,
      title,
      detail,
    })
  }

  const catMeta: Record<string, { icon: any; color: string; label: string }> = {}
  for (const c of CATEGORY_DEFINITIONS) {
    catMeta[c.id] = { icon: c.icon, color: c.color, label: c.name }
  }

  for (const m of metrics) {
    const meta = catMeta[m.category] || catMeta.outro
    const value =
      m.numeric_value !== undefined && m.numeric_value !== null
        ? `${fmtNum(m.numeric_value)}${m.unit ? ` ${m.unit}` : ''}`
        : m.text_value || ''
    push(
      `hm-${m.id}`,
      m.date_time,
      meta.icon,
      meta.color,
      meta.label,
      value || m.notes || undefined,
    )
  }

  for (const meal of meals) {
    const label =
      meal.meal_type === 'cafe_da_manha'
        ? 'Café da manhã'
        : meal.meal_type === 'almoco'
          ? 'Almoço'
          : meal.meal_type === 'jantar'
            ? 'Jantar'
            : meal.meal_type === 'lanche'
              ? 'Lanche'
              : meal.meal_type === 'ceia'
                ? 'Ceia'
                : 'Refeição'
    push(
      `meal-${meal.id}`,
      meal.date_time,
      null,
      'text-emerald-600',
      label,
      meal.title || meal.items_detected || undefined,
    )
  }

  for (const log of emotionalLogs) {
    // log.created é UTC ISO — converte para a hora local do dispositivo
    const d = new Date(log.created)
    const localStr = isNaN(d.getTime())
      ? undefined
      : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    push(
      `emo-${log.id}`,
      localStr ? `2000-01-01 ${localStr}` : undefined,
      null,
      'text-violet-600',
      'Diário emocional',
      log.mood_label ? `${log.mood_label} (${log.mood_score}/5)` : undefined,
    )
  }

  return entries.sort((a, b) => b.minutes - a.minutes)
}

// ---------- Faixa horizontal (estilo Guava) ----------

export interface DayStripBand {
  /** classe Tailwind de fundo do segmento */
  className: string
  /** largura do segmento em % da faixa */
  widthPct: number
  /** rótulo mostrado no tooltip do segmento */
  label: string
}

export interface DayStripSegment extends DayStripBand {
  entry: TimelineEntry
  /** posição do CENTRO do ícone, em % da largura da faixa */
  centerPct: number
}

export interface DayStripData {
  /** horas acordado (00:00) e de dormir — âncoras dos segmentos coloridos */
  wakeAt: string | null // "HH:MM"
  sleepAt: string | null // "HH:MM"
  bands: DayStripBand[]
  segments: DayStripSegment[]
}

const pctOf = (minutes: number) => Math.max(0, Math.min(100, (minutes / 1440) * 100))

/**
 * Distribui os registros do dia ao longo de uma faixa horizontal 0h→24h:
 * segmentos coloridos apenas para sono (00:00 → acordar) e hora de dormir,
 * ícones posicionados em ordem cronológica (sem hora visível).
 */
export function buildDayStrip(
  metrics: HealthMetric[],
  meals: Meal[],
  emotionalLogs: EmotionalLog[],
): DayStripData {
  const entries = buildTimeline(metrics, meals, emotionalLogs)
  const ordered = [...entries].sort((a, b) => a.minutes - b.minutes)

  // --- âncoras de sono ---
  let wakeMin: number | null = null
  let sleepMin: number | null = null

  // hora de acordar/dormir: registro de sono do dia (notes "acordou HH:MM" ou "HH:MM-HH:MM")
  const sleepRec = metrics.find((m) => m.category === 'sono')
  if (sleepRec) {
    const range = sleepRec.notes?.match(/(\d{1,2}):(\d{2})\s*(?:-|–|às)\s*(\d{1,2}):(\d{2})/)
    if (range) {
      const a = Number(range[1]) * 60 + Number(range[2])
      const b = Number(range[3]) * 60 + Number(range[4])
      // intervalo "HH:MM-HH:MM" → acordar = fim do sono, dormir = início
      wakeMin = b
      sleepMin = a
    } else {
      // notes "acordou 07:30" ou horário de dormir isolado
      const woke = sleepRec.notes?.match(/acordou?\s*(\d{1,2}):(\d{2})/)
      if (woke) wakeMin = Number(woke[1]) * 60 + Number(woke[2])
      const slept = sleepRec.notes?.match(/dormi(r)?\s*(\d{1,2}):(\d{2})/)
      if (slept) sleepMin = Number(slept[2]) * 60 + Number(slept[3])
    }
  }
  if (wakeMin === null) {
    // primeira atividade do dia ≈ hora de acordar
    const earliest = ordered[0]
    if (earliest) wakeMin = earliest.minutes
  }
  if (sleepMin === null) {
    // última refeição (jantar/ceia) + 2h, limitado; fallback 22h
    const lastMeal = ordered
      .filter((e) => e.title.includes('Jantar') || e.title.includes('Ceia'))
      .pop()
    sleepMin = lastMeal ? Math.min(23 * 60 + 59, lastMeal.minutes + 120) : 22 * 60
  }
  if (wakeMin !== null && sleepMin !== null && sleepMin < wakeMin) {
    sleepMin = Math.min(23 * 60 + 59, wakeMin + 4 * 60)
  }

  const wakePct = wakeMin !== null ? pctOf(wakeMin) : 0
  const sleepPct = sleepMin !== null ? pctOf(sleepMin) : pctOf(22 * 60)

  const bands: DayStripBand[] = [
    { className: 'bg-indigo-200 dark:bg-indigo-900', widthPct: wakePct, label: 'Sono' },
    { className: 'bg-transparent', widthPct: sleepPct - wakePct, label: 'Acordado' },
    {
      className: 'bg-indigo-300 dark:bg-indigo-800',
      widthPct: 100 - sleepPct,
      label: sleepAtLabel(sleepMin ?? 22 * 60),
    },
  ]

  // --- ícones distribuídos em ordem cronológica, sem sobreposição ---
  const segs: DayStripSegment[] = []
  let lastPct = -Infinity
  for (const e of ordered) {
    let pct = pctOf(e.minutes)
    if (pct - lastPct < MIN_GAP_PCT) pct = lastPct + MIN_GAP_PCT
    if (pct > 100) break
    lastPct = pct
    segs.push({ entry: e, centerPct: pct, className: '', widthPct: 0, label: '' })
  }
  return { wakeAt: fmtMin(wakeMin), sleepAt: fmtMin(sleepMin), bands, segments: segs }
}

const MIN_GAP_PCT = 100 / 30 // gap mínimo entre ícones (~48 min de "espaço" distribuído)

const fmtMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.round(m % 60)).padStart(2, '0')}`

const sleepAtLabel = (m: number) => `Ir dormir (${fmtMin(m)})`

// ---------- Medicações ----------

export interface MedRow {
  id: string
  name: string
  dosage: string // ex: "20 mg"
  times: string[] // horários informados no texto, ex: ["07:00"]
  /** doses tomadas por dia da semana, índice 0 = domingo */
  weekDoses: number[]
}

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export const weekdayLetter = (d: number) => WEEKDAY_LETTERS[d]

const DAY_RE = /\d{1,2}[:h]\d{2}?|\d{1,2}h/g

/** Extrai horários ("07:00", "8h", "12h30") do texto de notas/descrição. */
export const extractTimes = (text?: string): string[] => {
  if (!text) return []
  const found = text.match(DAY_RE) || []
  const out: string[] = []
  for (const f of found) {
    let t = f.replace('h', ':')
    if (!t.includes(':')) t = `${t}:00`
    else if (t.endsWith(':')) t = `${t}00`
    const tp = timeParts(t)
    if (tp) out.push(`${String(tp.hh).padStart(2, '0')}:${String(tp.mm).padStart(2, '0')}`)
    if (out.length >= 3) break
  }
  return out
}

const DOSAGE_RE = /(\d+(?:[.,]\d+)?)\s?(mg|mcg|g|ml|ui|ui\b|comprimido|cps|gota[s]?|dose[s]?)/i

export const extractDosage = (text?: string): string => {
  if (!text) return ''
  const m = text.match(DOSAGE_RE)
  if (!m) return ''
  return `${m[1].replace('.', ',')} ${m[2].toLowerCase()}`
}

/**
 * Medicações em uso = registros do tipo `medicamento_continuo` (medical_records),
 * enriquecidos com doses efetivamente tomadas (health_metrics.category = 'remedio').
 */
export function buildMedRows(
  continuousMeds: Array<{ id: string; title: string; description?: string }>,
  remedyMetrics: HealthMetric[],
): MedRow[] {
  const today = todayStr()
  const weekAgo = new Date(Date.now() - 6 * 86400000)
  const weekAgoStr = weekAgo.toISOString().slice(0, 10)

  return continuousMeds.map((med) => {
    const taken = remedyMetrics.filter(
      (m) =>
        m.text_value?.toLowerCase().includes(med.title.toLowerCase().split(' ')[0]) ||
        m.notes?.toLowerCase().includes(med.title.toLowerCase().split(' ')[0]),
    )
    const weekDoses = [0, 0, 0, 0, 0, 0, 0]
    for (const t of taken) {
      const day = t.date_time.slice(0, 10)
      if (day >= weekAgoStr && day <= today) {
        // dia da semana local
        const d = new Date(day.replace(' ', 'T') + ':00')
        if (!isNaN(d.getTime())) weekDoses[d.getDay()] += 1
      }
    }
    return {
      id: med.id,
      name: med.title,
      dosage: extractDosage(med.description) || extractDosage(med.title),
      times: extractTimes(med.description || med.title),
      weekDoses,
    }
  })
}

// ---------- Sintomas da semana ----------

export interface SymptomRow {
  id: string
  name: string
  severity: number // 0-10, mais recente
  count: number // registros na janela
  lastWhen: string
}

/**
 * Sintomas = health_metrics.category = 'sintoma'
 * (text_value = nome, numeric_value = severidade 0-10).
 */
export function buildSymptomRows(metrics: HealthMetric[], days: 7 | 28 | 90): SymptomRow[] {
  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
  const today = todayStr()
  const byName = new Map<string, SymptomRow>()

  for (const m of metrics) {
    if (m.category !== 'sintoma') continue
    const day = m.date_time.slice(0, 10)
    if (day < cutoff || day > today) continue
    const name = (m.text_value || m.notes || 'Sintoma').trim()
    const key = name.toLowerCase()
    const prev = byName.get(key)
    if (!prev) {
      byName.set(key, {
        id: m.id,
        name,
        severity: Math.round(m.numeric_value ?? 0),
        count: 1,
        lastWhen: m.date_time,
      })
      continue
    }
    prev.count += 1
    if (m.date_time.localeCompare(prev.lastWhen) > 0) {
      prev.severity = Math.round(m.numeric_value ?? prev.severity)
      prev.lastWhen = m.date_time
      prev.id = m.id
    }
  }

  return [...byName.values()].sort((a, b) => b.severity - a.severity)
}

// ---------- Grade semanal (S M T W T F S no formato local) ----------

export function lastWeekDays(): Array<{ date: string; letter: string; isToday: boolean }> {
  const letters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const today = new Date()
  const out: Array<{ date: string; letter: string; isToday: boolean }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out.push({ date: ds, letter: letters[d.getDay()], isToday: i === 0 })
  }
  return out
}

// ---------- Resumo da semana do diário emocional ----------

export function weekEmotionalSummary(logs: EmotionalLog[]) {
  const cutoff = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
  const today = todayStr()
  const week = logs.filter((l) => {
    const d = (l.date || '').slice(0, 10)
    return d >= cutoff && d <= today
  })
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : undefined
  return {
    logs: week,
    avgMood: avg(week.map((l) => l.mood_score)),
    avgEnergy: avg(week.map((l) => l.energy_level || 0)),
    avgStress: avg(week.map((l) => l.stress_level || 0)),
  }
}
