import pb from '@/lib/pocketbase/client'
import { Exam, Diet, MedicalRecord } from '@/types'

export const medicalService = {
  // Medical records (cirurgias, alergias)
  async listMedicalRecords(userId?: string): Promise<MedicalRecord[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const records = await pb.collection('medical_records').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-created',
    })

    return records.map((r) => ({
      id: r.id,
      user: r.user,
      type: r.type,
      title: r.title,
      date: r.date,
      description: r.description,
      severity: r.severity,
      created: r.created,
      updated: r.updated,
    }))
  },

  async createMedicalRecord(data: {
    type: 'cirurgia' | 'alergia' | 'doenca_previa' | 'medicamento_continuo'
    title: string
    date?: string
    description?: string
    severity?: string
    userId?: string
  }): Promise<MedicalRecord> {
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const r = await pb.collection('medical_records').create({
      user,
      type: data.type,
      title: data.title,
      date: data.date || '',
      description: data.description || '',
      severity: data.severity || '',
    })

    return {
      id: r.id,
      user: r.user,
      type: r.type,
      title: r.title,
      date: r.date,
      description: r.description,
      severity: r.severity,
      created: r.created,
      updated: r.updated,
    }
  },

  async deleteMedicalRecord(id: string): Promise<void> {
    await pb.collection('medical_records').delete(id)
  },

  // Exams
  async listExams(userId?: string): Promise<Exam[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const records = await pb.collection('exams').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-date',
    })

    return records.map((r) => ({
      id: r.id,
      user: r.user,
      title: r.title,
      type: r.type,
      date: r.date,
      laboratory: r.laboratory,
      summary_results: r.summary_results,
      file: r.file ? pb.files.getURL(r, r.file) : undefined,
      status: r.status,
      created: r.created,
      updated: r.updated,
    }))
  },

  async createExam(data: {
    title: string
    type: string
    date: string
    laboratory?: string
    summary_results?: string
    file?: File
    status?: 'normal' | 'alterado' | 'pendente'
    userId?: string
  }): Promise<Exam> {
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const formData = new FormData()
    formData.append('user', user)
    formData.append('title', data.title)
    formData.append('type', data.type)
    formData.append('date', data.date)
    if (data.laboratory) formData.append('laboratory', data.laboratory)
    if (data.summary_results) formData.append('summary_results', data.summary_results)
    if (data.status) formData.append('status', data.status)
    if (data.file) formData.append('file', data.file)

    const r = await pb.collection('exams').create(formData)

    return {
      id: r.id,
      user: r.user,
      title: r.title,
      type: r.type,
      date: r.date,
      laboratory: r.laboratory,
      summary_results: r.summary_results,
      file: r.file ? pb.files.getURL(r, r.file) : undefined,
      status: r.status,
      created: r.created,
      updated: r.updated,
    }
  },

  async deleteExam(id: string): Promise<void> {
    await pb.collection('exams').delete(id)
  },

  // Diets
  async listDiets(userId?: string): Promise<Diet[]> {
    const current = pb.authStore.record
    const targetId = userId || current?.id
    if (!targetId) return []

    const records = await pb.collection('diets').getFullList({
      filter: `user = '${targetId}'`,
      sort: '-created',
    })

    return records.map((r) => ({
      id: r.id,
      user: r.user,
      title: r.title,
      objective: r.objective,
      prescription: r.prescription,
      photo: r.photo ? pb.files.getURL(r, r.photo) : undefined,
      active: r.active,
      start_date: r.start_date,
      end_date: r.end_date,
      created: r.created,
      updated: r.updated,
    }))
  },

  async createDiet(data: {
    title: string
    objective?: string
    prescription?: string
    photo?: File
    active?: boolean
    start_date?: string
    end_date?: string
    userId?: string
  }): Promise<Diet> {
    const current = pb.authStore.record
    const user = data.userId || current?.id
    if (!user) throw new Error('Usuário não autenticado')

    const formData = new FormData()
    formData.append('user', user)
    formData.append('title', data.title)
    if (data.objective) formData.append('objective', data.objective)
    if (data.prescription) formData.append('prescription', data.prescription)
    formData.append('active', data.active !== false ? 'true' : 'false')
    if (data.start_date) formData.append('start_date', data.start_date)
    if (data.end_date) formData.append('end_date', data.end_date)
    if (data.photo) formData.append('photo', data.photo)

    const r = await pb.collection('diets').create(formData)

    return {
      id: r.id,
      user: r.user,
      title: r.title,
      objective: r.objective,
      prescription: r.prescription,
      photo: r.photo ? pb.files.getURL(r, r.photo) : undefined,
      active: r.active,
      start_date: r.start_date,
      end_date: r.end_date,
      created: r.created,
      updated: r.updated,
    }
  },

  async deleteDiet(id: string): Promise<void> {
    await pb.collection('diets').delete(id)
  },
}
