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
import { computePreventiveHealthScore, PreventiveHealthScoreData } from '@/lib/preventiveScore'

import { BasicInfoSection } from '@/components/profile/BasicInfoSection'
import { PreventiveScoreCard } from '@/components/profile/PreventiveScoreCard'
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
    return computePreventiveHealthScore({
      metrics,
      exams,
      biomarkers,
      lifestyle,
      vaccinations,
      userAge: age ?? undefined,
      userGender: basicProfile?.gender,
    })
  }, [metrics, exams, biomarkers, lifestyle, vaccinations, age, basicProfile?.gender])

  // Handlers para Basic Info
  const handleSaveBasic = async (patch: Partial<UserBasicProfile>) => {
    if (!user) return
    await profileService.updateBasicProfile(patch, user.id)
    const updated = await profileService.getBasicProfile(user.id)
    setBasicProfile(updated)
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
        {/* Cabeçalho do Perfil (Estilo Guava) */}
        <div className="rounded-2xl border border-border/70 bg-gradient-to-r from-card via-card to-primary/5 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xl md:text-2xl flex items-center justify-center shadow-inner shrink-0">
                {avatarInitials}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    {basicProfile?.name || user?.name || 'Meu Perfil'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck className="w-3 h-3" />
                    Paciente Soul
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>

                {/* Badges biométricos rápidos */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {age !== null && (
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                      {age} anos
                    </span>
                  )}
                  {basicProfile?.gender && (
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                      {basicProfile.gender}
                    </span>
                  )}
                  {basicProfile?.heightCm && (
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                      {basicProfile.heightCm} cm
                    </span>
                  )}
                  {basicProfile?.weightKg && (
                    <span className="px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                      {basicProfile.weightKg} kg
                    </span>
                  )}
                  {basicProfile?.bloodType && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">
                      {basicProfile.bloodType}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadAllData(true)}
                disabled={refreshing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </Button>
            </div>
          </div>
        </div>

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
              <div className="space-y-6">
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
                {basicProfile && (
                  <BasicInfoSection profile={basicProfile} onSave={handleSaveBasic} />
                )}
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
