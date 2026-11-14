/// <reference lib="dom" />
import pb from '@/lib/pocketbase/client'
import type { ExamStatusSnapshot } from '@/services/examStatus'
import { getExamAnalysisStatus } from '@/services/examStatus'

/**
 * Watchdog da análise assíncrona (v0.0.66): se a análise ficar presa em
 * 'running' sem progresso real (analysis_progress.pages_done sem mudar) por
 * mais de ~3 minutos, o card mostra "A análise demorou mais que o esperado"
 * com "Tentar novamente" habilitado — nunca mais "Analisando…" infinito.
 *
 * Progresso real = pages_done aumentar (lote concluído pelo runner) OU o
 * status sair de 'running'. Mensagens de enfileiramento/toast não contam.
 */

export interface WatchdogOptions {
  /** Intervalo de leitura do status (ms). Padrão 5s. */
  intervalMs?: number
  /** Tempo sem progresso real antes de disparar o timeout (ms). Padrão 3 min. */
  stallMs?: number
  onTick?: (snapshot: ExamStatusSnapshot) => void
}

export type WatchdogOutcome =
  | { kind: 'finished'; snapshot: ExamStatusSnapshot }
  | { kind: 'stalled'; snapshot: ExamStatusSnapshot }
  | { kind: 'cancelled'; snapshot: ExamStatusSnapshot | null }

export interface ExamWatchdog {
  promise: Promise<WatchdogOutcome>
  stop: () => void
}

export function startExamAnalysisWatchdog(
  examId: string,
  opts: WatchdogOptions = {},
): ExamWatchdog {
  const intervalMs = opts.intervalMs ?? 5000
  const stallMs = opts.stallMs ?? 3 * 60 * 1000
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastSnapshot: ExamStatusSnapshot | null = null
  let lastProgressKey = ''
  let lastProgressAt = Date.now()

  const stop = () => {
    cancelled = true
    if (timer) clearTimeout(timer)
  }

  const promise = new Promise<WatchdogOutcome>((resolve) => {
    const tick = async () => {
      if (cancelled) return
      try {
        const snapshot = await getExamAnalysisStatus(examId)
        if (cancelled) return
        lastSnapshot = snapshot
        opts.onTick?.(snapshot)
      } catch {
        // falha pontual de rede: apenas espera o próximo tick
      }
      if (cancelled) return
      const status = lastSnapshot?.status
      // 'awaiting_review' também é terminal no fluxo de IMPORTAÇÃO: a extração
      // acabou e os dados ficam em staging aguardando decisão do usuário.
      if (status === 'done' || status === 'error' || status === 'awaiting_review') {
        resolve({ kind: 'finished', snapshot: lastSnapshot! })
        return
      }
      const key = `${lastSnapshot?.progress?.pages_done ?? 0}/${lastSnapshot?.progress?.total_pages ?? 0}`
      const now = Date.now()
      if (key !== lastProgressKey) {
        lastProgressKey = key
        lastProgressAt = now
      }
      if (now - lastProgressAt > stallMs) {
        resolve({ kind: 'stalled', snapshot: lastSnapshot! })
        return
      }
      timer = setTimeout(tick, intervalMs)
    }
    tick()
  })

  return { promise, stop }
}

/** Marca o exame em 'error' com mensagem legível (usado no timeout/queue-fail). */
export async function markExamAnalysisError(examId: string, message: string): Promise<void> {
  try {
    await pb.collection('exams').update(examId, {
      analysis_status: 'error',
      analysis_error: message,
    })
  } catch (err) {
    console.warn('[examWatchdog] não conseguiu marcar erro no exame', examId, err)
  }
}
