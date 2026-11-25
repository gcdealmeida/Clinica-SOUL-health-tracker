import pb from '@/lib/pocketbase/client'
import { Meal, AiAnalysis } from '@/types'

export interface MealAiDetectionResult {
  title: string
  items: Array<{ name: string; weight_g: number; calories: number }>
  total_weight_g: number
  total_calories: number
  macronutrients: { protein_g: number; carbs_g: number; fat_g: number }
  nutritional_assessment: string
}

export const mealService = {
  async listMeals(userId?: string): Promise<Meal[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const records = await pb.collection('meals').getList(1, 50, {
      filter: `user = '${targetId}'`,
      sort: '-date_time',
    })

    return records.items.map((r) => ({
      id: r.id,
      user: r.user,
      meal_type: r.meal_type,
      date_time: r.date_time,
      title: r.title,
      photo: r.photo ? pb.files.getURL(r, r.photo) : undefined,
      photo_url: r.photo_url,
      items_detected: r.items_detected,
      estimated_weight_g: r.estimated_weight_g,
      estimated_calories: r.estimated_calories,
      notes: r.notes,
      created: r.created,
      updated: r.updated,
    }))
  },

  async analyzeMealWithAi(data: {
    photoBase64?: string
    description: string
    mealType: string
  }): Promise<MealAiDetectionResult> {
    const res = await pb.send('/backend/v1/ai/analyze-meal', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res as MealAiDetectionResult
  },

  async createMeal(data: {
    meal_type: Meal['meal_type']
    date_time: string
    title?: string
    photo?: File
    photo_url?: string
    items_detected?: string
    estimated_weight_g?: number
    estimated_calories?: number
    notes?: string
    userId?: string
  }): Promise<Meal> {
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const formData = new FormData()
    formData.append('user', user)
    formData.append('meal_type', data.meal_type)
    formData.append('date_time', data.date_time)
    if (data.title) formData.append('title', data.title)
    if (data.photo_url) formData.append('photo_url', data.photo_url)
    if (data.items_detected) formData.append('items_detected', data.items_detected)
    if (data.estimated_weight_g)
      formData.append('estimated_weight_g', String(data.estimated_weight_g))
    if (data.estimated_calories)
      formData.append('estimated_calories', String(data.estimated_calories))
    if (data.notes) formData.append('notes', data.notes)
    if (data.photo) formData.append('photo', data.photo)

    const r = await pb.collection('meals').create(formData)

    return {
      id: r.id,
      user: r.user,
      meal_type: r.meal_type,
      date_time: r.date_time,
      title: r.title,
      photo: r.photo ? pb.files.getURL(r, r.photo) : undefined,
      photo_url: r.photo_url,
      items_detected: r.items_detected,
      estimated_weight_g: r.estimated_weight_g,
      estimated_calories: r.estimated_calories,
      notes: r.notes,
      created: r.created,
      updated: r.updated,
    }
  },

  async deleteMeal(id: string): Promise<void> {
    await pb.collection('meals').delete(id)
  },
}

export const aiAnalysisService = {
  async runCorrelationAnalysis(params: {
    variables: string[]
    question?: string
    userId?: string
  }): Promise<{ insights: string; variables: string[] }> {
    const call = () =>
      pb.send('/backend/v1/ai/analyze-correlations', {
        method: 'POST',
        body: JSON.stringify(params),
      })
    let res: unknown
    try {
      res = await call()
    } catch (err: any) {
      // status 0 = a conexão morreu antes de qualquer resposta (timeout do
      // gateway enquanto o modelo gerava) — é isso que o SDK reporta como
      // "Something went wrong". Uma nova tentativa costuma bastar: o modelo
      // rápido responde em poucos segundos quando o prompt já está quente.
      if (err?.status === 0 || err?.isAbort) {
        res = await call()
      } else {
        throw err
      }
    }
    return res as { insights: string; variables: string[] }
  },

  async listAnalyses(userId?: string): Promise<AiAnalysis[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const records = await pb.collection('ai_analyses').getList(1, 30, {
      filter: `user = '${targetId}'`,
      sort: '-created',
    })

    return records.items.map((r) => ({
      id: r.id,
      user: r.user,
      variables: r.variables,
      question: r.question,
      insights: r.insights,
      summary: r.summary,
      created: r.created,
      updated: r.updated,
    }))
  },
}
