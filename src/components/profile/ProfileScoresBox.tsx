import React from 'react'
import { Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { PreventiveHealthScoreData } from '@/lib/preventiveScore'
import { EmotionalScoreSummary } from '@/lib/emotionalMetrics'

/**
 * Caixa colorida de Scores da página Profile (identidade Clínica Soul).
 * - Score Geral (computeScoreGeral, 0–100) PRINCIPAL em destaque (arco grande)
 * - Score Preventivo (0–10) e Score Emocional (0–100%) secundários, menores
 * Mesmos motores usados no Painel Hoje (HomeScoresSection) — sem recálculo divergente.
 */

const GOLD = '#B98A44'
const COPPER = '#B06A52'

function Ring({
  value, // 0..1
  color,
  children,
  sizeClass,
  strokeWidth,
  radius,
  viewSize,
}: {
  value: number
  color: string
  children: React.ReactNode
  sizeClass: string
  strokeWidth: number
  radius: number
  viewSize: number
}) {
  const clamped = Math.min(1, Math.max(0, value))
  const circ = 2 * Math.PI * radius
  const dashOffset = circ - clamped * circ
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClass}`}>
      <svg
        className="w-full h-full -rotate-90"
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        aria-hidden="true"
      >
        <circle
          cx={viewSize / 2}
          cy={viewSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-soul-gold-deep/15 dark:text-soul-gold-light/15"
          fill="transparent"
        />
        <circle
          cx={viewSize / 2}
          cy={viewSize / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  )
}

export interface ProfileScoresBoxProps {
  geralTotal: number | null
  preventiveScore: PreventiveHealthScoreData
  emotionalScore: EmotionalScoreSummary
  loading?: boolean
  onOpenPreventive: () => void
  onOpenEmotional: () => void
}

export const ProfileScoresBox: React.FC<ProfileScoresBoxProps> = ({
  geralTotal,
  preventiveScore,
  emotionalScore,
  loading,
  onOpenPreventive,
  onOpenEmotional,
}) => {
  // ---- Score Geral (principal, 0–100) ----
  const geralVal = geralTotal
  const geralColor = geralVal !== null && geralVal >= 75 ? GOLD : COPPER

  // ---- Preventivo (0–10) ----
  const prevVal = preventiveScore?.overallScore ?? 0
  const prevHasData = prevVal > 0

  // ---- Emocional (0–10 => %, mesma conversão do Vida 360º / Home) ----
  const emoPct = emotionalScore?.hasData ? Math.round((emotionalScore.score / 10) * 100) : null
  const emoColor = emotionalScore?.color || COPPER

  return (
    <section
      aria-label="Seus scores de saúde"
      className="relative overflow-hidden rounded-2xl border border-soul-gold/40 dark:border-soul-gold-light/30 shadow-subtle bg-gradient-to-br from-soul-gold/15 via-[#faf4ea] to-soul-copper/15 dark:from-soul-gold/15 dark:via-[#2a1d12] dark:to-soul-copper/20 p-4 sm:p-5"
    >
      {/* brilho decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 w-52 h-52 rounded-full bg-soul-gold/15 blur-3xl"
      />

      <div className="relative flex items-center gap-2 mb-3.5">
        <Sparkles
          className="w-4 h-4 text-soul-gold-deep dark:text-soul-gold-light"
          aria-hidden="true"
        />
        <h2 className="font-display text-base font-semibold text-foreground tracking-tight">
          Seus Scores
        </h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin motion-reduce:hidden" aria-hidden="true" />
          Calculando seus scores...
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {/* PRINCIPAL: Score Geral (0–100), maior e em destaque */}
          <div className="flex items-center gap-4 rounded-xl border border-soul-gold/50 dark:border-soul-gold-light/40 bg-gradient-to-br from-soul-gold/20 via-card/90 to-soul-copper/15 dark:from-soul-gold/20 dark:via-card dark:to-soul-copper/15 p-4 shadow-sm">
            <Ring
              value={geralVal !== null ? geralVal / 100 : 0}
              color={geralColor}
              sizeClass="w-24 h-24 sm:w-28 sm:h-28"
              strokeWidth={7}
              radius={26}
              viewSize={64}
            >
              <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                {geralVal !== null ? geralVal : '—'}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                {geralVal !== null ? 'de 100' : 'sem dados'}
              </span>
            </Ring>
            <div className="min-w-0 space-y-1.5">
              <p className="eyebrow leading-tight">Clínica Soul</p>
              <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground leading-tight">
                Score Geral
              </h3>
              <p className="text-xs text-muted-foreground leading-snug">
                Bem-estar 50% · adesão 30% · regularidade 20%.
              </p>
            </div>
          </div>

          {/* SECUNDÁRIOS: Preventivo + Emocional, menores, empilhados no mobile, lado a lado no desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenPreventive}
              className="group flex items-center gap-3.5 rounded-xl border border-soul-gold/30 dark:border-soul-gold-light/25 bg-gradient-to-br from-soul-gold/10 via-card/90 to-background dark:from-soul-gold/15 dark:via-card dark:to-background p-3 text-left shadow-xs hover:shadow-md hover:border-soul-gold/50 focus-visible:ring-2 focus-visible:ring-soul-gold-deep dark:focus-visible:ring-soul-gold-light focus-visible:outline-none transition-all duration-200 motion-reduce:transition-none"
            >
              <Ring
                value={prevHasData ? prevVal / 10 : 0}
                color={preventiveScore?.overallColor || GOLD}
                sizeClass="w-16 h-16 sm:w-[72px] sm:h-[72px]"
                strokeWidth={6}
                radius={26}
                viewSize={64}
              >
                <span className="text-base sm:text-lg font-bold tracking-tight text-foreground tabular-nums leading-none">
                  {prevHasData ? prevVal.toFixed(1) : '—'}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                  {prevHasData ? 'de 10' : 'sem dados'}
                </span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="eyebrow leading-tight">Prevenção</p>
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground leading-tight truncate">
                  Score Preventivo
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {preventiveScore?.overallLevel || 'Calculado'} ·{' '}
                  {preventiveScore?.completedTotal ?? 0} de {preventiveScore?.totalItems ?? 0} metas
                </p>
              </div>
              <ChevronRight
                className="w-4 h-4 shrink-0 text-soul-gold-deep dark:text-soul-gold-light opacity-70 group-hover:translate-x-0.5 group-hover:opacity-100 transition-transform motion-reduce:transition-none"
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              onClick={onOpenEmotional}
              aria-label="Abrir painel do Score Emocional"
              className="group flex items-center gap-3.5 rounded-xl border border-soul-copper/30 dark:border-soul-copper/40 bg-gradient-to-br from-soul-copper/10 via-card/90 to-background dark:from-soul-copper/15 dark:via-card dark:to-background p-3 text-left shadow-xs hover:shadow-md hover:border-soul-copper/50 focus-visible:ring-2 focus-visible:ring-soul-gold-deep dark:focus-visible:ring-soul-gold-light focus-visible:outline-none transition-all duration-200 motion-reduce:transition-none"
            >
              <Ring
                value={emoPct !== null ? emoPct / 100 : 0}
                color={emoColor}
                sizeClass="w-16 h-16 sm:w-[72px] sm:h-[72px]"
                strokeWidth={6}
                radius={26}
                viewSize={64}
              >
                <span className="text-base sm:text-lg font-bold tracking-tight text-foreground tabular-nums leading-none">
                  {emoPct !== null ? `${emoPct}%` : '—'}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                  {emotionalScore?.hasData ? 'bem-estar' : 'sem dados'}
                </span>
              </Ring>
              <div className="min-w-0 flex-1">
                <p className="eyebrow leading-tight">Bem-estar</p>
                <h3 className="font-display text-base sm:text-lg font-semibold text-foreground leading-tight truncate">
                  Score Emocional
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {emotionalScore?.hasData
                    ? `${emotionalScore.level} · ${emotionalScore.checkinsCount} ${
                        emotionalScore.checkinsCount === 1 ? 'check-in' : 'check-ins'
                      }`
                    : 'Faça seu primeiro check-in no diário'}
                </p>
              </div>
              <ChevronRight
                className="w-4 h-4 shrink-0 text-soul-copper opacity-70 group-hover:translate-x-0.5 group-hover:opacity-100 transition-transform motion-reduce:transition-none"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
