import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { profileService } from '@/services/profile'
import { medicalService } from '@/services/medical'
import { loadDashboardPreferences } from '@/services/preferences'
import { Sparkles, HeartPulse, ShieldCheck, Activity } from 'lucide-react'
import { EmotionalLog, HealthMetric } from '@/types'
import { Medication } from '@/services/medications'
import {
  Exam,
  ProfileBiomarker,
  ProfileLifestyle,
  ProfileVaccination,
  UserBasicProfile,
} from '@/types'
import { computePreventiveHealthScore } from '@/lib/preventiveScore'
import { computeEmotionalScore } from '@/lib/emotionalMetrics'
import { computeScoreGeral } from '@/components/professional/PatientExtendedTabs'

/**
 * Faixa compacta dos 3 scores do Painel Hoje (abaixo da linha do tempo):
 * - Preventivo (0–10): motor computePreventiveHealthScore (mesma fonte do Profile)
 * - Emocional (0–100%): computeEmotionalScore (mesma fonte do diário/Vida 360º)
 * - Geral (0–100): computeScoreGeral (mesma lógica da aba clínica Score Geral)
 * Nada além dos três cards. Números reais, sem recálculo divergente.
 */

const RING_RADIUS = 26
const RING_CIRC = 2 * Math.PI * RING_RADIUS

function ScoreRing({
  value, // 0..1
  color,
  children,
}: {
  value: number
  color: string
  children: React.ReactNode
}) {
  const clamped = Math.min(1, Math.max(0, value))
  const dashOffset = RING_CIRC - clamped * RING_CIRC
  return (
    <div className="relative flex items-center justify-center w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          stroke="currentColor"
          strokeWidth="6"
          className="text-soul-gold-deep/15 dark:text-soul-gold-light/15"
          fill="transparent"
        />
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          stroke={color}
          strokeWidth="6"
          strokeDasharray={RING_CIRC}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

interface HomeScoresSectionProps {
  metrics: HealthMetric[]
  emotionalLogs: EmotionalLog[]
  meals: { date_time: string }[]
  medications: Medication[]
  loading?: boolean
}

interface ScoreCardSpec {
  key: string
  eyebrow: string
  title: string
  value: string
  sub: string | null
  ringValue: number // 0..1 para o arco
  ringColor: string
  icon: typeof ShieldCheck
  to: string
}

interface ExtraScoreData {
  exams: Exam[]
  biomarkers: ProfileBiomarker[]
  vaccinations: ProfileVaccination[]
  lifestyle: ProfileLifestyle | null
  basicProfile: UserBasicProfile | null
  sleepGoalHours?: number
}

function computeAge(birthDate?: string): number | undefined {
  if (!birthDate) return undefined
  const parts = birthDate.split('-')
  if (parts.length !== 3) return undefined
  const birth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  const diff = Date.now() - birth.getTime()
  return Math.abs(new Date(diff).getUTCFullYear() - 1970)
}

function buildCards(input: HomeScoresSectionProps, extra: ExtraScoreData | null): ScoreCardSpec[] {
  const GOLD = '#B98A44'
  const COPPER = '#B06A52'

  // 1) Preventivo — mesmo motor do Profile (0..10)
  const preventive = extra
    ? computePreventiveHealthScore({
        metrics: input.metrics,
        exams: extra.exams,
        biomarkers: extra.biomarkers,
        vaccinations: extra.vaccinations,
        lifestyle: extra.lifestyle,
        meals: input.meals,
        sleepGoalHours: extra.sleepGoalHours,
        userAge: computeAge(extra.basicProfile?.birthDate),
        userGender: extra.basicProfile?.gender,
      })
    : null
  const prevVal = preventive?.overallScore ?? 0

  // 2) Emocional — computeEmotionalScore (0..10) => % (mesma conversão do Vida 360º)
  const emotional = computeEmotionalScore(input.emotionalLogs)
  const emoPct = emotional.hasData ? Math.round((emotional.score / 10) * 100) : null

  // 3) Geral — mesma fórmula da aba clínica Score Geral (0..100)
  const geral = computeScoreGeral(input.emotionalLogs, input.medications, input.metrics)
  const geralTotal = geral.total

  return [
    {
      key: 'preventivo',
      eyebrow: 'Prevenção',
      title: 'Score Preventivo',
      value: preventive && prevVal > 0 ? prevVal.toFixed(1) : '—',
      sub: preventive && prevVal > 0 ? 'de 10' : 'sem dados',
      ringValue: prevVal / 10,
      ringColor: preventive?.overallColor || GOLD,
      icon: ShieldCheck,
      to: '/profile',
    },
    {
      key: 'emocional',
      eyebrow: 'Bem-estar',
      title: 'Score Emocional',
      value: emoPct !== null ? `${emoPct}%` : '—',
      sub: emoPct !== null ? emotional.level : 'sem dados',
      ringValue: emoPct !== null ? emoPct / 100 : 0,
      ringColor: emotional.color || COPPER,
      icon: HeartPulse,
      to: '/diario-emocional',
    },
    {
      key: 'geral',
      eyebrow: 'Clínica Soul',
      title: 'Score Geral',
      value: geralTotal !== null ? String(geralTotal) : '—',
      sub: geralTotal !== null ? 'de 100' : 'sem dados',
      ringValue: geralTotal !== null ? geralTotal / 100 : 0,
      ringColor: geralTotal !== null && geralTotal >= 75 ? GOLD : COPPER,
      icon: Sparkles,
      to: '/profile',
    },
  ]
}

export function HomeScoresSection(props: HomeScoresSectionProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [extra, setExtra] = useState<ExtraScoreData | null>(null)

  // Dados extras do score preventivo (exames, biomarcadores, vacinas, hábitos, perfil)
  useEffect(() => {
    let cancelled = false
    if (!user) return
    Promise.all([
      medicalService.listExams(user.id).catch(() => []),
      profileService.getBiomarkers(user.id).catch(() => []),
      profileService.getVaccinations(user.id).catch(() => []),
      profileService.getLifestyle(user.id).catch(() => null),
      profileService.getBasicProfile(user.id).catch(() => null),
      loadDashboardPreferences().catch(() => null),
    ])
      .then(([exams, biomarkers, vaccinations, lifestyle, basicProfile, prefs]) => {
        if (cancelled) return
        setExtra({
          exams,
          biomarkers,
          vaccinations,
          lifestyle,
          basicProfile,
          sleepGoalHours: prefs?.sleepGoalHours,
        })
      })
      .catch(() => {
        if (!cancelled) setExtra(null)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const cards = useMemo(() => buildCards(props, extra), [props, extra])

  return (
    <section className="space-y-2" aria-label="Seus scores de saúde">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-foreground">Scores</h2>
        <Activity
          className="h-3.5 w-3.5 text-soul-gold-deep dark:text-soul-gold-light"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {props.loading || (props.metrics.length === 0 && !extra)
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
          : cards.map((c) => {
              const Icon = c.icon
              return (
                <Card
                  key={c.key}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(c.to)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(c.to)
                    }
                  }}
                  aria-label={`${c.title}: ${c.value} ${c.sub ?? ''} — abrir`}
                  className="group cursor-pointer overflow-hidden border-soul-gold/30 bg-gradient-to-br from-soul-gold/10 via-card to-soul-copper/10 dark:from-soul-gold/15 dark:via-card dark:to-soul-copper/15 shadow-subtle hover:shadow-md hover:border-soul-gold/50 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-soul-gold-deep dark:focus-visible:ring-soul-gold-light focus-visible:outline-none motion-reduce:transition-none"
                >
                  <CardContent className="p-4 flex items-center gap-3.5">
                    <ScoreRing value={c.ringValue} color={c.ringColor}>
                      <span className="text-sm sm:text-base font-bold tracking-tight text-foreground tabular-nums leading-none">
                        {c.value}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                        {c.sub}
                      </span>
                    </ScoreRing>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow leading-tight">{c.eyebrow}</p>
                      <h3 className="font-display text-base sm:text-lg font-semibold text-foreground leading-tight truncate">
                        {c.title}
                      </h3>
                    </div>
                    <Icon
                      className="h-4 w-4 shrink-0 text-soul-gold-deep dark:text-soul-gold-light opacity-70 group-hover:opacity-100 transition-opacity"
                      aria-hidden="true"
                    />
                  </CardContent>
                </Card>
              )
            })}
      </div>
    </section>
  )
}
