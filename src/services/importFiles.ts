/// <reference lib="dom" />
import pb from '@/lib/pocketbase/client'

/**
 * Importação inteligente de arquivos (v0.0.72) — serviço de extração no cliente.
 *
 * DOCX/XLSX/CSV/TXT são lidos no navegador; PDF e imagens (JPG/PNG/WebP) seguem
 * pelo caminho de imagens já existente (examReader → base64). mammoth/xlsx vêm
 * de CDN com import dinâmico + @vite-ignore — MESMO padrão de examReader.getPdfJs()
 * (pdfjs-dist NÃO é dependência do projeto; instalar quebraria o build).
 *
 * O conteúdo do arquivo é DADO, nunca instrução. Nada aqui simula rede/servidor:
 * toda persistência passa pelos endpoints reais do hook ai_features_import.js.
 */

const BACKEND = {
  assist: '/backend/v1/ai/import-assist',
  kickoff: '/backend/v1/ai/import-kickoff',
  export: '/backend/v1/ai/import-export',
}

/** Teto de caracteres por chunk de TEXTO (cada chunk vira uma "página"). */
const MAX_CHUNK_CHARS = 3000

/** Teto aproximado de caracteres JSON por pedaço enviado (~700KB de corpo). */
const MAX_CHUNK_BODY_CHARS = 700_000

export type ImportKind = 'pdf' | 'image' | 'docx' | 'xlsx' | 'csv' | 'txt' | 'unknown'

export interface ImportTextChunk {
  /** Rótulo de origem exibido na revisão: aba da planilha, bloco de linhas... */
  label: string
  text: string
}

export interface ImportAssistResponse {
  duplicate: boolean
  retry?: boolean
  exam_id?: string
  import_id?: string
  filename?: string
  created?: string
  status?: string
  message?: string
  error?: string
}

export interface ImportReviewItem {
  id: string
  name: string
  value: string
  unit: string
  reference_range: string
  date: string
  status: string
  validation_status: 'pending' | 'uncertain' | 'approved' | 'rejected' | string
  source_page: string
  evidence: string
  uncertainty_reason: string
}

export function fileKindOf(file: File): ImportKind {
  const name = file.name.toLowerCase()
  const mime = (file.type || '').toLowerCase()
  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx'
  if (name.endsWith('.csv')) return 'csv'
  if (name.endsWith('.txt')) return 'txt'
  return 'unknown'
}

export const IMPORT_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.docx,.xlsx,.xls,.csv,.txt,application/pdf,image/*,.docx,.xlsx,.xls,.csv,.txt'

/**
 * Carrega mammoth (DOCX → HTML/texto) de CDN. Mesmo padrão de
 * examReader.getPdfJs(): import dinâmico com @vite-ignore para o build não
 * tentar resolver o módulo.
 */
async function getMammoth(): Promise<any> {
  const mod: any = await import(
    /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js'
  )
  return mod.default || mod
}

/** Carrega SheetJS (XLSX) de CDN. */
async function getXlsx(): Promise<any> {
  const mod: any = await import(
    /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.full.min.js'
  )
  return mod.default || mod
}

/** Divide um texto longo em blocos de até MAX_CHUNK_CHARS chars, em fronteiras de linha. */
function splitIntoChunks(text: string, label: string): ImportTextChunk[] {
  const clean = (text || '').replace(/\r\n/g, '\n').trim()
  if (!clean) return []
  if (clean.length <= MAX_CHUNK_CHARS) return [{ label, text: clean }]
  const out: ImportTextChunk[] = []
  const lines = clean.split('\n')
  let current = ''
  for (const line of lines) {
    if (current.length + line.length + 1 > MAX_CHUNK_CHARS && current) {
      out.push({ label: `${label} (parte ${out.length + 1})`, text: current.trim() })
      current = ''
    }
    current += (current ? '\n' : '') + line
  }
  if (current.trim())
    out.push({ label: `${label} (parte ${out.length + 1})`, text: current.trim() })
  return out
}

/** DOCX → parágrafos concatenados, divididos em chunks. */
async function extractDocx(file: File): Promise<ImportTextChunk[]> {
  const mammoth = await getMammoth()
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return splitIntoChunks(String(result?.value || ''), 'Documento')
}

/** XLSX → uma lista de chunks por ABA da planilha (linhas como texto tabular). */
async function extractXlsx(file: File): Promise<ImportTextChunk[]> {
  const XLSX = await getXlsx()
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const chunks: ImportTextChunk[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })
    const text = rows
      .filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim()))
      .map((r) => r.map((c) => String(c ?? '').trim()).join(' | '))
      .join('\n')
    chunks.push(...splitIntoChunks(text, `Planilha: ${sheetName}`))
  }
  return chunks
}

/** CSV/TXT → lidos direto via File.text(). */
async function extractPlainText(file: File): Promise<ImportTextChunk[]> {
  const raw = await file.text()
  return splitIntoChunks(raw, 'Texto')
}

/** Hash de conteúdo estável (SHA-256 em hex) — igual ao que o hook dedupa. */
export async function contentHashOf(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** POST autenticado para o backend (pb.send injeta o token). */
async function backendPost<T>(endpoint: string, body: unknown): Promise<T> {
  return (await pb.send(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })) as T
}

/**
 * Passo 1 — import-assist: dedupe por hash + cria exams/exam_imports.
 * Responde duplicate=true SEM criar nada quando o mesmo conteúdo já foi importado.
 */
export async function importAssist(opts: {
  file: File
  kind: ImportKind
  hash: string
}): Promise<ImportAssistResponse> {
  return backendPost<ImportAssistResponse>(BACKEND.assist, {
    content_hash: opts.hash,
    filename: opts.file.name,
    file_type: opts.kind,
    file_size: opts.file.size,
  })
}

/**
 * Passo 2 — extração de TEXTO no cliente + envio em pedaços pelo endpoint
 * assíncrono existente (origin='import'). Responde com a contagem de páginas.
 */
export async function extractAndEnqueueText(opts: {
  file: File
  kind: ImportKind
  examId: string
  onProgress?: (msg: string) => void
}): Promise<{ chunks: number }> {
  let chunks: ImportTextChunk[]
  if (opts.kind === 'docx') chunks = await extractDocx(opts.file)
  else if (opts.kind === 'xlsx') chunks = await extractXlsx(opts.file)
  else if (opts.kind === 'csv' || opts.kind === 'txt') chunks = await extractPlainText(opts.file)
  else throw new Error(`Tipo de arquivo não suportado para extração de texto: ${opts.kind}`)

  if (chunks.length === 0) {
    throw new Error('O arquivo não tem texto legível para extrair.')
  }
  opts.onProgress?.(`Arquivo lido: ${chunks.length} bloco(s) de texto. Enfileirando...`)

  // Agrupa chunks em pedaços dentro do teto de corpo do ingress.
  const pieces: ImportTextChunk[][] = []
  let current: ImportTextChunk[] = []
  let chars = 0
  for (const chunk of chunks) {
    const cost = chunk.text.length + 120
    if (current.length > 0 && chars + cost > MAX_CHUNK_BODY_CHARS) {
      pieces.push(current)
      current = []
      chars = 0
    }
    current.push(chunk)
    chars += cost
  }
  if (current.length > 0) pieces.push(current)

  for (let c = 0; c < pieces.length; c++) {
    await backendPost('/backend/v1/ai/analyze-exam-async', {
      examId: opts.examId,
      texts: pieces[c].map((ch) => ch.text),
      total_pages: chunks.length,
      origin: 'import',
      restart: c === 0,
    })
    opts.onProgress?.(
      `Enfileirado(s) ${Math.min((c + 1) * MAX_PAGES_SENT, chunks.length)} de ${chunks.length} bloco(s)...`,
    )
  }
  return { chunks: chunks.length }
}

/**
 * Passo 3 — import-kickoff: marca 'extracting' e dispara o runner do cron
 * imediatamente (fallback: tick de 1 min).
 */
export async function importKickoff(opts: { examId: string; importId?: string }): Promise<void> {
  await backendPost(BACKEND.kickoff, { exam_id: opts.examId, import_id: opts.importId })
}

/**
 * Passo 4 — import-review: gravação definitiva dos itens aprovados em
 * profile_biomarkers. Conflitos de valor voltam na resposta (não sobrescrevem).
 */
export async function submitImportReview(opts: {
  examId: string
  importId?: string
  decisions: Array<{
    id?: string
    action: 'approve' | 'reject' | 'edit'
    name: string
    value: string
    unit?: string
    reference_range?: string
    date?: string
    status?: string
    source_page?: string
    evidence?: string
    validation_status?: string
    uncertainty_reason?: string
    existing_id?: string
  }>
}): Promise<{ created: number; updated: number; rejected: number; conflicts: unknown[] }> {
  return backendPost('/backend/v1/ai/import-review', {
    exam_id: opts.examId,
    import_id: opts.importId,
    decisions: opts.decisions,
  })
}

/** Exportação estruturada (JSON) dos dados gravados a partir de um import. */
export async function exportImportJson(importId: string): Promise<{
  filename?: string
  biomarkers: ImportReviewItem[]
  supplementary_info: Array<{ text: string; page?: number }>
}> {
  return (await pb.send(`${BACKEND.export}?file=${encodeURIComponent(importId)}&format=json`, {
    method: 'GET',
  })) as any
}

/** Exportação estruturada (CSV) — baixa o blob direto do endpoint. */
export async function exportImportCsv(importId: string): Promise<Blob> {
  const res = await fetch(
    `${pb.baseUrl}${BACKEND.export}?file=${encodeURIComponent(importId)}&format=csv`,
    { credentials: 'include' },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.blob()
}

/** Dispara o download de um Blob no navegador. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Lista os imports do usuário (persistência do estado por arquivo no banco). */
export async function listMyImports(userId: string): Promise<any[]> {
  return await pb.collection('exam_imports').getFullList({
    filter: `user = "${userId}"`,
    sort: '-created',
  })
}

/** Carrega os itens em STAGING aguardando revisão de um exame (profile_biomarkers). */
export async function loadStagedBiomarkers(opts: {
  userId: string
  examId: string
}): Promise<ImportReviewItem[]> {
  const recs = await pb.collection('profile_biomarkers').getFullList({
    filter: `user = "${opts.userId}" && source_exam = "${opts.examId}" && (validation_status = "pending" || validation_status = "uncertain")`,
    sort: 'source_page,-created',
  })
  return recs.map((r: any) => ({
    id: r.id,
    name: r.name || '',
    value: r.value || '',
    unit: r.unit || '',
    reference_range: r.reference_range || '',
    date: r.date || '',
    status: r.status || '',
    validation_status: r.validation_status,
    source_page: r.source_page || '',
    evidence: r.evidence || '',
    uncertainty_reason: r.uncertainty_reason || '',
  }))
}
