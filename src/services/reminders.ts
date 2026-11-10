import pb from '@/lib/pocketbase/client'
import { Reminder, ReminderType, ReminderRepeat, ReminderStatus } from '@/types'

export interface CreateReminderInput {
  title: string
  type: ReminderType
  date: string
  time?: string
  repeat?: ReminderRepeat
  notes?: string
}

export const remindersService = {
  /**
   * Lista lembretes do usuário logado (ou do userId passado)
   */
  async list(userId?: string): Promise<Reminder[]> {
    const targetUser = userId || pb.authStore.record?.id
    if (!targetUser) return []

    const records = await pb.collection('reminders').getFullList({
      filter: `user = "${targetUser}"`,
      sort: 'date,time,-created',
    })

    return records.map((r) => ({
      id: r.id,
      user: r.user,
      type: (r.type as ReminderType) || 'outro',
      title: r.title,
      date: r.date,
      time: r.time || undefined,
      repeat: (r.repeat as ReminderRepeat) || 'none',
      status: (r.status as ReminderStatus) || 'pending',
      notes: r.notes || undefined,
      created: r.created,
      updated: r.updated,
    }))
  },

  /**
   * Cria novo lembrete
   */
  async create(data: CreateReminderInput): Promise<Reminder> {
    const user = pb.authStore.record?.id
    if (!user) throw new Error('Usuário não autenticado')

    const record = await pb.collection('reminders').create({
      user,
      title: data.title.trim(),
      type: data.type,
      date: data.date,
      time: data.time || '',
      repeat: data.repeat || 'none',
      status: 'pending',
      notes: data.notes || '',
    })

    return {
      id: record.id,
      user: record.user,
      type: record.type as ReminderType,
      title: record.title,
      date: record.date,
      time: record.time || undefined,
      repeat: record.repeat as ReminderRepeat,
      status: record.status as ReminderStatus,
      notes: record.notes || undefined,
      created: record.created,
      updated: record.updated,
    }
  },

  /**
   * Atualiza status (ex: marcar como concluído / pendente)
   */
  async setStatus(id: string, status: ReminderStatus): Promise<void> {
    await pb.collection('reminders').update(id, { status })
  },

  /**
   * Exclui um lembrete
   */
  async delete(id: string): Promise<void> {
    await pb.collection('reminders').delete(id)
  },
}
