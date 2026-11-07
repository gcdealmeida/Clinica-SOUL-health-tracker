import { useEffect, useState } from 'react'
import { medicationService, type Medication } from '@/services/medications'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Clock, Loader2, Pill } from 'lucide-react'

interface TakeIntakeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const nowTime = () =>
  `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`

const todayDate = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/**
 * "Tomei medicação" no painel Hoje: seletor das medicações já cadastradas como
 * recorrentes (routine daily/weekly). O usuário seleciona qual tomou, pode
 * ajustar a DATA e o HORÁRIO em que foi tomada (padrão = agora) e a toma é
 * gravada como health_metrics 'remedio' com text_value = nome (sem notes
 * "pontual"), caindo no mesmo pareamento por nome da grade semanal (célula
 * fica verde) e da linha do tempo do dia.
 */
export function TakeIntakeDialog({ open, onOpenChange, onSaved }: TakeIntakeDialogProps) {
  const [meds, setMeds] = useState<Medication[]>([])
  const [selected, setSelected] = useState<Medication | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(todayDate)
  const [time, setTime] = useState(nowTime)

  useEffect(() => {
    if (!open) return
    setSelected(null)
    setMeds([])
    setDate(todayDate())
    setTime(nowTime())
    setLoading(true)
    medicationService
      .list()
      .then((all) => setMeds(all.filter((m) => m.routine !== 'once')))
      .catch((err) => {
        console.error(err)
        toast.error('Não foi possível carregar suas medicações')
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleConfirm = async () => {
    if (!selected || saving) return
    setSaving(true)
    try {
      await medicationService.registerIntake(selected.id, date, time)
      toast.success(`Toma de ${selected.name} registrada`)
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível registrar a toma')
    } finally {
      setSaving(false)
    }
  }

  const freqLabel = (m: Medication) => {
    if (m.routine === 'weekly') {
      const letters = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
      return m.weekdays.map((d) => letters[d]).join('')
    }
    return 'todos os dias'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-emerald-600" />
            Tomei medicação
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione a medicação recorrente e ajuste quando ela foi tomada — por padrão, agora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 min-h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : meds.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Nenhuma medicação recorrente cadastrada. Cadastre em /medicamentos ou pelo botão
              "Adicionar Medicação" (modo Recorrente).
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
              {meds.map((m) => {
                const active = selected?.id === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelected(active ? null : m)}
                    className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    <span
                      className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                        active ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-input'
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{m.name}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {[m.dosage, m.times.join(' · ')].filter(Boolean).join(' • ')}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] text-emerald-700 border-emerald-200 shrink-0"
                    >
                      {freqLabel(m)}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}

          {selected && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                Quando você tomou {selected.name}?
              </div>
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="take-intake-date" className="text-[11px] text-muted-foreground">
                    Data
                  </Label>
                  <Input
                    id="take-intake-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label htmlFor="take-intake-time" className="text-[11px] text-muted-foreground">
                    Horário
                  </Label>
                  <Input
                    id="take-intake-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!selected || saving || !date || !time}
            onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selected ? 'Registrar toma' : 'Tomar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
