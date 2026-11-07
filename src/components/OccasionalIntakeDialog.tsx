import { useEffect, useState } from 'react'
import { medicationService } from '@/services/medications'
import { useActiveIngredientSearch } from '@/hooks/use-active-ingredient-search'
import { weekdayLetter } from '@/lib/dashboard'
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
import { CalendarDays, Check, Clock, Info, Loader2, Pill, Plus, Repeat, Zap } from 'lucide-react'

interface OccasionalIntakeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const nowHHMM = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

const todayDate = () => {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type MedMode = 'esporadica' | 'recorrente'

/**
 * "Adicionar Medicação" no painel Hoje:
 * - Esporádica (padrão): toma pontual com DATA + horário — data editável, pode
 *   ser retroativa (pré-preenchida com hoje). Cria medicação routine 'once'
 *   (reutilizando a de mesmo nome) e grava a toma como health_metrics
 *   'remedio' com notes "pontual".
 * - Recorrente: dias da semana (multi-seleção) + horário(s) — cria a medicação
 *   com rotina diária (todos os dias) ou semanal (dias escolhidos), para aparecer
 *   na grade semanal de controle do painel Hoje.
 * Ambos os modos usam o buscador de princípio ativo da ANVISA.
 */
export function OccasionalIntakeDialog({
  open,
  onOpenChange,
  onSaved,
}: OccasionalIntakeDialogProps) {
  const [mode, setMode] = useState<MedMode>('esporadica')
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [date, setDate] = useState(todayDate)
  const [time, setTime] = useState(nowHHMM())
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [times, setTimes] = useState<string[]>(['08:00'])
  const [activeIngredient, setActiveIngredient] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [saving, setSaving] = useState(false)

  const { results, loading: searching, failed, source } = useActiveIngredientSearch(name)

  // reabrir o diálogo volta ao estado inicial (Esporádica)
  useEffect(() => {
    if (open) {
      setMode('esporadica')
      setName('')
      setDosage('')
      setDate(todayDate())
      setTime(nowHHMM())
      setWeekdays([])
      setTimes(['08:00'])
      setActiveIngredient('')
      setShowSuggestions(true)
    }
  }, [open])

  const reset = () => {
    setName('')
    setDosage('')
    setDate(todayDate())
    setTime(nowHHMM())
    setWeekdays([])
    setTimes(['08:00'])
    setActiveIngredient('')
    setShowSuggestions(true)
  }

  const toggleWeekday = (d: number) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))

  const updateTime = (index: number, value: string) =>
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)))

  const removeTime = (index: number) =>
    setTimes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const canSave =
    name.trim().length > 0 &&
    (mode === 'esporadica'
      ? DATE_RE.test(date) && TIME_RE.test(time.trim())
      : weekdays.length > 0 && times.some((t) => TIME_RE.test(t.trim())))

  const handleSave = async () => {
    if (!canSave) {
      toast.error(
        mode === 'esporadica'
          ? 'Informe o nome do remédio, a data e um horário válido (HH:MM)'
          : 'Informe o nome, pelo menos um dia da semana e um horário válido (HH:MM)',
      )
      return
    }
    setSaving(true)
    try {
      if (mode === 'esporadica') {
        await medicationService.createOccasionalIntake({
          name: name.trim(),
          active_ingredient: activeIngredient.trim(),
          dosage: dosage.trim(),
          date: date.trim(),
          time: time.trim(),
        })
        toast.success('Toma pontual registrada')
      } else {
        const cleanTimes = Array.from(new Set(times.map((t) => t.trim())))
          .filter((t) => TIME_RE.test(t))
          .sort()
        await medicationService.create({
          name: name.trim(),
          active_ingredient: activeIngredient.trim(),
          dosage: dosage.trim(),
          routine: weekdays.length === 7 ? 'daily' : 'weekly',
          weekdays: weekdays.length === 7 ? [] : weekdays,
          times: cleanTimes,
        })
        toast.success('Medicação recorrente cadastrada')
      }
      reset()
      onOpenChange(false)
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível salvar a medicação')
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
            Adicionar Medicação
          </DialogTitle>
          <DialogDescription className="text-xs">
            Esporádica: toma única, com data editável (pode ser retroativa). Recorrente: entra no
            controle do painel nos dias escolhidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alternador Esporádica / Recorrente */}
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-muted/40 p-1">
            <button
              type="button"
              aria-pressed={mode === 'esporadica'}
              onClick={() => setMode('esporadica')}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-colors ${
                mode === 'esporadica'
                  ? 'bg-emerald-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Zap className="h-3.5 w-3.5" /> Esporádica
            </button>
            <button
              type="button"
              aria-pressed={mode === 'recorrente'}
              onClick={() => setMode('recorrente')}
              className={`flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-colors ${
                mode === 'recorrente'
                  ? 'bg-emerald-600 text-white'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Repeat className="h-3.5 w-3.5" /> Recorrente
            </button>
          </div>

          {/* Nome + buscador de princípio ativo */}
          <div className="space-y-1">
            <Label htmlFor="add-med-name" className="text-xs">
              Nome da medicação
            </Label>
            <Input
              id="add-med-name"
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
            <Label htmlFor="add-med-ingredient" className="text-xs">
              Princípio ativo (opcional)
            </Label>
            <Input
              id="add-med-ingredient"
              value={activeIngredient}
              onChange={(e) => setActiveIngredient(e.target.value)}
              placeholder="Ex.: dipirona sódica"
              className="text-sm"
            />
          </div>

          {/* Dose */}
          <div className="space-y-1">
            <Label htmlFor="add-med-dosage" className="text-xs">
              Dose
            </Label>
            <Input
              id="add-med-dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Ex.: 500 mg"
              className="text-sm"
            />
          </div>

          {mode === 'esporadica' ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="add-med-date" className="text-xs">
                  <CalendarDays className="h-3.5 w-3.5 inline mr-1 -mt-0.5 text-emerald-600" />
                  Data da toma
                </Label>
                <Input
                  id="add-med-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-sm w-full"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-med-time" className="text-xs">
                  Horário da toma
                </Label>
                <Input
                  id="add-med-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="text-sm w-full"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Dias da semana</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const active = weekdays.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleWeekday(d)}
                        className={`h-8 w-10 rounded-md border text-xs font-medium transition-colors ${
                          active
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-background border-input text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {weekdayLetter(d)}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Horários das tomas
                </Label>
                {times.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={t}
                      onChange={(e) => updateTime(i, e.target.value)}
                      className="text-sm w-36"
                      aria-label={`Horário ${i + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      disabled={times.length === 1}
                      onClick={() => removeTime(i)}
                      aria-label={`Remover horário ${i + 1}`}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-emerald-700"
                  onClick={() => setTimes((prev) => [...prev, '08:00'])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar horário
                </Button>
              </div>
            </>
          )}
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
            {mode === 'esporadica' ? 'Registrar' : 'Salvar medicação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
