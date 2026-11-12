/// <reference lib="dom" />
import pb from '@/lib/pocketbase/client'
import type { Exam, ExamAnalysisStatus, ExamAnalysisStats, ExamAnalysisProgress } from '@/types'

/**
 * Acompanhamento da análise assíncrona de exames (v0.0.64).
 *
 * O endpoint /backend/v1/ai/analyze-exam-async responde 202 imediatamente e o
 * runner (cron no hook ai_features_exam_async.js) processa os lotes em segundo
 * plano, gravando em exams: analysis_status ('running' | 'done' | 'error'),
 * analysis_error, analysis_stats (contadores finais) e analysis_progress
 * ({total_pages, pages_done}). O app faz polling no registro do exame — nunca
 * mais na resposta longa do analyze-exam síncrono, que era a fonte do
 * "Failed to fetch".
 */

export interface ExamStatusSnapshot {
  status: ExamAnalysisStatus
  error?: string
  stats?: ExamAnalysisStats | null
  progress?: ExamAnalysisProgress | null
  updatedAt?: string
}

/** Lê o snapshot de status/progresso de um exame. */
export async function getExamAnalysisStatus(examId: string): Promise<ExamStatusSnapshot> {
  const r = await pb.collection('exams').getOne(examId)
  return {
    status: (r.analysis_status || '') as ExamAnalysisStatus,
    error: r.analysis_error || undefined,
    stats: safeParse(r.analysis_stats),
    progress: safeParse(r.analysis_progress),
    updatedAt: r.updated,
  }
}

function safeParse(raw: unknown): any {
  if (!raw) return null
  if (typeof raw === 'object') return raw // SDK já desserializa JSON fields
  try {
    return JSON.parse(String(raw))
  } catch {
    return null
  }
}

/** Porcentagem de páginas processadas (0–100), quando conhecida. */
export function progressPercent(progress?: ExamAnalysisProgress | null): number | null {
  if (!progress || typeof progress.total_pages !== 'number' || progress.total_pages <= 0) {
    return null
  }
  const done = typeof progress.pages_done === 'number' ? progress.pages_done : 0
  return Math.min(100, Math.round((done / progress.total_pages) * 100))
}

/** Lista os exames do usuário que estão em análise agora (retomada ao montar). */
export async function listExamsAnalyzing(userId: string): Promise<Exam[]> {
  const records = await pb.collection('exams').getFullList({
    filter: `user = '${userId}' && analysis_status = 'running'`,
    sort: '-created',
  })
  return records.map((r) => ({ id: r.id })) as Exam[]
}

export interface PollOptions {
  intervalMs?: number
  timeoutMs?: number
  onTick?: (snapshot: ExamStatusSnapshot) => void
}

/**
 * Faz polling do status do exame até concluir ('done'/'error') ou estourar o
 * timeout (padrão 5 min). Cada tick entrega o snapshot (com progresso de
 * páginas) para a UI via onTick.
 */
export function pollExamAnalysis(examId: string, opts: PollOptions = {}) {
  const intervalMs = opts.intervalMs ?? 3000
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  const startedAt = Date.now()

  const stop = () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }

  const promise = new Promise<ExamStatusSnapshot>((resolve, reject) => {
    const tick = async () => {
      if (cancelled) return
      try {
        const snapshot = await getExamAnalysisStatus(examId)
        if (cancelled) return
        opts.onTick?.(snapshot)
        if (snapshot.status === 'done' || snapshot.status === 'error') {
          resolve(snapshot)
          return
        }
      } catch (err) {
        // Falha pontual de rede/status: loga e continua tentando até o timeout.
        console.warn('pollExamAnalysis: falha ao ler status', err)
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('timeout'))
        return
      }
      timer = setTimeout(tick, intervalMs)
    }
    tick()
  })

  return { promise, stop }
}
