import pb from '@/lib/pocketbase/client'
import { HealthMetric, HealthCategory } from '@/types'

type RawMetric = {
  id?: string
  user?: string
  category?: string
  date_time?: string
  numeric_value?: number
  text_value?: string
  unit?: string
  notes?: string
  attachment?: string
  body_fat_pct?: number
  lean_mass_kg?: number
  sleep_deep_hours?: number
  sleep_rem_hours?: number
  sleep_awake_hours?: number
  bedtime?: string
  wakeup?: string
  created?: string
  updated?: string
}

function mapMetric(r: RawMetric): HealthMetric {
  return {
    id: r.id ?? '',
    user: r.user ?? '',
    category: r.category as HealthCategory,
    date_time: r.date_time ?? '',
    numeric_value: r.numeric_value,
    text_value: r.text_value,
    unit: r.unit,
    notes: r.notes,
    attachment: r.attachment ? pb.files.getURL(r as never, r.attachment) : undefined,
    body_fat_pct: r.body_fat_pct,
    lean_mass_kg: r.lean_mass_kg,
    sleep_deep_hours: r.sleep_deep_hours,
    sleep_rem_hours: r.sleep_rem_hours,
    sleep_awake_hours: r.sleep_awake_hours,
    bedtime: r.bedtime,
    wakeup: r.wakeup,
    created: r.created,
    updated: r.updated,
  }
}

export const healthService = {
  async listUserMetrics(
    userId?: string,
    limit = 50,
    category?: HealthCategory,
  ): Promise<HealthMetric[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    let filter = `user = '${targetId}'`
    if (category) {
      filter += ` && category = '${category}'`
    }

    const records = await pb.collection('health_metrics').getList(1, limit, {
      filter,
      sort: '-date_time',
    })

    return records.items.map(mapMetric)
  },

  /** TODOS os registros de sintoma do usuário (category='sintoma'), paginado. */
  async listAllSymptomMetrics(userId?: string): Promise<HealthMetric[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const filter = `user = '${targetId}' && category = 'sintoma'`
    const out: HealthMetric[] = []
    let page = 1
    for (;;) {
      const res = await pb.collection('health_metrics').getList(page, 200, {
        filter,
        sort: '-date_time',
      })
      for (const r of res.items) out.push(mapMetric(r))
      if (res.items.length === 0 || page >= res.totalPages) break
      page++
    }
    return out
  },

  async createMetric(data: {
    category: HealthCategory
    date_time: string
    numeric_value?: number
    text_value?: string
    unit?: string
    notes?: string
    attachment?: File
    userId?: string
    body_fat_pct?: number
    lean_mass_kg?: number
    sleep_deep_hours?: number
    sleep_rem_hours?: number
    sleep_awake_hours?: number
    bedtime?: string
    wakeup?: string
  }): Promise<HealthMetric> {
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const formData = new FormData()
    formData.append('user', user)
    formData.append('category', data.category)
    formData.append('date_time', data.date_time)
    if (data.numeric_value !== undefined && !isNaN(data.numeric_value)) {
      formData.append('numeric_value', String(data.numeric_value))
    }
    if (data.text_value) formData.append('text_value', data.text_value)
    if (data.unit) formData.append('unit', data.unit)
    if (data.notes) formData.append('notes', data.notes)
    if (data.attachment) formData.append('attachment', data.attachment)
    if (data.body_fat_pct !== undefined && !isNaN(data.body_fat_pct)) {
      formData.append('body_fat_pct', String(data.body_fat_pct))
    }
    if (data.lean_mass_kg !== undefined && !isNaN(data.lean_mass_kg)) {
      formData.append('lean_mass_kg', String(data.lean_mass_kg))
    }
    if (data.sleep_deep_hours !== undefined && !isNaN(data.sleep_deep_hours)) {
      formData.append('sleep_deep_hours', String(data.sleep_deep_hours))
    }
    if (data.sleep_rem_hours !== undefined && !isNaN(data.sleep_rem_hours)) {
      formData.append('sleep_rem_hours', String(data.sleep_rem_hours))
    }
    if (data.sleep_awake_hours !== undefined && !isNaN(data.sleep_awake_hours)) {
      formData.append('sleep_awake_hours', String(data.sleep_awake_hours))
    }
    if (data.bedtime) formData.append('bedtime', data.bedtime)
    if (data.wakeup) formData.append('wakeup', data.wakeup)

    const r = await pb.collection('health_metrics').create(formData)

    return {
      id: r.id,
      user: r.user,
      category: r.category as HealthCategory,
      date_time: r.date_time,
      numeric_value: r.numeric_value,
      text_value: r.text_value,
      unit: r.unit,
      notes: r.notes,
      attachment: r.attachment ? pb.files.getURL(r, r.attachment) : undefined,
      body_fat_pct: r.body_fat_pct,
      lean_mass_kg: r.lean_mass_kg,
      sleep_deep_hours: r.sleep_deep_hours,
      sleep_rem_hours: r.sleep_rem_hours,
      sleep_awake_hours: r.sleep_awake_hours,
      bedtime: r.bedtime,
      wakeup: r.wakeup,
      created: r.created,
      updated: r.updated,
    }
  },

  async updateMetric(id: string, data: Partial<HealthMetric>): Promise<void> {
    await pb.collection('health_metrics').update(id, data)
  },

  async deleteMetric(id: string): Promise<void> {
    await pb.collection('health_metrics').delete(id)
  },
}
