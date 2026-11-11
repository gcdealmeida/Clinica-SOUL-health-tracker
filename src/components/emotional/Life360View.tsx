import React, { useState } from 'react'
import { EmotionalLog } from '@/types'
import {
  LifeAspectKey,
  LIFE_ASPECTS,
  filterLogsByPeriod,
  computeAspectAverages,
  PeriodFilter,
} from '@/lib/emotionalDaylio'
import { AspectGaugeCard } from './AspectGaugeCard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Compass } from 'lucide-react'

interface Life360ViewProps {
  logs: EmotionalLog[]
  onOpenCheckin?: () => void
}

export const Life360View: React.FC<Life360ViewProps> = ({ logs, onOpenCheckin }) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const [selectedAspect, setSelectedAspect] = useState<LifeAspectKey | null>(null)

  const filteredLogs = filterLogsByPeriod(logs, period)
  const aspectAverages = computeAspectAverages(filteredLogs)

  const scoreByKey: Record<LifeAspectKey, number> = {} as any
  aspectAverages.forEach((item) => {
    scoreByKey[item.aspect.key] = item.score
  })

  // Radar data
  const radarData = LIFE_ASPECTS.map((aspect) => ({
    subject: aspect.title.split(' ')[0],
    fullName: aspect.title,
    score: scoreByKey[aspect.key] ?? 0,
    fullMark: 100,
  }))

  // Score global (média de todos os 11 aspectos)
  const allScores = aspectAverages.map((a) => a.score)
  const globalScore = allScores.length
    ? Math.round(allScores.reduce((acc, v) => acc + v, 0) / allScores.length)
    : 0

  // Melhor aspecto e aspecto que mais precisa de atenção
  const sortedAspects = [...aspectAverages].sort((a, b) => b.score - a.score)
  const bestAspect = sortedAspects[0]?.aspect
  const bestAspectScore = sortedAspects[0]?.score ?? 0
  const attentionAspect = sortedAspects[sortedAspects.length - 1]?.aspect
  const attentionAspectScore = sortedAspects[sortedAspects.length - 1]?.score ?? 0

  // Linha do tempo dos registros para gráfico de evolução conforme o período selecionado
  const timelineData = [...filteredLogs]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((log) => ({
      date: (log.date || '').slice(5, 10),
      fullDate: log.date || '',
      humor: (log.mood_score || 3) * 20,
      energia: (log.energy_level || 3) * 20,
      estresse: (6 - (log.stress_level || 3)) * 20, // invertido para quanto maior, melhor
      humorRaw: log.mood_score || 3,
      label: log.mood_label || 'Check-in',
    }))

  const periodLabels: Record<'day' | 'week' | 'month' | 'year', { title: string; desc: string }> = {
    day: { title: 'Hoje (Dia)', desc: 'Percepção imediata do dia atual' },
    week: { title: 'Últimos 7 dias (Semana)', desc: 'Média e equilíbrio da última semana' },
    month: { title: 'Últimos 30 dias (Mês)', desc: 'Tendência consolidada do mês' },
    year: { title: 'Último ano (Ano)', desc: 'Visão macro e consistência anual' },
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Período 360º: Diário / Semanal / Mensal / Anual */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-3xl bg-card border border-border/70 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Avaliação da Vida 360º — {periodLabels[period].title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {periodLabels[period].desc} • Baseado em {filteredLogs.length} registro(s)
              </p>
            </div>
          </div>
        </div>

        {/* Pílulas de Seleção de Período */}
        <div className="inline-flex p-1 bg-muted/60 rounded-2xl border border-border/50 self-stretch sm:self-auto justify-between">
          {(
            [
              { id: 'day', label: 'Dia' },
              { id: 'week', label: 'Semana' },
              { id: 'month', label: 'Mês' },
              { id: 'year', label: 'Ano' },
            ] as const
          ).map((p) => {
            const active = period === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Cards de Resumo & Gráfico Radar */}
      <Card className="rounded-3xl border-border/70 shadow-sm flex flex-col justify-between">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                Roda da Vida 360º (11 Aspectos)
              </CardTitle>
              <CardDescription className="text-xs">
                Distribuição de energia e dedicação nos 11 pilares
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-foreground">{globalScore}%</span>
              <span className="text-[10px] block font-semibold text-muted-foreground">
                Índice Global 360º
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="currentColor" className="text-muted/30" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'currentColor', fontSize: 11, fontWeight: 600 }}
                  className="text-foreground"
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 9 }}
                  stroke="currentColor"
                  className="text-muted-foreground/50"
                />
                <Radar
                  name="Equilíbrio"
                  dataKey="score"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 pt-3 border-t border-border/50">
            {bestAspect && (
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                  Pilar mais Forte
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-base">{bestAspect.emoji}</span>
                  <span className="text-xs font-bold text-foreground">{bestAspect.title}</span>
                  <span className="text-xs font-black text-emerald-600 ml-auto">
                    {bestAspectScore}%
                  </span>
                </div>
              </div>
            )}

            {attentionAspect && (
              <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/50">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                  Ponto de Atenção
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-base">{attentionAspect.emoji}</span>
                  <span className="text-xs font-bold text-foreground">{attentionAspect.title}</span>
                  <span className="text-xs font-black text-amber-600 ml-auto">
                    {attentionAspectScore}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução Temporal no Período (Humor, Energia e Estresse) */}
      {timelineData.length > 0 && (
        <Card className="rounded-3xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Evolução no Período ({periodLabels[period].title})
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhamento de humor, vitalidade e controle do estresse ({timelineData.length}{' '}
                  ponto{timelineData.length > 1 ? 's' : ''})
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Humor
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Energia
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" /> Estresse
                  Zen
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-muted/20"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'currentColor', fontSize: 11 }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                    stroke="currentColor"
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const item = payload[0].payload as (typeof timelineData)[0]
                      return (
                        <div className="bg-popover border border-border p-2.5 rounded-xl shadow-md text-xs space-y-1">
                          <p className="font-bold text-foreground">
                            {item.fullDate || item.date} • {item.label}
                          </p>
                          <p className="text-emerald-600 font-semibold">
                            Humor: {item.humorRaw}/5 ({item.humor}%)
                          </p>
                          <p className="text-amber-600 font-semibold">Energia: {item.energia}%</p>
                          <p className="text-violet-600 font-semibold">
                            Estresse (serenidade): {item.estresse}%
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humor"
                    name="Humor"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energia"
                    name="Energia"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#f59e0b' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="estresse"
                    name="Estresse Zen"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid com os 11 Aspectos da Vida — Cards ilustrativos carinhosos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Os 11 Aspectos da Vida 360º
            </h3>
            <p className="text-xs text-muted-foreground">
              Cada aspecto com sua medição ilustrada e descrição específica
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {periodLabels[period].title}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LIFE_ASPECTS.map((aspect) => {
            const score = scoreByKey[aspect.key] ?? 0
            return (
              <AspectGaugeCard
                key={aspect.key}
                aspect={aspect}
                score={score}
                subtext={`Média no período: ${score}% (${filteredLogs.length} registros)`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
