import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Pill, Plus, Trash2, Check, Clock, Loader2, Info } from 'lucide-react'
import { medicationService, type Medication, type MedicationRoutine } from '@/services/medications'
import { useActiveIngredientSearch } from '@/hooks/use-active-ingredient-search'
import { weekdayLetter } from '@/lib/dashboard'

const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export default function MedicationsPage() {
  const navigate = useNavigate()
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Formulário
  const [name, setName] = useState('')
  const [activeIngredient, setActiveIngredient] = useState('')
  const [dosage, setDosage] = useState('')
  const [routine, setRoutine] = useState<MedicationRoutine>('daily')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [times, setTimes] = useState<string[]>(['08:00'])

  // Sugestões de princípio ativo (base da ANVISA via backend, fallback OpenFDA)
  const { results, loading: searching, failed, source } = useActiveIngredientSearch(name)
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    setShowSuggestions(results.length > 0)
  }, [results])

  useEffect(() => {
    loadList()
  }, [])

  const loadList = async () => {
    try {
      setLoading(true)
      setMedications(await medicationService.list())
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar medicações')
    } finally {
      setLoading(false)
    }
  }

  const toggleWeekday = (d: number) => {
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  const updateTime = (index: number, value: string) => {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)))
  }

  const removeTime = (index: number) => {
    setTimes((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  const resetForm = () => {
    setName('')
    setActiveIngredient('')
    setDosage('')
    setRoutine('daily')
    setWeekdays([])
    setTimes(['08:00'])
    setShowSuggestions(false)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return toast.error('Informe o nome do remédio')
    if (routine === 'weekly' && weekdays.length === 0) {
      return toast.error('Escolha pelo menos um dia da semana')
    }
    const cleanTimes = Array.from(new Set(times.map((t) => t.trim()))).filter(Boolean)
    if (cleanTimes.length === 0) return toast.error('Informe pelo menos um horário de toma')
    if (!cleanTimes.every((t) => TIME_RE.test(t))) {
      return toast.error('Horário inválido. Use o formato HH:MM')
    }

    try {
      setSaving(true)
      await medicationService.create({
        name: cleanName,
        active_ingredient: activeIngredient.trim(),
        dosage: dosage.trim(),
        routine,
        weekdays: routine === 'weekly' ? weekdays : [],
        times: cleanTimes.sort(),
      })
      toast.success('Medicação cadastrada')
      resetForm()
      await loadList()
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível salvar a medicação')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await medicationService.remove(id)
      toast.success('Medicação removida')
      await loadList()
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível remover a medicação')
    }
  }

  const routineLabel = (m: Medication) =>
    m.routine === 'daily' ? 'Todos os dias' : m.weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medicações em uso</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cadastre o remédio, a dosagem, a rotina e os horários. Ele aparece no painel Hoje.
          </p>
        </div>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-emerald-600" />
              Nova medicação
            </CardTitle>
            <CardDescription className="text-xs">
              Sugestões de princípio ativo da base da ANVISA enquanto você digita o nome.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Nome + sugestão de princípio ativo */}
              <div className="space-y-1">
                <Label htmlFor="med-name" className="text-xs">
                  Nome do remédio
                </Label>
                <Input
                  id="med-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Losartana"
                  className="text-sm"
                  autoComplete="off"
                />

                {name.trim().length >= 3 && searching && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Buscando princípio ativo...
                  </p>
                )}

                {showSuggestions && results.length > 0 && (
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

                {name.trim().length >= 3 && !searching && failed && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <Info className="h-3 w-3" /> Não foi possível consultar o princípio ativo.
                    Preencha abaixo.
                  </p>
                )}
                {name.trim().length >= 3 && !searching && !failed && results.length === 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <Info className="h-3 w-3" /> Nenhum princípio ativo encontrado. Preencha abaixo.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="med-ingredient" className="text-xs">
                  Princípio ativo (opcional)
                </Label>
                <Input
                  id="med-ingredient"
                  value={activeIngredient}
                  onChange={(e) => setActiveIngredient(e.target.value)}
                  placeholder="Ex.: losartan potassium"
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="med-dosage" className="text-xs">
                    Dosagem
                  </Label>
                  <Input
                    id="med-dosage"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="Ex.: 50 mg"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="med-routine" className="text-xs">
                    Rotina
                  </Label>
                  <select
                    id="med-routine"
                    value={routine}
                    onChange={(e) => setRoutine(e.target.value as MedicationRoutine)}
                    className="w-full text-sm h-9 rounded-md border border-input bg-background px-3 py-1"
                  >
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal (escolher dias)</option>
                  </select>
                </div>
              </div>

              {routine === 'weekly' && (
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
                          title={WEEKDAY_NAMES[d]}
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
              )}

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
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeTime(i)}
                      disabled={times.length === 1}
                      aria-label="Remover horário"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setTimes((prev) => [...prev, '12:00'])}
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar horário
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0"
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salvar medicação
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-xs text-muted-foreground">Carregando...</p>}
            {!loading && medications.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma medicação cadastrada ainda.</p>
            )}
            {medications.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{m.name}</span>
                    {m.dosage && (
                      <Badge variant="secondary" className="text-[10px]">
                        {m.dosage}
                      </Badge>
                    )}
                  </div>
                  {m.active_ingredient && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {m.active_ingredient}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {routineLabel(m)} · {m.times.join(', ')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => handleDelete(m.id)}
                  aria-label={`Remover ${m.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <div className="pt-2">
              <Button variant="link" className="text-xs p-0 h-auto" onClick={() => navigate('/')}>
                Voltar ao painel Hoje
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
