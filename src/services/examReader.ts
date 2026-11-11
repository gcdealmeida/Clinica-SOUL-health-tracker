import pb from '@/lib/pocketbase/client'

export interface ExamBiomarkerExtracted {
  name: string
  value: string
  unit?: string
  reference_range?: string
  status?: 'otimo' | 'alterado'
}

export interface ExamAnalysisResponse {
  success: boolean
  exam_id?: string
  exam_title?: string
  exam_type?: string
  exam_date?: string
  laboratory?: string
  overall_status?: 'normal' | 'alterado'
  summary_text: string
  biomarkers_extracted: number
  biomarkers_created: number
  biomarkers_updated: number
  biomarkers: ExamBiomarkerExtracted[]
  model_used?: string
}

declare global {
  interface Window {
    pdfjsLib?: any
  }
}

// Carrega o PDF.js via CDN com fallbacks garantidos caso ainda não esteja carregado
let pdfjsPromise: Promise<any> | null = null

export async function getPdfJs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js só pode ser carregado no navegador')
  }

  if (window.pdfjsLib) {
    return window.pdfjsLib
  }

  if (pdfjsPromise) {
    return pdfjsPromise
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    // Tenta carregar do CDN Cloudflare / cdnjs / unpkg
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      const lib = window.pdfjsLib
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        resolve(lib)
      } else {
        reject(new Error('Biblioteca PDF.js não carregada corretamente'))
      }
    }

    script.onerror = () => {
      // Fallback para unpkg
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
      fallbackScript.async = true
      fallbackScript.crossOrigin = 'anonymous'

      fallbackScript.onload = () => {
        const lib = window.pdfjsLib
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
          resolve(lib)
        } else {
          reject(new Error('Falha ao inicializar PDF.js pelo fallback unpkg'))
        }
      }

      fallbackScript.onerror = () => {
        reject(new Error('Não foi possível carregar a biblioteca de leitura de PDFs'))
      }

      document.head.appendChild(fallbackScript)
    }

    document.head.appendChild(script)
  })

  return pdfjsPromise
}

/**
 * Converte um arquivo de imagem (PNG/JPG/WEBP) em data URL JPEG base64 redimensionado.
 */
export async function convertImageToJpegBase64(
  fileOrBlob: Blob,
  maxSide = 1280,
  quality = 0.9,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagem não suportado pelo navegador'))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Não foi possível inicializar canvas'))
          return
        }
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(fileOrBlob)
  })
}

/**
 * Converte páginas de um PDF em uma lista de strings data URL JPEG base64 (até maxPages).
 * Por padrão até 5 páginas — o mesmo limite aceito pelo hook analyze-exam — para que
 * laudos multipágina tenham TODAS as linhas de resultado enviadas à IA.
 */
export async function renderPdfToJpegBase64List(
  pdfSource: ArrayBuffer | Uint8Array | Blob | string,
  maxPages = 5,
  maxSide = 1280,
  quality = 0.9,
): Promise<string[]> {
  const pdfjs = await getPdfJs()

  let dataArg: any = {}
  if (typeof pdfSource === 'string') {
    // Se for URL http/https ou data URL
    dataArg = { url: pdfSource }
  } else if (pdfSource instanceof Blob) {
    const buffer = await pdfSource.arrayBuffer()
    dataArg = { data: new Uint8Array(buffer) }
  } else if (pdfSource instanceof ArrayBuffer) {
    dataArg = { data: new Uint8Array(pdfSource) }
  } else {
    dataArg = { data: pdfSource }
  }

  const loadingTask = pdfjs.getDocument({
    ...dataArg,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  })

  const pdf = await loadingTask.promise
  const numPages = Math.min(pdf.numPages, maxPages)
  const results: string[] = []

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    // Escala inicial de 1.5 para alta legibilidade de texto
    const unscaledViewport = page.getViewport({ scale: 1.5 })
    const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height)
    const scale = maxDim > maxSide ? (maxSide / maxDim) * 1.5 : 1.5
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    // Fundo branco limpo
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    results.push(dataUrl)
  }

  return results
}

/**
 * Prepara qualquer arquivo (PDF ou Imagem) e devolve as páginas prontas para envio à IA.
 */
export async function prepareExamPagesForAi(
  source: File | Blob | string,
  isPdf?: boolean,
  maxSide = 1280,
  quality = 0.9,
): Promise<string[]> {
  const isLikelyPdf =
    isPdf ??
    (source instanceof File
      ? source.type === 'application/pdf' || source.name.toLowerCase().endsWith('.pdf')
      : typeof source === 'string' && source.toLowerCase().includes('.pdf'))

  if (isLikelyPdf) {
    return await renderPdfToJpegBase64List(source, 5, maxSide, quality)
  }

  if (source instanceof Blob) {
    const single = await convertImageToJpegBase64(source, maxSide, quality)
    return [single]
  }

  if (typeof source === 'string') {
    // Faz fetch para converter em blob e depois em JPEG
    const resp = await fetch(source)
    const blob = await resp.blob()
    const contentType = resp.headers.get('content-type') || ''
    if (contentType.includes('pdf') || source.toLowerCase().includes('.pdf')) {
      return await renderPdfToJpegBase64List(blob, 5, maxSide, quality)
    }
    const single = await convertImageToJpegBase64(blob, maxSide, quality)
    return [single]
  }

  return []
}

/**
 * Envia as páginas renderizadas do exame para o endpoint de IA.
 * Em caso de erro 503 GATEWAY_REJECTED_IMAGE, refaz automaticamente a compressão a 768px.
 */
export async function analyzeExamWithAi(params: {
  examId?: string
  images: string[]
  title?: string
  fallbackSource?: File | Blob | string
}): Promise<ExamAnalysisResponse> {
  try {
    const res = await pb.send('/backend/v1/ai/analyze-exam', {
      method: 'POST',
      body: JSON.stringify({
        examId: params.examId,
        images: params.images,
        title: params.title,
      }),
    })
    return res as ExamAnalysisResponse
  } catch (err: any) {
    if (err?.response?.code === 'GATEWAY_REJECTED_IMAGE' && params.fallbackSource) {
      console.warn('analyze-exam: gateway rejeitou o tamanho da imagem, tentando a 768px...')
      const smallerPages = await prepareExamPagesForAi(params.fallbackSource, undefined, 768, 0.8)
      const res = await pb.send('/backend/v1/ai/analyze-exam', {
        method: 'POST',
        body: JSON.stringify({
          examId: params.examId,
          images: smallerPages,
          title: params.title,
        }),
      })
      return res as ExamAnalysisResponse
    }
    throw err
  }
}
