import type { MedRow } from '@/lib/dashboard'
import type { Medication } from '@/services/medications'

/**
 * Linhas da grade "Medicação Ingerida" a partir das medicações cadastradas em
 * /medicamentos. Cada dia da rotina (todos os dias na diária; dias escolhidos
 * na semanal) mostra a QUANTIDADE PLANEJADA de tomas dos horários cadastrados
 * (ex.: 2 horários → "2x"); as tomas efetivamente REGISTRADAS (health_metrics
 * category 'remedio' pareadas pelo nome) vêm em weekDoses — a célula fica
 * verde quando tomou, vermelha quando planejado e ainda não tomou.
 * Toma pontual (routine 'once') não gera linha planejada — só aparece quando
 * a toma é registrada, via buildOnceMedRows / buildOrphanOnceRows.
 */

const weekdayOf = (date: string): number | null => {
  const day = (date || '').slice(0, 10)
  if (!day) return null
  const d = new Date(`${day}T00:00:00`)
  return isNaN(d.getTime()) ? null : d.getDay()
}

const localDayStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Janela da grade: últimos 7 dias (mesma janela de lastWeekDays()). */
const weekWindow = () => {
  const today = new Date()
  return {
    weekAgoStr: localDayStr(new Date(today.getTime() - 6 * 86400000)),
    todayStr: localDayStr(today),
  }
}

const isPontual = (r: { notes?: string }) => (r.notes ?? '').toLowerCase().includes('pontual')

/**
 * Conta, por nome de remédio (minúsculas), as tomas registradas por dia da
 * semana dentro da janela de 7 dias da grade.
 * pontualOnly=true conta só tomas com notes "pontual" (toma esporádica);
 * pontualOnly=false conta só as sem "pontual" (tomas de rotina, registradas
 * pelo botão "Tomei hoje" ou manualmente).
 */
function countTakenByName(
  remedyMetrics: Array<{ text_value?: string; notes?: string; date_time: string }>,
  pontualOnly: boolean,
): Map<string, number[]> {
  const { weekAgoStr, todayStr: today } = weekWindow()
  const byName = new Map<string, number[]>()
  for (const r of remedyMetrics) {
    if (isPontual(r) !== pontualOnly) continue
    const day = (r.date_time || '').slice(0, 10)
    if (day < weekAgoStr || day > today) continue
    const label = (r.text_value ?? '').trim().toLowerCase()
    if (!label) continue
    const arr = byName.get(label) ?? [0, 0, 0, 0, 0, 0, 0]
    const wd = weekdayOf(r.date_time)
    if (wd !== null) arr[wd] += 1
    byName.set(label, arr)
  }
  return byName
}

export function buildPlannedMedRows(
  meds: Medication[],
  remedyMetrics: Array<{ text_value?: string; notes?: string; date_time: string }> = [],
): MedRow[] {
  const takenByName = countTakenByName(remedyMetrics, false)

  return meds
    .filter((m) => m.routine !== 'once')
    .map((m) => {
      const weekPlanned = [0, 0, 0, 0, 0, 0, 0]
      const days = m.routine === 'weekly' ? m.weekdays : [0, 1, 2, 3, 4, 5, 6]
      for (const d of days) {
        if (d >= 0 && d <= 6) weekPlanned[d] = m.times.length
      }
      const taken = takenByName.get(m.name.trim().toLowerCase()) ?? [0, 0, 0, 0, 0, 0, 0]
      return {
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        times: m.times,
        weekDoses: taken,
        weekPlanned,
      }
    })
}

/**
 * Linhas das tomas pontuais: para cada medicação routine 'once', soma as tomas
 * registradas (health_metrics category 'remedio' com notes "pontual") por dia,
 * dentro da janela de 7 dias da grade. Medicação 'once' sem nenhuma toma na
 * janela não vira linha — ela continua listada em /medicamentos.
 */
export function buildOnceMedRows(
  meds: Medication[],
  remedyMetrics: Array<{ text_value?: string; notes?: string; date_time: string }>,
): MedRow[] {
  const onceMeds = meds.filter((m) => m.routine === 'once')
  if (onceMeds.length === 0) return []

  const dosesByName = countTakenByName(remedyMetrics, true)

  return onceMeds
    .filter((m) => dosesByName.has(m.name.trim().toLowerCase()))
    .map((m) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      times: [],
      weekDoses: dosesByName.get(m.name.trim().toLowerCase()) ?? [0, 0, 0, 0, 0, 0, 0],
      weekPlanned: [0, 0, 0, 0, 0, 0, 0],
    }))
}

/**
 * Linhas extras para tomas pontuais registradas cujo remédio ainda não tem
 * medicação routine 'once' cadastrada — garante que a toma apareça na grade
 * mesmo sem cadastro em /medicamentos (uma linha por nome de remédio).
 */
export function buildOrphanOnceRows(
  meds: Medication[],
  remedyMetrics: Array<{ id: string; text_value?: string; notes?: string; date_time: string }>,
): MedRow[] {
  const { weekAgoStr, todayStr: today } = weekWindow()
  const knownNames = new Set(meds.map((m) => m.name.trim().toLowerCase()))
  const out: MedRow[] = []
  const seen = new Set<string>()

  for (const r of remedyMetrics) {
    if (!isPontual(r)) continue
    const day = (r.date_time || '').slice(0, 10)
    if (day < weekAgoStr || day > today) continue
    const label = (r.text_value ?? '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (knownNames.has(key) || seen.has(key)) continue
    seen.add(key)

    const weekDoses = [0, 0, 0, 0, 0, 0, 0]
    const wd = weekdayOf(r.date_time)
    if (wd !== null) weekDoses[wd] += 1
    out.push({
      id: `once-${r.id}`,
      name: label,
      dosage: '',
      times: [],
      weekDoses,
      weekPlanned: [0, 0, 0, 0, 0, 0, 0],
    })
  }
  return out
}
