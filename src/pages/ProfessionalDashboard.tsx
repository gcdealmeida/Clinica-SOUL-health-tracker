import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/auth'
import { healthService } from '@/services/health'
import { medicalService } from '@/services/medical'
import { emotionalService } from '@/services/emotional'
import { mealService, aiAnalysisService } from '@/services/mealsAndAi'
import { User, HealthMetric, Exam, Diet, EmotionalLog, Meal, MedicalRecord } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Users,
  Search,
  Activity,
  FileText,
  UtensilsCrossed,
  HeartPulse,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  BrainCircuit,
  Plus,
} from 'lucide-react'

export default function ProfessionalDashboardPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<User[]>([])
  const [selectedClient, setSelectedClient] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Dados do cliente selecionado
  const [clientMetrics, setClientMetrics] = useState<HealthMetric[]>([])
  const [clientExams, setClientExams] = useState<Exam[]>([])
  const [clientDiets, setClientDiets] = useState<Diet[]>([])
  const [clientMeals, setClientMeals] = useState<Meal[]>([])
  const [clientEmotional, setClientEmotional] = useState<EmotionalLog[]>([])
  const [clientMedical, setClientMedical] = useState<MedicalRecord[]>([])
  const [loadingClientData, setLoadingClientData] = useState(false)

  // Nova prescrição rápida de dieta para o cliente
  const [showAddDiet, setShowAddDiet] = useState(false)
  const [dietTitle, setDietTitle] = useState('')
  const [dietPrescription, setDietPrescription] = useState('')
  const [dietObjective, setDietObjective] = useState('')

  // Análise clínica com IA para este paciente
  const [runningPatientAi, setRunningPatientAi] = useState(false)
  const [patientAiInsights, setPatientAiInsights] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedClient) {
      loadClientData(selectedClient.id)
    }
  }, [selectedClient])

  const loadClients = async () => {
    try {
      setLoading(true)
      const list = await authService.listClients()
      setClients(list)
      if (list.length > 0 && !selectedClient) {
        setSelectedClient(list[0])
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao listar clientes')
    } finally {
      setLoading(false)
    }
  }

  const loadClientData = async (clientId: string) => {
    try {
      setLoadingClientData(true)
      setPatientAiInsights(null)
      const [m, ex, d, meals, emo, med] = await Promise.all([
        healthService.listUserMetrics(clientId, 50),
        medicalService.listExams(clientId),
        medicalService.listDiets(clientId),
        mealService.listMeals(clientId),
        emotionalService.listLogs(clientId, 20),
        medicalService.listMedicalRecords(clientId),
      ])
      setClientMetrics(m)
      setClientExams(ex)
      setClientDiets(d)
      setClientMeals(meals)
      setClientEmotional(emo)
      setClientMedical(med)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar dados do paciente')
    } finally {
      setLoadingClientData(false)
    }
  }

  const handlePrescribeDiet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClient || !dietTitle) return
    try {
      await medicalService.createDiet({
        userId: selectedClient.id,
        title: dietTitle,
        objective: dietObjective,
        prescription: dietPrescription,
        active: true,
      })
      toast.success('Prescrição de dieta adicionada para o paciente!')
      setShowAddDiet(false)
      setDietTitle('')
      setDietObjective('')
      setDietPrescription('')
      loadClientData(selectedClient.id)
    } catch (err) {
      toast.error('Erro ao prescrever dieta')
    }
  }

  const handleRunAiForClient = async () => {
    if (!selectedClient) return
    setRunningPatientAi(true)
    try {
      const res = await aiAnalysisService.runCorrelationAnalysis({
        userId: selectedClient.id,
        variables: ['sono', 'cafe', 'hrv', 'humor', 'pressao'],
        question: 'Avaliação clínica global da evolução de saúde integrativa deste paciente.',
      })
      setPatientAiInsights(res.insights)
      toast.success('Síntese clínica gerada pela IA!')
    } catch (err) {
      toast.error('Erro ao gerar análise')
    } finally {
      setRunningPatientAi(false)
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header do painel profissional */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                Painel do Profissional Clínica Soul
              </h1>
              <Badge className="bg-amber-600 text-white text-xs">Visão Médica / Terapêutica</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Acompanhamento longitudinal de evolução, medidas diárias, exames e intervenções
              nutricionais
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna da Esquerda: Lista de Clientes */}
          <Card className="lg:col-span-4 border-border/60 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Pacientes / Clientes
                </span>
                <Badge variant="secondary" className="text-xs">
                  {clients.length}
                </Badge>
              </CardTitle>
              <div className="pt-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Carregando pacientes...
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const isSelected = selectedClient?.id === client.id
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClient(client)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500 shadow-sm'
                          : 'border-border/70 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                        {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate">
                          {client.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{client.email}</p>
                        {client.phone && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" /> {client.phone}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhum paciente encontrado.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coluna da Direita: Prontuário e Evolução do Cliente Selecionado */}
          <div className="lg:col-span-8 space-y-6">
            {selectedClient ? (
              <>
                {/* Header do Paciente Selecionado */}
                <Card className="border-border/60 bg-gradient-to-r from-emerald-50/60 via-card to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow">
                        {selectedClient.name ? selectedClient.name.slice(0, 2).toUpperCase() : 'CL'}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{selectedClient.name}</h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {selectedClient.email}
                          </span>
                          {selectedClient.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {selectedClient.phone}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] bg-white dark:bg-card">
                            Cliente Soul
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleRunAiForClient}
                        disabled={runningPatientAi}
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        {runningPatientAi ? 'Analisando...' : 'Síntese IA do Paciente'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Síntese IA quando gerada */}
                {patientAiInsights && (
                  <Card className="border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-emerald-900 dark:text-emerald-200">
                        <BrainCircuit className="h-4 w-4 text-emerald-600" />
                        Parecer Integrativo da Inteligência Artificial
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs leading-relaxed whitespace-pre-line text-foreground/90 bg-card p-3 rounded-lg border">
                      {patientAiInsights}
                    </CardContent>
                  </Card>
                )}

                {/* Alertas Médicos Rápidos (Cirurgias & Alergias) */}
                {clientMedical.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {clientMedical.map((m) => (
                      <Badge
                        key={m.id}
                        variant="outline"
                        className={`text-xs py-1 px-2.5 ${
                          m.type === 'alergia'
                            ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300'
                        }`}
                      >
                        <span className="font-bold mr-1">[{m.type.toUpperCase()}]:</span> {m.title}
                        {m.severity ? ` (${m.severity})` : ''}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Abas com a evolução de saúde do paciente */}
                <Tabs defaultValue="medidas" className="w-full">
                  <TabsList className="grid grid-cols-4 max-w-lg">
                    <TabsTrigger value="medidas" className="text-xs">
                      Medidas ({clientMetrics.length})
                    </TabsTrigger>
                    <TabsTrigger value="exames" className="text-xs">
                      Exames ({clientExams.length})
                    </TabsTrigger>
                    <TabsTrigger value="refeicoes" className="text-xs">
                      Refeições ({clientMeals.length})
                    </TabsTrigger>
                    <TabsTrigger value="dietas" className="text-xs">
                      Dietas ({clientDiets.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* ABA MEDIDAS */}
                  <TabsContent value="medidas" className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Histórico de Sinais Vitais e Hábitos Registrados
                    </h3>
                    {clientMetrics.length > 0 ? (
                      <div className="space-y-2 max-h-[420px] overflow-y-auto">
                        {clientMetrics.map((m) => (
                          <div
                            key={m.id}
                            className="p-2.5 rounded-lg border bg-card flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {m.category}
                                </Badge>
                                <span className="font-semibold text-foreground">
                                  {m.numeric_value !== undefined && m.numeric_value !== null
                                    ? m.numeric_value
                                    : m.text_value}{' '}
                                  {m.unit}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {m.date_time}
                                {m.notes && <span className="text-foreground/80">• {m.notes}</span>}
                              </p>
                            </div>
                            {m.attachment && (
                              <a
                                href={m.attachment}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 underline"
                              >
                                Ver Anexo
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
                        Nenhuma medida lançada por este paciente.
                      </div>
                    )}
                  </TabsContent>

                  {/* ABA EXAMES */}
                  <TabsContent value="exames" className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Exames Anexados ao Prontuário
                    </h3>
                    {clientExams.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {clientExams.map((ex) => (
                          <Card key={ex.id} className="border-border/60">
                            <CardHeader className="p-3 pb-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-foreground">
                                  {ex.title}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {ex.status || 'Normal'}
                                </Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {ex.type} • {ex.date} {ex.laboratory ? `• ${ex.laboratory}` : ''}
                              </span>
                            </CardHeader>
                            <CardContent className="p-3 pt-1 space-y-1.5 text-xs">
                              {ex.summary_results && (
                                <p className="bg-muted/40 p-2 rounded text-[11px] font-mono leading-relaxed">
                                  {ex.summary_results}
                                </p>
                              )}
                              {ex.file && (
                                <a
                                  href={ex.file}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 text-[11px] underline block"
                                >
                                  Abrir Laudo Completo
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
                        Nenhum exame cadastrado.
                      </div>
                    )}
                  </TabsContent>

                  {/* ABA REFEIÇÕES */}
                  <TabsContent value="refeicoes" className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-foreground">
                      Fotos de Pratos & Estimativa de Calorias (IA)
                    </h3>
                    {clientMeals.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clientMeals.map((meal) => (
                          <div
                            key={meal.id}
                            className="border rounded-xl p-3 bg-card space-y-2 text-xs"
                          >
                            {meal.photo || meal.photo_url ? (
                              <img
                                src={meal.photo || meal.photo_url}
                                alt="Refeição"
                                className="h-32 w-full object-cover rounded-lg"
                              />
                            ) : null}
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">
                                {meal.title || 'Refeição'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {meal.date_time}
                              </span>
                            </div>
                            {meal.items_detected && (
                              <p className="text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded">
                                {meal.items_detected}
                              </p>
                            )}
                            <div className="flex items-center gap-2 text-[10px]">
                              {meal.estimated_weight_g && (
                                <Badge variant="secondary">⚖️ {meal.estimated_weight_g}g</Badge>
                              )}
                              {meal.estimated_calories && (
                                <Badge variant="outline">🔥 {meal.estimated_calories} kcal</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
                        Nenhuma refeição registrada.
                      </div>
                    )}
                  </TabsContent>

                  {/* ABA DIETAS */}
                  <TabsContent value="dietas" className="space-y-3 mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Dietas & Prescrições do Paciente
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setShowAddDiet(!showAddDiet)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        {showAddDiet ? 'Fechar' : 'Prescrever Dieta'}
                      </Button>
                    </div>

                    {showAddDiet && (
                      <Card className="border-emerald-200 bg-emerald-50/20 p-4 space-y-3">
                        <form onSubmit={handlePrescribeDiet} className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Título da Prescrição</Label>
                            <Input
                              placeholder="Ex: Protocolo de Otimização Mitocondrial"
                              value={dietTitle}
                              onChange={(e) => setDietTitle(e.target.value)}
                              className="text-xs"
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Objetivo Clínico</Label>
                            <Input
                              placeholder="Ex: Redução da esteatose hepática e melhora de energia"
                              value={dietObjective}
                              onChange={(e) => setDietObjective(e.target.value)}
                              className="text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Instruções / Cardápio Prescrito</Label>
                            <textarea
                              rows={4}
                              placeholder="Orientações de café, almoço, jantar, suplementação..."
                              value={dietPrescription}
                              onChange={(e) => setDietPrescription(e.target.value)}
                              className="w-full text-xs rounded-md border p-2"
                              required
                            />
                          </div>
                          <Button type="submit" size="sm" className="bg-emerald-600 text-xs">
                            Gravar Prescrição no Prontuário
                          </Button>
                        </form>
                      </Card>
                    )}

                    {clientDiets.length > 0 ? (
                      <div className="space-y-3">
                        {clientDiets.map((d) => (
                          <div
                            key={d.id}
                            className="p-3 rounded-lg border bg-card space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm text-foreground">
                                {d.title}
                              </span>
                              {d.active && (
                                <Badge className="bg-emerald-600 text-white text-[10px]">
                                  Ativa
                                </Badge>
                              )}
                            </div>
                            {d.objective && (
                              <p className="text-[11px] text-muted-foreground italic">
                                Objetivo: {d.objective}
                              </p>
                            )}
                            {d.prescription && (
                              <div className="bg-muted/40 p-2.5 rounded text-[11px] whitespace-pre-line leading-relaxed">
                                {d.prescription}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
                        Nenhuma dieta cadastrada para este paciente.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="text-center py-20 text-muted-foreground text-sm border rounded-xl">
                Selecione um paciente na lista para visualizar o prontuário e evolução.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
