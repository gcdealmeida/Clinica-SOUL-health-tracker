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
  metricMeta,
  findCardDef,
  buildSeries,
  buildDualSeries,
  computeStats,
  weekdayAverages,
  yearlyTotals,
  recordValues,
  dayKey,
  formatValue as fmtVal,
} from '@/lib/metricDetail'

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

function tickEvery(len: number): number {
  if (len <= 8) return 1
  if (len <= 14) return 2
  if (len <= 30) return 5
  return Math.ceil(len / 8)
}

// ---------- Gráficos ----------

function MainChart({
  defId,
  chart,
  stroke,
  fill,
  unit,
  series,
  dualSeries,
}: {
  defId: string
  chart: 'line' | 'bars' | 'dualLine'
  stroke: string
  fill: string
  unit: string
  series: Array<{ label: string; value: number | null }>
  dualSeries: Array<{ label: string; sys: number | null; dia: number | null }>
}) {
  const hasDual = chart === 'dualLine'

  if (chart === 'bars') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
            formatter={(v: any) => [`${fmtVal(defId, Number(v))} ${unit}`, 'Total']}
            labelFormatter={(l) => String(l)}
          />
          <Bar dataKey="value" fill={fill} radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (hasDual) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dualSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={18}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={42}
            domain={[50, 160]}
          />
          <ReTooltip
            formatter={(v: any, name: any) => [
              `${v} mmHg`,
              name === 'sys' ? 'Sistólica' : 'Diastólica',
            ]}
            labelFormatter={(l) => String(l)}
          />
          <Line
            type="monotone"
            dataKey="sys"
            name="sys"
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="dia"
            name="dia"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
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
          formatter={(v: any) => [`${fmtVal(defId, Number(v))} ${unit}`, 'Valor']}
          labelFormatter={(l) => String(l)}
        />
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

// ---------- Blocos auxiliares ----------

function StatsCard({
  title,
  main,
  unit,
  sub,
  accent,
}: {
  title: string
  main: string
  unit?: string
  sub?: string
  accent: string
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-lg font-bold ${accent}`}>{main}</span>
          {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
        </div>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
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

export default function MetricDetailPage() {
  const { tipo = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [loading, setLoading] = useState(true)
  const [periodId, setPeriodId] = useState<PeriodId>('2s')

  const def = useMemo(() => findCardDef(tipo), [tipo])
  const meta = useMemo(() => (def ? metricMeta(def) : null), [def])

  useEffect(() => {
    if (!user || !def) return
    setLoading(true)
    healthService
      .listUserMetrics(undefined, 500, def.categories[0] as HealthCategory)
      .then((list) => setMetrics(list))
      .catch(() => toast.error('Não foi possível carregar os registros da métrica'))
      .finally(() => setLoading(false))
  }, [user, def])

  const period = PERIOD_OPTIONS.find((p) => p.id === periodId)!

  // Registros dentro da janela do período
  const inWindow = useMemo(() => {
    if (!def) return []
    const start = dayKeyOffset(todayStr(), -(period.days - 1))
    return metrics.filter((m) => dayKey(m.date_time) >= start)
  }, [metrics, period, def])

  const allTime = useMemo(
    () => (def && meta ? computeStats(metrics, meta) : null),
    [metrics, meta, def],
  )
  const rangeStats = useMemo(
    () => (def && meta ? computeStats(inWindow, meta) : null),
    [inWindow, meta, def],
  )

  const series = useMemo(
    () => (def ? buildSeries(inWindow, period, def) : []),
    [inWindow, period, def],
  )
  const dualSeries = useMemo(
    () =>
      def?.categories[0] === 'pressao'
        ? buildDualSeries(inWindow, period).map((p) => ({ ...p, value: p.sys }))
        : [],
    [inWindow, period, def],
  )
  const weekdays = useMemo(
    () => (def && meta ? weekdayAverages(metrics, meta) : []),
    [metrics, meta, def],
  )
  const perYear = useMemo(
    () => (def && meta ? yearlyTotals(metrics, meta) : []),
    [metrics, meta, def],
  )

  const isDual = def?.categories[0] === 'pressao'
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
              <h1 className="text-lg sm:text-xl font-bold truncate">{meta.title}</h1>
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
                  {meta.dailySum ? 'Hoje' : 'Registro mais recente'}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold ${def.colorClass}`}>{fmt(currentVal)}</span>
                  <span className="text-xs text-muted-foreground">{meta.unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {latestDay ? `Último registro: ${fmtDayLong(latestDay)}` : 'Sem registros'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Fonte: registro manual no app • atualizado {relativeWhen(current?.date_time)}
                </p>
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

            {/* Gráfico principal */}
            <div className="h-56 sm:h-64">
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : !hasData ? (
                <EmptyState
                  defId={def.id}
                  onRegister={() => navigate(`/registrar?category=${def.categories[0]}`)}
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

            {hasData && meta.description && (
              <p className="text-[11px] text-muted-foreground border-t pt-3 leading-relaxed">
                {meta.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas (estilo All-time Stats do Guava) */}
        {hasData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <StatsCard
              title="Máximo registrado"
              main={fmt(rangeStats?.max?.value ?? null)}
              unit={rangeStats?.max ? meta.unit : undefined}
              sub={
                rangeStats?.max
                  ? rangeStats.max.day === todayStr()
                    ? 'hoje'
                    : fmtDay(rangeStats.max.day)
                  : 'sem registros no período'
              }
              accent={def.colorClass}
            />
            <StatsCard
              title={meta.dailySum ? 'Total no período' : 'Média no período'}
              main={fmt(meta.dailySum ? (rangeStats?.total ?? null) : (rangeStats?.avg ?? null))}
              unit={meta.unit}
              sub={`${rangeStats?.count ?? 0} registros`}
              accent="text-foreground"
            />
            <StatsCard
              title="Histórico"
              main={allTime?.since ? `desde ${fmtDay(allTime.since)}` : '--'}
              sub={allTime ? `${allTime.count} registros desde o início` : 'sem registros'}
              accent="text-foreground"
            />
          </div>
        )}

        {/* Média por dia da semana + Por ano */}
        {hasData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Por dia da semana</h3>
                <div className="grid grid-cols-7 gap-1.5">
                  {weekdays.map((w) => {
                    const nums = weekdays.map((x) => x.value).filter((x): x is number => x !== null)
                    const maxWd = nums.length ? Math.max(...nums) : 0
                    const h =
                      w.value === null || maxWd <= 0
                        ? 4
                        : Math.max(4, Math.round((w.value / maxWd) * 100))
                    return (
                      <div key={w.label} className="text-center space-y-1">
                        <div className="h-20 flex items-end justify-center">
                          <div
                            className="w-full rounded-t-md"
                            style={{
                              height: `${h}%`,
                              backgroundColor: meta.fill,
                              opacity: w.value === null ? 0.15 : 0.85,
                            }}
                          />
                        </div>
                        <p className="text-[10px] font-medium">{w.label}</p>
                        <p className="text-[9px] text-muted-foreground">{fmt(w.value)}</p>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {meta.dailySum ? 'Média do total diário' : 'Média do valor registrado'} por dia da
                  semana (todos os registros)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">Por ano</h3>
                <div className="grid grid-cols-5 gap-1.5">
                  {perYear.length ? (
                    perYear.map((y) => {
                      const nums = perYear
                        .map((x) => x.value)
                        .filter((x): x is number => x !== null)
                      const maxY = nums.length ? Math.max(...nums) : 0
                      const h =
                        y.value === null || maxY <= 0
                          ? 4
                          : Math.max(4, Math.round((y.value / maxY) * 100))
                      return (
                        <div key={y.label} className="text-center space-y-1">
                          <div className="h-20 flex items-end justify-center">
                            <div
                              className="w-full rounded-t-md"
                              style={{ height: `${h}%`, backgroundColor: meta.fill, opacity: 0.85 }}
                            />
                          </div>
                          <p className="text-[10px] font-medium">{y.label}</p>
                          <p className="text-[9px] text-muted-foreground">{fmt(y.value)}</p>
                        </div>
                      )
                    })
                  ) : (
                    <p className="col-span-5 text-[11px] text-muted-foreground">
                      Sem dados suficientes para comparação anual.
                    </p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {meta.dailySum ? 'Total por ano' : 'Média por ano'} (todos os registros)
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

function dayKeyOffset(today: string, offset: number): string {
  const d = new Date(`${today}T00:00:00`)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}
