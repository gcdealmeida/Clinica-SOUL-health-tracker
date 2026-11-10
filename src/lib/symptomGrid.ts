import type { HealthMetric } from '@/types'
import { todayStr } from '@/lib/localDate'
import { normalizeSymptomName, symptomGroupOf, type SymptomGroup } from '@/lib/symptomCatalog'

// Grade de sintomas do painel Hoje (estilo Guava): colunas = dias (ou semanas
// no período de 3 meses), uma linha por sintoma, valor = severidade máxima do dia.

export type SymptomPeriod = 7 | 28 | 90

export const SYMPTOM_PERIODS: Array<{ id: SymptomPeriod; label: string }> = [
  { id: 7, label: '7 dias' },
  { id: 28, label: '28 dias' },
  { id: 90, label: '3 meses' },
]

export interface SymptomGridColumn {
  key: string
  start: string // YYYY-MM-DD, inclusivo
  end: string // YYYY-MM-DD, inclusivo
  header: string
  isToday: boolean
}

export interface SymptomGridRow {
  name: string
  group: SymptomGroup
  latestSeverity: number
  count: number
  lastWhen: string
  cells: Array<number | null> // severidade máxima por coluna (null = sem registro)
}

export interface SymptomGrid {
  columns: SymptomGridColumn[]
  rows: SymptomGridRow[]
}

const LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function parseDate(ds: string): Date {
  const [y, m, d] = ds.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtDate(dt: Date): string {
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function addDays(ds: string, n: number): string {
  const dt = parseDate(ds)
  dt.setDate(dt.getDate() + n)
  return fmtDate(dt)
}

function buildColumns(period: SymptomPeriod, today: string): SymptomGridColumn[] {
  const cols: SymptomGridColumn[] = []
  if (period === 90) {
    // 13 blocos semanais; o último termina hoje
    for (let j = 12; j >= 0; j--) {
      const end = addDays(today, -7 * j)
      const start = addDays(end, -6)
      cols.push({
        key: start,
        start,
        end,
        header: `${start.slice(8, 10)}/${start.slice(5, 7)}`,
        isToday: j === 0,
      })
    }
    return cols
  }
  for (let i = period - 1; i >= 0; i--) {
    const ds = addDays(today, -i)
    cols.push({
      key: ds,
      start: ds,
      end: ds,
      header: LETTERS[parseDate(ds).getDay()],
      isToday: i === 0,
    })
  }
  return cols
}

function clampSeverity(v: number | undefined): number {
  const n = Math.round(v ?? 0)
  return Math.min(10, Math.max(0, n))
}

/**
 * Monta a grade a partir dos registros de sintoma (health_metrics.category = 'sintoma':
 * text_value = nome, numeric_value = severidade 0-10).
 */
export function buildSymptomGrid(metrics: HealthMetric[], period: SymptomPeriod): SymptomGrid {
  const today = todayStr()
  const columns = buildColumns(period, today)
  const cutoff = columns[0].start
  const byName = new Map<string, SymptomGridRow>()

  for (const m of metrics) {
    if (m.category !== 'sintoma') continue
    const day = (m.date_time || '').slice(0, 10)
    if (day < cutoff || day > today) continue
    const name = (m.text_value || m.notes || 'Sintoma').trim()
    const key = normalizeSymptomName(name)
    const severity = clampSeverity(m.numeric_value)

    let row = byName.get(key)
    if (!row) {
      row = {
        name,
        group: symptomGroupOf(name),
        latestSeverity: severity,
        count: 0,
        lastWhen: '',
        cells: columns.map(() => null),
      }
      byName.set(key, row)
    }
    row.count += 1
    if (m.date_time > row.lastWhen) {
      row.lastWhen = m.date_time
      row.latestSeverity = severity
    }
    const idx = columns.findIndex((c) => day >= c.start && day <= c.end)
    if (idx >= 0) {
      const prev = row.cells[idx]
      row.cells[idx] = prev === null ? severity : Math.max(prev, severity)
    }
  }

  const rows = [...byName.values()].sort((a, b) => b.lastWhen.localeCompare(a.lastWhen))
  return { columns, rows }
}

/** Cor do ponto pela severidade: leve → intenso. */
export function severityDotClass(sev: number): string {
  if (sev <= 3) return 'bg-sky-400'
  if (sev <= 5) return 'bg-amber-400'
  if (sev <= 7) return 'bg-orange-500'
  return 'bg-rose-500'
}
