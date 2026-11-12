/// <reference lib="dom" />
import pb from '@/lib/pocketbase/client'
import { GatewayRejection, prepareExamPagesForAi } from '@/services/examReader'
import type { ExamPage } from '@/services/examReader'

/** Erro de negócio: o registro do exame não tem arquivo anexado no servidor. */
export class ExamFileMissingError extends Error {
  constructor() {
    super('Este exame não tem arquivo anexado. Exclua e envie o arquivo novamente.')
    this.name = 'ExamFileMissingError'
  }
}

/**
 * Fluxo assíncrono (v0.0.64): o cliente renderiza o documento e envia as
 * páginas em PEDAÇOS pequenos para /backend/v1/ai/analyze-exam-async — cada
 * pedaço responde 202 na hora (o kickoff enfileira, os pedaços seguintes
 * anexam). O runner em cron (ai_features_exam_async.js) processa em segundo
 * plano e o app acompanha via polling em exams.analysis_status (examStatus.ts).
 */

const ASYNC_ENDPOINT = '/backend/v1/ai/analyze-exam-async'

/** Teto aproximado de caracteres base64 (JSON) por pedaço (~700KB de corpo). */
const MAX_CHUNK_CHARS = 700_000

/**
 * Escada de resolução do envio assíncrono: se um pedaço for recusado
 * (413/503/falha de rede no ingress), re-renderiza TODO o documento na
 * resolução seguinte e reenvia do zero.
 */
const ASYNC_LADDER: Array<{ width: number; quality: number }> = [
  { width: 1024, quality: 0.75 },
  { width: 768, quality: 0.7 },
  { width: 512, quality: 0.6 },
]

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

/** Envia um pedaço de páginas. Falha de rede/recusa do ingress sobe GatewayRejection. */
async function sendChunk(
  body: Record<string, unknown>,
  meta?: { chunkIndex?: number; chunkTotal?: number; width?: number; quality?: number },
): Promise<AsyncKickoffResponse> {
  const pages = Array.isArray(body?.images) ? (body.images as string[]).length : 0
  const bytes = body ? JSON.stringify(body).length : 0
  console.log(
    `[examAsync] sendChunk #${meta?.chunkIndex ?? '?'}${meta?.chunkTotal ? `/${meta.chunkTotal}` : ''}:` +
      ` ${pages} página(s), ${(bytes / 1024).toFixed(0)}KB, resolução ${meta?.width ?? '?'}px q${meta?.quality ?? '?'}`,
  )
  try {
    return (await pb.send(ASYNC_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(body),
    })) as AsyncKickoffResponse
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    // Sem status (TypeError "Failed to fetch" / status 0) ou recusas do
    // gateway/ingress: sobe GatewayRejection — a chamada em curso re-renderiza
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

/** Envia todas as páginas de um documento já renderizado, em pedaços. */
async function enqueueAllPages(
  masterPages: ExamPage[],
  examId: string,
  title: string | undefined,
  onProgress?: (msg: string) => void,
  res?: { width: number; quality: number },
): Promise<void> {
  const chunks = chunkPages(masterPages)
  if (chunks.length === 0) {
    throw new Error('A fila de páginas da análise está vazia. Use "Reanalisar com IA".')
  }
  console.log(
    `[examAsync] enfileirando ${masterPages.length} página(s) em ${chunks.length} pedaço(s)` +
      ` (exame ${examId}${title ? ` — "${title}"` : ''})`,
  )
  for (let c = 0; c < chunks.length; c++) {
    await sendChunk(
      {
        examId,
        images: chunks[c].map((p) => `data:image/jpeg;base64,${p.base64}`),
        total_pages: masterPages.length,
        restart: c === 0,
        title,
      },
      { chunkIndex: c + 1, chunkTotal: chunks.length, width: res?.width, quality: res?.quality },
    )
    if (chunks.length > 1) {
      const queued = chunks.slice(0, c + 1).reduce((n, ch) => n + ch.length, 0)
      onProgress?.(`Enfileiradas ${queued} de ${masterPages.length} página(s)...`)
    }
  }
  onProgress?.('Páginas na fila — o processamento continua em segundo plano.')
}

/**
 * Renderiza o documento (PDF/imagem) e enfileira TODAS as páginas na análise
 * assíncrona. Responde quando o kickoff aceita o trabalho (202) — o
 * processamento continua sozinho no servidor. Se um pedaço for recusado pelo
 * ingress/gateway (GatewayRejection), re-renderiza o documento inteiro na
 * resolução seguinte da escada e reenvia do zero.
 */
export async function startAsyncExamAnalysis(opts: {
  examId: string
  fileUrlOrFile: string | File
  title?: string
  onProgress?: (msg: string) => void
}): Promise<{ totalPages: number }> {
  const { examId, fileUrlOrFile, title, onProgress } = opts
  // Pré-checagem: o registro do exame precisa ter arquivo anexado. Sem isso a
  // fila de páginas sairia vazia e a análise abortaria com a mensagem genérica
  // de fila vazia — melhor abortar aqui com o motivo exato.
  if (typeof fileUrlOrFile === 'string') {
    let record: any = null
    try {
      record = await pb.collection('exams').getOne(examId)
    } catch (err) {
      console.warn('[examAsync] pré-checagem: não conseguiu ler o registro do exame', err)
    }
    if (record && !record.file) {
      console.warn('[examAsync] exame', examId, 'está SEM arquivo anexado no servidor')
      throw new ExamFileMissingError()
    }
  }
  let lastError: unknown = null
  for (let step = 0; step < ASYNC_LADDER.length; step++) {
    const { width, quality } = ASYNC_LADDER[step]
    try {
      if (step > 0) {
        onProgress?.(`O envio falhou — tentando novamente com resolução menor (${width}px)...`)
      }
      onProgress?.('Preparando e renderizando o documento completo...')
      const masterPages = await prepareExamPagesForAi(fileUrlOrFile, undefined, width, quality)
      if (masterPages.length === 0) {
        throw new Error('Não foi possível extrair páginas do arquivo para leitura.')
      }
      onProgress?.(`Documento com ${masterPages.length} página(s) renderizado(s). Enfileirando...`)
      await enqueueAllPages(masterPages, examId, title, onProgress, { width, quality })
      return { totalPages: masterPages.length }
    } catch (err) {
      lastError = err
      // Só sobe na escada quando for recusa de rede/gateway; erros de negócio
      // (arquivo ilegível, 401/403/404) terminam aqui mesmo.
      if (err instanceof GatewayRejection && step < ASYNC_LADDER.length - 1) continue
      throw err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Não foi possível enviar o exame para análise.')
}
