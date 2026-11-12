/// <reference lib="dom" />
import pb from '@/lib/pocketbase/client'

export interface ExamBiomarkerExtracted {
  name: string
  value: string
  unit?: string
  reference_range?: string
  category?: string
  status?: string
  date?: string
  notes?: string
}

export interface ExamAnalysisResponse {
  success: boolean
  summary: string
  exam_title?: string
  exam_type?: string
  biomarkers: ExamBiomarkerExtracted[]
  biomarkers_extracted: number
  biomarkers_created: number
  biomarkers_updated: number
  pages_analyzed: number
  error?: string
  code?: string
}

const ANALYZE_EXAM_ENDPOINT = '/backend/v1/ai/analyze-exam'

/** Página (JPEG em base64 puro, sem data URL) pronta para o analyze-exam. */
export interface ExamPage {
  base64: string
  width: number
  height: number
}

type RawAnalyzeResponse = {
  success?: boolean
  summary?: string
  exam_title?: string
  exam_type?: string
  biomarkers?: ExamBiomarkerExtracted[]
  biomarkers_extracted?: number
  biomarkers_created?: number
  biomarkers_updated?: number
  pages_analyzed?: number
  error?: string
  code?: string
}

export function extractPdfPageCount(data: Uint8Array): number | null {
  // Conta "/Type /Page" (excluindo "/Pages"). PDFs reais separam os objetos,
  // então um includes com contorno de palavra já é um bom estimador.
  let text = ''
  const step = Math.max(1, Math.floor(data.length / 3_000_000))
  for (let i = 0; i < data.length; i += step) {
    const end = Math.min(data.length, i + 4096)
    const chunk = data.subarray(i, end)
    text += String.fromCharCode(...Array.from(chunk))
  }
  const matches = text.match(/\/Type\s*\/Page[^s]/g)
  if (matches && matches.length > 0) return matches.length
  return null
}

async function renderPdfPagesAtScale(
  pdf: any,
  targetWidth: number,
  quality: number,
  onPage?: (index: number, total: number) => void,
): Promise<ExamPage[]> {
  const pages: ExamPage[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    onPage?.(i - 1, pdf.numPages)
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    // Sempre upa para pelo menos targetWidth (downscale a partir do máximo útil).
    const scale = Math.max(targetWidth / base.width, 1)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D não disponível neste navegador.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const pure = dataUrl.slice(dataUrl.indexOf(',') + 1)
    pages.push({ base64: pure, width: canvas.width, height: canvas.height })
    page.cleanup()
  }
  return pages
}

/**
 * Renderiza TODAS as páginas do PDF (sem limite) em JPEGs base64.
 * targetWidth é uma referência — o retry com resolução menor re-renderiza
 * em ladders menores com o mesmo arquivo.
 */
export async function renderAllPdfPagesToJpegBase64(
  fileUrlOrFile: string | File,
  targetWidth = 1280,
  quality = 0.9,
  onPage?: (index: number, total: number) => void,
): Promise<ExamPage[]> {
  const pdfjs = await getPdfJs()
  const data = await loadPdfData(fileUrlOrFile)
  const pdf = await pdfjs.getDocument({ data }).promise
  return renderPdfPagesAtScale(pdf, targetWidth, quality, onPage)
}

/** Compat: antiga API com limite de páginas (agora lê tudo). */
export async function renderPdfToJpegBase64List(
  fileUrlOrFile: string | File,
  maxPages = Infinity,
  targetWidth = 1280,
  quality = 0.9,
  onPage?: (index: number, total: number) => void,
): Promise<ExamPage[]> {
  const pdfjs = await getPdfJs()
  const data = await loadPdfData(fileUrlOrFile)
  const pdf = await pdfjs.getDocument({ data }).promise
  const total = Math.min(pdf.numPages, maxPages)
  const pages: ExamPage[] = []
  for (let i = 1; i <= total; i++) {
    onPage?.(i - 1, total)
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.max(targetWidth / base.width, 1)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D não disponível neste navegador.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const pure = dataUrl.slice(dataUrl.indexOf(',') + 1)
    pages.push({ base64: pure, width: canvas.width, height: canvas.height })
    page.cleanup()
  }
  return pages
}

async function loadPdfData(fileUrlOrFile: string | File): Promise<Uint8Array> {
  if (typeof fileUrlOrFile !== 'string') {
    return new Uint8Array(await fileUrlOrFile.arrayBuffer())
  }
  const res = await fetch(fileUrlOrFile, { credentials: 'include' })
  if (!res.ok) throw new Error(`Falha ao baixar o PDF do exame (${res.status}).`)
  return new Uint8Array(await res.arrayBuffer())
}

export async function convertImageToJpegBase64(
  fileUrlOrFile: string | File,
  targetWidth = 1280,
  quality = 0.9,
): Promise<ExamPage[]> {
  const img = await loadImage(fileUrlOrFile)
  const scale = Math.max(targetWidth / img.naturalWidth, 0.05)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D não disponível neste navegador.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  const pure = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return [{ base64: pure, width: canvas.width, height: canvas.height }]
}

function loadImage(src: string | File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível carregar a imagem.'))
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src)
  })
}

/**
 * Prepara todas as páginas do arquivo (PDF com qualquer nº de páginas, ou imagem única)
 * para o analyze-exam, na resolução de referência. O retry com resolução menor é
 * feito por runExamAnalysisWithRetry, que re-renderiza a partir do mesmo arquivo.
 */
export async function prepareExamPagesForAi(
  fileUrlOrFile: string | File,
  _maxPages?: number,
  targetWidth = 1280,
  quality = 0.9,
  onPage?: (index: number, total: number) => void,
): Promise<ExamPage[]> {
  const isPdf =
    typeof fileUrlOrFile === 'string'
      ? fileUrlOrFile.toLowerCase().includes('.pdf')
      : fileUrlOrFile.type === 'application/pdf' ||
        fileUrlOrFile.name.toLowerCase().endsWith('.pdf')
  if (isPdf) {
    return renderAllPdfPagesToJpegBase64(fileUrlOrFile, targetWidth, quality, onPage)
  }
  return convertImageToJpegBase64(fileUrlOrFile, targetWidth, quality)
}

async function callAnalyzeExamOnce(body: Record<string, unknown>): Promise<ExamAnalysisResponse> {
  try {
    const res = await pb.send(ANALYZE_EXAM_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return normalizeAnalyzeResponse(res)
  } catch (err: any) {
    const status = err?.status || err?.response?.status
    if (
      status === 413 ||
      status === 503 ||
      status === 400 ||
      status === 408 ||
      status === 502 ||
      status === 504
    ) {
      const raw = err?.response
      throw new GatewayRejection(status, normalizeAnalyzeResponse(raw))
    }
    // Sem status HTTP (ClientResponseError status 0 / TypeError "Failed to
    // fetch") a requisição nem chegou ao backend: corpo grande demais para o
    // ingress/proxy ou conexão quebrada por timeout. Trata como recusa do
    // gateway para que a escada re-tente com payload menor, em zero para o
    // usuário.
    if (!status || err instanceof TypeError) {
      throw new GatewayRejection(0, {
        error:
          'A conexão falhou ao enviar as páginas do exame (payload muito grande ou timeout do ' +
          'servidor). Tentando novamente com resolução menor...',
      })
    }
    throw err
  }
}

export class GatewayRejection extends Error {
  status: number
  payload: RawAnalyzeResponse
  constructor(status: number, payload: RawAnalyzeResponse) {
    const detail =
      payload?.error && typeof payload.error === 'string'
        ? payload.error
        : 'O serviço de IA recusou as páginas do exame.'
    super(detail)
    this.name = 'GatewayRejection'
    this.status = status
    this.payload = payload
  }
}

function normalizeAnalyzeResponse(raw: any): ExamAnalysisResponse {
  const biomarkers = Array.isArray(raw?.biomarkers) ? raw.biomarkers : []
  const declaredCount =
    typeof raw?.biomarkers_extracted === 'number' ? raw.biomarkers_extracted : biomarkers.length
  const created = typeof raw?.biomarkers_created === 'number' ? raw.biomarkers_created : 0
  const updated = typeof raw?.biomarkers_updated === 'number' ? raw.biomarkers_updated : 0
  const pages = typeof raw?.pages_analyzed === 'number' ? raw.pages_analyzed : 0
  return {
    success: raw?.success !== false,
    summary: typeof raw?.summary === 'string' ? raw.summary : '',
    exam_title: raw?.exam_title,
    exam_type: raw?.exam_type,
    biomarkers,
    biomarkers_extracted: declaredCount || biomarkers.length,
    biomarkers_created: created,
    biomarkers_updated: updated,
    pages_analyzed: pages,
    error: typeof raw?.error === 'string' ? raw.error : undefined,
    code: typeof raw?.code === 'string' ? raw.code : undefined,
  }
}

/**
 * Escada de resolução: cada tentativa reduz a largura alvo (e a qualidade).
 * v0.0.61: o gateway de IA e o ingress do Skip Cloud rejeitam payloads grandes
 * (413 "Request body is too large" / "Failed to fetch" sem resposta), então a
 * escada começa conservadora — 1 página por requisição, JPEG q0.75 — e cada
 * requisição fica bem abaixo de ~1.2MB de corpo.
 */
const RESOLUTION_LADDER: Array<{ width: number; quality: number; maxPagesPerBatch: number }> = [
  { width: 1024, quality: 0.75, maxPagesPerBatch: 1 },
  { width: 768, quality: 0.7, maxPagesPerBatch: 1 },
  { width: 512, quality: 0.6, maxPagesPerBatch: 1 },
]

/** Teto aproximado de caracteres base64 (JSON) por requisição (~1.2MB). */
const MAX_BATCH_CHARS = 1_200_000

/**
 * Agrupa páginas em lotes respeitando TANTO o nº máximo de páginas por
 * requisição QUANTO o teto de tamanho do corpo — uma página escaneada pode
 * sozinha estourar o limite do proxy/ingress e derrubar a chamada com
 * "Failed to fetch" antes de chegar ao hook.
 */
function buildBatches(pages: ExamPage[], maxPages: number): ExamPage[][] {
  const batches: ExamPage[][] = []
  let current: ExamPage[] = []
  let chars = 0
  for (const page of pages) {
    const cost = page.base64.length + 120
    if (current.length > 0 && (current.length >= maxPages || chars + cost > MAX_BATCH_CHARS)) {
      batches.push(current)
      current = []
      chars = 0
    }
    current.push(page)
    chars += cost
  }
  if (current.length > 0) batches.push(current)
  return batches
}

/**
 * Roda a análise com recuperação adaptativa:
 * 1. Renderiza TODAS as páginas na resolução inicial (1024px, JPEG q0.75).
 * 2. Envia em lotes de até maxPagesPerBatch páginas por requisição, com teto
 *    de tamanho de corpo por requisição (buildBatches).
 * 3. Se o gateway/ingress recusar (413/503/400 ou falha de rede "Failed to
 *    fetch"), reduz a resolução/qualidade (1024 → 768 → 512) e tenta de novo,
 *    sempre re-renderizando as páginas a partir do arquivo original.
 * 4. Consolida o resumo e os marcadores de todos os lotes.
 */
export async function runExamAnalysisWithRetry(opts: {
  examId: string
  fileUrlOrFile: string | File
  title?: string
  onProgress?: (msg: string) => void
}): Promise<ExamAnalysisResponse> {
  const { examId, fileUrlOrFile, title, onProgress } = opts
  onProgress?.('Preparando e renderizando o documento completo...')
  const masterPages = await prepareExamPagesForAi(fileUrlOrFile, undefined, 1024, 0.75)
  if (masterPages.length === 0) {
    throw new Error('Não foi possível extrair páginas do arquivo para leitura.')
  }
  onProgress?.(`Documento com ${masterPages.length} página(s) renderizado(s).`)

  let ladderIndex = 0
  let lastError: unknown = null
  while (ladderIndex < RESOLUTION_LADDER.length) {
    const step = RESOLUTION_LADDER[ladderIndex]
    try {
      let pagesAtStep = masterPages
      if (ladderIndex > 0) {
        onProgress?.(
          `Gateway recusou as páginas — re-renderizando em ${step.width}px, ${step.maxPagesPerBatch} página(s) por requisição...`,
        )
        pagesAtStep = await prepareExamPagesForAi(
          fileUrlOrFile,
          undefined,
          step.width,
          step.quality,
        )
      }
      const batches = buildBatches(pagesAtStep, step.maxPagesPerBatch)
      const allBiomarkers: ExamBiomarkerExtracted[] = []
      const summaries: string[] = []
      let examTitle: string | undefined
      let examType: string | undefined
      let createdTotal = 0
      let updatedTotal = 0

      for (let b = 0; b < batches.length; b++) {
        const batch = batches[b]
        const firstPage = batches.slice(0, b).reduce((n, bt) => n + bt.length, 0)
        onProgress?.(
          `Analisando páginas ${firstPage + 1}-${firstPage + batch.length} de ${
            pagesAtStep.length
          } (resolução ${step.width}px)...`,
        )
        const partial = await callAnalyzeExamOnce({
          examId,
          images: batch.map((p) => `data:image/jpeg;base64,${p.base64}`),
          // Em lotes, marca como parcial para o hook NÃO regravar marcadores
          // duplicados — só o último lote consolida e persiste.
          partial_batch: b < batches.length - 1,
          batch_index: b,
          batch_total: batches.length,
          title,
          previous_summary: b > 0 ? summaries[b - 1] : undefined,
          previous_biomarkers:
            b > 0
              ? allBiomarkers.map((m) => ({
                  name: m.name,
                  value: m.value,
                  unit: m.unit,
                  reference_range: m.reference_range,
                }))
              : undefined,
        })
        if (partial.summary) summaries.push(partial.summary)
        if (partial.exam_title) examTitle = partial.exam_title
        if (partial.exam_type) examType = partial.exam_type
        createdTotal += partial.biomarkers_created
        updatedTotal += partial.biomarkers_updated
        allBiomarkers.push(...partial.biomarkers)
      }

      onProgress?.('Consolidando resultado da leitura...')
      return {
        success: true,
        summary: summaries.join('\n\n'),
        exam_title: examTitle,
        exam_type: examType,
        biomarkers: allBiomarkers,
        biomarkers_extracted: allBiomarkers.length,
        biomarkers_created: createdTotal,
        biomarkers_updated: updatedTotal,
        pages_analyzed: pagesAtStep.length,
      }
    } catch (err: any) {
      lastError = err
      if (err instanceof GatewayRejection && ladderIndex < RESOLUTION_LADDER.length - 1) {
        ladderIndex++
        continue
      }
      throw err
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Não foi possível analisar o exame com IA.')
}

/**
 * Compat: antiga API de uma requisição única, agora com o retry adaptativo.
 * Mantida para não quebrar chamadas existentes; prefira runExamAnalysisWithRetry.
 */
export async function analyzeExamWithAi(opts: {
  examId: string
  images: ExamPage[] | string[]
  title?: string
  fallbackSource?: string | File
}): Promise<ExamAnalysisResponse> {
  const images = (opts.images || []).map((p) =>
    typeof p === 'string' ? p : `data:image/jpeg;base64,${p.base64}`,
  )
  if (opts.fallbackSource) {
    return runExamAnalysisWithRetry({
      examId: opts.examId,
      fileUrlOrFile: opts.fallbackSource,
      title: opts.title,
    })
  }
  return callAnalyzeExamOnce({
    examId: opts.examId,
    images,
    title: opts.title,
  })
}

/**
 * Marca o exame como "análise enfileirada" (status assíncrono 'running') ANTES
 * do upload em pedaços — a UI mostra "Analisando..." desde o primeiro clique.
 * Se o hook assíncrono não estiver disponível (backend antigo), segue com o
 * campo `status` do exame.
 */
export async function markExamAnalysisQueued(examId: string): Promise<void> {
  try {
    await pb.collection('exams').update(examId, { analysis_status: 'running' })
  } catch (err) {
    console.warn('markExamAnalysisQueued: falhou (seguindo sem status local)', err)
  }
}

/**
 * Resultado consolidado da análise assíncrona (chamado quando o polling vê
 * analysis_status='done'): lê os contadores finais gravados no exame.
 */
export async function fetchExamAnalysisResult(examId: string): Promise<ExamAnalysisResponse> {
  const r = await pb.collection('exams').getOne(examId)
  let stats: any = null
  try {
    stats = typeof r.analysis_stats === 'string' ? JSON.parse(r.analysis_stats) : r.analysis_stats
  } catch {
    stats = null
  }
  return {
    success: true,
    summary: r.summary_results || '',
    exam_title: r.title,
    exam_type: r.type,
    biomarkers: [],
    biomarkers_extracted: stats?.extracted ?? 0,
    biomarkers_created: stats?.created ?? 0,
    biomarkers_updated: stats?.updated ?? 0,
    pages_analyzed: stats?.pages_analyzed ?? 0,
  }
}

// pdf.js é carregado sob demanda de CDN (não é dependência npm do projeto).
const PDFJS_VERSION = '4.10.38'
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`

let pdfJsPromise: Promise<any> | null = null
export async function getPdfJs(): Promise<any> {
  if (!pdfJsPromise) {
    pdfJsPromise = import(/* @vite-ignore */ PDFJS_URL).then((mod: any) => {
      mod.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
      return mod
    })
  }
  return pdfJsPromise
}
