import { useState, useEffect, useRef, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { progressPercent } from '@/services/examStatus'
import type { ExamStatusSnapshot } from '@/services/examStatus'
import { startExamAnalysisWatchdog, markExamAnalysisError } from '@/services/examWatchdog'
import {
  IMPORT_ACCEPT,
  contentHashOf,
  fileKindOf,
  importAssist,
  extractAndEnqueueText,
  importKickoff,
  exportImportCsv,
  exportImportJson,
  downloadBlob,
} from '@/services/importFiles'
import type { ImportKind } from '@/services/importFiles'
import { ImportReviewPanel } from '@/components/sources/ImportReviewPanel'
import { Exam } from '@/types'
import {
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Loader2,
  AlertTriangle,
  Download,
  FileJson,
  FileSpreadsheet as FileCsv,
  ClipboardCheck,
  Upload,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

/**
 * Zona "Importar arquivos" (v0.0.72): drag & drop em lote de PDF/JPG/PNG/WebP/
 * DOCX/XLSX/CSV/TXT. Por arquivo: hash → import-assist (dedupe) → upload do
 * arquivo no exame criado → extração (cliente para DOCX/XLSX/CSV/TXT; servidor
 * para PDF/imagem) → import-kickoff → polling em exams.analysis_status.
 *
 * O estado por arquivo é SEMPRE o do banco (exams + exam_imports) — nada em
 * memória de sessão: se o usuário sair e voltar, a lista retoma os estados
 * (inclui 'awaiting_review', que abre o painel de revisão).
 */

const POLL_INTERVAL_MS = 3000
// Lote de 5 páginas pode levar >5 min no gateway (laudo denso); o runner
// grava heartbeat de pages_done a cada lote, então mede desde o último
// progresso — 8 min cobre o lote mais lento sem abortar análise viva.
const STALL_TIMEOUT_MS = 8 * 60 * 1000

type Stage =
  | 'received'
  | 'reading'
  | 'extracting'
  | 'awaiting_review'
  | 'done'
  | 'error'
  | 'duplicate'

const STAGE_META: Record<Stage, { label: string; className: string }> = {
  received: {
    label: 'Recebido',
    className:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
  },
  reading: {
    label: 'Em leitura',
    className:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  extracting: {
    label: 'Em extração',
    className:
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  },
  awaiting_review: {
    label: 'Aguardando revisão',
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  done: {
    label: 'Salvo',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  error: {
    label: 'Erro',
    className:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  duplicate: {
    label: 'Já importado',
    className:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  },
}

interface ImportEntry {
  localId: string
  file: File
  kind: ImportKind
  hash: string
  stage: Stage
  examId?: string
  importId?: string
  progressMsg?: string
  error?: string
}

function iconFor(kind: ImportKind) {
  if (kind === 'pdf') return FileText
  if (kind === 'image') return ImageIcon
  if (kind === 'docx' || kind === 'xlsx' || kind === 'csv') return FileSpreadsheet
  if (kind === 'txt') return FileText
  return FileIcon
}

/** Status do banco → estágio visual. analysis_status de exams manda. */
function stageFromExam(exam: Exam): Stage {
  const s = exam.analysis_status
  if (s === 'awaiting_review') return 'awaiting_review'
  if (s === 'running' || s === 'queued') return 'extracting'
  if (s === 'error') return 'error'
  if (s === 'done') return 'done'
  return 'received'
}

export function ImportFilesSection() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<ImportEntry[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [reviewExamId, setReviewExamId] = useState<string | null>(null)
  const [reviewImportId, setReviewImportId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pollersRef = useRef<Map<string, { stop: () => void }>>(new Map())

  const patchEntry = useCallback((localId: string, patch: Partial<ImportEntry>) => {
    setEntries((prev) => prev.map((en) => (en.localId === localId ? { ...en, ...patch } : en)))
  }, [])

  /** Acompanha exams.analysis_status de um exame em extração (watchdog igual ao fluxo de exames). */
  const trackExam = useCallback(
    (entryLocalId: string, examId: string) => {
      if (pollersRef.current.has(examId)) return
      const { promise, stop } = startExamAnalysisWatchdog(examId, {
        intervalMs: POLL_INTERVAL_MS,
        stallMs: STALL_TIMEOUT_MS,
        onTick: (snap: ExamStatusSnapshot) => {
          if (snap.status === 'running') {
            const pct = progressPercent(snap.progress)
            patchEntry(entryLocalId, {
              stage: 'extracting',
              progressMsg: pct !== null ? `Extraindo... ${pct}%` : 'Extraindo...',
            })
          } else if (snap.status === 'awaiting_review') {
            patchEntry(entryLocalId, { stage: 'awaiting_review', progressMsg: undefined })
          }
        },
      })
      pollersRef.current.set(examId, { stop })
      promise
        .then(async (outcome) => {
          pollersRef.current.delete(examId)
          if (outcome.kind === 'cancelled') return
          if (outcome.kind === 'stalled') {
            const msg =
              'A extração demorou mais que o esperado. Tente importar o arquivo novamente.'
            await markExamAnalysisError(examId, msg)
            patchEntry(entryLocalId, { stage: 'error', error: msg })
            toast.error(msg)
            return
          }
          const snap = outcome.snapshot
          if (snap.status === 'error') {
            patchEntry(entryLocalId, { stage: 'error', error: snap.error || 'Falha na extração.' })
          } else if (snap.status === 'awaiting_review') {
            patchEntry(entryLocalId, { stage: 'awaiting_review' })
            toast.info('Extração concluída — revise os dados antes de salvar.')
          }
        })
        .catch((err) => {
          pollersRef.current.delete(examId)
          console.warn('[ImportFilesSection] polling interrompido:', err)
        })
    },
    [patchEntry],
  )

  const processEntry = useCallback(
    async (entry: ImportEntry) => {
      const { localId, file, kind, hash } = entry
      try {
        patchEntry(localId, { stage: 'reading', progressMsg: 'Verificando duplicidade...' })
        const assist = await importAssist({ file, kind, hash })
        if (assist.duplicate) {
          patchEntry(localId, {
            stage: 'duplicate',
            examId: assist.exam_id,
            error: assist.message || 'Arquivo já importado anteriormente.',
          })
          return
        }
        if (!assist.exam_id) throw new Error(assist.error || 'Falha ao preparar a importação.')
        patchEntry(localId, { examId: assist.exam_id, importId: assist.import_id })

        // PDF/imagem: envia o BINÁRIO via FormData no exame criado — o runner
        // (exam_async) baixa e usa renderPdfToJpegBase64List no servidor.
        // DOCX/XLSX/CSV/TXT: extrai o TEXTO no cliente e enfileira com origin='import'.
        if (kind === 'pdf' || kind === 'image') {
          patchEntry(localId, { stage: 'reading', progressMsg: 'Enviando arquivo...' })
          const fd = new FormData()
          fd.append('file', file)
          await pb.collection('exams').update(assist.exam_id, fd)
          patchEntry(localId, {
            stage: 'extracting',
            progressMsg: 'Na fila para leitura por IA...',
          })
          await importKickoff({ examId: assist.exam_id, importId: assist.import_id })
        } else {
          patchEntry(localId, { stage: 'reading', progressMsg: 'Lendo conteúdo do arquivo...' })
          await extractAndEnqueueText({
            file,
            kind,
            examId: assist.exam_id,
            onProgress: (msg) => patchEntry(localId, { stage: 'extracting', progressMsg: msg }),
          })
          patchEntry(localId, {
            stage: 'extracting',
            progressMsg: 'Na fila para extração com IA...',
          })
          await importKickoff({ examId: assist.exam_id, importId: assist.import_id })
        }
        trackExam(localId, assist.exam_id)
      } catch (err: any) {
        console.error('[ImportFilesSection] falha no fluxo de importação:', err)
        patchEntry(localId, {
          stage: 'error',
          error:
            err?.response?.error ||
            err?.message ||
            'Não foi possível importar este arquivo. Tente novamente.',
        })
      }
    },
    [patchEntry, trackExam],
  )

  const addFiles = useCallback(
    (files: File[]) => {
      for (const file of files) {
        const kind = fileKindOf(file)
        const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
        const entry: ImportEntry = { localId, file, kind, hash: '', stage: 'received' }
        setEntries((prev) => [...prev, entry])
        contentHashOf(file)
          .then((hash) => processEntry({ ...entry, hash }))
          .catch((err) => {
            console.error('[ImportFilesSection] hash falhou:', err)
            patchEntry(localId, { stage: 'error', error: 'Falha ao ler o arquivo (hash).' })
          })
      }
    },
    [processEntry, patchEntry],
  )

  // ---- Persistência: ao montar, retoma do BANCO os imports em andamento ----
  useEffect(() => {
    let alive = true
    if (!user?.id) return
    ;(async () => {
      try {
        const imports = await pb.collection('exam_imports').getFullList({
          filter: `user = "${user.id}"`,
          sort: '-created',
        })
        const open = imports.filter((im: any) =>
          ['awaiting_review', 'extracting'].includes(String(im.status || '')),
        )
        if (!alive || open.length === 0) return
        const resumed: ImportEntry[] = []
        for (const im of open) {
          const exam = im.exam
            ? await pb
                .collection('exams')
                .getOne(im.exam)
                .catch(() => null)
            : null
          const stage: Stage =
            String(im.status) === 'awaiting_review'
              ? 'awaiting_review'
              : String(exam?.analysis_status) === 'error'
                ? 'error'
                : 'extracting'
          resumed.push({
            localId: `db-${im.id}`,
            file: new File([], String(im.filename || 'arquivo'), {}),
            kind: (String(im.file_type || 'unknown') as ImportKind) || 'unknown',
            hash: String(im.content_hash || ''),
            stage,
            examId: im.exam,
            importId: im.id,
            error: stage === 'error' ? 'A extração falhou nesta sessão anterior.' : undefined,
          })
        }
        if (resumed.length > 0) setEntries((prev) => [...resumed, ...prev])
      } catch (err) {
        console.warn('[ImportFilesSection] não conseguiu retomar imports do banco:', err)
      }
    })()
    return () => {
      alive = false
      pollersRef.current.forEach((p) => p.stop())
      pollersRef.current.clear()
    }
  }, [user?.id])

  const handleDownloadOriginal = async (entry: ImportEntry) => {
    if (!entry.examId) return
    setDownloadingId(entry.localId)
    try {
      const exam: any = await pb.collection('exams').getOne(entry.examId)
      if (!exam?.file) throw new Error('O exame não tem arquivo anexado.')
      // ?token= na URL do arquivo: PocketBase autentica por header/token, nunca
      // por cookie (credentials:'include' aqui voltaria 401).
      const fileUrl = new URL(pb.getFileUrl(exam, exam.file))
      if (pb.authStore.token) fileUrl.searchParams.set('token', pb.authStore.token)
      const blob = await (await fetch(fileUrl.toString())).blob()
      const ext = exam.file.split('.').pop() || 'bin'
      downloadBlob(blob, `${(exam.title || 'exame').replace(/[^\w.-]+/g, '_')}.${ext}`)
    } catch (err: any) {
      console.error('[ImportFilesSection] download do original falhou:', err)
      toast.error(err?.message || 'Falha ao baixar o arquivo original.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleExport = async (entry: ImportEntry, format: 'json' | 'csv') => {
    if (!entry.importId) {
      toast.error('Ainda não há dados estruturados para este arquivo.')
      return
    }
    setExportingId(entry.localId)
    try {
      if (format === 'csv') {
        downloadBlob(await exportImportCsv(entry.importId), `import-${entry.importId}.csv`)
      } else {
        downloadBlob(
          new Blob([JSON.stringify(await exportImportJson(entry.importId), null, 2)], {
            type: 'application/json',
          }),
          `import-${entry.importId}.json`,
        )
      }
      toast.success(`Exportado em ${format.toUpperCase()}.`)
    } catch (err: any) {
      console.error('[ImportFilesSection] export falhou:', err)
      toast.error(err?.message || `Falha ao exportar em ${format.toUpperCase()}.`)
    } finally {
      setExportingId(null)
    }
  }

  const openReview = (entry: ImportEntry) => {
    setReviewExamId(entry.examId || null)
    setReviewImportId(entry.importId || null)
  }

  const onReviewFinished = (examId: string) => {
    setEntries((prev) =>
      prev.map((en) =>
        en.examId === examId ? { ...en, stage: 'done', progressMsg: undefined } : en,
      ),
    )
    setReviewExamId(null)
    setReviewImportId(null)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) addFiles(files)
  }

  const hasAwaitingReview = entries.some((en) => en.stage === 'awaiting_review')
  const reviewEntry = entries.find((en) => en.examId === reviewExamId)

  return (
    <div className="space-y-3">
      {/* Zona de drag & drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40'
            : 'border-emerald-300 bg-background/60 hover:bg-emerald-50/50 dark:border-emerald-800 dark:hover:bg-emerald-950/20'
        }`}
      >
        <CloudUpload className="h-7 w-7 mx-auto text-emerald-600 mb-2" />
        <p className="text-sm font-medium text-foreground">
          Arraste arquivos aqui ou clique para selecionar
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          PDF, JPG, PNG, WebP, DOCX, XLSX, CSV ou TXT — individual ou em lote. A IA extrai os dados
          e você confirma antes de salvar.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            if (files.length > 0) addFiles(files)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </div>

      {/* Lista de arquivos com estado individual */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Arquivos em importação ({entries.length})
          </p>
          {entries.map((entry) => {
            const Icon = iconFor(entry.kind)
            const meta = STAGE_META[entry.stage]
            const busy = entry.stage === 'reading' || entry.stage === 'extracting'
            return (
              <div
                key={entry.localId}
                className="rounded-xl border bg-card p-3 flex items-start gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[14rem] sm:max-w-xs">
                      {entry.file.name || 'Arquivo retomado do banco'}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${meta.className}`}>
                      {meta.label}
                    </Badge>
                  </div>
                  {busy && entry.progressMsg && (
                    <div className="bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      {entry.progressMsg}
                    </div>
                  )}
                  {entry.stage === 'duplicate' && (
                    <div className="bg-orange-50/70 dark:bg-orange-950/30 p-2 rounded-lg text-[11px] text-orange-700 dark:text-orange-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        Arquivo já importado anteriormente — nenhum registro novo foi criado.
                      </span>
                    </div>
                  )}
                  {entry.stage === 'error' && (
                    <div className="bg-red-50/70 dark:bg-red-950/30 p-2 rounded-lg text-[11px] text-red-700 dark:text-red-300 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{entry.error || 'Falha no processamento.'}</span>
                    </div>
                  )}
                  {entry.stage === 'awaiting_review' && (
                    <div className="bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-lg text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <ClipboardCheck className="h-3 w-3 shrink-0" />
                      <span>Dados extraídos — confirme antes de salvar em Biomarcadores.</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {entry.stage === 'awaiting_review' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openReview(entry)}
                      className="h-7 px-2 text-[11px] gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                    >
                      <ClipboardCheck className="h-3 w-3" />
                      Revisar dados
                    </Button>
                  )}
                  {entry.examId && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={downloadingId === entry.localId}
                        onClick={() => handleDownloadOriginal(entry)}
                        className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-emerald-700"
                      >
                        {downloadingId === entry.localId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Baixar
                      </Button>
                      {entry.stage === 'done' && entry.importId && (
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={exportingId === entry.localId}
                            onClick={() => handleExport(entry, 'json')}
                            className="h-7 px-2 text-[11px] gap-1"
                          >
                            {exportingId === entry.localId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileJson className="h-3.5 w-3.5" />
                            )}
                            JSON
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={exportingId === entry.localId}
                            onClick={() => handleExport(entry, 'csv')}
                            className="h-7 px-2 text-[11px] gap-1"
                          >
                            {exportingId === entry.localId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileCsv className="h-3.5 w-3.5" />
                            )}
                            CSV
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Painel de revisão (modal sobre a lista) */}
      {reviewExamId && (
        <ImportReviewPanel
          examId={reviewExamId}
          importId={reviewImportId}
          entry={reviewEntry}
          onClose={() => {
            setReviewExamId(null)
            setReviewImportId(null)
          }}
          onFinished={onReviewFinished}
        />
      )}
    </div>
  )
}
