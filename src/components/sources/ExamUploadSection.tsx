import { useState, useEffect, useRef, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { medicalService } from '@/services/medical'
import {
  runExamAnalysisWithRetry,
  markExamAnalysisQueued,
  fetchExamAnalysisResult,
} from '@/services/examReader'
import { startAsyncExamAnalysis } from '@/services/examAsync'
import { progressPercent } from '@/services/examStatus'
import type { ExamStatusSnapshot } from '@/services/examStatus'
import { startExamAnalysisWatchdog, markExamAnalysisError } from '@/services/examWatchdog'
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
  AlertTriangle,
  Upload,
} from 'lucide-react'

/**
 * Área "Upload Files / Downloads Exames" da página Sources.
 * v0.0.64: leitura por IA ASSÍNCRONA — o cliente enfileira as páginas
 * (analyze-exam-async, 202 imediato) e o servidor processa em segundo plano
 * (cron runner). O app acompanha com polling em exams.analysis_status:
 * - card mostra "Analisando…" com progresso de páginas enquanto roda;
 * - se o usuário sair e voltar, a análise em curso é retomada ao montar;
 * - erro do processamento aparece amigável no card (nunca "Failed to fetch").
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

/** Intervalo de polling e tempo de tolerância sem progresso (watchdog). */
const POLL_INTERVAL_MS = 3000
const STALL_TIMEOUT_MS = 3 * 60 * 1000

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
  /** Exames em análise no cliente + snapshot de progresso por exame. */
  const [analyzing, setAnalyzing] = useState<Record<string, ExamStatusSnapshot>>({})
  const [examError, setExamError] = useState<Record<string, string>>({})

  const [examType, setExamType] = useState(EXAM_TYPE_OPTIONS[EXAM_TYPE_OPTIONS.length - 2])
  const [customType, setCustomType] = useState('')
  const [examDate, setExamDate] = useState('')
  const [examFile, setExamFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  /** Reenvio de arquivo em exame sem mídia (substitui o campo file do registro). */
  const [reuploadingId, setReuploadingId] = useState<string | null>(null)
  const reuploadExamIdRef = useRef<string | null>(null)
  const reuploadInputRef = useRef<HTMLInputElement | null>(null)
  /** Download em curso (desabilita o botão até o blob chegar). */
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  /** Pollers ativos — sobrevivem a re-render e são parados no unmount. */
  const pollersRef = useRef<Map<string, { stop: () => void }>>(new Map())

  const loadExams = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setExams(await medicalService.listExams())
    } catch (err) {
      console.error(err)
      if (!silent) toast.error('Erro ao carregar a lista de exames')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const isAnalyzing = (exam: Exam) =>
    analyzing[exam.id] !== undefined || exam.analysis_status === 'running'

  const analysisErrorFor = (exam: Exam) =>
    exam.analysis_status === 'error'
      ? exam.analysis_error || 'A leitura por IA falhou neste exame.'
      : examError[exam.id]

  const progressFor = (exam: Exam): string | null => {
    const snap = analyzing[exam.id]
    if (snap?.progress) {
      const pct = progressPercent(snap.progress)
      if (pct !== null) return `Analisando... ${pct}%`
      return `Analisando... página ${snap.progress.pages_done + 1} de ${snap.progress.total_pages}`
    }
    return 'Analisando...'
  }

  /** Acompanha um exame que o SERVIDOR já está processando (status 'running').
   *  Watchdog: se analysis_status ficar running sem progresso real
   *  (pages_done sem mudar) por mais de ~3 min, marca erro no exame e libera
   *  o botão "Reanalisar com IA" — nunca "Analisando…" infinito. */
  const trackExam = useCallback(
    (examId: string) => {
      if (pollersRef.current.has(examId)) return
      setAnalyzing((prev) => ({ ...prev, [examId]: prev[examId] ?? { status: 'running' } }))
      const { promise, stop } = startExamAnalysisWatchdog(examId, {
        intervalMs: POLL_INTERVAL_MS,
        stallMs: STALL_TIMEOUT_MS,
        onTick: (snap) => setAnalyzing((prev) => ({ ...prev, [examId]: snap })),
      })
      pollersRef.current.set(examId, { stop })
      promise
        .then(async (outcome) => {
          pollersRef.current.delete(examId)
          setAnalyzing((prev) => {
            const next = { ...prev }
            delete next[examId]
            return next
          })
          if (outcome.kind === 'cancelled') return
          if (outcome.kind === 'stalled') {
            const msg =
              'A análise demorou mais que o esperado. Clique em "Reanalisar com IA" para tentar novamente.'
            await markExamAnalysisError(examId, msg)
            setExamError((prev) => ({ ...prev, [examId]: msg }))
            toast.error(msg)
            await loadExams(true)
            return
          }
          const snap = outcome.snapshot
          if (snap.status === 'error') {
            const msg = snap.error || 'A leitura por IA falhou neste exame.'
            setExamError((prev) => ({ ...prev, [examId]: msg }))
            toast.error(msg)
          } else {
            try {
              const result = await fetchExamAnalysisResult(examId)
              if (result.biomarkers_extracted > 0) {
                toast.success(
                  `IA extraiu ${result.biomarkers_extracted} marcador(es) do laudo: ${result.biomarkers_created} novo(s) em Biomarkers, ${result.biomarkers_updated} atualizado(s).`,
                )
              } else {
                toast.success('Exame processado pela IA: resumo do laudo atualizado.')
              }
            } catch {
              toast.success('Exame processado pela IA.')
            }
          }
          await loadExams(true)
        })
        .catch((err) => {
          pollersRef.current.delete(examId)
          setAnalyzing((prev) => {
            const next = { ...prev }
            delete next[examId]
            return next
          })
          console.warn('watchdog da análise interrompido:', err)
        })
    },
    [loadExams],
  )

  // Retomada: ao montar, exames com analysis_status='running' voltam a ser
  // acompanhados (o servidor continua processando em segundo plano).
  useEffect(() => {
    let alive = true
    loadExams().then(() => {
      if (!alive) return
      setExams((current) => {
        current.filter((e) => e.analysis_status === 'running').forEach((e) => trackExam(e.id))
        return current
      })
    })
    return () => {
      alive = false
      pollersRef.current.forEach((p) => p.stop())
      pollersRef.current.clear()
    }
  }, [loadExams, trackExam])

  const handleAnalyze = async (exam: Exam) => {
    if (!exam.file) {
      toast.error('Este exame não tem arquivo anexado. Exclua e envie o arquivo novamente.')
      return
    }
    if (isAnalyzing(exam)) return
    // Indicador imediato no card (antes mesmo do 202 voltar).
    trackExam(exam.id)
    setExamError((prev) => ({ ...prev, [exam.id]: '' }))
    try {
      toast.info('Leitura inteligente iniciada — processando em segundo plano...')
      await markExamAnalysisQueued(exam.id)
      await startAsyncExamAnalysis({
        examId: exam.id,
        fileUrlOrFile: exam.file,
        title: exam.title,
        onProgress: (msg) => toast.info(msg),
      })
      // Polling já em curso via trackExam — nada mais a fazer aqui.
    } catch (err: any) {
      // Falha ao enfileirar (rede/gateway após a escada de resolução):
      // para o spinner e mostra erro amigável — nunca "Failed to fetch".
      pollersRef.current.get(exam.id)?.stop()
      pollersRef.current.delete(exam.id)
      setAnalyzing((prev) => {
        const next = { ...prev }
        delete next[exam.id]
        return next
      })
      const msg =
        err?.response?.error ||
        err?.response?.message ||
        err?.message ||
        'Não foi possível iniciar a análise com IA neste momento. Tente novamente.'
      setExamError((prev) => ({ ...prev, [exam.id]: String(msg) }))
      toast.error(typeof msg === 'string' ? msg : 'Erro ao iniciar a análise com IA')
      await loadExams(true) // garante lista consistente
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

      // Mesmo fluxo assíncrono da reanálise: enfileira + polling no card novo.
      trackExam(created.id)
      try {
        await startAsyncExamAnalysis({
          examId: created.id,
          fileUrlOrFile: examFile,
          title: created.title,
          onProgress: (msg) => toast.info(msg),
        })
      } catch (aiErr) {
        pollersRef.current.get(created.id)?.stop()
        pollersRef.current.delete(created.id)
        setAnalyzing((prev) => {
          const next = { ...prev }
          delete next[created.id]
          return next
        })
        const msg =
          aiErr?.response?.error ||
          aiErr?.message ||
          'Não foi possível iniciar a leitura automática. Use "Reanalisar com IA" para tentar novamente.'
        setExamError((prev) => ({ ...prev, [created.id]: String(msg) }))
        toast.warning('Exame salvo. Use "Reanalisar com IA" para tentar a leitura novamente.')
        console.warn('Leitura automática falhou:', aiErr)
      }

      await loadExams(true)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao enviar o exame. Verifique o arquivo e tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (exam: Exam) => {
    // Pré-checagem: sem campo de arquivo no registro, não há o que baixar —
    // orienta o reenvio em vez de falhar com erro genérico de rede.
    if (!exam.file) {
      toast.warning('Arquivo não disponível — reenvie o exame.')
      return
    }
    setDownloadingId(exam.id)
    try {
      const fetchBlob = async (): Promise<Blob> => {
        const res = await fetch(exam.file!, { credentials: 'include' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      }
      let blob: Blob
      try {
        blob = await fetchBlob()
      } catch (firstErr) {
        // 1 retry em falha de rede/status transitório.
        console.warn('[ExamUploadSection] download falhou, tentando novamente...', firstErr)
        blob = await fetchBlob()
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = downloadFileName(exam)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Download concluído.')
    } catch (err) {
      console.error('[ExamUploadSection] download do exame falhou:', err)
      toast.error(
        'Não foi possível baixar o arquivo do exame do servidor. Verifique a conexão e tente novamente.',
      )
    } finally {
      setDownloadingId(null)
    }
  }

  /** Abre o seletor para SUBSTITUIR o arquivo de um exame existente (mesmo card). */
  const openReupload = (exam: Exam) => {
    reuploadExamIdRef.current = exam.id
    if (reuploadInputRef.current) reuploadInputRef.current.value = ''
    reuploadInputRef.current?.click()
  }

  const handleReuploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    const examId = reuploadExamIdRef.current
    reuploadExamIdRef.current = null
    if (!file || !examId) return
    setReuploadingId(examId)
    try {
      // Update do campo file no registro exams EXISTENTE — mantém o mesmo card,
      // limpa o status de erro e libera o "Reanalisar com IA".
      const formData = new FormData()
      formData.append('file', file)
      formData.append('analysis_status', '')
      formData.append('analysis_error', '')
      await pb.collection('exams').update(examId, formData)
      setExamError((prev) => ({ ...prev, [examId]: '' }))
      toast.success('Arquivo anexado. Iniciando leitura automática com IA...')

      // O reenvio agora inicia a análise de verdade (mesmo caminho do
      // "Reanalisar com IA"): PATCH do arquivo → markQueued → kickoff 202 →
      // pedaços. Qualquer falha propaga para o card como status error.
      trackExam(examId)
      try {
        await markExamAnalysisQueued(examId)
        await startAsyncExamAnalysis({
          examId,
          fileUrlOrFile: file,
          title: exams.find((e) => e.id === examId)?.title,
          onProgress: (msg) => toast.info(msg),
        })
      } catch (aiErr: any) {
        // Falha do kickoff/reenvio de páginas: para o indicador e deixa o
        // status em error — nunca "Analisando…" infinito.
        pollersRef.current.get(examId)?.stop()
        pollersRef.current.delete(examId)
        setAnalyzing((prev) => {
          const next = { ...prev }
          delete next[examId]
          return next
        })
        const msg =
          aiErr?.response?.error ||
          aiErr?.message ||
          'Não foi possível iniciar a leitura automática. Use "Reanalisar com IA" para tentar novamente.'
        setExamError((prev) => ({ ...prev, [examId]: String(msg) }))
        toast.error(typeof msg === 'string' ? msg : 'Erro ao iniciar a análise com IA')
        console.warn('[ExamUploadSection] análise pós-reenvio falhou:', aiErr)
      }
      await loadExams(true)
    } catch (err) {
      console.error('[ExamUploadSection] reenvio de arquivo falhou:', err)
      toast.error('Não foi possível anexar o novo arquivo. Tente novamente.')
    } finally {
      setReuploadingId(null)
    }
  }

  /** Limpa a marca de erro do card, sem mexer no arquivo. */
  const dismissExamError = (examId: string) => {
    setExamError((prev) => {
      const next = { ...prev }
      delete next[examId]
      return next
    })
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
          ultrassom…). A IA lê o laudo em segundo plano e os valores quantitativos são gravados em
          Biomarkers — o arquivo original fica guardado aqui para download.
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
                const analyzingNow = isAnalyzing(exam)
                const analyzed = !!exam.summary_results
                const errorMsg = analysisErrorFor(exam)
                const progressMsg = analyzingNow ? progressFor(exam) : null
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
                            analyzingNow
                              ? 'text-[10px] bg-blue-50 text-blue-700 border-blue-200'
                              : analyzed
                                ? 'text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'text-[10px] bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {analyzingNow
                            ? 'Analisando…'
                            : analyzed
                              ? 'Lido pela IA'
                              : 'Aguardando leitura'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {exam.type} • {exam.date || 'sem data'}
                      </p>
                      {analyzingNow ? (
                        <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                          {progressMsg}
                        </div>
                      ) : errorMsg ? (
                        <div className="bg-red-50/70 dark:bg-red-950/30 p-2 rounded-lg text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1.5">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="flex-1">{errorMsg}</span>
                          <button
                            type="button"
                            onClick={() => dismissExamError(exam.id)}
                            className="shrink-0 text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100"
                            title="Dispensar mensagem"
                          >
                            ✕
                          </button>
                        </div>
                      ) : analyzed ? (
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
                        disabled={analyzingNow || !exam.file}
                        onClick={() => handleAnalyze(exam)}
                        title={!exam.file ? 'Arquivo não disponível — reenvie o exame' : undefined}
                        className="h-7 px-2 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
                      >
                        {analyzingNow ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analisando…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3 w-3 text-emerald-600" />
                            Reanalisar com IA
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingId === exam.id}
                        onClick={() => handleDownload(exam)}
                        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-emerald-700"
                      >
                        {downloadingId === exam.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Baixando…
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            Baixar arquivo
                          </>
                        )}
                      </Button>
                      {/* Reenvio aparece para exames SEM arquivo e também para
                          exames presos em erro — substituir o arquivo e
                          reprocessar. Oculto apenas enquanto está analisando. */}
                      {!analyzingNow && (errorMsg || !exam.file) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={reuploadingId === exam.id}
                          onClick={() => openReupload(exam)}
                          className="h-7 px-2 text-[11px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                        >
                          {reuploadingId === exam.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Anexando…
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3" />
                              Reenviar arquivo
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
      {/* Input oculto do reenvio de arquivo (substitui o campo file do exame existente). */}
      <input
        ref={reuploadInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleReuploadChange}
      />
    </Card>
  )
}
