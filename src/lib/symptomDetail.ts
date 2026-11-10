import type { HealthMetric } from '@/types'
import { todayStr, daysAgoStr } from '@/lib/localDate'
import { normalizeSymptomName } from '@/lib/symptomCatalog'

// Cálculos do painel de detalhe de um sintoma (estilo Guava): entradas,
// tendências (# dias, severidade média), gráficos semanais de frequência e
// severidade, dias da semana, anos, horas do dia e coocorrência com outros
// sintomas. Todos derivados dos registros reais (health_metrics.category='sintoma').

export interface SymptomDetailEntry {
  id: string
  day: string // YYYY-MM-DD
  hh: number
  mm: number
  time: string // "HH:MM"
  severity: number // 0-10
  rawSeverity: number | undefined
}

export interface SymptomDetailStats {
  name: string
  entries: SymptomDetailEntry[]
  /** Chaves dos dias (YYYY-MM-DD) com pelo menos um registro, do mais recente. */
  dayKeys: string[]
  lastDateTime: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Extrai as entradas de um sintoma (pelo nome normalizado) dos registros. */
export function extractSymptomDetail(
  metrics: HealthMetric[],
  symptomKey: string,
): SymptomDetailStats | null {
  const entries: SymptomDetailEntry[] = []
  let name = ''
  let lastDateTime = ''

  for (const m of metrics) {
    if (m.category !== 'sintoma') continue
    const rawName = (m.text_value || m.notes || 'Sintoma').trim()
    if (normalizeSymptomName(rawName) !== symptomKey) continue
    if (!name) name = rawName
    const dt = m.date_time || ''
    if (dt > lastDateTime) {
      lastDateTime = dt
      name = rawName
    }
    const hm = dt.match(/(\d{2}):(\d{2})/)
    const hh = hm ? Number(hm[1]) : 0
    const mm = hm ? Number(hm[2]) : 0
    entries.push({
      id: m.id,
      day: dt.slice(0, 10),
      hh,
      mm,
      time: `${pad(hh)}:${pad(mm)}`,
      severity: Math.min(10, Math.max(0, Math.round(m.numeric_value ?? 0))),
      rawSeverity: m.numeric_value,
    })
  }

  if (entries.length === 0) return null
  entries.sort((a, b) => {
    const ka = `${a.day} ${a.time}`
    const kb = `${b.day} ${b.time}`
    return kb.localeCompare(ka)
  })
  const dayKeys = [...new Set(entries.map((e) => e.day))].sort((a, b) => b.localeCompare(a))
  return { name, entries, dayKeys, lastDateTime }
}

export interface TrendStats {
  days: number
  dayPct: number
  avgSeverity: number
  total: number
}

/** Tendências em uma janela de dias terminando hoje. */
export function trendForWindow(stats: SymptomDetailStats, days: number): TrendStats {
  const today = todayStr()
  const cutoff = daysAgoStr(days - 1)
  const inWindow = stats.entries.filter((e) => e.day >= cutoff && e.day <= today)
  const daySet = new Set(inWindow.map((e) => e.day))
  const total = inWindow.length
  const avgSeverity = total > 0 ? inWindow.reduce((s, e) => s + e.severity, 0) / total : 0
  return {
    days: daySet.size,
    dayPct: total > 0 ? Math.round((daySet.size / days) * 100) : 0,
    avgSeverity: total > 0 ? Math.round(avgSeverity * 10) / 10 : 0,
    total,
  }
}

// ---------- Gráfico semanal (Frequency / Severity, Weekly / Total) ----------

export interface ChartWeek {
  start: string
  end: string
  label: string // "12/5 - 18/5"
  days: number
  maxSeverity: number
}

export type ChartMode = 'frequency' | 'severity'
export type ChartScope = 'weekly' | 'total'

const addDays = (ds: string, n: number): string => {
  const [y, m, d] = ds.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

/** Semanas (7 dias, terminando hoje) dentro da janela; valor pela severidade máxima do dia. */
export function weeklyChart(
  stats: SymptomDetailStats,
  windowDays: number,
): { weeks: ChartWeek[]; weekCount: number } {
  const today = todayStr()
  const weeks: ChartWeek[] = []
  for (let i = 0; i < windowDays; i += 7) {
    const end = addDays(today, -i)
    const start = addDays(end, -6)
    const daySet = new Set<string>()
    let maxSev = 0
    for (const e of stats.entries) {
      if (e.day >= start && e.day <= end) {
        daySet.add(e.day)
        maxSev = Math.max(maxSev, e.severity)
      }
    }
    weeks.push({
      start,
      end,
      label: `${start.slice(8, 10)}/${start.slice(5, 7)} - ${end.slice(8, 10)}/${end.slice(5, 7)}`,
      days: daySet.size,
      maxSeverity: maxSev,
    })
  }
  return { weeks: weeks.reverse(), weekCount: Math.ceil(windowDays / 7) }
}

/** Série do gráfico: barras por semana (Weekly) ou por dia (Total). */
export function chartSeries(
  stats: SymptomDetailStats,
  weeks: ChartWeek[],
  mode: ChartMode,
  scope: ChartScope,
): Array<{ label: string; value: number }> {
  const first = weeks[0]
  const start = first ? first.start : todayStr()
  const end = todayStr()
  const inWindow = stats.entries.filter((e) => e.day >= start && e.day <= end)
  const byDay = new Map<string, { count: number; maxSev: number }>()
  for (const e of inWindow) {
    const prev = byDay.get(e.day)
    byDay.set(e.day, {
      count: (prev?.count ?? 0) + 1,
      maxSev: Math.max(prev?.maxSev ?? 0, e.severity),
    })
  }
  if (scope === 'weekly') {
    return weeks.map((w) => {
      let days = 0
      let maxSev = 0
      for (const [day, agg] of byDay) {
        if (day >= w.start && day <= w.end) {
          days += 1
          maxSev = Math.max(maxSev, agg.maxSev)
        }
      }
      return { label: w.label, value: mode === 'frequency' ? days : maxSev }
    })
  }
  // Total: uma barra por dia da janela (mais antiga à esquerda).
  const out: Array<{ label: string; value: number }> = []
  let cur = start
  while (cur <= end) {
    const agg = byDay.get(cur)
    out.push({
      label: `${cur.slice(8, 10)}/${cur.slice(5, 7)}`,
      value: agg ? (mode === 'frequency' ? agg.count : agg.maxSev) : 0,
    })
    cur = addDays(cur, 1)
  }
  return out
}

// ---------- Dias da semana ----------

export interface WeekdayCount {
  /** 0 = domingo … 6 = sábado */
  dow: number
  label: string
  count: number
}

const DOW_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

export function weekdayCounts(stats: SymptomDetailStats): WeekdayCount[] {
  const counts = new Array(7).fill(0)
  for (const day of stats.dayKeys) {
    const [y, m, d] = day.split('-').map(Number)
    counts[new Date(y, m - 1, d).getDay()] += 1
  }
  return counts.map((count, dow) => ({ dow, label: DOW_LABELS[dow], count }))
}

// ---------- Anos ----------

export interface YearCount {
  year: string
  count: number
}

export function yearCounts(stats: SymptomDetailStats): YearCount[] {
  const map = new Map<string, number>()
  for (const day of stats.dayKeys) {
    const y = day.slice(0, 4)
    map.set(y, (map.get(y) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year.localeCompare(b.year))
}

// ---------- Horas do dia ----------

export interface HourBandCount {
  label: string
  count: number
}

export const HOUR_BANDS = ['00-04h', '04-08h', '08-12h', '12-16h', '16-20h', '20-24h']

export function hourBandCounts(stats: SymptomDetailStats): HourBandCount[] {
  const counts = new Array(6).fill(0)
  for (const e of stats.entries) {
    counts[Math.min(5, Math.floor(e.hh / 4))] += 1
  }
  return counts.map((count, i) => ({ label: HOUR_BANDS[i], count }))
}

// ---------- Coocorrência ----------

export interface CoOccurrence {
  name: string
  count: number
}

/**
 * Outros sintomas que ocorreram nos MESMOS DIAS que o sintoma selecionado.
 * Derivado dos registros reais: para cada dia com registro do sintoma,
 * conta quantos dias também tiveram registro do outro sintoma.
 */
export function coOccurrences(metrics: HealthMetric[], symptomKey: string): CoOccurrence[] {
  const mine = new Set<string>()
  const others = new Map<string, Set<string>>() // chave normalizada -> dias

  for (const m of metrics) {
    if (m.category !== 'sintoma') continue
    const rawName = (m.text_value || m.notes || 'Sintoma').trim()
    const key = normalizeSymptomName(rawName)
    const day = (m.date_time || '').slice(0, 10)
    if (!day) continue
    if (key === symptomKey) {
      mine.add(day)
    } else {
      if (!others.has(key)) others.set(key, new Set())
      others.get(key)!.add(day)
    }
  }

  const out: CoOccurrence[] = []
  for (const [key, days] of others) {
    let count = 0
    for (const day of days) if (mine.has(day)) count += 1
    if (count > 0) out.push({ name: key, count })
  }
  return out.sort((a, b) => b.count - a.count).slice(0, 10)
}

/** Quantos dias distintos o usuário registrou QUALQUER sintoma (para o aviso 14 dias). */
export function trackedSymptomDays(metrics: HealthMetric[]): number {
  const days = new Set<string>()
  for (const m of metrics) {
    if (m.category !== 'sintoma') continue
    const day = (m.date_time || '').slice(0, 10)
    if (day) days.add(day)
  }
  return days.size
}
