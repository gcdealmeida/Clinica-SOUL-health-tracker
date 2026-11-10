import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowLeftRight, Lightbulb, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { healthService } from '@/services/health'
import {
  chartSeries,
  coOccurrences,
  extractSymptomDetail,
  hourBandCounts,
  trackedSymptomDays,
  trendForWindow,
  weeklyChart,
  weekdayCounts,
  yearCounts,
  type ChartMode,
  type ChartScope,
} from '@/lib/symptomDetail'
import { symptomGroupOf } from '@/lib/symptomCatalog'
import { relativeWhen } from '@/lib/dashboard'
import { todayStr } from '@/lib/localDate'
import { cn } from '@/lib/utils'
import type { HealthMetric } from '@/types'

interface SymptomDetailPanelProps {
  symptomKey: string // nome normalizado do sintoma
  metrics?: HealthMetric[]
  onCompare?: (name: string) => void
  onBack: () => void
}

type TrendPeriod = 7 | 28 | 30 | 90
type ChartWindow = 14 | 30

const TREND_PERIODS: Array<{ id: TrendPeriod; label: string }> = [
  { id: 7, label: '7D' },
  { id: 28, label: '28D' },
  { id: 30, label: '1 mês' },
  { id: 90, label: '90D' },
]

const CHART_WINDOWS: Array<{ id: ChartWindow; label: string }> = [
  { id: 14, label: '2 semanas' },
  { id: 30, label: '1 mês' },
]

/** Barras horizontais simples com rótulo à esquerda e valor à direita. */
function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-[10px] text-muted-foreground shrink-0 truncate">{label}</span>
      <div className="flex-1 h-4 rounded bg-muted/60 overflow-hidden">
        <div className="h-full rounded bg-emerald-500/80" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-[10px] text-muted-foreground shrink-0">
        {count} {count === 1 ? 'vez' : 'vezes'}
      </span>
    </div>
  )
}

/**
 * Painel de detalhe de um sintoma (2º nível do diálogo "Todos Sintomas"),
 * no estilo Guava: registros, tendências, gráficos, dias da semana, anos,
 * horas do dia e coocorrência com outros sintomas.
 */
export function SymptomDetailPanel({
  symptomKey,
  metrics,
  onCompare,
  onBack,
}: SymptomDetailPanelProps) {
  const [tab, setTab] = useState<'entries' | 'trends'>('entries')
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(7)
  const [chartWindow, setChartWindow] = useState<ChartWindow>(14)
  const [chartMode, setChartMode] = useState<ChartMode>('frequency')
  const [chartScope, setChartScope] = useState<ChartScope>('weekly')
  const [remoteMetrics, setRemoteMetrics] = useState<HealthMetric[] | null>(null)
  const [loading, setLoading] = useState(false)

  // Busca os registros reais pela mesma fonte/paginação da lista "Todos Sintomas".
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    healthService
      .listAllSymptomMetrics()
      .then((rows) => {
        if (!cancelled) setRemoteMetrics(rows)
      })
      .catch((err) => console.error('Erro ao carregar registros do sintoma:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [symptomKey])

  const source = remoteMetrics ?? metrics ?? []
  const stats = useMemo(() => extractSymptomDetail(source, symptomKey), [source, symptomKey])

  const trend = useMemo(
    () => (stats ? trendForWindow(stats, trendPeriod) : null),
    [stats, trendPeriod],
  )

  const chart = useMemo(() => {
    if (!stats) return null
    const { weeks } = weeklyChart(stats, chartWindow)
    const fmt = (ds: string) => {
      const [y, m, d] = ds.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    }
    const first = weeks[0]
    return {
      weeks,
      series: chartSeries(stats, weeks, chartMode, chartScope),
      rangeLabel: first ? `${fmt(first.start)} - ${fmt(todayStr())}` : '',
    }
  }, [stats, chartWindow, chartMode, chartScope])

  const weekdays = useMemo(() => (stats ? weekdayCounts(stats) : []), [stats])
  const years = useMemo(() => (stats ? yearCounts(stats) : []), [stats])
  const hours = useMemo(() => (stats ? hourBandCounts(stats) : []), [stats])
  const co = useMemo(() => coOccurrences(source, symptomKey), [source, symptomKey])
  const trackedDays = useMemo(() => trackedSymptomDays(source), [source])
  const maxHour = Math.max(1, ...hours.map((h) => h.count))
  const maxDow = Math.max(1, ...weekdays.map((d) => d.count))
  const maxCo = Math.max(1, ...co.map((c) => c.count))

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-xs text-muted-foreground text-center">
          {loading ? 'Carregando registros…' : 'Nenhum registro encontrado para este sintoma.'}
        </p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Voltar
        </Button>
      </div>
    )
  }

  const group = symptomGroupOf(stats.name)
  const lastRelative = relativeWhen(stats.lastDateTime)
  const weeklyMax = chartScope === 'weekly' ? 7 : 10
  const chartMax = Math.max(1, ...(chart?.series.map((s) => s.value) ?? [1]))

  return (
    <div className="flex flex-col min-h-0 -mt-9">
      {/* Cabeçalho */}
      <div className="pb-3 border-b border-border/60">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <DialogTitle className="text-base leading-tight flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: group.color }}
                aria-hidden
              />
              <span className="truncate">{stats.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              Última: {lastRelative || 'sem registro'} • {stats.entries.length}{' '}
              {stats.entries.length === 1 ? 'registro' : 'registros'}
            </DialogDescription>
          </div>
          {onCompare && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] shrink-0"
              onClick={() => onCompare(stats.name)}
            >
              <ArrowLeftRight className="h-3 w-3 mr-1" />
              Comparar
            </Button>
          )}
        </div>
      </div>

      {/* Abas */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'entries' | 'trends')} className="mt-2">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="entries" className="text-xs">
            Registros
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">
            Tendências
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex-1 min-h-0 overflow-y-auto mt-3 pr-0.5">
        {/* ---- Registros ---- */}
        {tab === 'entries' && (
          <ul className="divide-y divide-border/60">
            {stats.entries.map((e) => (
              <li key={e.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {e.day.split('-').reverse().join('/')}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.time}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  severidade <span className="font-semibold text-foreground">{e.severity}/10</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* ---- Tendências ---- */}
        {tab === 'trends' && (
          <div className="space-y-4 pb-2">
            {/* Tendências */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold">Tendências</h4>
                <div className="flex gap-1">
                  {TREND_PERIODS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTrendPeriod(p.id)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full transition-colors',
                        trendPeriod === p.id
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">Nº de dias</p>
                  <p className="text-lg font-bold leading-tight">{trend?.days ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {trend ? `${trend.dayPct}% do período` : '—'}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] text-muted-foreground">Severidade</p>
                  <p className="text-lg font-bold leading-tight">
                    {(trend?.avgSeverity ?? 0).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">média /10 no período</p>
                </div>
              </div>
            </section>

            {/* Gráficos */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold">Gráficos</h4>
                <div className="flex gap-1">
                  {CHART_WINDOWS.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setChartWindow(w.id)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full transition-colors',
                        chartWindow === w.id
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70',
                      )}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 mb-2">
                {(
                  [
                    ['frequency', 'Frequência'],
                    ['severity', 'Severidade'],
                    ['weekly', 'Semanal'],
                    ['total', 'Total'],
                  ] as Array<[ChartMode | ChartScope, string]>
                ).map(([value, label]) => {
                  const active =
                    value === 'frequency' || value === 'severity'
                      ? chartMode === value
                      : chartScope === value
                  const onClick = () => {
                    if (value === 'frequency' || value === 'severity') setChartMode(value)
                    else setChartScope(value)
                  }
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={onClick}
                      className={cn(
                        'flex-1 text-[10px] px-1.5 py-1 rounded-md border transition-colors',
                        active
                          ? 'bg-emerald-600 border-emerald-600 text-white font-semibold'
                          : 'bg-card text-muted-foreground hover:bg-muted/50',
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-medium">
                  {chartMode === 'frequency' ? 'Dias com registro' : 'Severidade'} por{' '}
                  {chartScope === 'weekly' ? 'semana' : 'dia'}
                </p>
                <p className="text-[10px] text-muted-foreground mb-2">{chart?.rangeLabel}</p>
                <div className="flex items-end gap-1 h-24">
                  {chart?.series.map((d, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-end h-full flex-1 min-w-[6px]"
                    >
                      <span className="text-[8px] text-muted-foreground mb-0.5">
                        {d.value || ''}
                      </span>
                      <div
                        className={cn(
                          'w-full rounded-t',
                          chartScope === 'weekly' ? 'bg-emerald-500/80' : 'bg-emerald-600/60',
                        )}
                        style={{
                          height: `${d.value > 0 ? Math.max(6, Math.round((d.value / chartMax) * 100)) : 2}%`,
                        }}
                        title={`${d.label}: ${d.value}`}
                      />
                      {chartScope === 'weekly' && (
                        <span className="text-[7px] text-muted-foreground/70">/{weeklyMax}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Dias da semana */}
            <section>
              <h4 className="text-xs font-semibold mb-2">Dias da semana</h4>
              <div className="rounded-lg border bg-card p-3 space-y-1.5">
                {weekdays.map((d) => (
                  <BarRow key={d.dow} label={d.label} count={d.count} max={maxDow} />
                ))}
              </div>
            </section>

            {/* Anos */}
            <section>
              <h4 className="text-xs font-semibold mb-2">Anos</h4>
              <div className="rounded-lg border bg-card p-3 space-y-1.5">
                {years.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem registros.</p>
                ) : (
                  years.map((y) => {
                    const max = Math.max(1, ...years.map((x) => x.count))
                    return <BarRow key={y.year} label={y.year} count={y.count} max={max} />
                  })
                )}
              </div>
            </section>

            {/* Horas do dia */}
            <section>
              <h4 className="text-xs font-semibold mb-2">Horas do dia</h4>
              <div className="rounded-lg border bg-card p-3 space-y-1.5">
                {hours.map((h) => (
                  <BarRow key={h.label} label={h.label} count={h.count} max={maxHour} />
                ))}
              </div>
            </section>

            {/* Ocorre com frequência */}
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <h4 className="text-xs font-semibold">Ocorre com frequência</h4>
              </div>
              {trackedDays < 14 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3 mb-2">
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Para melhores insights, registre sintomas por pelo menos 14 dias —{' '}
                    <span className="font-semibold">{trackedDays}/14 dias</span>
                  </p>
                </div>
              )}
              <div className="rounded-lg border bg-card p-3">
                {co.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum outro sintoma registrado nos mesmos dias ainda.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {co.map((c) => (
                      <BarRow
                        key={c.name}
                        label={c.name.length > 14 ? `${c.name.slice(0, 13)}…` : c.name}
                        count={c.count}
                        max={maxCo}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {loading && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          Atualizando…
        </p>
      )}
    </div>
  )
}
