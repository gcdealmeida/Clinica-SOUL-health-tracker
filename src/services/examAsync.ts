/// <reference lib="dom" />
import pb from '@/lib/pocketbase/client'
import { GatewayRejection, prepareExamPagesForAi } from '@/services/examReader'
import type { ExamPage } from '@/services/examReader'

/**
 * Fluxo assíncrono (v0.0.64): o cliente renderiza o documento inteiro e envia
 * as páginas em PEDAÇOS pequenos para /backend/v1/ai/analyze-exam-async — cada
 * pedaço responde 202 na hora (o kickoff enfileira, os pedaços seguintes
 * anexam). O runner em cron (ai_features_exam_async.js) processa em segundo
 * plano e o app acompanha via polling em exams.analysis_status (examStatus.ts).
 *
 * Isso elimina o "Failed to fetch": nenhuma requisição demora ou carrega
 * payload grande demais para o ingress.
 */

const ASYNC_ENDPOINT = '/backend/v1/ai/analyze-exam-async'

/** Teto aproximado de caracteres base64 (JSON) por pedaço (~700KB de corpo). */
const MAX_CHUNK_CHARS = 700_000

function chunkPages(pages: ExamPage[]): ExamPage[][] {
  const chunks: ExamPage[][] = []
  let current: ExamPage[] = []
  let chars = 0
  for (const page of pages) {
    const cost = page.base64.length + 120
    if (current.length > 0 && chars + cost > MAX_CHUNK_CHARS) {
      chunks.push(current)
      current = []
      chars = 0
    }
    current.push(page)
    chars += cost
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

interface AsyncKickoffResponse {
  success?: boolean
  accepted?: boolean
  exam_id?: string
  analysis_status?: string
  pages_queued?: number
  total_pages?: number
  error?: string
}

/** Envia um pedaço de páginas. `restart` limpa a fila antes de anexar. */
async function sendChunk(body: Record<string, unknown>): Promise<AsyncKickoffResponse> {
  try {
    return (await pb.send(ASYNC_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(body),
    })) as AsyncKickoffResponse
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    // Sem status (TypeError "Failed to fetch" / status 0) ou recusas do
    // gateway/ingress: sobe GatewayRejection — a chamada em course re-renderiza
    // em resolução menor e reenvia do zero (mesma escada do fluxo síncrono).
    if (!status || err instanceof TypeError || [400, 413, 503, 502, 504].includes(status)) {
      throw new GatewayRejection(status || 0, {
        error:
          'A conexão falhou ao enviar as páginas do exame (payload muito grande ou timeout). ' +
          'Tentando novamente com resolução menor...',
      })
    }
    throw err
  }
}

/**
 * Renderiza o documento (PDF/imagem) e enfileira TODAS as páginas na análise
 * assíncrona. Responde quando o kickoff aceita o trabalho (202) — o
 * processamento continua sozinho no servidor.
 */
export async function startAsyncExamAnalysis(opts: {
  examId: string
  fileUrlOrFile: string | File
  title?: string
  onProgress?: (msg: string) => void
}): Promise<{ totalPages: number }> {
  const { examId, fileUrlOrFile, title, onProgress } = opts
  onProgress?.('Preparando e renderizando o documento completo...')
  const masterPages = await prepareExamPagesForAi(fileUrlOrFile, undefined, 1024, 0.75)
  if (masterPages.length === 0) {
    throw new Error('Não foi possível extrair páginas do arquivo para leitura.')
  }
  onProgress?.(`Documento com ${masterPages.length} página(s) renderizado(s). Enfileirando...`)

  const chunks = chunkPages(masterPages)
  for (let c = 0; c < chunks.length; c++) {
    await sendChunk({
      examId,
      images: chunks[c].map((p) => `data:image/jpeg;base64,${p.base64}`),
      total_pages: masterPages.length,
      restart: c === 0,
      title,
    })
    if (chunks.length > 1) {
      const queued = chunks.slice(0, c + 1).reduce((n, ch) => n + ch.length, 0)
      onProgress?.(`Enfileiradas ${queued} de ${masterPages.length} página(s)...`)
    }
  }
  onProgress?.('Páginas na fila — o processamento continua em segundo plano.')
  return { totalPages: masterPages.length }
}
