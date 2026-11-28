import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Navbar } from '@/components/Navbar'
import {
  UserBasicProfile,
  ProfileBiomarker,
  ProfileCondition,
  ProfileAllergy,
  ProfileVaccination,
  ProfileEvent,
  ProfileGenetics,
  ProfileCareProvider,
  ProfileLifestyle,
  HealthMetric,
  Exam,
} from '@/types'
import { Medication, medicationService } from '@/services/medications'
import { healthService } from '@/services/health'
import { medicalService } from '@/services/medical'
import { profileService } from '@/services/profile'
import { mealService } from '@/services/mealsAndAi'
import { loadDashboardPreferences } from '@/services/preferences'
import { computePreventiveHealthScore, PreventiveHealthScoreData } from '@/lib/preventiveScore'
import { computeScoreGeral } from '@/components/professional/PatientExtendedTabs'

import { PreventiveScoreCard } from '@/components/profile/PreventiveScoreCard'
import { EmotionalScorePanel } from '@/components/profile/EmotionalScorePanel'
import {
  ProfileOverviewHeader,
  InitialProfileData,
} from '@/components/profile/ProfileOverviewHeader'
import { emotionalService } from '@/services/emotional'
import { computeEmotionalScore, EmotionalScoreSummary } from '@/lib/emotionalMetrics'
import { EmotionalLog } from '@/types'
import { MedicationsSupplementsSection } from '@/components/profile/MedicationsSupplementsSection'
import { BiomarkersSection } from '@/components/profile/BiomarkersSection'
import {
  ConditionsSection,
  AllergiesSection,
  VaccinationsSection,
  EventsSection,
  GeneticsSection,
  CareProvidersSection,
  LifestyleSection,
} from '@/components/profile/ProfileSubSections'

import {
  User as UserIcon,
  HeartPulse,
  Pill,
  Activity,
  AlertTriangle,
  Syringe,
  History,
  Dna,
  Stethoscope,
  Flame,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export type ProfileTab =
  | 'basic'
  | 'biomarkers'
  | 'medications'
  | 'conditions'
  | 'allergies'
  | 'vaccinations'
  | 'events'
  | 'genetics'
  | 'providers'
  | 'lifestyle'

const TABS: { id: ProfileTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'basic', label: 'Basic Info', icon: UserIcon },
  { id: 'biomarkers', label: 'Biomarkers', icon: HeartPulse },
  { id: 'medications', label: 'Medications & Supplements', icon: Pill },
  { id: 'conditions', label: 'Conditions & Injuries', icon: Activity },
  { id: 'allergies', label: 'Allergies', icon: AlertTriangle },
  { id: 'vaccinations', label: 'Vaccinations', icon: Syringe },
  { id: 'events', label: 'Events', icon: History },
  { id: 'genetics', label: 'Genetics', icon: Dna },
  { id: 'providers', label: 'Care Providers', icon: Stethoscope },
  { id: 'lifestyle', label: 'Lifestyle', icon: Flame },
]

export const ProfilePage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ProfileTab>('basic')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Estados de dados
  const [basicProfile, setBasicProfile] = useState<UserBasicProfile | null>(null)
  const [biomarkers, setBiomarkers] = useState<ProfileBiomarker[]>([])
  const [conditions, setConditions] = useState<ProfileCondition[]>([])
  const [allergies, setAllergies] = useState<ProfileAllergy[]>([])
  const [vaccinations, setVaccinations] = useState<ProfileVaccination[]>([])
  const [events, setEvents] = useState<ProfileEvent[]>([])
  const [genetics, setGenetics] = useState<ProfileGenetics[]>([])
  const [careProviders, setCareProviders] = useState<ProfileCareProvider[]>([])
  const [lifestyle, setLifestyle] = useState<ProfileLifestyle | null>(null)

  // Coleções pré-existentes para cálculo de score
  const [medications, setMedications] = useState<Medication[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([])
  const [meals, setMeals] = useState<{ date_time: string }[]>([])
  const [symptoms, setSymptoms] = useState<HealthMetric[]>([])
  const [sleepGoalHours, setSleepGoalHours] = useState<number | undefined>(undefined)

  const loadAllData = useCallback(
    async (isRefresh = false) => {
      if (!user) return
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const [
          basicData,
          bioData,
          condData,
          allgData,
          vaccData,
          evtData,
          genData,
          provData,
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
          profileService.getConditions(user.id),
          profileService.getAllergies(user.id),
          profileService.getVaccinations(user.id),
          profileService.getEvents(user.id),
          profileService.getGenetics(user.id),
          profileService.getCareProviders(user.id),
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
        setConditions(condData)
        setAllergies(allgData)
        setVaccinations(vaccData)
        setEvents(evtData)
        setGenetics(genData)
        setCareProviders(provData)
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
          title: 'Erro ao carregar perfil',
          description: err.message || 'Tente novamente',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [user],
  )

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Iniciais do Avatar
  const avatarInitials = useMemo(() => {
    const raw = basicProfile?.name || user?.name || user?.email || 'U'
    const parts = raw.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return raw.slice(0, 2).toUpperCase()
  }, [basicProfile?.name, user?.name, user?.email])

  // Idade calculada
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

  // Recálculo dinâmico do Preventive Health Score
  const scoreResult: PreventiveHealthScoreData = useMemo(() => {
    // Junta métricas gerais e sintomas (sem duplicar registros já presentes)
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

  // Recálculo dinâmico do Score do Diário Emocional (0 a 10)
  const emotionalScoreResult: EmotionalScoreSummary = useMemo(() => {
    return computeEmotionalScore(emotionalLogs)
  }, [emotionalLogs])

  // Score Geral (0–100) — mesma função da aba clínica e da Home (HomeScoresSection)
  const geralTotal = useMemo(() => {
    return computeScoreGeral(emotionalLogs, medications, metrics).total
  }, [emotionalLogs, medications, metrics])

  // Busca as métricas corporais mais recentes de peso, gordura % e massa magra
  const latestBodyMetrics = useMemo(() => {
    const weightMetrics = metrics
      .filter((m) => m.category === 'peso')
      .sort((a, b) => (b.date_time || '').localeCompare(a.date_time || ''))

    const latestWithWeight = weightMetrics.find(
      (m) => typeof m.numeric_value === 'number' && m.numeric_value > 0,
    )
    const latestWithFat = weightMetrics.find(
      (m) => typeof m.body_fat_pct === 'number' && m.body_fat_pct > 0,
    )
    const latestWithLean = weightMetrics.find(
      (m) => typeof m.lean_mass_kg === 'number' && m.lean_mass_kg > 0,
    )

    return {
      weightKg: latestWithWeight?.numeric_value ?? basicProfile?.weightKg ?? null,
      bodyFatPct: latestWithFat?.body_fat_pct ?? null,
      leanMassKg: latestWithLean?.lean_mass_kg ?? null,
    }
  }, [metrics, basicProfile?.weightKg])

  // Objeto unificado de dados iniciais para o topo
  const initialData: InitialProfileData = useMemo(() => {
    return {
      name: basicProfile?.name || user?.name || '',
      email: user?.email || '',
      age,
      gender: basicProfile?.gender || '',
      weightKg: latestBodyMetrics.weightKg,
      heightCm: basicProfile?.heightCm ?? null,
      bodyFatPct: latestBodyMetrics.bodyFatPct,
      leanMassKg: latestBodyMetrics.leanMassKg,
      bloodType: basicProfile?.bloodType || '',
    }
  }, [basicProfile, user, age, latestBodyMetrics])

  const handleOpenBasicInfo = () => {
    setActiveTab('basic')
    // Suave scroll para a seção se necessário
    const el = document.getElementById('basic-info-anchor')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleOpenEmotionalDiary = () => {
    navigate('/diario-emocional')
  }

  // Abre o painel próprio do Score Emocional — mesmo padrão do clique no Score Preventivo
  const handleOpenEmotionalScore = () => {
    setActiveTab('basic')
    const el = document.getElementById('emotional-score-anchor')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Handlers para Biomarcadores
  const handleAddBiomarker = async (
    item: Omit<ProfileBiomarker, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createBiomarker(item)
    setBiomarkers((prev) => [created, ...prev])
  }
  const handleDeleteBiomarker = async (id: string) => {
    await profileService.deleteBiomarker(id)
    setBiomarkers((prev) => prev.filter((b) => b.id !== id))
  }

  // Handlers para Conditions
  const handleAddCondition = async (
    item: Omit<ProfileCondition, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createCondition(item)
    setConditions((prev) => [created, ...prev])
  }
  const handleDeleteCondition = async (id: string) => {
    await profileService.deleteCondition(id)
    setConditions((prev) => prev.filter((c) => c.id !== id))
  }

  // Handlers para Alergias
  const handleAddAllergy = async (
    item: Omit<ProfileAllergy, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createAllergy(item)
    setAllergies((prev) => [created, ...prev])
  }
  const handleDeleteAllergy = async (id: string) => {
    await profileService.deleteAllergy(id)
    setAllergies((prev) => prev.filter((a) => a.id !== id))
  }

  // Handlers para Vacinas
  const handleAddVaccination = async (
    item: Omit<ProfileVaccination, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createVaccination(item)
    setVaccinations((prev) => [created, ...prev])
  }
  const handleDeleteVaccination = async (id: string) => {
    await profileService.deleteVaccination(id)
    setVaccinations((prev) => prev.filter((v) => v.id !== id))
  }

  // Handlers para Eventos
  const handleAddEvent = async (
    item: Omit<ProfileEvent, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createEvent(item)
    setEvents((prev) => [created, ...prev])
  }
  const handleDeleteEvent = async (id: string) => {
    await profileService.deleteEvent(id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  // Handlers para Genética
  const handleAddGenetics = async (
    item: Omit<ProfileGenetics, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createGenetics(item)
    setGenetics((prev) => [created, ...prev])
  }
  const handleDeleteGenetics = async (id: string) => {
    await profileService.deleteGenetics(id)
    setGenetics((prev) => prev.filter((g) => g.id !== id))
  }

  // Handlers para Care Providers
  const handleAddProvider = async (
    item: Omit<ProfileCareProvider, 'id' | 'user' | 'created' | 'updated'>,
  ) => {
    if (!user) return
    const created = await profileService.createCareProvider(item)
    setCareProviders((prev) => [created, ...prev])
  }
  const handleDeleteProvider = async (id: string) => {
    await profileService.deleteCareProvider(id)
    setCareProviders((prev) => prev.filter((p) => p.id !== id))
  }

  // Handlers para Lifestyle
  const handleSaveLifestyle = async (
    patch: Partial<Omit<ProfileLifestyle, 'id' | 'user' | 'created' | 'updated'>>,
  ) => {
    if (!user) return
    const updated = await profileService.saveLifestyle(patch, user.id)
    setLifestyle(updated)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentTab="Profile" />

      <main className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Card de Dados Iniciais no Topo + Dois Scores Lado a Lado (Estilo Guava) */}
        <ProfileOverviewHeader
          initialData={initialData}
          preventiveScore={scoreResult}
          emotionalScore={emotionalScoreResult}
          geralTotal={geralTotal}
          avatarInitials={avatarInitials}
          refreshing={refreshing}
          onRefresh={() => loadAllData(true)}
          onOpenBasicInfo={handleOpenBasicInfo}
          onOpenEmotional={handleOpenEmotionalScore}
        />

        {/* Navegação horizontal de abas das 10 seções */}
        <div className="border-b border-border/80">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conteúdo da aba selecionada */}
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Carregando seu espaço pessoal de saúde...
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. BASIC INFO (inclui o Preventive Health Score com destaque) */}
            {activeTab === 'basic' && (
              <div id="basic-info-anchor" className="space-y-6 scroll-mt-20">
                <PreventiveScoreCard
                  scoreData={scoreResult}
                  onNavigateTab={(tabId) => setActiveTab(tabId as ProfileTab)}
                  onNavigateRoute={(routePath) => navigate(routePath)}
                  metrics={metrics}
                  biomarkers={biomarkers}
                  exams={exams}
                  vaccinations={vaccinations}
                  lifestyle={lifestyle}
                />

                {/* Painel próprio do Score Emocional — mesmo padrão do Preventivo */}
                <EmotionalScorePanel
                  emotionalLogs={emotionalLogs}
                  score={emotionalScoreResult}
                  onOpenDiary={handleOpenEmotionalDiary}
                />
              </div>
            )}

            {/* 2. BIOMARKERS */}
            {activeTab === 'biomarkers' && (
              <BiomarkersSection
                items={biomarkers}
                exams={exams}
                userGender={basicProfile?.gender}
                onAdd={handleAddBiomarker}
                onDelete={handleDeleteBiomarker}
              />
            )}

            {/* 3. MEDICATIONS & SUPPLEMENTS */}
            {activeTab === 'medications' && (
              <MedicationsSupplementsSection medications={medications} />
            )}

            {/* 4. CONDITIONS & INJURIES */}
            {activeTab === 'conditions' && (
              <ConditionsSection
                items={conditions}
                onAdd={handleAddCondition}
                onDelete={handleDeleteCondition}
              />
            )}

            {/* 5. ALLERGIES */}
            {activeTab === 'allergies' && (
              <AllergiesSection
                items={allergies}
                onAdd={handleAddAllergy}
                onDelete={handleDeleteAllergy}
              />
            )}

            {/* 6. VACCINATIONS */}
            {activeTab === 'vaccinations' && (
              <VaccinationsSection
                items={vaccinations}
                onAdd={handleAddVaccination}
                onDelete={handleDeleteVaccination}
              />
            )}

            {/* 7. EVENTS */}
            {activeTab === 'events' && (
              <EventsSection items={events} onAdd={handleAddEvent} onDelete={handleDeleteEvent} />
            )}

            {/* 8. GENETICS */}
            {activeTab === 'genetics' && (
              <GeneticsSection
                items={genetics}
                onAdd={handleAddGenetics}
                onDelete={handleDeleteGenetics}
              />
            )}

            {/* 9. CARE PROVIDERS */}
            {activeTab === 'providers' && (
              <CareProvidersSection
                items={careProviders}
                onAdd={handleAddProvider}
                onDelete={handleDeleteProvider}
              />
            )}

            {/* 10. LIFESTYLE */}
            {activeTab === 'lifestyle' && (
              <LifestyleSection lifestyle={lifestyle} onSave={handleSaveLifestyle} />
            )}
          </div>
        )}
      </main>
    </div>
  )
}
export default ProfilePage
