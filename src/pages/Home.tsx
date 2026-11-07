import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService } from '@/services/health'
import { emotionalService } from '@/services/emotional'
import { mealService } from '@/services/mealsAndAi'
import { medicalService } from '@/services/medical'
import { HealthMetric, EmotionalLog, Meal, Diet } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Droplets,
  Coffee,
  Moon,
  Activity,
  Heart,
  Scale,
  Sparkles,
  UtensilsCrossed,
  FileText,
  Plus,
  Smile,
  ChevronRight,
  TrendingUp,
  Clock,
  Flame,
  ShieldAlert,
} from 'lucide-react'

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [emotionalLogs, setEmotionalLogs] = useState<EmotionalLog[]>([])
  const [recentMeals, setRecentMeals] = useState<Meal[]>([])
  const [activeDiets, setActiveDiets] = useState<Diet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [mList, eList, mealList, dietList] = await Promise.all([
        healthService.listUserMetrics(undefined, 30),
        emotionalService.listLogs(undefined, 5),
        mealService.listMeals(undefined),
        medicalService.listDiets(undefined),
      ])
      setMetrics(mList)
      setEmotionalLogs(eList)
      setRecentMeals(mealList.slice(0, 4))
      setActiveDiets(dietList.filter((d) => d.active))
    } catch (err) {
      console.error('Erro ao carregar dados do dia:', err)
    } finally {
      setLoading(false)
    }
  }

  // Resumo de hoje
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayMetrics = metrics.filter((m) => m.date_time.startsWith(todayStr))

  // Água consumida hoje
  const todayWater = todayMetrics
    .filter((m) => m.category === 'agua')
    .reduce((sum, m) => sum + (m.numeric_value || 0), 0)

  // Cafés tomados hoje
  const todayCoffee = todayMetrics
    .filter((m) => m.category === 'cafe')
    .reduce((sum, m) => sum + (m.numeric_value || 0), 0)

  // Último sono
  const lastSleep = metrics.find((m) => m.category === 'sono')
  // Último HRV
  const lastHrv = metrics.find((m) => m.category === 'hrv')
  // Última pressão
  const lastBloodPressure = metrics.find((m) => m.category === 'pressao')
  // Último peso
  const lastWeight = metrics.find((m) => m.category === 'peso')
  // Último Diário Emocional
  const latestMood = emotionalLogs[0]

  const quickAction = (cat: string) => {
    navigate(`/registrar?category=${cat}`)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Welcome Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-100 bg-emerald-800/40 px-2.5 py-1 rounded-full">
              Visão do Dia •{' '}
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">
              Olá, {user?.name ? user.name.split(' ')[0] : 'Cliente Soul'}!
            </h1>
            <p className="text-emerald-50 text-sm sm:text-base mt-1.5 opacity-90">
              Acompanhe seus sinais vitais, hábitos essenciais e mantenha sua rotina em sintonia com
              seu bem-estar.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/registrar')}
                className="bg-white text-emerald-900 hover:bg-emerald-50 font-medium text-xs sm:text-sm"
              >
                <Plus className="h-4 w-4 mr-1 text-emerald-600" />
                Registrar Hábito / Sinal
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/analises')}
                className="border-white/40 text-white hover:bg-white/20 text-xs sm:text-sm backdrop-blur-sm"
              >
                <Sparkles className="h-4 w-4 mr-1 text-teal-200" />
                Cruzamento Inteligente IA
              </Button>
            </div>
          </div>

          <div className="absolute right-4 -bottom-6 opacity-10 pointer-events-none hidden sm:block">
            <Activity className="h-64 w-64 text-white" />
          </div>
        </div>

        {/* Atalhos Rápidos de Lançamento */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <span>Lançamento Rápido</span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                1 clique
              </Badge>
            </h2>
            <Link
              to="/registrar"
              className="text-xs text-emerald-600 hover:underline flex items-center"
            >
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            <Button
              variant="outline"
              onClick={() => quickAction('agua')}
              className="h-auto py-3 flex-col gap-1.5 border-blue-100 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 dark:border-blue-950"
            >
              <Droplets className="h-5 w-5 text-blue-500" />
              <span className="text-xs font-medium">Água (+250ml)</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => quickAction('cafe')}
              className="h-auto py-3 flex-col gap-1.5 border-amber-100 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 dark:border-amber-950"
            >
              <Coffee className="h-5 w-5 text-amber-700" />
              <span className="text-xs font-medium">Café (+1 xíc)</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => quickAction('sono')}
              className="h-auto py-3 flex-col gap-1.5 border-indigo-100 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 dark:border-indigo-950"
            >
              <Moon className="h-5 w-5 text-indigo-500" />
              <span className="text-xs font-medium">Sono / Noite</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => quickAction('pressao')}
              className="h-auto py-3 flex-col gap-1.5 border-rose-100 hover:bg-rose-50/60 dark:hover:bg-rose-950/30 dark:border-rose-950"
            >
              <Heart className="h-5 w-5 text-rose-500" />
              <span className="text-xs font-medium">Pressão Arterial</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/diario-emocional')}
              className="h-auto py-3 flex-col gap-1.5 border-violet-100 hover:bg-violet-50/60 dark:hover:bg-violet-950/30 dark:border-violet-950"
            >
              <Smile className="h-5 w-5 text-violet-500" />
              <span className="text-xs font-medium">Diário de Humor</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/refeicoes')}
              className="h-auto py-3 flex-col gap-1.5 border-emerald-100 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 dark:border-emerald-950"
            >
              <UtensilsCrossed className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-medium">Foto Refeição</span>
            </Button>
          </div>
        </section>

        {/* Indicadores Principais de Hoje */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Sinais Vitais e Hábitos Recentes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Água */}
            <Card className="border-border/60 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Água Hoje</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-blue-600">{todayWater}</span>
                    <span className="text-xs text-muted-foreground">ml</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Meta sugerida: 2.500 ml
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Droplets className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Sono */}
            <Card className="border-border/60 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Último Sono</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-indigo-600">
                      {lastSleep?.numeric_value ? `${lastSleep.numeric_value}h` : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground">registrado</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
                    {lastSleep?.notes || 'Dispositivo / Manual'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Moon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* HRV */}
            <Card className="border-border/60 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">HRV (VFC)</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-emerald-600">
                      {lastHrv?.numeric_value ? `${lastHrv.numeric_value}` : '--'}
                    </span>
                    <span className="text-xs text-muted-foreground">ms</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {lastHrv?.numeric_value && lastHrv.numeric_value >= 50
                      ? 'Ótima recuperação do SNA'
                      : 'Equilíbrio autonômico'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            {/* Café & Estímulo */}
            <Card className="border-border/60 hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Café Hoje</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-amber-700">{todayCoffee}</span>
                    <span className="text-xs text-muted-foreground">xícaras</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Evite após 14h para proteger o sono
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Coffee className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Duas colunas: Diário emocional & Dieta ativa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Diário emocional */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smile className="h-4 w-4 text-violet-600" />
                  Estado Emocional Recente
                </CardTitle>
                <CardDescription className="text-xs">
                  Acompanhamento de humor, estresse e energia
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/diario-emocional')}
                className="text-xs text-violet-600"
              >
                Fazer Check-in
              </Button>
            </CardHeader>
            <CardContent>
              {latestMood ? (
                <div className="bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">
                      {latestMood.mood_label}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-white border-violet-200 text-violet-800 text-xs"
                    >
                      Nota {latestMood.mood_score} / 5
                    </Badge>
                  </div>
                  {latestMood.affecting_factors && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">O que mais afetou: </span>
                      {latestMood.affecting_factors}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-violet-100">
                    <span>⚡ Energia: {latestMood.energy_level || 3}/5</span>
                    <span>🌊 Estresse: {latestMood.stress_level || 3}/5</span>
                    <span className="ml-auto text-[11px]">{latestMood.date}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground space-y-2">
                  <p className="text-sm">Nenhum check-in emocional registrado hoje.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/diario-emocional')}
                    className="text-xs"
                  >
                    Registrar Como Estou Hoje
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dieta ativa e Prescrição Soul */}
          <Card className="border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  Prescrição Nutricional Ativa
                </CardTitle>
                <CardDescription className="text-xs">
                  Diretrizes alimentares da equipe Clínica Soul
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/exames-dietas')}
                className="text-xs text-emerald-600"
              >
                Ver Detalhes
              </Button>
            </CardHeader>
            <CardContent>
              {activeDiets.length > 0 ? (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-emerald-950 dark:text-emerald-200">
                      {activeDiets[0].title}
                    </h3>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Em andamento</Badge>
                  </div>
                  {activeDiets[0].objective && (
                    <p className="text-xs text-muted-foreground italic">
                      Objetivo: {activeDiets[0].objective}
                    </p>
                  )}
                  {activeDiets[0].prescription && (
                    <div className="text-xs text-foreground/90 bg-white/70 dark:bg-card/70 p-2.5 rounded-lg border border-emerald-100 max-h-28 overflow-y-auto whitespace-pre-line leading-relaxed">
                      {activeDiets[0].prescription}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground space-y-2">
                  <p className="text-sm">Nenhuma dieta ativa cadastrada no momento.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/exames-dietas')}
                    className="text-xs"
                  >
                    Adicionar Dieta / Foto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Refeições Recentes (com IA) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
                Refeições Registradas
              </h2>
              <p className="text-xs text-muted-foreground">
                Pratos com alimentos identificados e peso estimado pela IA
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/refeicoes')}
              className="text-xs text-emerald-600"
            >
              Registrar Refeição
            </Button>
          </div>

          {recentMeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentMeals.map((meal) => (
                <Card
                  key={meal.id}
                  className="overflow-hidden border-border/60 hover:shadow-md transition-shadow"
                >
                  {meal.photo_url || meal.photo ? (
                    <div className="h-36 w-full overflow-hidden bg-muted relative">
                      <img
                        src={meal.photo || meal.photo_url}
                        alt={meal.title || 'Refeição'}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white text-[10px] backdrop-blur-sm">
                        {meal.meal_type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ) : (
                    <div className="h-24 bg-muted/50 flex items-center justify-center text-muted-foreground">
                      <UtensilsCrossed className="h-6 w-6 opacity-40" />
                    </div>
                  )}
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-semibold text-xs text-foreground line-clamp-1">
                        {meal.title || 'Refeição Registrada'}
                      </h4>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {meal.date_time.slice(11, 16) || meal.date_time}
                      </span>
                    </div>

                    {meal.items_detected && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {meal.items_detected}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1 text-[11px] font-medium text-foreground">
                      {meal.estimated_weight_g ? (
                        <span className="bg-muted px-2 py-0.5 rounded text-[10px]">
                          ⚖️ {meal.estimated_weight_g}g
                        </span>
                      ) : null}
                      {meal.estimated_calories ? (
                        <span className="bg-amber-50 text-amber-800 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[10px]">
                          🔥 {meal.estimated_calories} kcal
                        </span>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-muted/20 border border-dashed rounded-xl p-6 text-center text-muted-foreground space-y-2">
              <p className="text-xs">Nenhuma refeição registrada ainda.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/refeicoes')}
                className="text-xs"
              >
                Fotografar ou Descrever Prato
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
