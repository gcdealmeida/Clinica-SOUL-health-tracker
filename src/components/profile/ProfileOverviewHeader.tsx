import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  User as UserIcon,
  Calendar,
  Scale,
  Ruler,
  Percent,
  Dumbbell,
  Droplet,
  Sparkles,
  HeartHandshake,
  ChevronRight,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreventiveHealthScoreData } from '@/lib/preventiveScore'
import { EmotionalScoreSummary } from '@/lib/emotionalMetrics'

export interface InitialProfileData {
  name?: string
  email?: string
  age?: number | null
  gender?: string
  weightKg?: number | null
  heightCm?: number | null
  bodyFatPct?: number | null
  leanMassKg?: number | null
  bloodType?: string
}

interface ProfileOverviewHeaderProps {
  initialData: InitialProfileData
  preventiveScore: PreventiveHealthScoreData
  emotionalScore: EmotionalScoreSummary
  avatarInitials: string
  refreshing: boolean
  onRefresh: () => void
  onOpenBasicInfo: () => void
  onOpenEmotionalDiary: () => void
}

export const ProfileOverviewHeader: React.FC<ProfileOverviewHeaderProps> = ({
  initialData,
  preventiveScore,
  emotionalScore,
  avatarInitials,
  refreshing,
  onRefresh,
  onOpenBasicInfo,
  onOpenEmotionalDiary,
}) => {
  const { name, email, age, gender, weightKg, heightCm, bodyFatPct, leanMassKg, bloodType } =
    initialData

  const formatValue = (val: number | string | null | undefined, suffix = '') => {
    if (val === null || val === undefined || val === '') return '—'
    return `${val}${suffix}`
  }

  // 8 dados iniciais solicitados: Nome, Idade, Sexo, Peso, Altura, % Gordura, Massa Magra, Tipo Sanguíneo
  const initialFields = [
    {
      id: 'name',
      label: 'Nome',
      value: name || '—',
      icon: UserIcon,
      highlight: false,
    },
    {
      id: 'age',
      label: 'Idade',
      value: age !== null && age !== undefined ? `${age} anos` : '—',
      icon: Calendar,
      highlight: false,
    },
    {
      id: 'gender',
      label: 'Sexo',
      value: gender || '—',
      icon: UserIcon,
      highlight: false,
    },
    {
      id: 'weight',
      label: 'Peso',
      value: formatValue(weightKg, ' kg'),
      icon: Scale,
      highlight: false,
    },
    {
      id: 'height',
      label: 'Altura',
      value: formatValue(heightCm, ' cm'),
      icon: Ruler,
      highlight: false,
    },
    {
      id: 'bodyFat',
      label: '% Gordura',
      value: formatValue(bodyFatPct, '%'),
      icon: Percent,
      highlight: false,
    },
    {
      id: 'leanMass',
      label: 'Massa Magra',
      value: formatValue(leanMassKg, ' kg'),
      icon: Dumbbell,
      highlight: false,
    },
    {
      id: 'bloodType',
      label: 'Tipo Sanguíneo',
      value: bloodType || '—',
      icon: Droplet,
      highlight: Boolean(bloodType && bloodType !== '—'),
    },
  ]

  // Configuração visual do medidor de Preventive Score (0..10)
  const prevScoreVal = preventiveScore?.overallScore ?? 0
  const prevScoreColor = preventiveScore?.overallColor || '#10b981'
  const prevCircumference = 2 * Math.PI * 36 // raio 36 = 226.2
  const prevDashOffset =
    prevCircumference - (Math.min(10, Math.max(0, prevScoreVal)) / 10) * prevCircumference

  // Configuração visual do medidor de Emotional Score (0..10)
  const emoScoreVal = emotionalScore?.score ?? 0
  const emoScoreColor = emotionalScore?.color || '#10b981'
  const emoCircumference = 2 * Math.PI * 36
  const emoDashOffset =
    emoCircumference - (Math.min(10, Math.max(0, emoScoreVal)) / 10) * emoCircumference

  return (
    <div className="space-y-4">
      {/* 1) CARD DE DADOS INICIAIS NO TOPO */}
      <Card className="border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-xs overflow-hidden">
        <CardContent className="p-5 md:p-6 space-y-5">
          {/* Topo do Card: Avatar, Nome, Status e Botão de Atualizar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-lg sm:text-xl flex items-center justify-center shadow-inner shrink-0">
                {avatarInitials}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                    {name || 'Meu Perfil'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck className="w-3 h-3" />
                    Paciente Soul
                  </span>
                </div>
                {email && <p className="text-xs text-muted-foreground">{email}</p>}
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
            </div>
          </div>

          {/* Grid com os 8 Dados Iniciais no Estilo Guava */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <span>Dados Iniciais de Saúde & Biometria</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
              {initialFields.map((field) => {
                const Icon = field.icon
                return (
                  <div
                    key={field.id}
                    className="p-2.5 rounded-xl border border-border/60 bg-background/60 hover:bg-background transition-colors flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-muted-foreground mb-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground truncate">
                        {field.label}
                      </span>
                      <Icon className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    </div>
                    <div className="truncate">
                      {field.highlight ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                          {field.value}
                        </span>
                      ) : (
                        <span
                          className={`text-sm font-semibold tracking-tight ${
                            field.value === '—'
                              ? 'text-muted-foreground font-normal'
                              : 'text-foreground'
                          }`}
                          title={String(field.value)}
                        >
                          {field.value}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2) DOIS SCORES LADO A LADO (Preventive Health Score e Score do Diário Emocional) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Score 1: Preventive Health Score (clicável -> abre/rola Basic Info) */}
        <Card
          onClick={onOpenBasicInfo}
          className="group relative cursor-pointer border-emerald-200/70 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/40 via-card to-background dark:from-emerald-950/20 dark:via-card dark:to-background shadow-xs hover:shadow-md transition-all duration-200 hover:border-emerald-300"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenBasicInfo()
            }
          }}
        >
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/90 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Score Geral
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1 group-hover:text-primary transition-colors">
                  Preventive Health Score
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  Calculado dos 3 pilares: Prevenção, Monitoramento e Ação contínua.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {preventiveScore?.overallLevel || 'Calculado'}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {preventiveScore?.completedTotal ?? 0} de {preventiveScore?.totalItems ?? 0} metas
                </span>
              </div>
            </div>

            {/* Medidor Anel Circular */}
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-muted/20"
                  fill="transparent"
                />
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  stroke={prevScoreColor}
                  strokeWidth="7"
                  strokeDasharray={prevCircumference}
                  strokeDashoffset={prevDashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {prevScoreVal > 0 ? prevScoreVal.toFixed(1) : '—'}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                  de 10
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score 2: Score do Diário Emocional (clicável -> abre /diario-emocional) */}
        <Card
          onClick={onOpenEmotionalDiary}
          className="group relative cursor-pointer border-teal-200/70 dark:border-teal-900/50 bg-gradient-to-br from-teal-50/40 via-card to-background dark:from-teal-950/20 dark:via-card dark:to-background shadow-xs hover:shadow-md transition-all duration-200 hover:border-teal-300"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpenEmotionalDiary()
            }
          }}
        >
          <CardContent className="p-5 flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100/90 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                <HeartHandshake className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                Vida 360º & Emoções
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  Score do Diário Emocional
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  Média harmônica do humor diário, energia e os 11 aspectos da Vida 360º.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                {emotionalScore.hasData ? (
                  <>
                    <span className="font-semibold" style={{ color: emoScoreColor }}>
                      {emotionalScore.level}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {emotionalScore.checkinsCount}{' '}
                      {emotionalScore.checkinsCount === 1 ? 'check-in' : 'check-ins'}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                    <PlusCircle className="w-3 h-3" /> Fazer Check-in
                  </span>
                )}
              </div>
            </div>

            {/* Medidor Anel Circular */}
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44"
                  cy="44"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-muted/20"
                  fill="transparent"
                />
                {emotionalScore.hasData && (
                  <circle
                    cx="44"
                    cy="44"
                    r="36"
                    stroke={emoScoreColor}
                    strokeWidth="7"
                    strokeDasharray={emoCircumference}
                    strokeDashoffset={emoDashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                    fill="transparent"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {emotionalScore.hasData ? emoScoreVal.toFixed(1) : '—'}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {emotionalScore.hasData ? 'de 10' : 'sem dados'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
export default ProfileOverviewHeader
