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
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreventiveHealthScoreData } from '@/lib/preventiveScore'
import { EmotionalScoreSummary } from '@/lib/emotionalMetrics'
import { ProfileScoresBox } from '@/components/profile/ProfileScoresBox'

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
  geralTotal: number | null
  avatarInitials: string
  refreshing: boolean
  onRefresh: () => void
  onOpenBasicInfo: () => void
  onOpenEmotional: () => void
}

export const ProfileOverviewHeader: React.FC<ProfileOverviewHeaderProps> = ({
  initialData,
  preventiveScore,
  emotionalScore,
  geralTotal,
  avatarInitials,
  refreshing,
  onRefresh,
  onOpenBasicInfo,
  onOpenEmotional,
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
                <p className="text-sm text-muted-foreground leading-snug max-w-prose">
                  Este é o seu perfil de saúde: seus dados pessoais, histórico médico (cirurgias e
                  alergias), biomarcadores e as metas que orientam seu acompanhamento na Clínica
                  Soul.
                </p>
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

          {/* 1.5) CAIXA COLORIDA DOS TRÊS SCORES — logo abaixo do nome e da explicação */}
          <ProfileScoresBox
            geralTotal={geralTotal}
            preventiveScore={preventiveScore}
            emotionalScore={emotionalScore}
            onOpenPreventive={onOpenBasicInfo}
            onOpenEmotional={onOpenEmotional}
          />

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
    </div>
  )
}
export default ProfileOverviewHeader
