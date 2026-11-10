import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Reminder, ReminderType, ReminderRepeat, ReminderStatus } from '@/types'
import { remindersService, CreateReminderInput } from '@/services/reminders'
import { todayStr } from '@/lib/localDate'
import {
  Bell,
  Plus,
  Pill,
  FileText,
  Calendar,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
  Repeat,
  Check,
  RotateCcw,
} from 'lucide-react'

interface RemindersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPE_CONFIG: Record<
  ReminderType,
  { label: string; icon: any; color: string; badgeClass: string }
> = {
  remedio: {
    label: 'Remédio',
    icon: Pill,
    color: 'text-rose-600',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300',
  },
  exame: {
    label: 'Exame',
    icon: FileText,
    color: 'text-indigo-600',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300',
  },
  consulta: {
    label: 'Consulta',
    icon: Calendar,
    color: 'text-emerald-600',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  habito: {
    label: 'Hábito / Meta',
    icon: Sparkles,
    color: 'text-amber-600',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
  },
  outro: {
    label: 'Outro',
    icon: Bell,
    color: 'text-slate-600',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300',
  },
}

export function RemindersModal({ open, onOpenChange }: RemindersModalProps) {
  const { user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')

  // Estado do formulário
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ReminderType>('remedio')
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState('08:00')
  const [repeat, setRepeat] = useState<ReminderRepeat>('none')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadReminders = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const list = await remindersService.list(user.id)
      setReminders(list)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao carregar lembretes')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (open) {
      loadReminders()
    }
  }, [open, loadReminders])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Informe o título do lembrete')
      return
    }
    setSubmitting(true)
    try {
      const payload: CreateReminderInput = {
        title: title.trim(),
        type,
        date,
        time: time || undefined,
        repeat,
        notes: notes.trim() || undefined,
      }
      const created = await remindersService.create(payload)
      setReminders((prev) => [created, ...prev])
      toast.success('Lembrete agendado com sucesso!')
      // reset form
      setTitle('')
      setType('remedio')
      setNotes('')
      setShowForm(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao criar lembrete')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (item: Reminder) => {
    const newStatus: ReminderStatus = item.status === 'completed' ? 'pending' : 'completed'
    try {
      await remindersService.setStatus(item.id, newStatus)
      setReminders((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: newStatus } : r)))
      toast.success(
        newStatus === 'completed' ? 'Lembrete marcado como concluído!' : 'Lembrete reaberto!',
      )
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao atualizar lembrete')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await remindersService.delete(id)
      setReminders((prev) => prev.filter((r) => r.id !== id))
      toast.success('Lembrete excluído')
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao excluir lembrete')
    }
  }

  const filteredList = reminders.filter((r) => {
    if (filter === 'pending') return r.status !== 'completed'
    if (filter === 'completed') return r.status === 'completed'
    return true
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 rounded-2xl">
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Lembretes (Reminders)</DialogTitle>
                <DialogDescription className="text-xs">
                  Agende exames, remédios a tomar, consultas e rotinas preventivas
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowForm((prev) => !prev)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {showForm ? 'Fechar Formulário' : 'Novo Lembrete'}
            </Button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* FORMULÁRIO DE CRIAÇÃO */}
          {showForm && (
            <form onSubmit={handleCreate} className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <p className="text-xs font-bold text-foreground">Novo Lembrete de Saúde</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Título do Lembrete *</Label>
                  <Input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Tomar Mounjaro, Hemograma em jejum..."
                    className="text-xs h-9 bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tipo *</Label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ReminderType)}
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="remedio">Remédio a Tomar</option>
                    <option value="exame">Exame Laboratorial / Imagem</option>
                    <option value="consulta">Consulta Médica / Retorno</option>
                    <option value="habito">Hábito / Hidratação / Treino</option>
                    <option value="outro">Outro Lembrete</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Data *</Label>
                  <Input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Horário (opcional)</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Repetição</Label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as ReminderRepeat)}
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                  >
                    <option value="none">Sem repetição (único)</option>
                    <option value="daily">Todos os dias</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="monthly">Mensalmente</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium">Observações / Instruções (opcional)</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Em jejum de 8h, após o almoço..."
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? 'Salvando...' : 'Salvar Lembrete'}
                </Button>
              </div>
            </form>
          )}

          {/* FILTROS E CONTAGEM */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pendentes ({reminders.filter((r) => r.status !== 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('completed')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Concluídos ({reminders.filter((r) => r.status === 'completed').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos ({reminders.length})
              </button>
            </div>

            {loading && <span className="text-[11px] text-muted-foreground">Carregando...</span>}
          </div>

          {/* LISTA DE LEMBRETES */}
          {filteredList.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto opacity-30 text-emerald-600" />
              <p className="text-xs font-medium">Nenhum lembrete nesta lista</p>
              <p className="text-[11px]">
                Clique no botão <b>Novo Lembrete</b> acima para agendar exames, remédios ou
                consultas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map((item) => {
                const conf = TYPE_CONFIG[item.type] || TYPE_CONFIG.outro
                const Icon = conf.icon
                const isCompleted = item.status === 'completed'

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isCompleted
                        ? 'bg-muted/30 border-muted opacity-70'
                        : 'bg-card hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                          isCompleted
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-muted-foreground/30 hover:border-emerald-500 text-transparent hover:text-emerald-500'
                        }`}
                        title={isCompleted ? 'Reabrir lembrete' : 'Marcar como concluído'}
                      >
                        <Check className="h-4 w-4" />
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className={`text-xs font-semibold truncate ${
                              isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'
                            }`}
                          >
                            {item.title}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 border ${conf.badgeClass}`}
                          >
                            <Icon className="h-2.5 w-2.5 mr-1" />
                            {conf.label}
                          </Badge>
                          {item.repeat && item.repeat !== 'none' && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Repeat className="h-2.5 w-2.5" />
                              {item.repeat === 'daily'
                                ? 'Diário'
                                : item.repeat === 'weekly'
                                  ? 'Semanal'
                                  : 'Mensal'}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.date}
                          </span>
                          {item.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </span>
                          )}
                          {item.notes && (
                            <span className="italic truncate max-w-xs">"{item.notes}"</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleStatus(item)}
                        title={isCompleted ? 'Reabrir lembrete' : 'Concluir'}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        {isCompleted ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        title="Excluir lembrete"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/10 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
