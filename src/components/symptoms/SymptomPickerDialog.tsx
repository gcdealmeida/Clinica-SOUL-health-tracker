import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { healthService } from '@/services/health'
import {
  SYMPTOM_CATALOG,
  SYMPTOM_GROUPS,
  normalizeSymptomName,
  type SymptomEntry,
  type SymptomGroupId,
} from '@/lib/symptomCatalog'
import { nowLocalDateTime } from '@/lib/localDate'

interface SymptomPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

interface Chosen {
  name: string
  group: SymptomGroupId | null // null = sintoma personalizado
}

/** Diálogo "+ Sintomas": busca + grupos por cor no catálogo; depois severidade e data/hora. */
export function SymptomPickerDialog({ open, onOpenChange, onSaved }: SymptomPickerDialogProps) {
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<SymptomGroupId | 'all'>('all')
  const [chosen, setChosen] = useState<Chosen | null>(null)
  const [severity, setSeverity] = useState('5')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  // Reinicia o diálogo a cada abertura
  useEffect(() => {
    if (!open) return
    setQuery('')
    setGroupFilter('all')
    setChosen(null)
    setSeverity('5')
    const [d, t] = nowLocalDateTime().split(' ')
    setDate(d)
    setTime(t)
  }, [open])

  const groupById = useMemo(() => new Map(SYMPTOM_GROUPS.map((g) => [g.id, g])), [])

  const sections = useMemo(() => {
    const q = normalizeSymptomName(query)
    const matches = SYMPTOM_CATALOG.filter(
      (e: SymptomEntry) =>
        (groupFilter === 'all' || e.group === groupFilter) &&
        (!q || normalizeSymptomName(e.name).includes(q)),
    )
    return SYMPTOM_GROUPS.map((g) => ({
      group: g,
      items: matches.filter((e) => e.group === g.id),
    })).filter((s) => s.items.length > 0)
  }, [query, groupFilter])

  const exactMatch = SYMPTOM_CATALOG.some(
    (e) => normalizeSymptomName(e.name) === normalizeSymptomName(query),
  )

  const handleSave = async () => {
    if (!chosen) return
    if (!date || !time) {
      toast.error('Informe a data e a hora do sintoma')
      return
    }
    setSaving(true)
    try {
      await healthService.createMetric({
        category: 'sintoma',
        date_time: `${date} ${time}`,
        numeric_value: Number(severity),
        text_value: chosen.name,
      })
      toast.success(`${chosen.name} registrado (severidade ${severity}/10)`)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar o sintoma')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {chosen === null ? (
          <>
            <DialogHeader className="bg-emerald-600 text-white p-4 space-y-2">
              <DialogTitle className="text-white text-base">Selecionar sintomas</DialogTitle>
              <DialogDescription className="sr-only">
                Escolha um sintoma do catálogo para registrar
              </DialogDescription>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-700" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar sintoma..."
                  className="pl-8 bg-emerald-700/40 border-emerald-500 text-white placeholder:text-emerald-100 h-9"
                />
              </div>
            </DialogHeader>

            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              <GroupChip
                active={groupFilter === 'all'}
                label="Todos"
                onClick={() => setGroupFilter('all')}
              />
              {SYMPTOM_GROUPS.map((g) => (
                <GroupChip
                  key={g.id}
                  active={groupFilter === g.id}
                  label={g.label}
                  color={g.color}
                  onClick={() => setGroupFilter(g.id)}
                />
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto pb-2 mt-2">
              {query.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => setChosen({ name: query.trim(), group: null })}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 border-b"
                >
                  <Plus2 />
                  <span className="text-sm">
                    Usar “<b>{query.trim()}</b>” como sintoma personalizado
                  </span>
                </button>
              )}
              {sections.length === 0 && !query.trim() && (
                <p className="text-xs text-muted-foreground px-4 py-6">
                  Nenhum sintoma neste grupo.
                </p>
              )}
              {sections.map((s) => (
                <div key={s.group.id}>
                  <p
                    className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: s.group.color }}
                  >
                    {s.group.label}
                  </p>
                  {s.items.map((e) => (
                    <button
                      key={e.name}
                      type="button"
                      onClick={() => setChosen({ name: e.name, group: e.group })}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/60 transition-colors"
                    >
                      <span
                        className="h-4 w-4 rounded-md shrink-0"
                        style={{ backgroundColor: groupById.get(e.group)?.color }}
                      />
                      <span className="text-sm flex-1 truncate">{e.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="bg-emerald-600 text-white p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Voltar à lista"
                  onClick={() => setChosen(null)}
                  className="p-1 rounded-md hover:bg-emerald-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <DialogTitle className="text-white text-base truncate">{chosen.name}</DialogTitle>
              </div>
              <DialogDescription className="text-emerald-100 text-xs">
                {chosen.group ? groupById.get(chosen.group)?.label : 'Personalizado'}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Severidade</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                    {severity}/10
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full accent-emerald-600 h-2 bg-muted rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 - Imperceptível</span>
                  <span>5 - Moderado</span>
                  <span>10 - Intenso</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="symptom-date">
                    Data
                  </label>
                  <Input
                    id="symptom-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="symptom-time">
                    Hora
                  </label>
                  <Input
                    id="symptom-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={saving}
                onClick={handleSave}
              >
                <Check className="h-4 w-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar sintoma'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Plus2() {
  return (
    <span className="h-4 w-4 rounded-md border border-dashed border-muted-foreground/60 flex items-center justify-center text-[11px] text-muted-foreground shrink-0">
      +
    </span>
  )
}

function GroupChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean
  label: string
  color?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
        active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-card hover:bg-muted'
      }`}
    >
      {color && !active && (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
    </button>
  )
}
