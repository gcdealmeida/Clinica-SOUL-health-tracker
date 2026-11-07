import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { medicationService } from '@/services/medications'
import { useActiveIngredientSearch } from '@/hooks/use-active-ingredient-search'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, Info, Loader2, Pill } from 'lucide-react'

interface OccasionalIntakeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Cadastro rápido de toma PONTUAL: remédio (com buscador de princípio ativo
 * da ANVISA + preenchimento manual), dosagem e horário da toma — sem rotina
 * diária/semanal. Cria a medicação com routine 'once' (ou reutiliza a de
 * mesmo nome) e grava a toma como health_metrics 'remedio' com notes "pontual".
 */
export function OccasionalIntakeDialog({
  open,
  onOpenChange,
  onSaved,
}: OccasionalIntakeDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [time, setTime] = useState(nowHHMM())
  const [activeIngredient, setActiveIngredient] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [saving, setSaving] = useState(false)

  const { results, loading: searching, failed, source } = useActiveIngredientSearch(name)

  const reset = () => {
    setName('')
    setDosage('')
    setTime(nowHHMM())
    setActiveIngredient('')
    setShowSuggestions(true)
  }

  const canSave = name.trim().length > 0 && /^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())

  const handleSave = async () => {
    if (!user) return
    if (!canSave) {
      toast.error('Informe o nome do remédio e um horário válido (HH:MM)')
      return
    }
    setSaving(true)
    try {
      await medicationService.createOccasionalIntake({
        name: name.trim(),
        active_ingredient: activeIngredient.trim(),
        dosage: dosage.trim(),
        time: time.trim(),
      })
      toast.success('Toma pontual registrada')
      reset()
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível registrar a toma pontual')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-emerald-600" />
            Toma pontual
          </DialogTitle>
          <DialogDescription className="text-xs">
            Remédio tomado uma única vez (ex.: febre, dor de cabeça) — sem rotina, sem dias e sem
            horários recorrentes. Aparece na grade de hoje.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="once-med-name" className="text-xs">
              Nome do remédio
            </Label>
            <Input
              id="once-med-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setShowSuggestions(true)
              }}
              placeholder="Ex.: Dipirona"
              className="text-sm"
              autoComplete="off"
            />

            {name.trim().length >= 3 && searching && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Buscando princípio ativo...
              </p>
            )}

            {showSuggestions && name.trim().length >= 3 && !searching && results.length > 0 && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
                <p className="text-xs font-medium text-emerald-800">
                  {source === 'openfda'
                    ? 'Princípio ativo encontrado na base internacional (FDA) — confirme:'
                    : 'Princípio ativo encontrado — confirme se estiver certo:'}
                </p>
                {results.map((s) => (
                  <div
                    key={`${s.label}|${s.activeIngredient}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{s.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {s.category ? `${s.category} · ` : ''}
                        {s.activeIngredient}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        setActiveIngredient(s.activeIngredient)
                        setShowSuggestions(false)
                      }}
                    >
                      <Check className="h-3 w-3 mr-1" /> OK
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowSuggestions(false)}
                >
                  Preencher manualmente
                </Button>
              </div>
            )}

            {name.trim().length >= 3 &&
              !searching &&
              (failed || (!showSuggestions && results.length === 0)) && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <Info className="h-3 w-3" /> Princípio ativo preenchido manualmente abaixo.
                </p>
              )}
            {name.trim().length >= 3 &&
              !searching &&
              !failed &&
              showSuggestions &&
              results.length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <Info className="h-3 w-3" /> Nenhum princípio ativo encontrado. Preencha abaixo.
                </p>
              )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="once-med-ingredient" className="text-xs">
              Princípio ativo (opcional)
            </Label>
            <Input
              id="once-med-ingredient"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
              placeholder="Ex.: dipirona sódica"
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="once-med-dosage" className="text-xs">
                Dosagem
              </Label>
              <Input
                id="once-med-dosage"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="Ex.: 500 mg"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="once-med-time" className="text-xs">
                Horário da toma
              </Label>
              <Input
                id="once-med-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="text-sm w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !canSave}
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar toma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
