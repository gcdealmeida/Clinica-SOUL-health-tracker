import { useState, useEffect, useRef } from 'react'
import { medicalService } from '@/services/medical'
import { runExamAnalysisWithRetry } from '@/services/examReader'
import { Exam } from '@/types'
import { todayStr } from '@/lib/localDate'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  CloudUpload,
  FileText,
  Image as ImageIcon,
  Download,
  Sparkles,
  Loader2,
  FileWarning,
} from 'lucide-react'

/**
 * Área "Upload Files / Downloads Exames" da página Sources.
 * Reutiliza o pipeline existente de leitura inteligente de exames (v0.0.31):
 * preparação das páginas client-side (examReader) + endpoint /backend/v1/ai/analyze-exam,
 * que transcreve o laudo em exams.summary_results e grava os marcadores em profile_biomarkers.
 * Os arquivos vão para a mesma coleção `exams`, então aparecem também em Exames & Dietas.
 */

const EXAM_TYPE_OPTIONS = [
  'Exame de Sangue',
  'Ressonância Magnética',
  'Tomografia Computadorizada',
  'Ultrassonografia',
  'Endoscopia',
  'Eletrocardiograma',
  'Raio-X',
  'Detectar automaticamente pela IA',
  'Outro',
]

function fileIconFor(fileUrl?: string, title?: string) {
  const isPdf =
    !!fileUrl && (fileUrl.toLowerCase().includes('.pdf') || title?.toLowerCase().includes('.pdf'))
  return isPdf ? FileText : ImageIcon
}

function downloadFileName(exam: Exam): string {
  const base = `${exam.type || 'exame'}-${exam.date || todayStr()}`.replace(/[^\w.-]+/g, '_')
  const isPdf = exam.file?.toLowerCase().includes('.pdf')
  return isPdf ? `${base}.pdf` : `${base}.jpg`
}

export default function ExamUploadSection() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  const [examType, setExamType] = useState(EXAM_TYPE_OPTIONS[EXAM_TYPE_OPTIONS.length - 2])
  const [customType, setCustomType] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examFile, setExamFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadExams = async () => {
    try {
      setLoading(true)
      setExams(await medicalService.listExams())
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar a lista de exames')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExams()
  }, [])

  const handleAnalyze = async (exam: Exam) => {
    if (!exam.file) {
      toast.error('Este exame não possui arquivo anexado para leitura.')
      return
    }
    setAnalyzingId(exam.id)
    try {
      toast.info('Iniciando leitura inteligente do exame com IA...')
      const result = await runExamAnalysisWithRetry({
        examId: exam.id,
        fileUrlOrFile: exam.file,
        title: exam.title,
        onProgress: (msg) => toast.info(msg),
      })
      if (result.success && result.biomarkers_extracted > 0) {
        toast.success(
          `IA extraiu ${result.biomarkers_extracted} marcador(es) do laudo: ${result.biomarkers_created} novo(s) em Biomarkers, ${result.biomarkers_updated} atualizado(s).`,
        )
      } else {
        toast.success('Exame processado pela IA: resumo do laudo atualizado.')
      }
      await loadExams()
    } catch (err: any) {
      console.error(err)
      const msg =
        err?.response?.error ||
        err?.response?.message ||
        err?.message ||
        'Não foi possível analisar o exame com IA neste momento.'
      toast.error(typeof msg === 'string' ? msg : 'Erro ao processar exame com IA')
    } finally {
      setAnalyzingId(null)
    }
  }

  const handleUpload = async () => {
    if (!examFile) {
      toast.error('Selecione um arquivo (PDF ou foto) para enviar.')
      return
    }
    const type =
      examType === 'Outro'
        ? customType.trim() || 'Outro'
        : examType === 'Detectar automaticamente pela IA'
          ? 'A detectar pela IA'
          : examType
    setUploading(true)
    try {
      const created = await medicalService.createExam({
        title: examFile.name.replace(/\.[^.]+$/, '') || type,
        type,
        date: examDate || todayStr(),
        file: examFile,
        status: 'pendente',
      })
      setExamFile(null)
      setCustomType('')
      setExamDate('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success('Exame enviado! Iniciando leitura automática com IA...')

      // Leitura automática: mesmo pipeline dos cards de exames (Exames & Dietas),
      // com retry adaptativo de resolução e lotes de páginas.
      let analysisFailed = false
      try {
        const aiRes = await runExamAnalysisWithRetry({
          examId: created.id,
          fileUrlOrFile: examFile,
          title: created.title,
          onProgress: (msg) => toast.info(msg),
        })
        if (aiRes.biomarkers_extracted > 0) {
          toast.success(
            `IA extraiu ${aiRes.biomarkers_extracted} marcador(es) do laudo: ${aiRes.biomarkers_created} novo(s) em Biomarkers, ${aiRes.biomarkers_updated} atualizado(s).`,
          )
        } else {
          toast.success('IA gerou o resumo descritivo do laudo.')
        }
      } catch (aiErr) {
        analysisFailed = true
        console.warn('Leitura automática falhou:', aiErr)
        toast.warning('Exame salvo. Use "Reanalisar com IA" para tentar a leitura novamente.')
      }

      await loadExams()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar o exame. Verifique o arquivo e tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = (exam: Exam) => {
    if (!exam.file) return
    const a = document.createElement('a')
    a.href = exam.file
    a.download = downloadFileName(exam)
    a.target = '_blank'
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.info('Download iniciado.')
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/60 via-card to-teal-50/40 dark:from-emerald-950/20 dark:to-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CloudUpload className="h-4 w-4 text-emerald-600" />
          Upload Files / Downloads Exames
        </CardTitle>
        <CardDescription className="text-xs">
          Envie exames em PDF ou foto (sangue, ressonância, endoscopia, eletrocardiograma,
          ultrassom…). A IA lê o laudo automaticamente e os valores quantitativos são gravados em
          Biomarkers — e o arquivo original fica guardado aqui para download.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulário de upload */}
        <div className="rounded-xl border bg-background/80 p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo do exame</Label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
              >
                {EXAM_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            {examType === 'Outro' ? (
              <div className="space-y-1">
                <Label className="text-xs">Especifique o tipo</Label>
                <Input
                  placeholder="Ex: Colonoscopia"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs">Data do exame (opcional)</Label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Arquivo (PDF, PNG, JPG)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setExamFile(e.target.files?.[0] || null)}
                className="text-xs"
              />
            </div>
          </div>
          {examType === 'Outro' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Data do exame (opcional)</Label>
                <Input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={uploading || !examFile}
              onClick={handleUpload}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enviando e lendo com IA...
                </>
              ) : (
                <>
                  <CloudUpload className="h-3.5 w-3.5" />
                  Enviar exame
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Lista de exames enviados */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Exames enviados ({exams.length})</p>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando exames...
            </div>
          ) : exams.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-1">
              <CloudUpload className="h-6 w-6 mx-auto opacity-30" />
              <p>Nenhum exame enviado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exams.map((exam) => {
                const Icon = fileIconFor(exam.file, exam.title)
                const analyzed = !!exam.summary_results
                return (
                  <div
                    key={exam.id}
                    className="rounded-xl border bg-card p-3 flex items-start gap-3"
                  >
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground truncate max-w-[16rem] sm:max-w-xs">
                          {exam.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            analyzed
                              ? 'text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'text-[10px] bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {analyzed ? 'Lido pela IA' : 'Aguardando leitura'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {exam.type} • {exam.date || 'sem data'}
                      </p>
                      {analyzed ? (
                        <div className="bg-muted/40 p-2 rounded-lg text-[11px] text-foreground/85 whitespace-pre-line max-h-32 overflow-y-auto">
                          {exam.summary_results}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <FileWarning className="h-3 w-3" />
                          Resumo transcrito ainda não disponível.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={analyzingId === exam.id || !exam.file}
                        onClick={() => handleAnalyze(exam)}
                        className="h-7 px-2 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      >
                        {analyzingId === exam.id ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Lendo...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            Reanalisar com IA
                          </>
                        )}
                      </Button>
                      {exam.file && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(exam)}
                          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-emerald-700"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Baixar arquivo
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
