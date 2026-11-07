import pb from '@/lib/pocketbase/client'

/**
 * Medicações cadastradas pelo paciente (coleção `medications`).
 * routine: 'daily' = todos os dias; 'weekly' = dias escolhidos em `weekdays` (0 = domingo);
 * 'once' = toma pontual (sem rotina) — dias e horários ficam vazios, a toma
 * registrada é um health_metrics (category 'remedio') com notes "pontual HH:MM".
 */

export type MedicationRoutine = 'daily' | 'weekly' | 'once'

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

export interface OccasionalIntakeInput {
  name: string
  active_ingredient?: string
  dosage?: string
  /** "YYYY-MM-DD" da toma; omitido/vazio = hoje (pode ser retroativa) */
  date?: string
  /** "HH:MM" da toma; omitido = agora */
  time?: string
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
  routine: rec.routine === 'weekly' ? 'weekly' : rec.routine === 'once' ? 'once' : 'daily',
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

  /** Cria uma medicação (rotina diária/semanal) para o usuário logado. */
  async create(input: MedicationInput): Promise<Medication> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')
    const rec = await pb.collection('medications').create({ ...input, user: userId })
    return toMedication(rec)
  },

  /**
   * Registra a toma de uma medicação recorrente (routine daily/weekly) na
   * DATA e HORÁRIO informados (padrão = agora): grava health_metrics category
   * 'remedio' com text_value = nome da medicação (sem notes "pontual" — assim
   * conta como toma de rotina no pareamento por nome da grade, virando célula
   * verde) e volta para a linha do tempo do dia.
   */
  async registerIntake(medicationId: string, date?: string, time?: string): Promise<Medication> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')

    const meds = await this.list()
    const med = meds.find((m) => m.id === medicationId)
    if (!med || med.routine === 'once') {
      throw new Error('Medicação recorrente não encontrada')
    }

    const hhmm = time?.trim()
    if (hhmm && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) {
      throw new Error('Horário inválido. Use o formato HH:MM')
    }
    const now = new Date()
    const dateStr =
      date?.trim() ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const hh =
      hhmm ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const { healthService } = await import('@/services/health')
    await healthService.createMetric({
      category: 'remedio',
      date_time: `${dateStr} ${hh}`,
      text_value: med.name,
      unit: 'dose',
      notes: med.dosage?.trim() ? `rotina • ${med.dosage.trim()}` : 'rotina',
      userId,
    })

    return med
  },

  /**
   * Registra uma toma PONTUAL (sem rotina): cria a medicação com routine 'once'
   * (reaproveitando a linha já existente com o mesmo nome, se houver) e grava a
   * toma como health_metrics category 'remedio' na data/hora informada — a data
   * pode ser retroativa (padrão = hoje).
   * A toma entra na grade semanal e na linha do tempo do painel Hoje.
   */
  async createOccasionalIntake(input: OccasionalIntakeInput): Promise<Medication> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')
    const cleanName = input.name.trim()
    if (!cleanName) throw new Error('Informe o nome do remédio')

    const hhmm = input.time?.trim()
    if (hhmm && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) {
      throw new Error('Horário inválido. Use o formato HH:MM')
    }
    const now = new Date()
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    // data da toma: a informada (retroativa ou hoje) ou hoje
    const dateStr =
      input.date?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(input.date.trim())
        ? input.date.trim()
        : isoToday
    const time =
      hhmm ||
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // reutiliza a medicação pontual já cadastrada com o mesmo nome
    const existing = (await this.list()).find(
      (m) => m.routine === 'once' && m.name.trim().toLowerCase() === cleanName.toLowerCase(),
    )
    const medication = existing
      ? undefined
      : await this.create({
          name: cleanName,
          active_ingredient: input.active_ingredient?.trim() ?? '',
          dosage: input.dosage?.trim() ?? '',
          routine: 'once',
          weekdays: [],
          times: [],
        })

    const { healthService } = await import('@/services/health')
    await healthService.createMetric({
      category: 'remedio',
      date_time: `${dateStr} ${time}`,
      text_value: cleanName,
      unit: 'dose',
      notes: `pontual${input.dosage?.trim() ? ` • ${input.dosage.trim()}` : ''}`,
      userId,
    })

    return medication ?? existing!
  },
}
