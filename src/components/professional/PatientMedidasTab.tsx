import { useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { HealthMetric } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
} from 'recharts'
import {
  Droplets,
  Coffee,
  Moon,
  Activity,
  Heart,
  Scale,
  Wine,
  Wind,
  Sparkles,
  Ruler,
  Clock,
} from 'lucide-react'
import { METRIC_CARDS, MetricCardDef, relativeWhen } from '@/lib/dashboard'
import {
  PERIOD_OPTIONS,
  PeriodId,
  metricMeta,
  findCardDef,
  buildSeries,
  buildDualSeries,
  buildSleepPhaseSeries,
  recordValues,
  dayKey,
  formatValue as fmtVal,
  decimalHoursToTimeString,
} from '@/lib/metricDetail'
import { SleepPhasesBreakdown, SleepPhaseTab } from '@/components/metric/SleepPhasesBreakdown'
import {
  bmiClassify,
  bmiFrom,
  goalFor,
  refLinesFor,
  computeAllTimeStats,
  weekdayStats,
  yearStats,
  hourStats,
  bodyFatSeries,
  leanMassSeries,
  latestBloodPressure,
  RefLine,
} from '@/lib/metricReference'
import {
  AllTimeStatsBlock,
  WeekdayStatsBlock,
  YearStatsBlock,
  HourStatsBlock,
} from '@/components/metric/MetricStatsBlocks'
import { InstitucionalBadge, isFromInstitutionalApp } from './PatientExtendedTabs'

/**
 * Aba MEDIDAS do prontuário profissional — MESMO modelo visual do app do
 * cliente (painel de detalhe de métrica /metrics/:tipo estilo Guava):
 * seletor de métricas, gráfico de evolução por período, fases do sono,
 * estatísticas all-time / dia da semana / ano / hora — em MODO LEITURA
 * (a clínica visualiza, não edita por esta tela).
 */

const ICONS: Record<string, any> = {
  agua: Droplets,
  cafe: Coffee,
  sono: Moon,
  hrv: Activity,
  atividade: Activity,
  pressao: Heart,
  peso: Scale,
  glicemia: Activity,
  saturacao: Activity,
  alcool: Wine,
  meditacao: Wind,
  sauna: Sparkles,
}

type WeightTab = 'peso' | 'gordura' | 'magra'

const SLEEP_PHASE_STYLE: Record<
  string,
  { stroke: string; fill: string; unit: string; isTime: boolean }
> = {
  total: { stroke: '#4f46e5', fill: '#6366f1', unit: 'h', isTime: false },
  deep: { stroke: '#3730a3', fill: '#4f46e5', unit: 'h', isTime: false },
  rem: { stroke: '#6366f1', fill: '#818cf8', unit: 'h', isTime: false },
  awake: { stroke: '#f59e0b', fill: '#fbbf24', unit: 'h', isTime: false },
  bedtime: { stroke: '#7c3aed', fill: '#a78bfa', unit: '', isTime: true },
  wakeup: { stroke: '#0ea5e9', fill: '#38bdf8', unit: '', isTime: true },
}

const periodLabel = (id: PeriodId) =>
  PERIOD_OPTIONS.find((p) => p.id === id)?.label.toLowerCase() ?? ''

const fmtDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const fmtDateTime = (dt: string) => {
  const d = new Date((dt || '').replace(' ', 'T'))
  return isNaN(d.getTime())
    ? dt
    : d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
}

interface PatientMedidasTabProps {
  clientId: string
  metrics: HealthMetric[]
  loading: boolean
}

export function PatientMedidasTab({ clientId, metrics, loading }: PatientMedidasTabProps) {
  const [metricId, setMetricId] = useState<string | null>(null)
  const [periodId, setPeriodId] = useState<PeriodId>('1m')
  const [weightTab, setWeightTab] = useState<WeightTab>('peso')
  const [sleepPhaseTab, setSleepPhaseTab] = useState<SleepPhaseTab>('total')
  const [heightCm, setHeightCm] = useState<number | null>(null)
  const [sleepGoal, setSleepGoal] = useState(8)

  // Preferências do PACIENTE (altura p/ IMC, meta de sono) — somente leitura.
  useEffect(() => {
    let cancelled = false
    if (!clientId) return
    pb.collection('user_preferences')
      .getFirstListItem(`user = "${clientId}"`)
      .then((rec: any) => {
        if (cancelled) return
        if (typeof rec?.height_cm === 'number' && rec.height_cm > 0) setHeightCm(rec.height_cm)
        if (typeof rec?.sleep_goal_hours === 'number' && rec.sleep_goal_hours > 0)
          setSleepGoal(rec.sleep_goal_hours)
      })
      .catch(() => {
        /* paciente ainda sem preferências — usa os padrões */
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  // Métricas registradas pelo paciente que possuem card equivalente no app do cliente
  const availableDefs = useMemo(() => {
    const cats: string[] = []
    for (const m of metrics) {
      const cat = (m.category || '').toLowerCase()
      if (cat && findCardDef(cat) && !cats.includes(cat)) cats.push(cat)
    }
    const defs = cats.map((c) => findCardDef(c)!)
    return defs.sort((a, b) => METRIC_CARDS.indexOf(a) - METRIC_CARDS.indexOf(b))
  }, [metrics])

  useEffect(() => {
    if (!availableDefs.length) {
      setMetricId(null)
      return
    }
    if (!metricId || !availableDefs.some((d) => d.id === metricId)) setMetricId(availableDefs[0].id)
  }, [availableDefs, metricId])

  const def = metricId ? findCardDef(metricId) : undefined
  const meta = def ? metricMeta(def) : undefined

  const metricItems = useMemo(
    () =>
      def
        ? metrics
            .filter((m) => (m.category || '').toLowerCase() === def.id)
            .sort((a, b) => b.date_time.localeCompare(a.date_time))
        : [],
    [metrics, def],
  )

  const period = PERIOD_OPTIONS.find((p) => p.id === periodId)!
  const isSono = def?.id === 'sono'
  const isPeso = def?.id === 'peso'
  const isPressao = def?.id === 'pressao'
  const phaseStyle = SLEEP_PHASE_STYLE[sleepPhaseTab] ?? SLEEP_PHASE_STYLE.total

  const chartSeries = useMemo(
    () => (def ? buildSeries(metricItems, period, def) : []),
    [metricItems, period, def],
  )
  const dualSeries = useMemo(
    () => (def ? buildDualSeries(metricItems, period) : []),
    [metricItems, period, def],
  )
  // buildSleepPhaseSeries não aceita a fase 'total' (o gráfico da aba Total é
  // o gráfico principal, abaixo) — só calculamos a série das fases reais.
  const sleepSeries = useMemo(
    () =>
      isSono && sleepPhaseTab !== 'total'
        ? buildSleepPhaseSeries(metricItems, period, sleepPhaseTab)
        : [],
    [isSono, metricItems, period, sleepPhaseTab],
  )

  const allTime = useMemo(
    () => (def && metricItems.length ? computeAllTimeStats(metricItems, meta!) : null),
    [def, metricItems, meta],
  )
  const weekdays = useMemo(
    () => (def && metricItems.length ? weekdayStats(metricItems, meta!) : []),
    [def, metricItems, meta],
  )
  const perYear = useMemo(
    () => (def && metricItems.length ? yearStats(metricItems, meta!) : []),
    [def, metricItems, meta],
  )
  const perHour = useMemo(
    () => (def && metricItems.length ? hourStats(metricItems, meta!) : []),
    [def, metricItems, meta],
  )

  const current = metricItems[0]
  const latestDay = current ? dayKey(current.date_time) : null
  const currentVal = current ? (recordValues(current)[0] ?? null) : null
  const bp = useMemo(
    () => (isPressao ? latestBloodPressure(metricItems) : null),
    [isPressao, metricItems],
  )
  const goal = def ? goalFor(def.id) : null
  const refLines: RefLine[] = def ? refLinesFor(def.id) : []

  const fatData = useMemo(
    () => bodyFatSeries(metricItems).map((s) => ({ ...s, day: s.label })),
    [metricItems],
  )
  const leanData = useMemo(
    () => leanMassSeries(metricItems).map((s) => ({ ...s, day: s.label })),
    [metricItems],
  )
  const bmi = currentVal && heightCm ? bmiFrom(currentVal, heightCm) : null
  const bmiClass = bmi ? bmiClassify(bmi) : null

  const hasData = metricItems.length > 0

  if (loading) {
    return (
      <div className="space-y-3 mt-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (!availableDefs.length) {
    return (
      <div className="text-center py-10 text-xs text-muted-foreground border rounded-lg mt-4">
        Nenhuma medida lançada por este paciente.
      </div>
    )
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Seletor de métricas (cards compactos estilo Painel do cliente) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {availableDefs.map((d) => {
          const Icon = ICONS[d.id] ?? Activity
          const m = metricMeta(d)
          const items = metrics
            .filter((x) => (x.category || '').toLowerCase() === d.id)
            .sort((a, b) => b.date_time.localeCompare(a.date_time))
          const val = items[0] ? (recordValues(items[0])[0] ?? null) : null
          const active = metricId === d.id
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setMetricId(d.id)}
              className={`text-left rounded-xl border p-2.5 transition-colors ${
                active
                  ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/30'
                  : 'bg-card hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                <span className="text-[11px] font-semibold text-foreground truncate">{d.name}</span>
              </div>
              <p className={`text-lg font-bold ${m.color} leading-tight mt-0.5`}>
                {d.id === 'pressao'
                  ? (() => {
                      const b = latestBloodPressure(items)
                      return b ? `${b.sys}/${b.dia}` : '--'
                    })()
                  : val !== null
                    ? fmtVal(d.id, val)
                    : '--'}
              </p>
              <p className="text-[9px] text-muted-foreground">{d.unit}</p>
            </button>
          )
        })}
      </div>

      {def && meta && (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Cabeçalho: valor atual + período */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {meta.title}
                  </h3>
                  <Badge variant="outline" className="text-[9px]">
                    visualização somente leitura
                  </Badge>
                </div>
                {isPressao ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-rose-600">
                      {bp ? `${bp.sys}/${bp.dia}` : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground">mmHg</span>
                  </div>
                ) : isSono ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {currentVal !== null ? fmtVal('sono', currentVal) : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Meta: ≥ {sleepGoal}h
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl font-bold ${meta.color}`}>
                      {currentVal !== null ? fmtVal(def.id, currentVal) : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground">{meta.unit}</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {latestDay
                    ? `${latestDay === dayKey(new Date().toISOString()) ? 'hoje' : fmtDay(latestDay)} • ${relativeWhen(current?.date_time)}`
                    : 'Sem registros'}
                </p>
                {bmi !== null && bmiClass && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    IMC:{' '}
                    <span className="font-bold" style={{ color: bmiClass.color }}>
                      {bmi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ({bmiClass.label})
                    </span>
                  </p>
                )}
              </div>
              {/* Seletor de período (igual ao do cliente) */}
              <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 flex-wrap">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriodId(p.id)}
                    className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                      periodId === p.id
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fases do sono (abas estilo Guava: Total | Deep | REM | Awake | Bedtime | Wakeup) */}
            {isSono && hasData && (
              <SleepPhasesBreakdown
                items={metricItems}
                activeTab={sleepPhaseTab}
                onSelectTab={setSleepPhaseTab}
              />
            )}

            {/* Abas do peso: Peso / Gordura % / Massa Magra */}
            {isPeso && (
              <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 w-fit">
                {(
                  [
                    ['peso', 'Peso'],
                    ['gordura', 'Gordura %'],
                    ['magra', 'Massa Magra'],
                  ] as Array<[WeightTab, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setWeightTab(id)}
                    className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                      weightTab === id
                        ? 'bg-slate-600 text-white font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Gráfico principal (mesmos gráficos do painel do cliente) */}
            <div className="h-56 sm:h-64">
              {isPeso && weightTab === 'gordura' ? (
                fatData.length ? (
                  <SimpleChart
                    chart="line"
                    stroke="#b45309"
                    fill="#d97706"
                    unit="%"
                    series={fatData}
                  />
                ) : (
                  <EmptyChart text="Sem registros de gordura corporal." />
                )
              ) : isPeso && weightTab === 'magra' ? (
                leanData.length ? (
                  <SimpleChart
                    chart="line"
                    stroke="#0d9488"
                    fill="#14b8a6"
                    unit="kg"
                    series={leanData}
                  />
                ) : (
                  <EmptyChart text="Sem registros de massa magra." />
                )
              ) : isSono && sleepPhaseTab !== 'total' ? (
                <SimpleChart
                  chart="line"
                  stroke={phaseStyle.stroke}
                  fill={phaseStyle.fill}
                  unit={phaseStyle.unit}
                  series={sleepSeries}
                  isTimeMode={phaseStyle.isTime}
                />
              ) : (
                <SimpleChart
                  chart={meta.chart}
                  stroke={meta.stroke}
                  fill={meta.fill}
                  unit={meta.unit}
                  series={chartSeries}
                  dualSeries={dualSeries}
                  refLines={refLines}
                />
              )}
            </div>

            {hasData && (
              <p className="text-[10px] text-muted-foreground text-center">
                Exibindo {periodLabel(periodId)} • {metricItems.length} registro
                {metricItems.length !== 1 ? 's' : ''} no histórico
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Altura + IMC (painel do peso, somente leitura) */}
      {isPeso && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold">Altura e IMC</h3>
            </div>
            <div className="flex items-end gap-3 flex-wrap text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">Altura</p>
                <p className="font-semibold text-foreground">
                  {heightCm ? `${heightCm} cm` : 'não informada pelo paciente'}
                </p>
              </div>
              {bmi !== null && bmiClass && (
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">IMC atual</p>
                  <p className="text-lg font-bold" style={{ color: bmiClass.color }}>
                    {bmi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                    <span className="text-[11px] font-medium">({bmiClass.label})</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas all-time + dias da semana + ano + hora (iguais às do cliente) */}
      {hasData && allTime && !isSono && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Estatísticas de todo o período</h3>
            {goal && meta && (
              <span className="text-[10px] text-muted-foreground">
                {goal.label}: {fmtVal(def!.id, goal.value)} {meta.unit}
              </span>
            )}
          </div>
          <AllTimeStatsBlock stats={allTime} meta={meta!} metricId={def!.id} />
        </div>
      )}
      {hasData && !isSono && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <WeekdayStatsBlock stats={weekdays} meta={meta!} metricId={def!.id} />
          <div className="space-y-3">
            <YearStatsBlock stats={perYear} meta={meta!} metricId={def!.id} />
            {perHour.some((h) => h.value > 0) && (
              <HourStatsBlock stats={perHour} meta={meta!} metricId={def!.id} />
            )}
          </div>
        </div>
      )}

      {/* Histórico de registros da métrica selecionada (com selo App Institucional) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Registros da métrica · mais recentes primeiro
        </h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {metricItems.slice(0, 30).map((m) => (
            <div
              key={m.id}
              className="p-2 rounded-lg border bg-card flex items-center justify-between gap-2 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">
                    {isPressao
                      ? (() => {
                          const v = recordValues(m)
                          return v.length >= 2 ? `${v[0]}/${v[1]} mmHg` : m.text_value
                        })()
                      : currentVal !== null && recordValues(m)[0] !== undefined
                        ? `${fmtVal(def!.id, recordValues(m)[0])} ${m.unit || ''}`
                        : m.text_value}
                  </span>
                  {isFromInstitutionalApp(m) && <InstitucionalBadge />}
                </div>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" /> {fmtDateTime(m.date_time)}
                  {m.notes && <span className="truncate">• {m.notes}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full w-full rounded-xl border border-dashed flex items-center justify-center text-xs text-muted-foreground">
      {text}
    </div>
  )
}

/** Gráfico de evolução no padrão visual do painel de métrica do cliente. */
function SimpleChart({
  chart,
  stroke,
  fill,
  unit,
  series,
  dualSeries = [],
  isTimeMode = false,
  refLines = [],
}: {
  chart: 'line' | 'bars' | 'dualLine'
  stroke: string
  fill: string
  unit: string
  series: Array<{ label: string; value: number | null; day?: string; timeStr?: string }>
  dualSeries?: Array<{ label: string; sys: number | null; dia: number | null }>
  isTimeMode?: boolean
  refLines?: RefLine[]
}) {
  const fmt = (v: number | null | undefined) => {
    if (v === null || v === undefined || isNaN(v)) return '--'
    return isTimeMode
      ? decimalHoursToTimeString(v)
      : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  }

  if (chart === 'dualLine') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dualSeries} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
          <ReTooltip formatter={(v: any) => (typeof v === 'number' ? `${v} mmHg` : '--')} />
          {refLines.map((l) => (
            <ReferenceLine
              key={l.label}
              y={l.value}
              stroke={l.color}
              strokeDasharray="4 4"
              label={{ value: l.label, fontSize: 9, position: 'insideTopRight' }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="sys"
            stroke="#e11d48"
            strokeWidth={2}
            dot={false}
            name="Sistólica"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="dia"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
            name="Diastólica"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chart === 'bars') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} />
          <ReTooltip
            formatter={(v: any) => [`${fmt(typeof v === 'number' ? v : null)} ${unit}`, 'registro']}
          />
          {refLines.map((l) => (
            <ReferenceLine
              key={l.label}
              y={l.value}
              stroke={l.color}
              strokeDasharray="4 4"
              label={{ value: l.label, fontSize: 9, position: 'insideTopRight' }}
            />
          ))}
          <Bar dataKey="value" fill={fill} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <defs>
          <linearGradient id={`grad-${stroke.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 10 }}
          domain={isTimeMode ? [0, 24] : ['auto', 'auto']}
          tickFormatter={(v: number) => (isTimeMode ? decimalHoursToTimeString(v) : String(v))}
        />
        <ReTooltip
          formatter={(v: any, _n: any, p: any) => [
            `${fmt(typeof v === 'number' ? v : null)}${unit ? ` ${unit}` : ''}`,
            isTimeMode && p?.payload?.timeStr ? p.payload.timeStr : 'média do período',
          ]}
        />
        {refLines.map((l) => (
          <ReferenceLine
            key={l.label}
            y={l.value}
            stroke={l.color}
            strokeDasharray="4 4"
            label={{ value: l.label, fontSize: 9, position: 'insideTopRight' }}
          />
        ))}
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill={`url(#grad-${stroke.replace('#', '')})`}
          connectNulls={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
