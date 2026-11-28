import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HeartPulse, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/Navbar'
import { PreventiveScoreCard } from '@/components/profile/PreventiveScoreCard'
import { EmotionalScorePanel } from '@/components/profile/EmotionalScorePanel'
import { computePreventiveHealthScore, PreventiveHealthScoreData } from '@/lib/preventiveScore'
import { computeEmotionalScore, EmotionalScoreSummary } from '@/lib/emotionalMetrics'
import { useAuth } from '@/context/AuthContext'
import { UserBasicProfile, HealthMetric, Exam, EmotionalLog } from '@/types'
import { ProfileBiomarker } from '@/types'
import { ProfileVaccination, ProfileLifestyle } from '@/types'
import { Medication, medicationService } from '@/services/medications'
import { healthService } from '@/services/health'
import { medicalService } from '@/services/medical'
import { profileService } from '@/services/profile'
import { mealService } from '@/services/mealsAndAi'
import { emotionalService } from '@/services/emotional'
import { loadDashboardPreferences } from '@/services/preferences'
import { toast } from '@/hooks/use-toast'

export type ProfileScorePageKind = 'preventivo' | 'emocional'

interface ProfileScorePageProps {
  kind: ProfileScorePageKind
}

/**
 * Página dedicada de um score do Profile (Score Preventivo ou Score Emocional).
 * Reutiliza os painéis existentes (PreventiveScoreCard / EmotionalScorePanel) e
 * as MESMAS funções de cálculo da página /profile (computePreventiveHealthScore
 * e computeEmotionalScore) — nenhuma lógica de score é duplicada aqui.
 */
export const ProfileScorePage: React.FC<ProfileScorePageProps> = ({ kind }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  const [basicProfile, setBasicProfile] = useState<UserBasicProfile | null>(null)
  const [biomarkers, setBiomarkers] = useState<ProfileBiomarker[]>([])
  const [vaccinations, setVaccinations] = useState<ProfileVaccination[]>([])
  const [lifestyle, setLifestyle] = useState<ProfileLifestyle | null>(null)
  const [medications, setMedications] = useState<Medication[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([])
  const [meals, setMeals] = useState<{ date_time: string }[]>([])
  const [symptoms, setSymptoms] = useState<HealthMetric[]>([])
  const [sleepGoalHours, setSleepGoalHours] = useState<number | undefined>(undefined)

  const loadAllData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [
        basicData,
        bioData,
        vaccData,
        lifeData,
        medsData,
        metricsData,
        examsData,
        emoData,
        mealsData,
        symptomsData,
        prefsData,
      ] = await Promise.all([
        profileService.getBasicProfile(user.id),
        profileService.getBiomarkers(user.id),
        profileService.getVaccinations(user.id),
        profileService.getLifestyle(user.id),
        medicationService.list().catch(() => []),
        healthService.listUserMetrics(user.id, 200).catch(() => []),
        medicalService.listExams(user.id).catch(() => []),
        emotionalService.listLogs(user.id, 60).catch(() => []),
        mealService.listMeals(user.id).catch(() => []),
        healthService.listAllSymptomMetrics(user.id).catch(() => []),
        loadDashboardPreferences().catch(() => null),
      ])

      setBasicProfile(basicData)
      setBiomarkers(bioData)
      setVaccinations(vaccData)
      setLifestyle(lifeData)
      setMedications(medsData)
      setMetrics(metricsData)
      setExams(examsData)
      setEmotionalLogs(emoData)
      setMeals(mealsData)
      setSymptoms(symptomsData)
      setSleepGoalHours(prefsData?.sleepGoalHours)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar seus dados',
        description: err.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Idade calculada (mesma lógica da /profile)
  const age = useMemo(() => {
    if (!basicProfile?.birthDate) return null
    const parts = basicProfile.birthDate.split('-')
    if (parts.length !== 3) return null
    const birthDateObj = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    )
    const diff = Date.now() - birthDateObj.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }, [basicProfile?.birthDate])

  // Recálculo dinâmico do Preventive Health Score — MESMA função da /profile
  const scoreResult: PreventiveHealthScoreData = useMemo(() => {
    const metricIds = new Set(metrics.map((m) => m.id))
    const allMetrics = [...metrics, ...symptoms.filter((s) => !metricIds.has(s.id))]
    return computePreventiveHealthScore({
      metrics: allMetrics,
      exams,
      biomarkers,
      lifestyle,
      vaccinations,
      meals,
      sleepGoalHours,
      userAge: age ?? undefined,
      userGender: basicProfile?.gender,
    })
  }, [
    metrics,
    symptoms,
    meals,
    sleepGoalHours,
    exams,
    biomarkers,
    lifestyle,
    vaccinations,
    age,
    basicProfile?.gender,
  ])

  // Recálculo dinâmico do Score do Diário Emocional (0 a 10) — MESMA função da /profile
  const emotionalScoreResult: EmotionalScoreSummary = useMemo(() => {
    return computeEmotionalScore(emotionalLogs)
  }, [emotionalLogs])

  const title = kind === 'preventivo' ? 'Score Preventivo' : 'Score Emocional'

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentTab="Profile" />

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Cabeçalho da página dedicada, com botão Voltar ao Profile */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              className="gap-1.5 text-xs h-8 shrink-0"
              aria-label="Voltar para o Profile"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </Button>
            <div className="space-y-0.5">
              <p className="eyebrow leading-tight">Perfil · {title}</p>
              <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                {kind === 'preventivo' ? (
                  <span className="inline-flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Preventive Health Score
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-soul-copper" />
                    Score Emocional
                  </span>
                )}
              </h1>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Carregando seu painel de {title.toLowerCase()}...
          </div>
        ) : kind === 'preventivo' ? (
          <PreventiveScoreCard
            scoreData={scoreResult}
            onNavigateTab={() => navigate('/profile')}
            onNavigateRoute={(routePath) => navigate(routePath)}
            metrics={metrics}
            biomarkers={biomarkers}
            exams={exams}
            vaccinations={vaccinations}
            lifestyle={lifestyle}
          />
        ) : (
          <EmotionalScorePanel
            emotionalLogs={emotionalLogs}
            score={emotionalScoreResult}
            onOpenDiary={() => navigate('/diario-emocional')}
          />
        )}
      </main>
    </div>
  )
}
