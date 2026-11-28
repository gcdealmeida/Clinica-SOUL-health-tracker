import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Lightbulb, GitCompareArrows, Sparkles, Loader2, FileText, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { aiAnalysisService } from '@/services/mealsAndAi'
import type { HealthMetric, EmotionalLog } from '@/types'

/**
 * Página Insights (estilo Guava, identidade Clínica Soul).
 * - Correlações REAIS: escolhe 2 variáveis dos dados do próprio usuário,
 *   calcula Pearson sobre séries diárias alinhadas por dia e plota dispersão.
 * - "Análise com IA": envia resumos das séries ao hook pb_hooks
 *   (POST /backend/v1/ai/analyze-correlations) para interpretação em português.
 * - Apresentação premium: gradientes dourado-cobre, ícones em círculos e
 *   botões com elevação — textos curtos de v0.0.116 preservados.
 */

// ---------- Variáveis disponíveis (derivadas dos dados reais) ----------

const VARIABLE_DEFS = [
  { id: 'sono_horas', label: 'Horas de sono', group: 'Sono & estilo' },
  { id: 'agua', label: 'Água (copos)', group: 'Sono & estilo' },
  { id: 'cafe', label: 'Café (xícaras)', group: 'Sono & estilo' },
  { id: 'alcool', label: 'Álcool (doses)', group: 'Sono & estilo' },
  { id: 'atividade', label: 'Atividade física (min)', group: 'Sono & estilo' },
  { id: 'peso', label: 'Peso (kg)', group: 'Medidas' },
  { id: 'pressao_sistolica', label: 'Pressão sistólica', group: 'Medidas' },
  { id: 'glicemia', label: 'Glicemia', group: 'Medidas' },
  { id: 'hrv', label: 'HRV', group: 'Medidas' },
  { id: 'humor', label: 'Humor (diário)', group: 'Bem-estar' },
  { id: 'energia', label: 'Energia (diário)', group: 'Bem-estar' },
  { id: 'estresse', label: 'Estresse (diário)', group: 'Bem-estar' },
] as const

type VariableId = (typeof VARIABLE_DEFS)[number]['id']

const VARIABLE_LABEL: Record<string, string> = Object.fromEntries(
  VARIABLE_DEFS.map((v) => [v.id, v.label]),
)

const PERIODS = [
  { id: '30', label: 'Últimos 30 dias' },
  { id: '60', label: 'Últimos 60 dias' },
  { id: '90', label: 'Últimos 90 dias' },
] as const

// Categorias de health_metrics mapeadas para variáveis canônicas.
// (Registrar usa 'sono', 'agua', 'cafe', 'alcool', 'atividade_fisica', 'peso',
// 'pressao_arterial', 'glicemia', 'hrv' etc. — ver RegisterMetric.tsx)
const METRIC_CATEGORY_TO_VAR: Record<string, VariableId> = {
  sono: 'sono_horas',
  horas_sono: 'sono_horas',
  agua: 'agua',
  cafe: 'cafe',
  alcool: 'alcool',
  atividade_fisica: 'atividade',
  exercicio: 'atividade',
  peso: 'peso',
  pressao: 'pressao_sistolica',
  pressao_arterial: 'pressao_sistolica',
  glicemia: 'glicemia',
  hrv: 'hrv',
}

const AVAILABILITY_NOTE =
  'Correlação não é causalidade: mostra um padrão, não prova que uma coisa causa a outra.'

// ---------- Identidade visual (Clínica Soul) ----------

// Botão de ação premium: gradiente dourado-cobre, elevação no hover e
// texto marrom-profundo da marca (contraste correto sobre o dourado).
const PREMIUM_BUTTON_CLASS =
  'border border-soul-gold-light/60 bg-gradient-to-r from-soul-gold-deep via-soul-gold to-soul-copper text-soul-brown-deep font-semibold shadow-md shadow-soul-gold/25 transition-all duration-200 hover:shadow-lg hover:shadow-soul-gold/40 hover:brightness-[1.05] hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:text-soul-brown-deep'

// Badge circular para ícones das seções (dourado com profundidade)
const ICON_BADGE_CLASS =
  'h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-soul-gold-light via-soul-gold to-soul-copper text-soul-brown-deep flex items-center justify-center shadow-md shadow-soul-gold/25'

// Faixa decorativa no topo dos cards (eco do brilho do logo)
const CARD_TOP_ACCENT_CLASS =
  'h-1 w-full bg-gradient-to-r from-soul-gold-light via-soul-gold to-soul-copper/80'

// Cores das séries nos gráficos (dourado e cobre da marca)
const CHART_GOLD = '#B98A44'
const CHART_COPPER = '#B06A52'

// ---------- Cálculo estatístico ----------

function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return NaN
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let dx2 = 0
  let dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    const dy = ys[i] - my
    num += dx * dy
    dx2 += dx * dx
    dy2 += dy * dy
  }
  const den = Math.sqrt(dx2 * dy2)
  if (den === 0) return NaN
  return num / den
}

function strengthLabel(r: number): { label: string; className: string } {
  const a = Math.abs(r)
  if (a >= 0.7)
    return {
      label: 'correlação forte',
      className: 'text-soul-gold-deep dark:text-soul-gold-light font-semibold',
    }
  if (a >= 0.4)
    return {
      label: 'correlação moderada',
      className: 'text-soul-copper dark:text-soul-copper-light font-semibold',
    }
  if (a >= 0.2) return { label: 'correlação fraca', className: 'text-muted-foreground font-medium' }
  return { label: 'praticamente nenhuma correlação', className: 'text-muted-foreground' }
}

function directionLabel(r: number): string {
  return r > 0 ? 'positiva (sobem juntas)' : 'negativa (uma sobe, a outra cai)'
}

function friendlyInterpretation(varA: string, varB: string, r: number): string {
  const s = strengthLabel(r)
  const d = directionLabel(r)
  if (Number.isNaN(r) || Math.abs(r) < 0.2) {
    return `Nos dias registrados, ${varA} e ${varB} não mostram padrão estatístico claro — ainda. Continue registrando por mais tempo.`
  }
  return `Nos dias registrados, quando ${varA} está maior, ${varB} tende a estar ${
    r > 0 ? 'maior também' : 'menor'
  } — há uma ${s.label} ${d} (r = ${r.toFixed(2)}).`
}

// ---------- Coleta de séries diárias reais ----------

type DailySeries = Record<string, number> // 'YYYY-MM-DD' -> valor

function metricSeriesFor(metrics: HealthMetric[], varId: VariableId): DailySeries {
  const out: DailySeries = {}
  for (const m of metrics) {
    const mapped = METRIC_CATEGORY_TO_VAR[m.category]
    if (mapped !== varId) continue
    const day = (m.date_time || '').slice(0, 10)
    if (!day) continue
    const v = Number(m.numeric_value)
    if (!Number.isFinite(v)) continue
    // pressão: usa a sistólica (primeiro número de "120/80")
    if (varId === 'pressao_sistolica' && !Number.isFinite(v)) continue
    out[day] = v
  }
  return out
}

function emotionalSeriesFor(logs: EmotionalLog[], varId: VariableId): DailySeries {
  const out: DailySeries = {}
  for (const l of logs) {
    const day = (l.date || '').slice(0, 10)
    if (!day) continue
    if (varId === 'humor') out[day] = Number(l.mood_score)
    else if (varId === 'energia') out[day] = Number(l.energy_level)
    else if (varId === 'estresse') out[day] = Number(l.stress_level)
  }
  return out
}

// ---------- Componente ----------

export default function InsightsPage() {
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedA, setSelectedA] = useState<string>('')
  const [selectedB, setSelectedB] = useState<string>('')
  const [periodDays, setPeriodDays] = useState<string>('60')

  const [aiLoading, setAiLoading] = useState(false)
  const [aiText, setAiText] = useState('')
  const aiAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [m, e] = await Promise.all([
          pb.collection('health_metrics').getFullList({
            filter: `user = '${pb.authStore.record?.id}'`,
            sort: '-date_time',
          }),
          pb.collection('emotional_logs').getFullList({
            filter: `user = '${pb.authStore.record?.id}'`,
            sort: '-date',
          }),
        ])
        setMetrics(m as unknown as HealthMetric[])
        setEmotionalLogs(e as unknown as EmotionalLog[])
      } catch (err) {
        console.error('Erro ao carregar dados de insights:', err)
        toast.error('Não foi possível carregar seus registros.')
      } finally {
        setLoading(false)
      }
    }
    if (pb.authStore.record?.id) load()
  }, [])

  // Variáveis que realmente têm dados no período
  const cutoff = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - Number(periodDays))
    return d.toISOString().slice(0, 10)
  }, [periodDays])

  const availableVars = useMemo(() => {
    const has = new Set<string>()
    for (const m of metrics) {
      if ((m.date_time || '').slice(0, 10) >= cutoff) {
        const v = METRIC_CATEGORY_TO_VAR[m.category]
        if (v) has.add(v)
      }
    }
    for (const l of emotionalLogs) {
      if ((l.date || '').slice(0, 10) >= cutoff) {
        has.add('humor')
        has.add('energia')
        has.add('estresse')
      }
    }
    return VARIABLE_DEFS.filter((v) => has.has(v.id))
  }, [metrics, emotionalLogs, cutoff])

  const seriesOf = (varId: string): DailySeries => {
    const isEmo = varId === 'humor' || varId === 'energia' || varId === 'estresse'
    return isEmo
      ? emotionalSeriesFor(emotionalLogs, varId)
      : metricSeriesFor(metrics, varId as VariableId)
  }

  // Alinha as duas séries por dia e calcula Pearson
  const correlation = useMemo(() => {
    if (!selectedA || !selectedB || selectedA === selectedB) return null
    const a = seriesOf(selectedA)
    const b = seriesOf(selectedB)
    const days: string[] = []
    const xs: number[] = []
    const ys: number[] = []
    for (const day of Object.keys(a)) {
      if (day < cutoff) continue
      if (b[day] !== undefined) {
        days.push(day)
        xs.push(a[day])
        ys.push(b[day])
      }
    }
    const r = pearson(xs, ys)
    const points = days
      .map((day, i) => ({ day, x: xs[i], y: ys[i] }))
      .sort((p, q) => p.day.localeCompare(q.day))
    const dualLine = points.map((p) => ({
      day: p.day.slice(8, 10) + '/' + p.day.slice(5, 7),
      a: p.x,
      b: p.y,
    }))
    return {
      days,
      r,
      points,
      dualLine,
      pairs: xs.length,
      labelA: VARIABLE_LABEL[selectedA] || selectedA,
      labelB: VARIABLE_LABEL[selectedB] || selectedB,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedA, selectedB, periodDays, metrics, emotionalLogs])

  const handleAiAnalysis = async () => {
    if (!correlation || correlation.pairs < 3) {
      toast.error('Escolha duas variáveis com pelo menos 3 dias em comum para a análise.')
      return
    }
    setAiLoading(true)
    setAiText('')
    try {
      const summarize = (series: DailySeries, label: string) => {
        const days = Object.keys(series).sort()
        const vals = days.map((d) => series[d])
        if (!vals.length) return `${label}: sem registros no período.`
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length
        return `${label}: ${vals.length} dia(s) registrado(s), média ${avg.toFixed(1)}, mínimo ${Math.min(...vals).toFixed(1)}, máximo ${Math.max(...vals).toFixed(1)} (último: ${days[days.length - 1]} = ${vals[vals.length - 1]}).`
      }
      const data = await aiAnalysisService.runCorrelationAnalysis({
        variables: [selectedA, selectedB],
        question: `Correlação de Pearson calculada pelo app: r=${Number.isNaN(correlation.r) ? 'indefinido' : correlation.r.toFixed(2)} entre ${correlation.labelA} e ${correlation.labelB} (${correlation.pairs} dias em comum, últimos ${periodDays} dias). Resumos: ${summarize(seriesOf(selectedA), correlation.labelA)} ${summarize(seriesOf(selectedB), correlation.labelB)}`,
      })
      setAiText(data.insights || 'A IA não retornou conteúdo.')
      toast.success('Análise com IA concluída')
      setTimeout(
        () => aiAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        100,
      )
    } catch (err) {
      console.error(err)
      toast.error('Falha na análise com IA. Tente novamente.')
    } finally {
      setAiLoading(false)
    }
  }

  const selectVar = (which: 'A' | 'B', value: string) => {
    if (which === 'A') {
      setSelectedA(value)
      if (value === selectedB) setSelectedB('')
    } else {
      setSelectedB(value)
      if (value === selectedA) setSelectedA('')
    }
  }

  const strength = correlation ? strengthLabel(correlation.r) : null
  const isNeutral = !correlation || Number.isNaN(correlation.r) || Math.abs(correlation.r) < 0.2

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar currentTab="insights" />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className={ICON_BADGE_CLASS}>
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="eyebrow">Clínica Soul</p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground leading-tight">
              Insights
            </h1>
            <p className="text-xs text-muted-foreground">Correlações e padrões da sua saúde</p>
          </div>
        </div>

        {/* Seção explicativa — resumida (v0.0.116) */}
        <Card className="overflow-hidden border-soul-gold/30 bg-gradient-to-r from-soul-gold/10 via-card to-soul-copper/5 dark:from-soul-gold/15 dark:to-soul-copper/10 shadow-subtle">
          <div className={CARD_TOP_ACCENT_CLASS} aria-hidden="true" />
          <CardContent className="py-3.5 flex items-center gap-3">
            <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-soul-gold-light to-soul-gold text-soul-brown-deep flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-xs text-foreground/90 leading-relaxed">
              Cruze seus dados para descobrir padrões sobre a sua saúde ao longo do tempo.
            </p>
          </CardContent>
        </Card>

        {/* Correlações */}
        <Card className="overflow-hidden border-soul-gold/25 shadow-elevation">
          <div className={CARD_TOP_ACCENT_CLASS} aria-hidden="true" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-soul-gold-light to-soul-gold text-soul-brown-deep flex items-center justify-center shadow-sm">
                <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-display text-lg sm:text-xl">Correlações</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Escolha 2 variáveis e um período para ver a correlação entre elas.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : availableVars.length < 2 ? (
              <div className="rounded-xl border border-dashed border-soul-gold/40 bg-gradient-to-br from-soul-gold/5 to-transparent p-4 bg-muted/20 text-xs text-muted-foreground space-y-2">
                <p>
                  Registre dados em duas variáveis em{' '}
                  <Link
                    to="/registrar"
                    className="text-soul-gold-deep dark:text-soul-gold-light font-semibold hover:underline"
                  >
                    Registrar
                  </Link>{' '}
                  ou no{' '}
                  <Link
                    to="/diario-emocional"
                    className="text-soul-gold-deep dark:text-soul-gold-light font-semibold hover:underline"
                  >
                    Diário Emocional
                  </Link>{' '}
                  para liberar os cruzamentos.
                </p>
              </div>
            ) : (
              <>
                {/* Seletores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-soul-gold-deep dark:text-soul-gold-light">
                      Variável 1
                    </span>
                    <Select value={selectedA} onValueChange={(v) => selectVar('A', v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Escolher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVars.map((v) => (
                          <SelectItem key={v.id} value={v.id} disabled={v.id === selectedB}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-soul-gold-deep dark:text-soul-gold-light">
                      Variável 2
                    </span>
                    <Select value={selectedB} onValueChange={(v) => selectVar('B', v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Escolher..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVars.map((v) => (
                          <SelectItem key={v.id} value={v.id} disabled={v.id === selectedA}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-soul-gold-deep dark:text-soul-gold-light">
                      Período
                    </span>
                    <Select value={periodDays} onValueChange={setPeriodDays}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resultado */}
                {correlation ? (
                  <div className="space-y-3">
                    <div
                      className={`rounded-xl border p-3 space-y-1.5 ${
                        isNeutral
                          ? 'border-border bg-muted/20'
                          : correlation.r > 0
                            ? 'border-soul-gold/40 bg-gradient-to-br from-soul-gold/10 via-card to-transparent dark:from-soul-gold/15'
                            : 'border-soul-copper/40 bg-gradient-to-br from-soul-copper/10 via-card to-transparent dark:from-soul-copper/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-foreground">
                          {correlation.labelA} × {correlation.labelB}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-background/70 border-soul-gold/40 text-soul-gold-deep dark:text-soul-gold-light"
                        >
                          {correlation.pairs} dias em comum
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/90">
                        {friendlyInterpretation(
                          correlation.labelA,
                          correlation.labelB,
                          correlation.r,
                        )}{' '}
                        {strength && !isNeutral && (
                          <span className={strength.className}>({strength.label})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{AVAILABILITY_NOTE}</p>
                    </div>

                    {/* Gráfico: linha dupla normalizada + dispersão */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-xl border border-soul-gold/20 bg-gradient-to-b from-soul-gold/5 to-transparent p-3">
                        <p className="text-[11px] font-semibold text-foreground mb-1">
                          Evolução diária (últimos {periodDays} dias)
                        </p>
                        {correlation.dualLine.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-8 text-center">
                            Sem dias em comum no período.
                          </p>
                        ) : (
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={correlation.dualLine}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <ReTooltip
                                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                  labelStyle={{ fontSize: 11 }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Line
                                  type="monotone"
                                  dataKey="a"
                                  name={correlation.labelA}
                                  stroke={CHART_GOLD}
                                  dot={false}
                                  strokeWidth={2}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="b"
                                  name={correlation.labelB}
                                  stroke={CHART_COPPER}
                                  dot={false}
                                  strokeWidth={2}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border border-soul-copper/20 bg-gradient-to-b from-soul-copper/5 to-transparent p-3">
                        <p className="text-[11px] font-semibold text-foreground mb-1">
                          Dispersão ({correlation.labelA} × {correlation.labelB})
                        </p>
                        {correlation.points.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-8 text-center">
                            Sem pares de dados.
                          </p>
                        ) : (
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={correlation.points}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                  dataKey="x"
                                  type="number"
                                  domain={['dataMin', 'dataMax']}
                                  tick={{ fontSize: 10 }}
                                  name={correlation.labelA}
                                />
                                <YAxis
                                  dataKey="y"
                                  tick={{ fontSize: 10 }}
                                  name={correlation.labelB}
                                />
                                <ReTooltip
                                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                                  labelStyle={{ fontSize: 11 }}
                                  formatter={(value: unknown) => String(value)}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="y"
                                  stroke="none"
                                  fill={CHART_COPPER}
                                  dot={{ r: 3, fill: CHART_COPPER }}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Eixo X: {correlation.labelA} • Eixo Y: {correlation.labelB}
                        </p>
                      </div>
                    </div>

                    {/* Análise com IA */}
                    <div
                      className="rounded-xl border border-soul-gold/35 bg-gradient-to-br from-soul-gold/10 via-card to-soul-copper/5 dark:from-soul-gold/15 dark:to-soul-copper/10 p-3 space-y-2 shadow-subtle"
                      ref={aiAnchorRef}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-soul-gold-light via-soul-gold to-soul-copper text-soul-brown-deep flex items-center justify-center shadow-sm">
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="text-sm font-semibold font-display text-foreground">
                            Análise com IA
                          </span>
                        </div>
                        <Button
                          size="sm"
                          disabled={aiLoading || !selectedA || !selectedB}
                          onClick={handleAiAnalysis}
                          aria-busy={aiLoading}
                          className={`h-9 px-4 text-xs ${PREMIUM_BUTTON_CLASS} ${
                            aiLoading ? 'animate-pulse motion-reduce:animate-none' : ''
                          }`}
                        >
                          {aiLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin motion-reduce:animate-none" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                              Analisar cruzamento
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        A IA da Clínica interpreta o cruzamento escolhido.
                      </p>
                      {aiLoading && <Skeleton className="h-20 w-full" />}
                      {aiText && !aiLoading && (
                        <div className="rounded-lg bg-card border border-soul-gold/25 p-3 text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
                          {aiText}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Escolha as duas variáveis acima para calcular a correlação.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Entenda seus exames — reaproveita a leitura IA existente */}
        <Card className="overflow-hidden border-soul-copper/25 shadow-elevation">
          <div
            className="h-1 w-full bg-gradient-to-r from-soul-copper/80 via-soul-gold to-soul-gold-light"
            aria-hidden="true"
          />
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2.5">
              <span className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-soul-copper-light via-soul-copper to-soul-brown text-cream flex items-center justify-center shadow-sm">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-display text-lg sm:text-xl">Entenda seus exames</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-dashed border-soul-copper/40 bg-gradient-to-br from-soul-copper/5 to-transparent p-3">
              <p className="text-xs text-muted-foreground">
                Leia seus exames com IA em Exames & Dietas.
              </p>
              <Button
                size="sm"
                asChild
                className={`h-9 px-4 text-xs shrink-0 ${PREMIUM_BUTTON_CLASS}`}
              >
                <Link to="/exames-dietas">
                  Abrir Exames & Dietas
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
