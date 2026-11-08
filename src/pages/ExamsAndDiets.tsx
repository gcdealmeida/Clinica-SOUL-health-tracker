import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { medicalService } from '@/services/medical'
import { Exam, Diet, MedicalRecord } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { todayStr } from '@/lib/localDate'
import {
  FileText,
  Utensils,
  ShieldAlert,
  Plus,
  Trash2,
  Calendar,
  Upload,
  CheckCircle,
  AlertTriangle,
  Building,
  Activity,
  HeartCrack,
  Sparkles,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { prepareExamPagesForAi, analyzeExamWithAi } from '@/services/examReader'

export default function ExamsAndDietsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'exames' | 'dietas' | 'historico'>('exames')

  // Lists
  const [exams, setExams] = useState<Exam[]>([])
  const [diets, setDiets] = useState<Diet[]>([])
  const [medRecords, setMedRecords] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Modais de criação (toggle forms)
  const [showExamForm, setShowExamForm] = useState(false)
  const [showDietForm, setShowDietForm] = useState(false)
  const [showMedForm, setShowMedForm] = useState(false)

  // Form Exames
  const [examTitle, setExamTitle] = useState('')
  const [examType, setExamType] = useState('Exame de Sangue')
  const [examDate, setExamDate] = useState(() => todayStr())
  const [examLab, setExamLab] = useState('')
  const [examSummary, setExamSummary] = useState('')
  const [examStatus, setExamStatus] = useState<'normal' | 'alterado' | 'pendente'>('normal')
  const [examFile, setExamFile] = useState<File | null>(null)
  const [analyzingExamId, setAnalyzingExamId] = useState<string | null>(null)
  const [analyzingProgress, setAnalyzingProgress] = useState<string>('')

  // Form Dietas
  const [dietTitle, setDietTitle] = useState('')
  const [dietObjective, setDietObjective] = useState('')
  const [dietPrescription, setDietPrescription] = useState('')
  const [dietPhoto, setDietPhoto] = useState<File | null>(null)

  // Form Histórico (cirurgias e alergias)
  const [medType, setMedType] = useState<
    'cirurgia' | 'alergia' | 'doenca_previa' | 'medicamento_continuo'
  >('cirurgia')
  const [medTitle, setMedTitle] = useState('')
  const [medDate, setMedDate] = useState('')
  const [medDesc, setMedDesc] = useState('')
  const [medSeverity, setMedSeverity] = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [exList, dList, mList] = await Promise.all([
        medicalService.listExams(),
        medicalService.listDiets(),
        medicalService.listMedicalRecords(),
      ])
      setExams(exList)
      setDiets(dList)
      setMedRecords(mList)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar registros médicos')
    } finally {
      setLoading(false)
    }
  }

  // Análise inteligente de exame existente ou recém-criado
  const handleAnalyzeExamWithAi = async (exam: Exam) => {
    if (!exam.file) {
      toast.error('Este exame não possui arquivo ou foto anexada para leitura.')
      return
    }

    setAnalyzingExamId(exam.id)
    setAnalyzingProgress('Carregando e renderizando documento...')
    try {
      toast.info('Iniciando leitura inteligente do exame com IA...')
      // Renderiza as páginas do PDF ou imagem em canvas client-side
      const pages = await prepareExamPagesForAi(exam.file, undefined, 1280, 0.9)
      if (pages.length === 0) {
        throw new Error('Não foi possível extrair páginas do arquivo para leitura.')
      }

      setAnalyzingProgress(`Interpretando ${pages.length} página(s) com IA clínica...`)
      const result = await analyzeExamWithAi({
        examId: exam.id,
        images: pages,
        title: exam.title,
        fallbackSource: exam.file,
      })

      if (result.success) {
        toast.success(
          `Exame interpretado com sucesso! ${result.biomarkers_extracted} biomarcador(es) atualizado(s) no seu perfil.`,
        )
      } else {
        toast.success('Exame processado pela IA.')
      }
      await loadAll()
    } catch (err: any) {
      console.error(err)
      const msg =
        err?.response?.error ||
        err?.response?.message ||
        err?.message ||
        'Não foi possível analisar o exame com IA neste momento.'
      toast.error(typeof msg === 'string' ? msg : 'Erro ao processar exame com IA')
    } finally {
      setAnalyzingExamId(null)
      setAnalyzingProgress('')
    }
  }

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!examTitle || !examType || !examDate) {
      toast.error('Preencha os campos obrigatórios do exame')
      return
    }
    setSaving(true)
    try {
      const createdExam = await medicalService.createExam({
        title: examTitle,
        type: examType,
        date: examDate,
        laboratory: examLab,
        summary_results: examSummary,
        status: examStatus,
        file: examFile || undefined,
      })
      toast.success('Exame cadastrado com sucesso!')

      // Se um arquivo foi anexado e o resumo estiver em branco,
      // dispara automaticamente a leitura com IA
      if (examFile && !examSummary) {
        toast.info('Arquivo anexado detectado: iniciando leitura automática com IA...')
        try {
          const pages = await prepareExamPagesForAi(examFile, undefined, 1280, 0.9)
          if (pages.length > 0) {
            const aiRes = await analyzeExamWithAi({
              examId: createdExam.id,
              images: pages,
              title: createdExam.title,
              fallbackSource: examFile,
            })
            if (aiRes.biomarkers_extracted > 0) {
              toast.success(
                `IA transcreveu ${aiRes.biomarkers_extracted} biomarcadores automaticamente para a aba Biomarkers!`,
              )
            }
          }
        } catch (aiErr: any) {
          console.warn('Leitura automática em segundo plano falhou:', aiErr)
          toast.warning('O exame foi salvo. Você pode acionar "Ler com IA" no card do exame.')
        }
      }

      setShowExamForm(false)
      setExamTitle('')
      setExamSummary('')
      setExamLab('')
      setExamFile(null)
      await loadAll()
    } catch (err) {
      toast.error('Erro ao salvar exame')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateDiet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dietTitle) {
      toast.error('Preencha o título da dieta')
      return
    }
    setSaving(true)
    try {
      await medicalService.createDiet({
        title: dietTitle,
        objective: dietObjective,
        prescription: dietPrescription,
        photo: dietPhoto || undefined,
        active: true,
        start_date: todayStr(),
      })
      toast.success('Dieta cadastrada com sucesso!')
      setShowDietForm(false)
      setDietTitle('')
      setDietObjective('')
      setDietPrescription('')
      setDietPhoto(null)
      await loadAll()
    } catch (err) {
      toast.error('Erro ao salvar dieta')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateMedRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medTitle) {
      toast.error('Informe o nome da cirurgia ou alergia')
      return
    }
    setSaving(true)
    try {
      await medicalService.createMedicalRecord({
        type: medType,
        title: medTitle,
        date: medDate,
        description: medDesc,
        severity: medSeverity,
      })
      toast.success('Histórico médico atualizado!')
      setShowMedForm(false)
      setMedTitle('')
      setMedDesc('')
      setMedDate('')
      setMedSeverity('')
      await loadAll()
    } catch (err) {
      toast.error('Erro ao salvar histórico')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExam = async (id: string) => {
    try {
      await medicalService.deleteExam(id)
      toast.success('Exame excluído')
      setExams((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {
      toast.error('Erro ao excluir exame')
    }
  }

  const handleDeleteDiet = async (id: string) => {
    try {
      await medicalService.deleteDiet(id)
      toast.success('Dieta excluída')
      setDiets((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {
      toast.error('Erro ao excluir dieta')
    }
  }

  const handleDeleteMed = async (id: string) => {
    try {
      await medicalService.deleteMedicalRecord(id)
      toast.success('Registro médico excluído')
      setMedRecords((prev) => prev.filter((x) => x.id !== id))
    } catch (err) {
      toast.error('Erro ao excluir registro')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exames, Dietas & Histórico Clínico</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mantenha seus exames laboratoriais, diretrizes nutricionais, cirurgias e alergias
            organizados
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 max-w-md">
            <TabsTrigger value="exames" className="flex items-center gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Exames ({exams.length})
            </TabsTrigger>
            <TabsTrigger value="dietas" className="flex items-center gap-1.5 text-xs">
              <Utensils className="h-3.5 w-3.5" />
              Dietas ({diets.length})
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-1.5 text-xs">
              <ShieldAlert className="h-3.5 w-3.5" />
              Cirurgias & Alergias ({medRecords.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EXAMES */}
          <TabsContent value="exames" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Exames Laboratoriais e Diagnósticos
              </h2>
              <Button
                size="sm"
                onClick={() => setShowExamForm(!showExamForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {showExamForm ? 'Fechar Formulário' : 'Novo Exame'}
              </Button>
            </div>

            {/* Exam creation card */}
            {showExamForm && (
              <Card className="border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Cadastrar Novo Exame</CardTitle>
                  <CardDescription className="text-xs">
                    Faça upload do laudo em PDF ou foto e anote os pontos principais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateExam} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Título / Nome do Exame</Label>
                        <Input
                          placeholder="Ex: Hemograma Completo com Ferritina"
                          value={examTitle}
                          onChange={(e) => setExamTitle(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo de Exame</Label>
                        <Input
                          placeholder="Ex: Sangue, Endoscopia, Eletrocardiograma, Imagem"
                          value={examType}
                          onChange={(e) => setExamType(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Data da Realização</Label>
                        <Input
                          type="date"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Laboratório / Clínica</Label>
                        <Input
                          placeholder="Ex: Fleury, Dasa, Sírio-Libanês"
                          value={examLab}
                          onChange={(e) => setExamLab(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Classificação do Resultado</Label>
                        <select
                          value={examStatus}
                          onChange={(e: any) => setExamStatus(e.target.value)}
                          className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
                        >
                          <option value="normal">Normal / Dentro dos parâmetros</option>
                          <option value="alterado">Com marcadores alterados</option>
                          <option value="pendente">Aguardando laudo definitivo</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Resumo dos Resultados e Valores Principais</Label>
                      <Textarea
                        placeholder="Ex: Glicose: 88 mg/dL | Vitamina D: 45 ng/mL | TSH: 1.8 | Colesterol Total: 180"
                        value={examSummary}
                        onChange={(e) => setExamSummary(e.target.value)}
                        className="text-xs"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Upload do Laudo / Foto (PDF, PNG, JPG)</Label>
                      <Input
                        type="file"
                        onChange={(e) => e.target.files && setExamFile(e.target.files[0])}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExamForm(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        {saving ? 'Salvando...' : 'Salvar Exame'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Exams list */}
            {exams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((ex) => (
                  <Card key={ex.id} className="border-border/60 hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{ex.title}</span>
                          {ex.status === 'alterado' ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Alterado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              Normal
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>{ex.type}</span>
                          <span>•</span>
                          <span>{ex.date}</span>
                          {ex.laboratory && <span>• {ex.laboratory}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {ex.file && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={analyzingExamId === ex.id}
                            onClick={() => handleAnalyzeExamWithAi(ex)}
                            className="h-7 px-2 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                            title="Transcrever exame com IA e atualizar a aba Biomarkers"
                          >
                            {analyzingExamId === ex.id ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Lendo...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 text-emerald-600" />
                                <span>
                                  {ex.summary_results ? 'Reanalisar com IA' : 'Ler com IA'}
                                </span>
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExam(ex.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2 text-xs">
                      {analyzingExamId === ex.id && (
                        <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
                          <Loader2 className="h-4 w-4 animate-spin text-emerald-600 shrink-0" />
                          <span className="text-xs font-medium">
                            {analyzingProgress ||
                              'Processando exame e transcrevendo biomarcadores...'}
                          </span>
                        </div>
                      )}
                      {ex.summary_results ? (
                        <div className="bg-muted/40 p-2.5 rounded-lg text-foreground/90 whitespace-pre-line text-xs font-mono">
                          {ex.summary_results}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
                          <span>Resumo ainda não computado.</span>
                          {ex.file && (
                            <Button
                              variant="link"
                              size="sm"
                              disabled={analyzingExamId === ex.id}
                              onClick={() => handleAnalyzeExamWithAi(ex)}
                              className="h-auto p-0 text-xs font-semibold text-emerald-600 hover:underline"
                            >
                              Transcrever agora com IA →
                            </Button>
                          )}
                        </div>
                      )}
                      {ex.file && (
                        <div className="pt-1">
                          <a
                            href={ex.file}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline font-medium"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Visualizar Arquivo Anexo do Exame
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-2">
                <FileText className="h-8 w-8 mx-auto opacity-30" />
                <p>Nenhum exame cadastrado no prontuário ainda.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExamForm(true)}
                  className="text-xs"
                >
                  Cadastrar Primeiro Exame
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: DIETAS */}
          <TabsContent value="dietas" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Dietas e Prescrições Nutricionais
              </h2>
              <Button
                size="sm"
                onClick={() => setShowDietForm(!showDietForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {showDietForm ? 'Fechar Formulário' : 'Nova Dieta'}
              </Button>
            </div>

            {/* Diet form */}
            {showDietForm && (
              <Card className="border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Cadastrar Dieta / Prescrição
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Insira as orientações da equipe da Clínica Soul ou envie foto do plano
                    alimentar.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateDiet} className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome / Título do Protocolo</Label>
                      <Input
                        placeholder="Ex: Protocolo Low Carb & Anti-inflamatório"
                        value={dietTitle}
                        onChange={(e) => setDietTitle(e.target.value)}
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Objetivo Clínico</Label>
                      <Input
                        placeholder="Ex: Sensibilidade insulínica, redução de marcadores inflamatórios e disposição"
                        value={dietObjective}
                        onChange={(e) => setDietObjective(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Prescrição Completa / Cardápio do Cliente</Label>
                      <Textarea
                        placeholder="Estrutura por horários (Café da Manhã, Almoço, Lanche, Jantar) e diretrizes..."
                        value={dietPrescription}
                        onChange={(e) => setDietPrescription(e.target.value)}
                        className="text-xs font-mono"
                        rows={6}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">
                        Foto da Dieta / Folha de Prescrição (Opcional)
                      </Label>
                      <Input
                        type="file"
                        onChange={(e) => e.target.files && setDietPhoto(e.target.files[0])}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDietForm(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        {saving ? 'Salvando...' : 'Salvar Dieta'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Diet list */}
            {diets.length > 0 ? (
              <div className="space-y-4">
                {diets.map((d) => (
                  <Card key={d.id} className="border-border/60 overflow-hidden">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between bg-muted/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base text-foreground">{d.title}</CardTitle>
                          {d.active && (
                            <Badge className="bg-emerald-600 text-white text-[10px]">Ativa</Badge>
                          )}
                        </div>
                        {d.objective && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            Objetivo: {d.objective}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDiet(d.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      {d.prescription && (
                        <div className="text-xs text-foreground bg-card border rounded-lg p-3 whitespace-pre-line leading-relaxed">
                          {d.prescription}
                        </div>
                      )}

                      {d.photo && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Foto da Prescrição:
                          </p>
                          <img
                            src={d.photo}
                            alt="Foto da Dieta"
                            className="max-h-60 rounded-lg border object-cover"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-2">
                <Utensils className="h-8 w-8 mx-auto opacity-30" />
                <p>Nenhuma dieta ou prescrição ativa cadastrada.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDietForm(true)}
                  className="text-xs"
                >
                  Cadastrar Primeira Dieta
                </Button>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: CIRURGIAS & ALERGIAS */}
          <TabsContent value="historico" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Histórico Clínico: Cirurgias e Alergias
              </h2>
              <Button
                size="sm"
                onClick={() => setShowMedForm(!showMedForm)}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {showMedForm ? 'Fechar' : 'Adicionar Registro'}
              </Button>
            </div>

            {/* Med Record form */}
            {showMedForm && (
              <Card className="border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Novo Registro no Histórico
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateMedRecord} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Categoria</Label>
                        <select
                          value={medType}
                          onChange={(e: any) => setMedType(e.target.value)}
                          className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
                        >
                          <option value="cirurgia">Cirurgia Prévia</option>
                          <option value="alergia">Alergia (Medicamentosa / Alimentar)</option>
                          <option value="doenca_previa">Condição Prévia</option>
                          <option value="medicamento_continuo">Medicamento de Uso Contínuo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome / Título</Label>
                        <Input
                          placeholder="Ex: Apendicectomia / Dipirona / Asma"
                          value={medTitle}
                          onChange={(e) => setMedTitle(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Data ou Ano (opcional)</Label>
                        <Input
                          placeholder="Ex: 2020 ou 15/04/2018"
                          value={medDate}
                          onChange={(e) => setMedDate(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Gravidade / Reação (opcional)</Label>
                        <Input
                          placeholder="Ex: Choque anafilático, moderada, leve"
                          value={medSeverity}
                          onChange={(e) => setMedSeverity(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Descrição e Observações</Label>
                      <Textarea
                        placeholder="Detalhes relevantes para a equipe médica da Clínica Soul..."
                        value={medDesc}
                        onChange={(e) => setMedDesc(e.target.value)}
                        className="text-xs"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMedForm(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                      >
                        {saving ? 'Salvando...' : 'Salvar no Histórico'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Med Records list */}
            {medRecords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {medRecords.map((m) => {
                  const isAlergia = m.type === 'alergia'
                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                        isAlergia
                          ? 'border-rose-200 bg-rose-50/40 dark:bg-rose-950/20'
                          : 'border-blue-200 bg-blue-50/40 dark:bg-blue-950/20'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isAlergia
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {m.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-sm text-foreground">{m.title}</span>
                        </div>
                        {m.severity && (
                          <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400">
                            Gravidade: {m.severity}
                          </p>
                        )}
                        {m.date && (
                          <p className="text-[11px] text-muted-foreground">Data/Ano: {m.date}</p>
                        )}
                        {m.description && (
                          <p className="text-xs text-foreground/85 mt-1">{m.description}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMed(m.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-2">
                <ShieldAlert className="h-8 w-8 mx-auto opacity-30" />
                <p>Nenhuma cirurgia ou alergia registrada no prontuário.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMedForm(true)}
                  className="text-xs"
                >
                  Adicionar ao Histórico
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
