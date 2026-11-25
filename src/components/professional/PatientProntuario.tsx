import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { healthService } from '@/services/health'
import { medicalService } from '@/services/medical'
import { emotionalService } from '@/services/emotional'
import { mealService, aiAnalysisService } from '@/services/mealsAndAi'
import { medicationService, Medication } from '@/services/medications'
import { HealthMetric, Exam, Diet, EmotionalLog, Meal, MedicalRecord, User } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Sparkles, Phone, Mail, BrainCircuit, Plus } from 'lucide-react'
import React from 'react'
import {
  MedicacoesTab,
  SintomasTab,
  EmocionalTab,
  BiomarcadoresTab,
  ScoreGeralTab,
  PatientBiomarkerRow,
} from './PatientExtendedTabs'
import { PatientMedidasTab } from './PatientMedidasTab'

interface PatientProntuarioProps {
  client: User
}

/**
 * Prontuário completo do paciente (header, Síntese IA, alertas e abas
 * Medidas/Medicações/Sintomas/Emocional/Biomarcadores/Exames/Refeições/Dietas
 * e Score Geral). Reaproveitado pelo painel do profissional e pela página
 * própria do paciente (/profissional/paciente/:id).
 */
export function PatientProntuario({ client }: PatientProntuarioProps) {
  // Dados do cliente
  const [clientMetrics, setClientMetrics] = useState<HealthMetric[]>([])
  const [clientExams, setClientExams] = useState<Exam[]>([])
  const [clientDiets, setClientDiets] = useState<Diet[]>([])
  const [clientMeals, setClientMeals] = useState<Meal[]>([])
  const [clientEmotional, setClientEmotional] = useState<EmotionalLog[]>([])
  const [clientMedical, setClientMedical] = useState<MedicalRecord[]>([])
  const [clientMeds, setClientMeds] = useState<Medication[]>([])
  const [clientBiomarkers, setClientBiomarkers] = useState<PatientBiomarkerRow[]>([])
  const [loadingClientData, setLoadingClientData] = useState(true)

  // Nova prescrição rápida de dieta para o cliente
  const [showAddDiet, setShowAddDiet] = useState(false)
  const [dietTitle, setDietTitle] = useState('')
  const [dietPrescription, setDietPrescription] = useState('')
  const [dietObjective, setDietObjective] = useState('')

  // Análise clínica com IA para este paciente
  const [runningPatientAi, setRunningPatientAi] = useState(false)
  const [patientAiInsights, setPatientAiInsights] = useState<string | null>(null)

  useEffect(() => {
    loadClientData(client.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id])

  const loadClientData = async (clientId: string) => {
    try {
      setLoadingClientData(true)
      setPatientAiInsights(null)
      const [m, ex, d, meals, emo, med, meds, bioms] = await Promise.all([
        healthService.listUserMetrics(clientId, 50),
        medicalService.listExams(clientId),
        medicalService.listDiets(clientId),
        mealService.listMeals(clientId),
        emotionalService.listLogs(clientId, 20),
        medicalService.listMedicalRecords(clientId),
        // Medicações e biomarcadores do paciente (a regra da coleção permite ao
        // profissional ler registros dos clientes vinculados).
        pb.collection('medications').getFullList({
          filter: `user = "${clientId}"`,
          sort: 'created',
        }),
        pb.collection('profile_biomarkers').getList(1, 100, {
          filter: `user = "${clientId}"`,
          sort: '-date',
        }),
      ])
      setClientMetrics(m)
      setClientExams(ex)
      setClientDiets(d)
      setClientMeals(meals)
      setClientEmotional(emo)
      setClientMedical(med)
      setClientMeds(meds.map((rec: any) => medicationService.fromRecord(rec)))
      setClientBiomarkers(
        bioms.items.map((rec: any) => ({
          id: rec.id,
          name: rec.name ?? rec.title ?? 'Biomarcador',
          value: String(rec.value ?? ''),
          unit: rec.unit ?? '',
          date: rec.date ?? '',
        })),
      )
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar dados do paciente')
    } finally {
      setLoadingClientData(false)
    }
  }

  const handlePrescribeDiet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dietTitle) return
    try {
      await medicalService.createDiet({
        userId: client.id,
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
      loadClientData(client.id)
    } catch (err) {
      toast.error('Erro ao prescrever dieta')
    }
  }

  const handleRunAiForClient = async () => {
    setRunningPatientAi(true)
    try {
      const res = await aiAnalysisService.runCorrelationAnalysis({
        userId: client.id,
        variables: [
          'sono',
          'cafe',
          'hrv',
          'humor',
          'pressao',
          // Histórico de uso pedido no prontuário completo:
          'medicações e adesão',
          'sintomas',
          'atividade física',
          'estilo de vida (diário emocional/Vida 360º)',
        ],
        question:
          'Prontuário completo: avaliação clínica global do paciente integrando o histórico de uso — medicações e adesão, sintomas, atividade física, estilo de vida (diário emocional/Vida 360º) e biomarcadores.',
      })
      setPatientAiInsights(res.insights)
      toast.success('Síntese clínica gerada pela IA!')
    } catch (err: any) {
      // Mostra o detalhe devolvido pelo backend (ex: "Falha na inteligência
      // artificial: ...") em vez de um erro genérico sem contexto.
      const detail =
        err?.response?.error ||
        err?.response?.message ||
        err?.message ||
        'Falha inesperada ao contatar o serviço de IA.'
      // status 0 sem corpo = a conexão com o backend morreu antes da resposta
      // (tempo limite do gateway com o modelo gerando) — o SDK reporta isso
      // como o genérico "Something went wrong"; traduzimos para a causa real.
      const isNetworkLoss =
        (err?.status === 0 || err?.isAbort) && (!detail || /something went wrong/i.test(detail))
      toast.error(
        'Erro ao gerar análise: ' +
          (isNetworkLoss
            ? 'tempo limite excedido ao gerar a síntese — tente novamente em alguns segundos.'
            : detail),
        { duration: 8000 },
      )
    } finally {
      setRunningPatientAi(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header do Paciente */}
      <Card className="border-border/60 bg-gradient-to-r from-emerald-50/60 via-card to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/20">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow">
              {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">{client.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {client.email}
                </span>
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {client.phone}
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
        <TabsList className="grid grid-cols-5 max-w-2xl">
          <TabsTrigger value="medidas" className="text-xs">
            Medidas ({clientMetrics.length})
          </TabsTrigger>
          <TabsTrigger value="medicacoes" className="text-xs">
            Medicações ({clientMeds.length})
          </TabsTrigger>
          <TabsTrigger value="sintomas" className="text-xs">
            Sintomas
          </TabsTrigger>
          <TabsTrigger value="emocional" className="text-xs">
            Emocional 360º
          </TabsTrigger>
          <TabsTrigger value="exames" className="text-xs">
            Exames ({clientExams.length})
          </TabsTrigger>
          <TabsTrigger value="refeicoes" className="text-xs">
            Refeições ({clientMeals.length})
          </TabsTrigger>
          <TabsTrigger value="biomarcadores" className="text-xs">
            Biomarcadores ({clientBiomarkers.length})
          </TabsTrigger>
          <TabsTrigger value="dietas" className="text-xs">
            Dietas ({clientDiets.length})
          </TabsTrigger>
          <TabsTrigger value="score" className="text-xs">
            Score Geral
          </TabsTrigger>
        </TabsList>

        {/* ABA MEDICAÇÕES */}
        <TabsContent value="medicacoes" className="mt-4">
          <MedicacoesTab meds={clientMeds} metrics={clientMetrics} loading={loadingClientData} />
        </TabsContent>

        {/* ABA SINTOMAS */}
        <TabsContent value="sintomas" className="mt-4">
          <SintomasTab metrics={clientMetrics} loading={loadingClientData} />
        </TabsContent>

        {/* ABA EMOCIONAL / VIDA 360º */}
        <TabsContent value="emocional" className="mt-4">
          <EmocionalTab logs={clientEmotional} />
        </TabsContent>

        {/* ABA MEDIDAS — modelo visual completo do app do cliente (somente leitura) */}
        <TabsContent value="medidas" className="mt-4">
          <PatientMedidasTab
            clientId={client.id}
            metrics={clientMetrics}
            loading={loadingClientData}
          />
        </TabsContent>

        {/* ABA EXAMES */}
        <TabsContent value="exames" className="space-y-3 mt-4">
          <h3 className="text-sm font-semibold text-foreground">Exames Anexados ao Prontuário</h3>
          {clientExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {clientExams.map((ex) => (
                <Card key={ex.id} className="border-border/60">
                  <CardHeader className="p-3 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{ex.title}</span>
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
              {loadingClientData ? 'Carregando exames...' : 'Nenhum exame cadastrado.'}
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
                <div key={meal.id} className="border rounded-xl p-3 bg-card space-y-2 text-xs">
                  {meal.photo || meal.photo_url ? (
                    <img
                      src={meal.photo || meal.photo_url}
                      alt={`Foto da refeição ${meal.title || ''}`.trim()}
                      width={320}
                      height={128}
                      className="h-32 w-full object-cover rounded-lg"
                    />
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {meal.title || 'Refeição'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{meal.date_time}</span>
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
              {loadingClientData ? 'Carregando refeições...' : 'Nenhuma refeição registrada.'}
            </div>
          )}
        </TabsContent>

        {/* ABA BIOMARCADORES */}
        <TabsContent value="biomarcadores" className="mt-4">
          <BiomarcadoresTab biomarkers={clientBiomarkers} loading={loadingClientData} />
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
                <div key={d.id} className="p-3 rounded-lg border bg-card space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{d.title}</span>
                    {d.active && (
                      <Badge className="bg-emerald-600 text-white text-[10px]">Ativa</Badge>
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
              {loadingClientData
                ? 'Carregando dietas...'
                : 'Nenhuma dieta cadastrada para este paciente.'}
            </div>
          )}
        </TabsContent>

        {/* ABA SCORE GERAL */}
        <TabsContent value="score" className="mt-4">
          <ScoreGeralTab metrics={clientMetrics} meds={clientMeds} logs={clientEmotional} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
