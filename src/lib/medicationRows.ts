import type { MedRow } from '@/lib/dashboard'
import type { Medication } from '@/services/medications'

/**
 * Linhas da grade "Medicações em uso" a partir das medicações cadastradas em /medicamentos.
 * Cada dia da rotina (todos os dias na diária; dias escolhidos na semanal) mostra
 * a quantidade de tomas do horário cadastrado (ex.: 2 horários → "2x").
 */
export function buildPlannedMedRows(meds: Medication[]): MedRow[] {
  return meds.map((m) => {
    const weekDoses = [0, 0, 0, 0, 0, 0, 0]
    const days = m.routine === 'weekly' ? m.weekdays : [0, 1, 2, 3, 4, 5, 6]
    for (const d of days) {
      if (d >= 0 && d <= 6) weekDoses[d] = m.times.length
    }
    return {
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      times: m.times,
      weekDoses,
    }
  })
}
