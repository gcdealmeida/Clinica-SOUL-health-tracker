import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  Lightbulb,
  Database,
  GitCompareArrows,
  TrendingUp,
  Sparkles,
  Info,
  Loader2,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { aiAnalysisService } from '@/services/mealsAndAi'
import type { HealthMetric, EmotionalLog } from '@/types'

/**
 * Página Insights (estilo Guava).
 * - Seção explicativa com o texto do usuário (as 3 etapas + IA).
 * - Correlações REAIS: escolhe 2+ variáveis dos dados do próprio usuário,
 *   calcula Pearson sobre séries diárias alinhadas por dia e plota dispersão.
 * - "Análise com IA": envia resumos das séries ao hook pb_hooks
 *   (POST /backend/v1/ai/analyze-correlations) para interpretação em português.
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
  'Correlação medida pelo coeficiente de Pearson (−1 a +1) sobre os dias em que as duas variáveis têm registro. Correlação NÃO é causalidade: um padrão estatístico não prova que uma variável causa a outra.'

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
      className: 'text-emerald-700 dark:text-emerald-400 font-semibold',
    }
  if (a >= 0.4)
    return {
      label: 'correlação moderada',
      className: 'text-amber-700 dark:text-amber-400 font-semibold',
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar currentTab="insights" />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
              Insights
            </h1>
            <p className="text-xs text-muted-foreground">
              Descubra correlações, tendências e padrões ocultos sobre a sua saúde
            </p>
          </div>
        </div>

        {/* Seção explicativa — texto do usuário */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/60 via-card to-teal-50/40 dark:from-emerald-950/20 dark:to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              O que esta página faz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-foreground/90 leading-relaxed">
            <p>
              Ajudar você — especialmente se convive com condições médicas complexas ou crônicas — a
              descobrir correlações, tendências e padrões ocultos sobre a própria saúde ao longo do
              tempo, cruzando dados de diferentes áreas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="rounded-xl border bg-card p-3 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Database className="h-3.5 w-3.5 text-emerald-600" />
                  1. Centralização de Dados
                </div>
                <p className="text-muted-foreground">
                  Sintomas diários e intensidade de dores; humor, energia e saúde mental;
                  medicamentos; sono, alimentação, atividade física, ciclo menstrual e clima.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600" />
                  2. Cruzamento de Informações via Algoritmos
                </div>
                <p className="text-muted-foreground">
                  Ex.: pico de dor após noites de sono ruins; sintoma diminui quando você toma a
                  medicação corretamente.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-3 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  3. Geração de Tendências Visuais
                </div>
                <p className="text-muted-foreground">
                  Gráficos e relatórios que revelam gatilhos e a eficácia de tratamentos — responder
                  perguntas como "Será que o meu cansaço está associado à queda de temperatura?" ou
                  "Esse novo remédio realmente reduziu minhas crises no último mês?".
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
                <b>Além disso, com IA:</b> resumir anotações médicas complexas e traduzir termos
                difíceis, permitindo entender exames de forma simples e levar relatórios claros às
                consultas — veja a seção{' '}
                <Link to="/exames-dietas" className="underline font-semibold">
                  Entenda seus exames
                </Link>{' '}
                abaixo.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Correlações */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-emerald-600" />
              Correlações
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Escolha 2 variáveis dos seus dados reais e um período: o app calcula a correlação
              estatística (Pearson, séries diárias alinhadas por dia) e mostra o gráfico.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : availableVars.length < 2 ? (
              <div className="rounded-xl border border-dashed p-4 bg-muted/20 text-xs text-muted-foreground space-y-2">
                <p>
                  Você ainda não tem registros suficientes em pelo menos duas variáveis neste
                  período. Registre métricas em{' '}
                  <Link to="/registrar" className="text-emerald-600 font-semibold hover:underline">
                    Registrar
                  </Link>{' '}
                  ou faça check-ins no{' '}
                  <Link
                    to="/diario-emocional"
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Diário Emocional
                  </Link>{' '}
                  para desbloquear os cruzamentos.
                </p>
              </div>
            ) : (
              <>
                {/* Seletores */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
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
                    <span className="text-[11px] font-medium text-muted-foreground">
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
                    <span className="text-[11px] font-medium text-muted-foreground">Período</span>
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
                        Number.isNaN(correlation.r) || Math.abs(correlation.r) < 0.2
                          ? 'border-border bg-muted/20'
                          : correlation.r > 0
                            ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20'
                            : 'border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-foreground">
                          {correlation.labelA} × {correlation.labelB}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-background/70 border-border"
                        >
                          {correlation.pairs} dias em comum
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/90">
                        {friendlyInterpretation(
                          correlation.labelA,
                          correlation.labelB,
                          correlation.r,
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{AVAILABILITY_NOTE}</p>
                    </div>

                    {/* Gráfico: linha dupla normalizada + dispersão */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="rounded-xl border p-3">
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                                  stroke="#059669"
                                  dot={false}
                                  strokeWidth={2}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="b"
                                  name={correlation.labelB}
                                  stroke="#7c3aed"
                                  dot={false}
                                  strokeWidth={2}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                      <div className="rounded-xl border p-3">
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
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
                                  fill="#059669"
                                  dot={{ r: 3, fill: '#059669' }}
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
                      className="rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-3 space-y-2"
                      ref={aiAnchorRef}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-violet-600" />
                          <span className="text-xs font-semibold text-foreground">
                            Análise com IA
                          </span>
                        </div>
                        <Button
                          size="sm"
                          disabled={aiLoading || !selectedA || !selectedB}
                          onClick={handleAiAnalysis}
                          className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                        >
                          {aiLoading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              Analisando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5 mr-1" />
                              Analisar cruzamento
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Envia os resumos das séries escolhidas ao assistente da Clínica Soul, que
                        devolve uma interpretação em português dos cruzamentos — sempre com o aviso
                        de que correlação não é causalidade.
                      </p>
                      {aiLoading && <Skeleton className="h-20 w-full" />}
                      {aiText && !aiLoading && (
                        <div className="rounded-lg bg-card border p-3 text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Entenda seus exames
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              IA para resumir anotações médicas complexas e traduzir termos difíceis — entenda seus
              exames de forma simples e leve relatórios claros às consultas.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-dashed p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                A leitura por IA dos seus exames (PDF ou foto) acontece na página Exames & Dietas —
                os resumos em linguagem simples ficam salvos lá e entram na linha do tempo de
                Records.
              </p>
              <Button
                size="sm"
                asChild
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
              >
                <Link to="/exames-dietas">Abrir Exames & Dietas</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
