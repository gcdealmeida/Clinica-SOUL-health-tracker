import pb from '@/lib/pocketbase/client'

/**
 * Medicações em uso cadastradas pelo paciente (coleção `medications`).
 * routine: 'daily' = todos os dias; 'weekly' = dias escolhidos em `weekdays` (0 = domingo).
 */

export type MedicationRoutine = 'daily' | 'weekly'

export interface Medication {
  id: string
  name: string
  active_ingredient: string
  dosage: string
  routine: MedicationRoutine
  weekdays: number[]
  times: string[]
}

export interface MedicationInput {
  name: string
  active_ingredient: string
  dosage: string
  routine: MedicationRoutine
  weekdays: number[]
  times: string[]
}

const parseList = (raw: unknown): any[] => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (_) {
      return []
    }
  }
  return []
}

const toMedication = (rec: any): Medication => ({
  id: rec.id,
  name: rec.name ?? '',
  active_ingredient: rec.active_ingredient ?? '',
  dosage: rec.dosage ?? '',
  routine: rec.routine === 'weekly' ? 'weekly' : 'daily',
  weekdays: parseList(rec.weekdays).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
  times: parseList(rec.times).filter((t) => typeof t === 'string'),
})

export const medicationService = {
  /** Lista as medicações do usuário logado (as regras da coleção limitam ao dono). */
  async list(): Promise<Medication[]> {
    const records = await pb.collection('medications').getFullList({ sort: 'created' })
    return records.map(toMedication)
  },

  /** Remove uma medicação do usuário logado. */
  async remove(id: string): Promise<void> {
    await pb.collection('medications').delete(id)
  },

  /** Cria uma medicação para o usuário logado. */
  async create(input: MedicationInput): Promise<Medication> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')
    const rec = await pb.collection('medications').create({ ...input, user: userId })
    return toMedication(rec)
  },
}
