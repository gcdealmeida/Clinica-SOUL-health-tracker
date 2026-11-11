import pb from '@/lib/pocketbase/client'
import { EmotionalLog } from '@/types'

export const emotionalService = {
  async listLogs(userId?: string, limit = 30): Promise<EmotionalLog[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const records = await pb.collection('emotional_logs').getList(1, limit, {
      filter: `user = '${targetId}'`,
      sort: '-date',
    })

    const parseJson = <T>(val: unknown, fallback: T): T => {
      if (!val) return fallback
      if (typeof val === 'string') {
        try {
          return JSON.parse(val) as T
        } catch {
          return fallback
        }
      }
      return val as T
    }

    return records.items.map((r) => ({
      id: r.id,
      user: r.user,
      date: r.date,
      mood_score: r.mood_score,
      mood_label: r.mood_label,
      affecting_factors: r.affecting_factors,
      notes: r.notes,
      energy_level: r.energy_level,
      stress_level: r.stress_level,
      emotions: parseJson<string[]>(r.emotions, []),
      sleep_status: r.sleep_status,
      physical_activity: r.physical_activity,
      nutrition: r.nutrition,
      social_status: r.social_status,
      family_status: r.family_status,
      partner_status: r.partner_status,
      hobbies_status: r.hobbies_status,
      spirituality_status: r.spirituality_status,
      intellect_status: r.intellect_status,
      service_status: r.service_status,
      financial_status: r.financial_status,
      life_aspects: parseJson(r.life_aspects, undefined),
      created: r.created,
      updated: r.updated,
    }))
  },

  async getLogByDate(date: string, userId?: string): Promise<EmotionalLog | null> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return null

    try {
      const records = await pb.collection('emotional_logs').getList(1, 1, {
        filter: `user = '${targetId}' && date ~ '${date}'`,
        sort: '-created',
      })
      if (!records.items.length) return null
      const r = records.items[0]
      const parseJson = <T>(val: unknown, fallback: T): T => {
        if (!val) return fallback
        if (typeof val === 'string') {
          try {
            return JSON.parse(val) as T
          } catch {
            return fallback
          }
        }
        return val as T
      }
      return {
        id: r.id,
        user: r.user,
        date: r.date,
        mood_score: r.mood_score,
        mood_label: r.mood_label,
        affecting_factors: r.affecting_factors,
        notes: r.notes,
        energy_level: r.energy_level,
        stress_level: r.stress_level,
        emotions: parseJson<string[]>(r.emotions, []),
        sleep_status: r.sleep_status,
        physical_activity: r.physical_activity,
        nutrition: r.nutrition,
        social_status: r.social_status,
        family_status: r.family_status,
        partner_status: r.partner_status,
        hobbies_status: r.hobbies_status,
        spirituality_status: r.spirituality_status,
        intellect_status: r.intellect_status,
        service_status: r.service_status,
        financial_status: r.financial_status,
        life_aspects: parseJson(r.life_aspects, undefined),
        created: r.created,
        updated: r.updated,
      }
    } catch {
      return null
    }
  },

  async saveCheckin(data: {
    date: string
    mood_score: number
    mood_label: string
    energy_level?: number
    stress_level?: number
    emotions?: string[]
    sleep_status?: string
    physical_activity?: string
    nutrition?: string
    social_status?: string
    family_status?: string
    partner_status?: string
    hobbies_status?: string
    spirituality_status?: string
    intellect_status?: string
    service_status?: string
    financial_status?: string
    life_aspects?: Record<string, number>
    affecting_factors?: string
    notes?: string
    userId?: string
  }): Promise<EmotionalLog> {
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const payload = {
      user,
      date: data.date,
      mood_score: data.mood_score,
      mood_label: data.mood_label,
      energy_level: data.energy_level ?? 3,
      stress_level: data.stress_level ?? 3,
      emotions: data.emotions ?? [],
      sleep_status: data.sleep_status ?? '',
      physical_activity: data.physical_activity ?? '',
      nutrition: data.nutrition ?? '',
      social_status: data.social_status ?? '',
      family_status: data.family_status ?? '',
      partner_status: data.partner_status ?? '',
      hobbies_status: data.hobbies_status ?? '',
      spirituality_status: data.spirituality_status ?? '',
      intellect_status: data.intellect_status ?? '',
      service_status: data.service_status ?? '',
      financial_status: data.financial_status ?? '',
      life_aspects: data.life_aspects ?? {},
      affecting_factors: data.affecting_factors ?? '',
      notes: data.notes ?? '',
    }

    // Upsert: procura registro existente da mesma data para o usuário
    let existingId: string | null = null
    try {
      const existing = await pb.collection('emotional_logs').getList(1, 1, {
        filter: `user = '${user}' && date ~ '${data.date}'`,
        sort: '-created',
      })
      if (existing.items.length > 0) {
        existingId = existing.items[0].id
      }
    } catch {
      // prossegue criando novo
    }

    const r = existingId
      ? await pb.collection('emotional_logs').update(existingId, payload)
      : await pb.collection('emotional_logs').create(payload)

    return {
      id: r.id,
      user: r.user,
      date: r.date,
      mood_score: r.mood_score,
      mood_label: r.mood_label,
      affecting_factors: r.affecting_factors,
      notes: r.notes,
      energy_level: r.energy_level,
      stress_level: r.stress_level,
      emotions: data.emotions ?? [],
      sleep_status: r.sleep_status,
      physical_activity: r.physical_activity,
      nutrition: r.nutrition,
      social_status: r.social_status,
      family_status: r.family_status,
      partner_status: r.partner_status,
      hobbies_status: r.hobbies_status,
      spirituality_status: r.spirituality_status,
      intellect_status: r.intellect_status,
      service_status: r.service_status,
      financial_status: r.financial_status,
      life_aspects: data.life_aspects,
      created: r.created,
      updated: r.updated,
    }
  },

  async createLog(data: {
    date: string
    mood_score: number
    mood_label: string
    affecting_factors?: string
    notes?: string
    energy_level?: number
    stress_level?: number
    userId?: string
  }): Promise<EmotionalLog> {
    return this.saveCheckin({
      date: data.date,
      mood_score: data.mood_score,
      mood_label: data.mood_label,
      affecting_factors: data.affecting_factors,
      notes: data.notes,
      energy_level: data.energy_level,
      stress_level: data.stress_level,
      userId: data.userId,
    })
  },

  async delete(id: string): Promise<boolean> {
    await pb.collection('emotional_logs').delete(id)
    return true
  },
}

export default emotionalService
