import React, { useMemo } from 'react'
import { EmotionalLog } from '@/types'
import { EmotionalScoreSummary } from '@/lib/emotionalMetrics'
import { formatDateFriendly } from '@/lib/emotionalDaylio'
import { Life360View } from '@/components/emotional/Life360View'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HeartPulse, Sparkles, Smile, Zap, Timer, BookHeart } from 'lucide-react'

/**
 * Painel próprio do Score Emocional (equivalente do PreventiveScoreCard).
 * Mesma apresentação/estrutura do painel preventivo, com a identidade da marca
 * (dourado/cobre, títulos serifados). Fonte única: computeEmotionalScore
 * (humor/energia/estresse do check-in 50% + aspectos Vida 360º 50%).
 * A apresentação detalhada (radar, evolução, 11 aspectos) reutiliza o Life360View.
 */

const COPPER = '#B06A52'

interface EmotionalScorePanelProps {
  emotionalLogs: EmotionalLog[]
  score: EmotionalScoreSummary
  onOpenDiary: () => void
}

function Ring({
  value,
  color,
  children,
}: {
  value: number
  color: string
  children: React.ReactNode
}) {
  const clamped = Math.min(1, Math.max(0, value))
  const radius = 40
  const circ = 2 * Math.PI * radius
  const dashOffset = circ - clamped * circ
  return (
    <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          className="text-soul-gold-deep/15 dark:text-soul-gold-light/15"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export const EmotionalScorePanel: React.FC<EmotionalScorePanelProps> = ({
  emotionalLogs,
  score,
  onOpenDiary,
}) => {
  const emoPct = score.hasData ? Math.round((score.score / 10) * 100) : null

  // Médias dos check-ins mais recentes (até 7, mesma janela do computeEmotionalScore)
  const dailyAverages = useMemo(() => {
    const recent = [...emotionalLogs]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 7)
    const pick = (vals: number[]) =>
      vals.length ? Math.round((vals.reduce((a, v) => a + v, 0) / vals.length) * 20) : null // 1..5 => 0..100
    return {
      humor: pick(
        recent
          .filter((l) => typeof l.mood_score === 'number' && l.mood_score > 0)
          .map((l) => l.mood_score as number),
      ),
      energia: pick(
        recent
          .filter((l) => typeof l.energy_level === 'number' && l.energy_level > 0)
          .map((l) => l.energy_level as number),
      ),
      serenidade: pick(
        recent
          .filter((l) => typeof l.stress_level === 'number' && l.stress_level > 0)
          .map((l) => 6 - (l.stress_level as number)),
      ),
    }
  }, [emotionalLogs])

  const global360 = score.aspectsAverage ?? null

  const dailyCards = [
    {
      key: 'humor',
      icon: <Smile className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      title: 'Humor',
      value: dailyAverages.humor,
      subtitle: 'Média dos últimos check-ins',
    },
    {
      key: 'energia',
      icon: <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      title: 'Energia',
      value: dailyAverages.energia,
      subtitle: 'Vitalidade sentida no dia',
    },
    {
      key: 'serenidade',
      icon: <Timer className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      title: 'Serenidade',
      value: dailyAverages.serenidade,
      subtitle: 'Quanto menos estresse, melhor',
    },
  ]

  return (
    <section
      id="emotional-score-anchor"
      aria-label="Painel do Score Emocional"
      className="scroll-mt-20 rounded-2xl border border-soul-copper/40 dark:border-soul-copper/40 bg-gradient-to-br from-soul-copper/10 via-background to-soul-gold/10 dark:from-soul-copper/15 dark:via-background dark:to-soul-gold/15 shadow-sm overflow-hidden"
    >
      <div className="p-5 sm:p-6 space-y-6">
        {/* Header do Score com Medidor */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-border/60">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-soul-copper bg-soul-copper/10 dark:bg-soul-copper/20 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Score Emocional
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Seu Bem-Estar Emocional
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Calculado a partir dos seus check-ins do Diário Emocional: humor, energia e estresse
              recentes somados ao equilíbrio dos 11 aspectos da Vida 360º.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-background/80 dark:bg-card/80 p-3.5 rounded-2xl border border-border shadow-xs">
            <Ring value={emoPct !== null ? emoPct / 100 : 0} color={score.color || COPPER}>
              <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {emoPct !== null ? `${emoPct}%` : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase">
                {score.hasData ? 'bem-estar' : 'sem dados'}
              </span>
            </Ring>

            <div className="space-y-1">
              {score.hasData ? (
                <Badge
                  variant="outline"
                  className="font-semibold text-xs px-2 py-0.5"
                  style={{ borderColor: score.color || COPPER, color: score.color || COPPER }}
                >
                  {score.level}
                </Badge>
              ) : (
                <Badge variant="outline" className="font-semibold text-xs px-2 py-0.5">
                  Sem registros
                </Badge>
              )}
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{score.checkinsCount}</span>{' '}
                check-in{score.checkinsCount === 1 ? '' : 's'} registrados
              </div>
              {score.lastCheckinDate && (
                <div className="text-[11px] text-muted-foreground">
                  Último: {formatDateFriendly(score.lastCheckinDate)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conceito da escala — mesma estrutura do bloco do Preventivo */}
        <div className="flex items-start gap-3 rounded-2xl border border-soul-gold/30 dark:border-soul-gold-light/30 bg-soul-gold/10 dark:bg-soul-gold/15 p-4 sm:p-5 shadow-xs">
          <div className="mt-0.5 shrink-0 p-2 rounded-xl bg-soul-gold/15 dark:bg-soul-gold/25">
            <HeartPulse className="w-4 h-4 text-soul-gold-deep dark:text-soul-gold-light" />
          </div>
          <div className="space-y-2 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-soul-gold-deep dark:text-soul-gold-light">
              O conceito da escala
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              O Score Emocional mede o equilíbrio entre corpo, mente, relações e propósito. A nota
              combina, em partes iguais, a média dos seus check-ins recentes (humor, energia e
              controle do estresse) com o Índice Vida 360º — a média dos 11 aspectos da sua vida.
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              Faça o check-in diário no Diário Emocional para acompanhar a evolução do seu bem-estar
              junto da sua equipe da Clínica Soul.
            </p>
          </div>
        </div>

        {/* Médias diárias rápidas (humor / energia / serenidade) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {dailyCards.map((c) => (
            <div
              key={c.key}
              className="text-left p-4 rounded-xl border border-border/70 bg-card/60 hover:bg-card transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted/60">{c.icon}</div>
                <div className="text-right">
                  <span className="font-display text-lg font-bold text-foreground tabular-nums">
                    {c.value !== null ? `${c.value}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="font-semibold text-sm text-foreground">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Apresentação detalhada: radar, evolução e 11 aspectos (Vida 360º) */}
        {score.hasData ? (
          <Life360View logs={emotionalLogs} />
        ) : (
          <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-card/50 text-muted-foreground space-y-3">
            <Smile className="h-10 w-10 mx-auto text-soul-gold-deep/50 dark:text-soul-gold-light/50" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Nenhum check-in ainda</h4>
              <p className="text-xs max-w-sm mx-auto mt-1">
                Registre seu primeiro momento no Diário Emocional para o seu Score Emocional
                aparecer aqui.
              </p>
            </div>
          </div>
        )}

        {/* Rodapé: índice 360º + ação principal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            {global360 !== null && (
              <>
                Índice Global Vida 360º:{' '}
                <span className="font-bold text-foreground tabular-nums">{global360}%</span> ·{' '}
              </>
            )}
            Fonte: Diário Emocional (mesmo cálculo do Score Emocional do painel).
          </p>
          <Button
            onClick={onOpenDiary}
            size="sm"
            className="gap-1.5 text-xs rounded-xl font-semibold bg-gradient-to-r from-soul-gold-deep via-soul-gold to-soul-copper text-white shadow-sm hover:shadow-md transition-shadow"
          >
            <BookHeart className="w-3.5 h-3.5" />
            Abrir Diário Emocional
          </Button>
        </div>
      </div>
    </section>
  )
}
