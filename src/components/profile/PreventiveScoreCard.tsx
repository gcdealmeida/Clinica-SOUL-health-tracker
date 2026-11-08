import React, { useState } from 'react'
import { PreventiveHealthScoreData, PillarScore } from '@/lib/preventiveScore'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ShieldCheck,
  Activity,
  HeartHandshake,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from 'lucide-react'

interface PreventiveScoreCardProps {
  scoreData: PreventiveHealthScoreData
}

export const PreventiveScoreCard: React.FC<PreventiveScoreCardProps> = ({ scoreData }) => {
  const [activePillar, setActivePillar] = useState<'all' | 'prevention' | 'monitoring' | 'action'>(
    'all',
  )
  const [expandedPillar, setExpandedPillar] = useState<string | null>('prevention')

  const toggleExpand = (pillarName: string) => {
    setExpandedPillar(expandedPillar === pillarName ? null : pillarName)
  }

  const {
    overallScore,
    overallLevel,
    overallColor,
    prevention,
    monitoring,
    action,
    completedTotal,
    totalItems,
  } = scoreData

  return (
    <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/50 via-background to-teal-50/30 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Header do Score com Medidor / Termômetro */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-border/60">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" />
              Preventive Health Score
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Sua Escala de Saúde Preventiva
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Calculada dinamicamente a partir dos seus exames, métricas diárias e hábitos de
              longevidade.
            </p>
          </div>

          {/* Medidor Circular / Visual Guava */}
          <div className="flex items-center gap-4 bg-background/80 dark:bg-card/80 p-3.5 rounded-2xl border border-border shadow-xs">
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted/20"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={overallColor}
                  strokeWidth="8"
                  strokeDasharray={`${(overallScore / 10) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {overallScore.toFixed(1)}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase">
                  / 10
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Badge
                variant="outline"
                className="font-semibold text-xs px-2 py-0.5"
                style={{ borderColor: overallColor, color: overallColor }}
              >
                {overallLevel}
              </Badge>
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{completedTotal}</span> de{' '}
                {totalItems} metas ativas
              </div>
              <div className="text-[11px] text-muted-foreground">Atualizado em tempo real</div>
            </div>
          </div>
        </div>

        {/* Os 3 Pilares em Cards Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <PillarSummaryCard
            icon={<ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            title="Prevenção"
            score={prevention.score}
            completed={prevention.completedCount}
            total={prevention.totalCount}
            subtitle="Checkups & Exames"
            active={expandedPillar === 'prevention'}
            onClick={() => toggleExpand('prevention')}
            colorClass="from-indigo-500/10 to-indigo-500/5 text-indigo-700 dark:text-indigo-400"
          />
          <PillarSummaryCard
            icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            title="Monitoramento"
            score={monitoring.score}
            completed={monitoring.completedCount}
            total={monitoring.totalCount}
            subtitle="Controle 30 dias"
            active={expandedPillar === 'monitoring'}
            onClick={() => toggleExpand('monitoring')}
            colorClass="from-emerald-500/10 to-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          />
          <PillarSummaryCard
            icon={<HeartHandshake className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            title="Ação"
            score={action.score}
            completed={action.completedCount}
            total={action.totalCount}
            subtitle="Hábitos & Sono 7h+"
            active={expandedPillar === 'action'}
            onClick={() => toggleExpand('action')}
            colorClass="from-amber-500/10 to-amber-500/5 text-amber-700 dark:text-amber-400"
          />
        </div>

        {/* Detalhamento dos Pilares */}
        <div className="space-y-4 pt-2">
          <PillarDetailAccordion
            pillar={prevention}
            isOpen={expandedPillar === 'prevention'}
            onToggle={() => toggleExpand('prevention')}
            accentColor="indigo"
          />
          <PillarDetailAccordion
            pillar={monitoring}
            isOpen={expandedPillar === 'monitoring'}
            onToggle={() => toggleExpand('monitoring')}
            accentColor="emerald"
          />
          <PillarDetailAccordion
            pillar={action}
            isOpen={expandedPillar === 'action'}
            onToggle={() => toggleExpand('action')}
            accentColor="amber"
          />
        </div>
      </CardContent>
    </Card>
  )
}

interface PillarSummaryCardProps {
  icon: React.ReactNode
  title: string
  score: number
  completed: number
  total: number
  subtitle: string
  active: boolean
  onClick: () => void
  colorClass: string
}

const PillarSummaryCard: React.FC<PillarSummaryCardProps> = ({
  icon,
  title,
  score,
  completed,
  total,
  subtitle,
  active,
  onClick,
}) => {
  const pct = Math.round((completed / total) * 100)
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all duration-200 ${
        active
          ? 'border-primary ring-2 ring-primary/20 bg-card shadow-sm'
          : 'border-border/70 hover:border-border hover:bg-card/70 bg-card/40'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-muted/60">{icon}</div>
        <div className="text-right">
          <span className="text-lg font-bold">{score.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">/10</span>
        </div>
      </div>
      <div className="font-semibold text-sm text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground mb-3">{subtitle}</div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {completed} de {total} itens
          </span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>
    </button>
  )
}

interface PillarDetailAccordionProps {
  pillar: PillarScore
  isOpen: boolean
  onToggle: () => void
  accentColor: 'indigo' | 'emerald' | 'amber'
}

const PillarDetailAccordion: React.FC<PillarDetailAccordionProps> = ({
  pillar,
  isOpen,
  onToggle,
  accentColor,
}) => {
  return (
    <div className="border border-border/80 rounded-xl overflow-hidden bg-card/60">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="text-base font-semibold">{pillar.title}</div>
          <Badge variant="secondary" className="text-xs">
            {pillar.completedCount}/{pillar.totalCount} cumpridos
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="font-bold text-sm">{pillar.score.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground"> / 10</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 pt-1 space-y-2 border-t border-border/60 bg-background/50">
          <p className="text-xs text-muted-foreground mb-3">{pillar.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {pillar.items.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border text-xs space-y-1.5 transition-colors ${
                  item.fulfilled
                    ? 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                    : 'border-border/60 bg-muted/20 text-muted-foreground'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {item.fulfilled ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    )}
                    {item.title}
                  </span>
                  {item.valueLabel && (
                    <Badge variant="outline" className="text-[10px] shrink-0 font-medium">
                      {item.valueLabel}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
                {item.recommendation && (
                  <div className="text-[10px] font-medium pt-0.5 text-primary/80">
                    • {item.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
