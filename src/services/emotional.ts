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
      created: r.created,
      updated: r.updated,
    }))
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
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const r = await pb.collection('emotional_logs').create({
      user,
      date: data.date,
      mood_score: data.mood_score,
      mood_label: data.mood_label,
      affecting_factors: data.affecting_factors || '',
      notes: data.notes || '',
      energy_level: data.energy_level || 3,
      stress_level: data.stress_level || 3,
    })

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
      created: r.created,
      updated: r.updated,
    }
  },
}
