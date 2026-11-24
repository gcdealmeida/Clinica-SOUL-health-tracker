import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService } from '@/services/health'
import { HealthMetric, HealthCategory } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Droplets,
  Coffee,
  Moon,
  Activity,
  Heart,
  Scale,
  Wine,
  Wind,
  Sparkles,
  Plus,
  CalendarDays,
  Ruler,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ReferenceLine,
} from 'recharts'

import { todayStr } from '@/lib/dashboard'
import {
  PERIOD_OPTIONS,
  PeriodId,
  MetricMeta,
  metricMeta,
  findCardDef,
  buildSeries,
  buildDualSeries,
  buildSleepPhaseSeries,
  computeStats,
  recordValues,
  dayKey,
  formatValue as fmtVal,
  decimalHoursToTimeString,
} from '@/lib/metricDetail'
import {
  SleepGoalAndAdherenceBlock,
  formatHoursMins,
} from '@/components/metric/SleepGoalAndAdherence'
import { SleepPhasesBreakdown, SleepPhaseTab } from '@/components/metric/SleepPhasesBreakdown'
import {
  ReferenceNote,
  referenceNoteFor,
  lashClassify,
  bmiClassify,
  bmiFrom,
  goalFor,
  refLinesFor,
  computeAllTimeStats,
  AllTimeStats,
  weekdayStats,
  WeekdayStat,
  yearStats,
  YearStat,
  hourStats,
  HourStat,
  bodyFatSeries,
  leanMassSeries,
  hasBodyFatData,
  hasLeanMassData,
  latestBloodPressure,
} from '@/lib/metricReference'
import {
  ReferenceNoteBlock,
  AllTimeStatsBlock,
  WeekdayStatsBlock,
  YearStatsBlock,
  HourStatsBlock,
} from '@/components/metric/MetricStatsBlocks'

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
  remedio: Activity,
  sintoma: CalendarDays,
  outro: CalendarDays,
}

type WeightTab = 'peso' | 'gordura' | 'magra'

const periodLabel = (id: PeriodId) =>
  PERIOD_OPTIONS.find((p) => p.id === id)?.label.toLowerCase() ?? ''

const fmtDay = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const fmtDayLong = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
  })

function relativeWhen(dateStr?: string): string {
  if (!dateStr) return 'sem registros'
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min atrás`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h atrás`
  const days = Math.round(h / 24)
  return days === 1 ? 'ontem' : `${days}d atrás`
}

function dayKeyOffset(today: string, offset: number): string {
  const d = new Date(`${today}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

// ---------- Gráfico principal (com linhas de referência) ----------

function MainChart({
  defId,
  chart,
  stroke,
  fill,
  unit,
  series,
  dualSeries,
  isTimeMode = false,
  customTooltipFormatter,
  yDomain,
}: {
  defId: string
  chart: 'line' | 'bars' | 'dualLine'
  stroke: string
  fill: string
  unit: string
  series: Array<{ label: string; value: number | null; timeStr?: string }>
  dualSeries: Array<{ label: string; sys: number | null; dia: number | null }>
  isTimeMode?: boolean
  customTooltipFormatter?: (val: number) => string
  yDomain?: [number, number]
}) {
  const refLines = isTimeMode ? [] : refLinesFor(defId)
  const hasDual = chart === 'dualLine'
  const grid = <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
  const xAxis = (
    <XAxis
      dataKey="label"
      tick={{ fontSize: 10 }}
      interval="preserveStartEnd"
      minTickGap={18}
      tickLine={false}
      axisLine={false}
    />
  )
  const yAxis = (domain?: [number, number]) => (
    <YAxis
      tick={{ fontSize: 10 }}
      tickLine={false}
      axisLine={false}
      width={46}
      domain={domain ?? yDomain}
      tickFormatter={(v: any) => (isTimeMode ? decimalHoursToTimeString(Number(v)) : String(v))}
    />
  )
  const tooltipBars = (
    <ReTooltip
      formatter={(v: any) => [`${fmtVal(defId, Number(v))} ${unit}`, 'Total']}
      labelFormatter={(l) => String(l)}
    />
  )
  const tooltipLine = (
    <ReTooltip
      formatter={(v: any) => {
        const num = Number(v)
        if (customTooltipFormatter) {
          return [customTooltipFormatter(num), 'Valor']
        }
        if (isTimeMode) {
          return [decimalHoursToTimeString(num), 'Horário']
        }
        return [`${fmtVal(defId, num)} ${unit}`, 'Valor']
      }}
      labelFormatter={(l) => String(l)}
    />
  )
  const tooltipDual = (
    <ReTooltip
      formatter={(v: any, name: any) => [`${v} mmHg`, name === 'sys' ? 'Sistólica' : 'Diastólica']}
      labelFormatter={(l) => String(l)}
    />
  )

  if (chart === 'bars') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          {grid}
          {xAxis}
          {yAxis()}
          {tooltipBars}
          {refLines.map((rl) => (
            <ReferenceLine
              key={rl.value}
              y={rl.value}
              stroke={rl.color ?? '#94a3b8'}
              strokeDasharray={rl.dashed ? '4 3' : undefined}
              label={{ value: rl.label, position: 'insideTopRight', fontSize: 9, fill: rl.color }}
            />
          ))}
          <Bar dataKey="value" fill={fill} radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (hasDual) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dualSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          {grid}
          {xAxis}
          {yAxis([40, 170])}
          {tooltipDual}
          {refLines.map((rl) => (
            <ReferenceLine
              key={rl.value}
              y={rl.value}
              stroke={rl.color ?? '#94a3b8'}
              strokeDasharray={rl.dashed ? '4 3' : undefined}
              label={{ value: rl.label, position: 'insideTopRight', fontSize: 9, fill: rl.color }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="sys"
            name="sys"
            stroke={stroke}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="dia"
            name="dia"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
            <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {grid}
        {xAxis}
        {yAxis()}
        {tooltipLine}
        {refLines.map((rl) => (
          <ReferenceLine
            key={rl.value}
            y={rl.value}
            stroke={rl.color ?? '#94a3b8'}
            strokeDasharray={rl.dashed ? '4 3' : undefined}
            label={{ value: rl.label, position: 'insideTopRight', fontSize: 9, fill: rl.color }}
          />
        ))}
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={2}
          fill="url(#metricFill)"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ---------- Gráfico de aba do peso (gordura / massa magra) ----------

function SimpleLineChart({
  data,
  color,
  unit,
}: {
  data: Array<{ label: string; value: number | null }>
  color: string
  unit: string
}) {
  if (!data.length) {
    return (
      <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground text-center px-6">
        Sem registros com esse dado ainda. Ao registrar o peso, informe a gordura corporal (%) e a
        massa magra (kg) — opcionais — para acompanhar aqui.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="weightTabFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
          minTickGap={18}
          tickLine={false}
          axisLine={false}
        />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
        <ReTooltip
          formatter={(v: any) => [
            `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unit}`,
            'Valor',
          ]}
          labelFormatter={(l) => fmtDay(String(l))}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#weightTabFill)"
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function EmptyState({ defId, onRegister }: { defId: string; onRegister: () => void }) {
  const Icon = ICONS[defId] ?? Activity
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-2 rounded-xl border border-dashed p-6">
      <Icon className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium">Ainda sem registros desta métrica</p>
      <p className="text-xs text-muted-foreground max-w-xs">
        Registre alguns valores para acompanhar a evolução em gráficos e estatísticas.
      </p>
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
        onClick={onRegister}
      >
        Registrar primeira medida
      </Button>
    </div>
  )
}

// ---------- Página ----------

export default function MetricDetailPage() {
  const { tipo = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [periodId, setPeriodId] = useState<PeriodId>('2s')
  const [weightTab, setWeightTab] = useState<WeightTab>('peso')
  const [sleepPhaseTab, setSleepPhaseTab] = useState<SleepPhaseTab>('total')
  const [sleepGoalHours, setSleepGoalHours] = useState<number>(7)
  const [heightCm, setHeightCm] = useState<number | undefined>(undefined)
  const [heightDraft, setHeightDraft] = useState<string>('')
  const [savingHeight, setSavingHeight] = useState(false)

  const def = useMemo(() => findCardDef(tipo), [tipo])
  const meta: MetricMeta | null = useMemo(() => (def ? metricMeta(def) : null), [def])
  const note: ReferenceNote | null = useMemo(() => (def ? referenceNoteFor(def.id) : null), [def])
  const goal = useMemo(() => (def ? goalFor(def.id) : null), [def])
  const isPressao = def?.categories[0] === 'pressao'
  const isPeso = def?.categories[0] === 'peso'
  const isSono = def?.id === 'sono'
  const hasHourStats = !!meta?.dailySum

  useEffect(() => {
    if (!user || !def) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      healthService.listUserMetrics(undefined, 500, def.categories[0] as HealthCategory),
      import('@/services/preferences').then((m) => m.loadDashboardPreferences()),
    ])
      .then(([list, prefs]) => {
        if (cancelled) return
        setMetrics(list)
        setHeightCm(prefs.heightCm)
        setHeightDraft(prefs.heightCm ? String(prefs.heightCm) : '')
        if (prefs.sleepGoalHours) {
          setSleepGoalHours(prefs.sleepGoalHours)
        }
      })
      .catch(() => toast.error('Não foi possível carregar os registros da métrica'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [user, def])

  const saveHeight = async () => {
    const h = parseFloat(heightDraft.replace(',', '.'))
    if (!h || h < 50 || h > 260) {
      toast.error('Informe uma altura válida (50–260 cm)')
      return
    }
    setSavingHeight(true)
    try {
      const { saveDashboardPreferences } = await import('@/services/preferences')
      await saveDashboardPreferences({ metrics: [], heightCm: h })
      setHeightCm(h)
      toast.success('Altura salva — IMC atualizado')
    } catch (_) {
      toast.error('Não foi possível salvar a altura')
    } finally {
      setSavingHeight(false)
    }
  }

  const period = PERIOD_OPTIONS.find((p) => p.id === periodId)!

  // Registros dentro da janela do período
  const inWindow = useMemo(() => {
    if (!def) return []
    const start = dayKeyOffset(todayStr(), -(period.days - 1))
    return metrics.filter((m) => dayKey(m.date_time) >= start)
  }, [metrics, period, def])

  const allTime: AllTimeStats | null = useMemo(
    () => (def && meta ? computeAllTimeStats(metrics, meta) : null),
    [metrics, meta, def],
  )
  const rangeStats = useMemo(
    () => (def && meta ? computeStats(inWindow, meta) : null),
    [inWindow, meta, def],
  )

  const saveSleepGoal = async (newGoal: number) => {
    try {
      const { saveDashboardPreferences } = await import('@/services/preferences')
      await saveDashboardPreferences({ metrics: [], sleepGoalHours: newGoal })
      setSleepGoalHours(newGoal)
      toast.success(`Meta de sono atualizada para ${newGoal}h`)
    } catch (_) {
      toast.error('Não foi possível salvar a meta de sono')
    }
  }

  const resetSleepGoal = async () => {
    try {
      const { saveDashboardPreferences } = await import('@/services/preferences')
      await saveDashboardPreferences({ metrics: [], sleepGoalHours: 7 })
      setSleepGoalHours(7)
      toast.success('Meta de sono restaurada para 7h')
    } catch (_) {
      toast.error('Não foi possível restaurar a meta de sono')
    }
  }

  const series = useMemo(
    () => (def ? buildSeries(inWindow, period, def) : []),
    [inWindow, period, def],
  )

  // Série de gráfico adaptada para sono quando uma fase é selecionada
  const sleepSeries = useMemo(() => {
    if (!isSono) return null
    if (sleepPhaseTab === 'total') return null // usa series padrão
    return buildSleepPhaseSeries(inWindow, period, sleepPhaseTab)
  }, [isSono, sleepPhaseTab, inWindow, period])

  // Informações contextuais da fase de sono ativa para o gráfico
  const sleepPhaseInfo = useMemo(() => {
    if (!isSono || sleepPhaseTab === 'total') return null
    const map: Record<
      'deep' | 'rem' | 'awake' | 'bedtime' | 'wakeup',
      {
        label: string
        unit: string
        stroke: string
        fill: string
        isTime: boolean
        customFmt?: (v: number) => string
        domain?: [number, number]
      }
    > = {
      deep: {
        label: 'Sono Profundo (Deep)',
        unit: 'h',
        stroke: '#4338ca',
        fill: '#3730a3',
        isTime: false,
        customFmt: (v: number) => `${formatHoursMins(v)} de sono profundo`,
      },
      rem: {
        label: 'Sono REM',
        unit: 'h',
        stroke: '#0284c7',
        fill: '#0369a1',
        isTime: false,
        customFmt: (v: number) => `${formatHoursMins(v)} de sono REM`,
      },
      awake: {
        label: 'Tempo Acordado (Awake)',
        unit: 'h',
        stroke: '#d97706',
        fill: '#b45309',
        isTime: false,
        customFmt: (v: number) => `${formatHoursMins(v)} acordado`,
      },
      bedtime: {
        label: 'Hora de Deitar (Bedtime)',
        unit: '',
        stroke: '#8b5cf6',
        fill: '#7c3aed',
        isTime: true,
        customFmt: (v: number) => `Deitou às ${decimalHoursToTimeString(v)}`,
        domain: [18, 28], // permite deitar de 18h até 04h (28) ou [0, 24]
      },
      wakeup: {
        label: 'Hora de Acordar (Wakeup)',
        unit: '',
        stroke: '#059669',
        fill: '#047857',
        isTime: true,
        customFmt: (v: number) => `Acordou às ${decimalHoursToTimeString(v)}`,
        domain: [4, 14], // foco das 04h às 14h
      },
    }
    return map[sleepPhaseTab]
  }, [isSono, sleepPhaseTab])
  const dualSeries = useMemo(
    () => (isPressao ? buildDualSeries(inWindow, period) : []),
    [inWindow, period, isPressao],
  )
  const weekdays: WeekdayStat[] = useMemo(
    () => (def && meta ? weekdayStats(metrics, meta) : []),
    [metrics, meta, def],
  )
  const perYear: YearStat[] = useMemo(
    () => (def && meta ? yearStats(metrics, meta) : []),
    [metrics, meta, def],
  )
  const perHour: HourStat[] = useMemo(
    () => (def && meta ? hourStats(metrics, meta) : []),
    [metrics, meta, def],
  )

  const current = metrics[0] // lista vem ordenada por -date_time
  const latestDay = current ? dayKey(current.date_time) : null

  // Último valor agregado (cabeçalho)
  const currentVal = useMemo(() => {
    if (!def || !meta) return null
    if (meta.dailySum) {
      const today = todayStr()
      const todays = metrics.filter((m) => dayKey(m.date_time) === today)
      if (!todays.length) return null
      return todays.flatMap(recordValues).reduce((s, v) => s + v, 0)
    }
    const last = metrics.find((m) => recordValues(m).length > 0)
    const vals = last ? recordValues(last) : []
    return vals.length ? vals[0] : null
  }, [metrics, def, meta])

  // Pressão: par atual + selo LASH
  const bp = useMemo(() => (isPressao ? latestBloodPressure(metrics) : null), [isPressao, metrics])
  const bpClass = useMemo(() => (bp ? lashClassify(bp.sys, bp.dia) : null), [bp])

  // Peso: IMC + séries das abas
  const lastWeight = useMemo(
    () => metrics.find((m) => m.numeric_value && m.numeric_value > 0)?.numeric_value ?? null,
    [metrics],
  )
  const bmi = useMemo(
    () => (lastWeight && heightCm ? bmiFrom(lastWeight, heightCm) : null),
    [lastWeight, heightCm],
  )
  const bmiClass = useMemo(() => (bmi ? bmiClassify(bmi) : null), [bmi])
  const fatSeries = useMemo(() => (isPeso ? bodyFatSeries(metrics) : []), [isPeso, metrics])
  const leanSeries = useMemo(() => (isPeso ? leanMassSeries(metrics) : []), [isPeso, metrics])
  const rangeFat = useMemo(() => {
    const vals = fatSeries.map((p) => p.value).filter((v): v is number => v !== null)
    if (!vals.length) return null
    return { min: Math.min(...vals), max: Math.max(...vals) }
  }, [fatSeries])

  const hasData =
    metrics.length > 0 && (currentVal !== null || metrics.some((m) => recordValues(m).length > 0))

  if (!def || !meta) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto max-w-6xl px-4 py-10 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Card>
            <CardContent className="py-16 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Métrica não encontrada.</p>
              <Button size="sm" onClick={() => navigate('/')}>
                Voltar ao painel Hoje
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const Icon = ICONS[def.id] ?? Activity
  const fmt = (v: number | null | undefined) => fmtVal(def.id, v)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`h-9 w-9 rounded-lg flex items-center justify-center ${def.bgClass}`}>
              <Icon className={`h-5 w-5 ${def.colorClass}`} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-semibold truncate">
                {meta.title}
              </h1>
              <p className="text-xs text-muted-foreground">Acompanhamento ao longo do tempo</p>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/registrar?category=${def.categories[0]}`)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Registrar
            </Button>
          </div>
        </div>

        {/* Valor atual + seletor de período + gráfico */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] text-muted-foreground">
                  {isSono && sleepPhaseInfo
                    ? sleepPhaseInfo.label
                    : meta.dailySum
                      ? 'Total de hoje'
                      : 'Registro mais recente'}
                </p>
                {isPressao && bp ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-rose-600">
                      {bp.sys}/{bp.dia}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: bpClass?.color }}
                    >
                      {bpClass?.label}
                    </span>
                  </div>
                ) : isPeso ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-slate-600">{fmt(currentVal)}</span>
                    <span className="text-xs text-muted-foreground">{meta.unit}</span>
                    {bmi !== null && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: bmiClass?.color }}
                      >
                        IMC {bmi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} •{' '}
                        {bmiClass?.label}
                      </span>
                    )}
                  </div>
                ) : isSono && sleepPhaseTab !== 'total' ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: sleepPhaseInfo?.stroke ?? '#4f46e5' }}
                    >
                      {sleepPhaseTab === 'deep'
                        ? current?.sleep_deep_hours !== undefined
                          ? formatHoursMins(current.sleep_deep_hours)
                          : '--'
                        : sleepPhaseTab === 'rem'
                          ? current?.sleep_rem_hours !== undefined
                            ? formatHoursMins(current.sleep_rem_hours)
                            : '--'
                          : sleepPhaseTab === 'awake'
                            ? current?.sleep_awake_hours !== undefined
                              ? formatHoursMins(current.sleep_awake_hours)
                              : '--'
                            : sleepPhaseTab === 'bedtime'
                              ? current?.bedtime || '--'
                              : sleepPhaseTab === 'wakeup'
                                ? current?.wakeup || '--'
                                : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {sleepPhaseTab === 'bedtime' || sleepPhaseTab === 'wakeup'
                        ? 'horário'
                        : 'no registro recente'}
                    </span>
                  </div>
                ) : isSono ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {currentVal ? formatHoursMins(currentVal) : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Meta: ≥ {sleepGoalHours}h
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-3xl font-bold ${def.colorClass}`}>
                      {fmt(currentVal)}
                    </span>
                    <span className="text-xs text-muted-foreground">{meta.unit}</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {latestDay
                    ? `${latestDay === todayStr() ? 'hoje' : fmtDayLong(latestDay)} • registro manual no app • ${relativeWhen(current?.date_time)}`
                    : 'Sem registros'}
                </p>
                {isPeso && rangeFat && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Gordura corporal:{' '}
                    {rangeFat.min.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}–
                    {rangeFat.max.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                  </p>
                )}
              </div>
              {/* Seletor de período */}
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

            {/* Abas do sono no estilo Guava: Total | Deep | REM | Awake | Bedtime | Wakeup */}
            {isSono && hasData && (
              <SleepPhasesBreakdown
                items={metrics}
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

            {/* Gráfico principal */}
            <div className="h-56 sm:h-64">
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : !hasData ? (
                <EmptyState
                  defId={def.id}
                  onRegister={() => navigate(`/registrar?category=${def.categories[0]}`)}
                />
              ) : isPeso && weightTab === 'gordura' ? (
                <SimpleLineChart data={fatSeries} color="#b45309" unit="%" />
              ) : isPeso && weightTab === 'magra' ? (
                <SimpleLineChart data={leanSeries} color="#0d9488" unit="kg" />
              ) : isSono && sleepSeries && sleepPhaseInfo ? (
                <MainChart
                  defId={def.id}
                  chart={meta.chart}
                  stroke={sleepPhaseInfo.stroke}
                  fill={sleepPhaseInfo.fill}
                  unit={sleepPhaseInfo.unit}
                  series={sleepSeries}
                  dualSeries={[]}
                  isTimeMode={sleepPhaseInfo.isTime}
                  customTooltipFormatter={sleepPhaseInfo.customFmt}
                  yDomain={sleepPhaseInfo.domain}
                />
              ) : (
                <MainChart
                  defId={def.id}
                  chart={meta.chart}
                  stroke={meta.stroke}
                  fill={meta.fill}
                  unit={meta.unit}
                  series={series}
                  dualSeries={dualSeries}
                />
              )}
            </div>

            {hasData && (
              <p className="text-[10px] text-muted-foreground text-center">
                Exibindo {periodLabel(periodId)} • {inWindow.length} registro
                {inWindow.length !== 1 ? 's' : ''} no período
              </p>
            )}
          </CardContent>
        </Card>

        {/* Altura + IMC (painel do peso) */}
        {isPeso && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold">Altura e IMC</h3>
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="w-28">
                  <label className="text-[10px] text-muted-foreground">Altura (cm)</label>
                  <input
                    type="number"
                    min={50}
                    max={260}
                    step="any"
                    value={heightDraft}
                    onChange={(e) => setHeightDraft(e.target.value)}
                    placeholder="ex: 170"
                    className="mt-0.5 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={saveHeight} disabled={savingHeight}>
                  Salvar altura
                </Button>
                {bmi !== null && (
                  <div className="ml-auto text-right">
                    <p className="text-[10px] text-muted-foreground">Seu IMC atual</p>
                    <p className="text-lg font-bold" style={{ color: bmiClass?.color }}>
                      {bmi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                      <span className="text-[11px] font-medium">({bmiClass?.label})</span>
                    </p>
                  </div>
                )}
              </div>
              {note && <ReferenceNoteBlock note={note} />}
            </CardContent>
          </Card>
        )}

        {/* Nota de referência (demais métricas) */}
        {!isPeso && note && <ReferenceNoteBlock note={note} />}

        {/* Estatísticas All-time & Aderência à Meta de Sono (estilo Guava Sleep) */}
        {isSono && hasData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Estatísticas de Todo o Período (All-time Stats)
              </h3>
              <span className="text-[10px] text-muted-foreground">
                Baseado em {metrics.length} registro{metrics.length !== 1 ? 's' : ''}
              </span>
            </div>
            <SleepGoalAndAdherenceBlock
              items={metrics}
              goalHours={sleepGoalHours}
              onSaveGoal={saveSleepGoal}
              onResetGoal={resetSleepGoal}
            />
          </div>
        )}

        {/* Estatísticas All-time (estilo Guava - outras métricas) */}
        {!isSono && hasData && allTime && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Estatísticas de todo o período</h3>
              {goal && (
                <span className="text-[10px] text-muted-foreground">
                  {goal.label}: {fmt(goal.value)} {meta.unit}
                </span>
              )}
            </div>
            <AllTimeStatsBlock stats={allTime} meta={meta} metricId={def.id} />
          </div>
        )}

        {/* Dias da semana + Anos + Horas */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <WeekdayStatsBlock stats={weekdays} meta={meta} metricId={def.id} />
            <div className="space-y-3">
              <YearStatsBlock stats={perYear} meta={meta} metricId={def.id} />
              {hasHourStats && <HourStatsBlock stats={perHour} meta={meta} metricId={def.id} />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
