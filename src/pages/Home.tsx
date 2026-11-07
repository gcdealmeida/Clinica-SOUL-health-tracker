import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService } from '@/services/health'
import { emotionalService } from '@/services/emotional'
import { mealService } from '@/services/mealsAndAi'
import { medicalService } from '@/services/medical'
import { medicationService, type Medication } from '@/services/medications'
import { buildPlannedMedRows, buildOnceMedRows, buildOrphanOnceRows } from '@/lib/medicationRows'
import { OccasionalIntakeDialog } from '@/components/OccasionalIntakeDialog'
import { TakeIntakeDialog } from '@/components/TakeIntakeDialog'
import { loadDashboardPreferences, saveDashboardPreferences } from '@/services/preferences'
import { HealthMetric, EmotionalLog, Meal, MedicalRecord } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { toast } from 'sonner'
import {
  Plus,
  ArrowUp,
  ArrowDown,
  X,
  Pencil,
  UtensilsCrossed,
  Smile,
  Droplets,
  Coffee,
  ClipboardList,
  AlertTriangle,
  Pill,
} from 'lucide-react'
import {
  buildMetricCards,
  buildDayStrip,
  buildMedRows,
  buildSymptomRows,
  weekEmotionalSummary,
  lastWeekDays,
  METRIC_CARDS,
  MetricCardData,
  DayStripData,
} from '@/lib/dashboard'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [medRecords, setMedRecords] = useState<MedicalRecord[]>([])
  const [plannedMeds, setPlannedMeds] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [onceOpen, setOnceOpen] = useState(false)
  const [takeOpen, setTakeOpen] = useState(false)

  // Preferência de métricas (cards customizáveis)
  const [visibleCards, setVisibleCards] = useState<string[]>([])
  const [editingCards, setEditingCards] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)

  // Alternador de janela dos sintomas (7/28/90 dias)
  const [symptomWindow, setSymptomWindow] = useState<7 | 28 | 90>(7)

  useEffect(() => {
    if (!user) return
    loadAll()
  }, [user])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [metricList, eList, mealList, medList, plannedList, prefs] = await Promise.all([
        healthService.listUserMetrics(undefined, 200),
        emotionalService.listLogs(undefined, 30),
        mealService.listMeals(undefined),
        medicalService.listMedicalRecords(undefined),
        medicationService.list(),
        loadDashboardPreferences(),
      ])
      setMetrics(metricList)
      setEmotionalLogs(eList)
      setMeals(mealList)
      setMedRecords(medList)
      setPlannedMeds(plannedList)
      setVisibleCards(prefs.metrics)
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  // ----- Derivações -----
  const cards = useMemo(() => buildMetricCards(visibleCards, metrics), [visibleCards, metrics])
  const dayStrip = useMemo<DayStripData>(
    () =>
      buildDayStrip(
        metrics.filter((m) => (m.date_time || '').slice(0, 10) === today),
        meals.filter((m) => (m.date_time || '').slice(0, 10) === today),
        emotionalLogs.filter((l) => (l.date || '').slice(0, 10) === today),
      ),
    [metrics, meals, emotionalLogs, today],
  )
  const remedyMetrics = useMemo(() => metrics.filter((m) => m.category === 'remedio'), [metrics])
  const medRows = useMemo(
    () => [
      ...buildPlannedMedRows(plannedMeds, remedyMetrics),
      ...buildOnceMedRows(plannedMeds, remedyMetrics),
      ...buildOrphanOnceRows(plannedMeds, remedyMetrics),
      ...buildMedRows(
        medRecords.filter((r) => r.type === 'medicamento_continuo'),
        remedyMetrics,
      ),
    ],
    [plannedMeds, medRecords, remedyMetrics],
  )
  const symptomRows = useMemo(
    () => buildSymptomRows(metrics, symptomWindow),
    [metrics, symptomWindow],
  )
  const weekDays = useMemo(() => lastWeekDays(), [])
  const emoSummary = useMemo(() => weekEmotionalSummary(emotionalLogs), [emotionalLogs])
  const todayDiary = emotionalLogs.find((l) => (l.date || '').slice(0, 10) === today)

  // ----- Customização dos cards -----
  const moveCard = (id: string, dir: -1 | 1) => {
    setVisibleCards((prev) => {
      const idx = prev.indexOf(id)
      const next = [...prev]
      const target = idx + dir
      if (idx < 0 || target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  const removeCard = (id: string) => setVisibleCards((prev) => prev.filter((c) => c !== id))

  const addCard = (id: string) =>
    setVisibleCards((prev) => (prev.includes(id) ? prev : [...prev, id]))

  const persistCards = async (order: string[]) => {
    setSavingOrder(true)
    try {
      await saveDashboardPreferences({ metrics: order })
      toast.success('Preferências do painel salvas')
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível salvar as preferências')
    } finally {
      setSavingOrder(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-5">
        {/* Cabeçalho compacto */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Olá, {user?.name ? user.name.split(' ')[0] : 'Cliente Soul'} 👋
            </h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {' • '}Painel Hoje
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('/refeicoes')}>
              <UtensilsCrossed className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Refeição
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/registrar')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Registrar
            </Button>
          </div>
        </div>

        {/* Faixa horizontal do dia (estilo Guava) — topo do painel */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Hoje — linha do tempo</h2>
            <div className="flex items-center gap-1.5">
              <QuickBtn
                icon={Droplets}
                label="Água"
                onClick={() => navigate('/registrar?category=agua')}
              />
              <QuickBtn
                icon={Coffee}
                label="Café"
                onClick={() => navigate('/registrar?category=cafe')}
              />
              <QuickBtn
                icon={UtensilsCrossed}
                label="Comida"
                onClick={() => navigate('/refeicoes')}
              />
              <QuickBtn
                icon={ClipboardList}
                label="Sintomas"
                onClick={() => navigate('/registrar?category=sintoma')}
              />
              <QuickBtn icon={Plus} label="Add" onClick={() => navigate('/registrar')} />
            </div>
          </div>

          <Card className="border-border/60">
            <CardContent className="p-4">
              {loading ? (
                <p className="text-xs text-muted-foreground">Carregando registros...</p>
              ) : dayStrip.segments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nada registrado ainda hoje. Use os botões acima para começar — tudo entra na linha
                  do tempo.
                </p>
              ) : (
                <DayStrip strip={dayStrip} />
              )}
            </CardContent>
          </Card>
        </section>

        {/* Cards de métricas (estilo Guava) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Métricas</h2>
            <button
              type="button"
              onClick={() => setEditingCards((v) => !v)}
              className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
            >
              {editingCards ? 'Concluir' : 'Editar'}
              <Pencil className="h-3 w-3" />
            </button>
          </div>

          {editingCards ? (
            <div className="rounded-xl border border-dashed p-3 space-y-3 bg-muted/20">
              <div className="space-y-2">
                {visibleCards.map((id, idx) => {
                  const def = METRIC_CARDS.find((c) => c.id === id)
                  if (!def) return null
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 rounded-lg bg-card border px-3 py-2"
                    >
                      <span className="text-xs font-medium flex-1">
                        {def.name}{' '}
                        <span className="text-muted-foreground text-[10px]">({def.unit})</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === 0 || savingOrder}
                        onClick={() => moveCard(id, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === visibleCards.length - 1 || savingOrder}
                        onClick={() => moveCard(id, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={savingOrder}
                        onClick={() => removeCard(id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
                {visibleCards.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma métrica selecionada — adicione abaixo.
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                  Adicionar métrica:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {METRIC_CARDS.filter((c) => !visibleCards.includes(c.id)).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => addCard(c.id)}
                      className="text-[11px] px-2.5 py-1 rounded-full border bg-card hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      + {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setEditingCards(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={savingOrder}
                  onClick={() => {
                    persistCards(visibleCards)
                    setEditingCards(false)
                  }}
                >
                  {savingOrder ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {cards.map((c) => (
                <MetricCard key={c.def.id} data={c} />
              ))}
            </div>
          )}
        </section>

        {/* Medicações + Sintomas lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Medicação Ingerida</CardTitle>
              <Link to="/medicamentos" className="text-xs text-emerald-600 hover:underline">
                Todas
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                onClick={() => setOnceOpen(true)}
              >
                <Pill className="h-3.5 w-3.5 mr-1" />
                Adicionar Medicação
              </Button>
              {medRows.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma medicação registrada nesta semana.{' '}
                  <Link to="/medicamentos" className="text-emerald-600 hover:underline">
                    Cadastrar
                  </Link>
                </p>
              )}
              {medRows.length > 0 && (
                <>
                  <div className="grid grid-cols-[1fr_repeat(7,minmax(26px,1fr))] items-center">
                    <span />
                    {weekDays.map((d, i) => (
                      <span
                        key={i}
                        className={`text-[10px] text-center ${
                          d.isToday ? 'text-emerald-700 font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        {d.letter}
                      </span>
                    ))}
                    {medRows.map((med, rowIdx) => (
                      <div
                        key={med.id}
                        className={`col-span-8 grid grid-cols-subgrid items-center py-1.5 ${
                          rowIdx > 0 ? 'border-t border-border/40' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{med.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {[med.dosage, med.times.length ? med.times.join(' · ') : '']
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        </div>
                        {med.weekDoses.map((doses, i) => (
                          <MedCell key={i} doses={doses} planned={med.weekPlanned?.[i] ?? 0} />
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      onClick={() => setTakeOpen(true)}
                    >
                      <Pill className="h-3.5 w-3.5 mr-1" />
                      Tomei medicação
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-emerald-600"
                      onClick={() => navigate('/medicamentos')}
                    >
                      Horários
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm">Sintomas</CardTitle>
                <Link
                  to="/registrar?category=sintoma"
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Registrar
                </Link>
              </div>
              <div className="flex items-center gap-1">
                {([7, 28, 90] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setSymptomWindow(w)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      symptomWindow === w
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {w === 90 ? '3 meses' : `${w} dias`}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {symptomRows.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum sintoma registrado nesta janela.
                </p>
              )}
              {symptomRows.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      severidade {s.severity}/10 • {s.count} registro{s.count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(100, s.severity * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Diário do dia + resumo da semana */}
        <Card className="border-border/60">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Smile className="h-4 w-4 text-violet-600" />
                Diário emocional
              </CardTitle>
              <CardDescription className="text-[11px]">Hoje e resumo da semana</CardDescription>
            </div>
            <Link to="/diario-emocional" className="text-xs text-violet-600 hover:underline">
              Abrir diário
            </Link>
          </CardHeader>
          <CardContent>
            {todayDiary ? (
              <div className="rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{todayDiary.mood_label}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-violet-200 text-violet-700"
                  >
                    {todayDiary.mood_score}/5
                  </Badge>
                </div>
                {todayDiary.affecting_factors && (
                  <p className="text-[11px] text-muted-foreground">
                    {todayDiary.affecting_factors}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed p-3">
                <p className="text-xs text-muted-foreground">Nenhum check-in hoje ainda.</p>
                <Button size="sm" variant="outline" onClick={() => navigate('/diario-emocional')}>
                  Fazer check-in
                </Button>
              </div>
            )}

            {emoSummary.logs.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">Semana:</span>
                <span>
                  Humor médio{' '}
                  <b className="text-foreground">
                    {emoSummary.avgMood ? emoSummary.avgMood.toFixed(1) : '--'}/5
                  </b>
                </span>
                <span>
                  Energia{' '}
                  <b className="text-foreground">
                    {emoSummary.avgEnergy ? emoSummary.avgEnergy.toFixed(1) : '--'}/5
                  </b>
                </span>
                <span>
                  Estresse{' '}
                  <b className="text-foreground">
                    {emoSummary.avgStress ? emoSummary.avgStress.toFixed(1) : '--'}/5
                  </b>
                </span>
                <span>({emoSummary.logs.length} registros)</span>
              </div>
            )}
          </CardContent>
        </Card>

        <OccasionalIntakeDialog open={onceOpen} onOpenChange={setOnceOpen} onSaved={loadAll} />
        <TakeIntakeDialog open={takeOpen} onOpenChange={setTakeOpen} onSaved={loadAll} />
      </main>
    </div>
  )
}

// ---------- Sub-componentes ----------

/**
 * Célula da grade semanal de medicações:
 * - verde = toma(s) já registrada(s) naquele dia ("1x", "2x"…)
 * - vermelho = toma planejada (rotina diária/semanal) ainda não registrada
 * - neutro = nenhum plano nem registro para o dia
 */
function MedCell({ doses, planned }: { doses: number; planned: number }) {
  const taken = doses > 0
  const isPlanned = planned > 0
  if (!taken && !isPlanned) return <span className="justify-self-center" />

  const cls = taken
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-semibold'
    : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-semibold'
  return (
    <span
      className={`justify-self-center text-[10px] min-w-5 h-5 px-0.5 flex items-center justify-center rounded-full ${cls}`}
    >
      {`${taken ? doses : planned}x`}
    </span>
  )
}

function MetricCard({ data }: { data: MetricCardData }) {
  const Icon = data.def.icon
  return (
    <div className="rounded-xl border bg-card p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon ? (
          <span
            className={`h-5 w-5 rounded-md flex items-center justify-center ${data.def.bgClass}`}
          >
            <Icon className="h-3 w-3" />
          </span>
        ) : null}
        <span className="text-[11px] font-medium text-muted-foreground truncate">
          {data.def.name}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-lg font-bold ${data.def.colorClass}`}>{data.value}</span>
        <span className="text-[10px] text-muted-foreground">{data.def.unit}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{data.when}</p>
    </div>
  )
}

/**
 * Faixa horizontal 0h→24h (estilo Guava):
 * - segmentos coloridos apenas para sono (início do dia → acordar) e hora de ir dormir
 * - ícones pequenos por categoria em ordem cronológica, sem hora visível
 * - hora aparece só no tooltip (hover/touch)
 */
function DayStrip({ strip }: { strip: DayStripData }) {
  const navigate = useNavigate()

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-1.5">
        {/* faixa com segmentos */}
        <div className="relative h-2.5 rounded-full bg-muted overflow-visible">
          <div className="absolute inset-0 flex rounded-full overflow-hidden">
            {strip.bands.map((b, i) => (
              <div
                key={i}
                className={`h-full ${b.className}`}
                style={{ width: `${Math.max(0, b.widthPct)}%` }}
                title={b.label}
              />
            ))}
          </div>

          {/* ícones cronológicos */}
          {strip.segments.map((seg) => {
            const Icon = seg.entry.icon || UtensilsCrossed
            return (
              <Tooltip key={seg.entry.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${seg.entry.title} às ${seg.entry.time}`}
                    onClick={() => {
                      if (seg.entry.id.startsWith('meal-')) navigate('/refeicoes')
                      else if (seg.entry.id.startsWith('emo-')) navigate('/diario-emocional')
                      else if (seg.entry.id.startsWith('hm-sintoma'))
                        navigate('/registrar?category=sintoma')
                      else if (seg.entry.id.startsWith('hm-remedio'))
                        navigate('/registrar?category=remedio')
                      else if (seg.entry.id.startsWith('hm-')) navigate('/registrar')
                      else navigate('/registrar')
                    }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:scale-125 hover:z-20 transition-transform"
                    style={{ left: `${seg.centerPct}%` }}
                  >
                    <Icon className={`h-3 w-3 ${seg.entry.colorClass}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <span className="font-semibold tabular-nums">{seg.entry.time}</span>
                  {' — '}
                  {seg.entry.title}
                  {seg.entry.detail ? ` (${seg.entry.detail})` : ''}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* legenda dos períodos-chave */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-200 dark:bg-indigo-900" /> Sono (até
            acordar{strip.wakeAt ? `, ${strip.wakeAt}` : ''})
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-indigo-300 dark:bg-indigo-800" /> Ir dormir
            {strip.sleepAt ? `, ${strip.sleepAt}` : ''}
          </span>
          <span className="ml-auto">Passe o mouse nos ícones para ver o horário</span>
        </div>
      </div>
    </TooltipProvider>
  )
}

function QuickBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  )
}
