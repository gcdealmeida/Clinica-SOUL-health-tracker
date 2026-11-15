import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { loadStagedBiomarkers, submitImportReview } from '@/services/importFiles'
import type { ImportReviewItem } from '@/services/importFiles'
import {
  Loader2,
  Check,
  X,
  Pencil,
  ShieldAlert,
  CopyX,
  HelpCircle,
  ScrollText,
  Info,
  FileWarning,
} from 'lucide-react'

/**
 * Painel de REVISÃO da importação inteligente (v0.0.72).
 *
 * Lista os itens em STAGING (profile_biomarkers com validation_status
 * pending/uncertain + source_exam) lado a lado com a evidência (página + trecho
 * original extraído), nível de confiança e sinalizações (incerto/duplicado/
 * conflito). Ações: Aprovar / Rejeitar / Editar valor — individual ou em lote.
 * Aprovar chama import-review, que grava DEFINITIVAMENTE em profile_biomarkers.
 * Ao concluir, mostra resumo final (páginas, identificadas, criadas/atualizadas,
 * duplicidades, conflitos, ilegíveis/pendentes).
 */

interface ReviewSummary {
  pages: number
  identified: number
  created: number
  updated: number
  duplicates: number
  conflicts: number
  unreadable: number
}

interface PanelProps {
  examId: string
  importId?: string | null
  onClose: () => void
  onFinished: (examId: string) => void
  entry?: { file?: File | null; kind?: string }
}

export function ImportReviewPanel({ examId, importId, onClose, onFinished }: PanelProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<ImportReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [summary, setSummary] = useState<ReviewSummary | null>(null)
  /** Laudos descritivos, trechos ilegíveis e identificação (exams.supplementary_info). */
  const [complementary, setComplementary] = useState<ComplementaryEntry[]>([])
  /** Resumo consolidado do exame (exams.summary_results, truncado a 4900). */
  const [examSummary, setExamSummary] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!user?.id) return
      try {
        const staged = await loadStagedBiomarkers({ userId: user.id, examId })
        if (!alive) return
        setItems(staged)
      } catch (err) {
        console.error('[ImportReviewPanel] falha ao carregar staging:', err)
        toast.error('Não foi possível carregar os dados em revisão.')
      } finally {
        if (alive) setLoading(false)
      }
      // Informações complementares do exame (falha aqui NUNCA bloqueia a revisão).
      try {
        const exam = await pb.collection('exams').getOne(examId)
        if (!alive) return
        setComplementary(parseSupplementary(exam.supplementary_info))
        setExamSummary(String(exam.summary_results || ''))
      } catch (err) {
        console.warn('[ImportReviewPanel] sem informações complementares:', err)
      }
    })()
    return () => {
      alive = false
    }
  }, [user?.id, examId])

  const stats = useMemo(() => {
    const pending = items.filter(
      (i) => i.validation_status === 'pending' || i.validation_status === 'uncertain',
    )
    const uncertain = pending.filter((i) => i.validation_status === 'uncertain')
    const pages = new Set(items.map((i) => i.source_page).filter(Boolean)).size
    return { pending, uncertain, pages }
  }, [items])

  const decide = (id: string, action: 'approve' | 'reject') => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        // ILEGÍVEL não pode ser aprovado: só editar manualmente (o que limpa o
        // motivo) ou rejeitar — o valor "ILEGÍVEL" não é um resultado.
        if (action === 'approve' && isIlegivel(i)) return i
        return { ...i, validation_status: action === 'approve' ? 'approved' : 'rejected' }
      }),
    )
  }

  const saveEdit = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const touched: ImportReviewItem = { ...i, value: editValue.trim(), unit: editUnit.trim() }
        // Valor editado pelo usuário: sobe a confiança — não é mais incerto.
        touched.validation_status = 'pending'
        touched.uncertainty_reason = ''
        return touched
      }),
    )
    setEditingId(null)
  }

  const approveAll = () => {
    setItems((prev) =>
      prev.map((i) =>
        (i.validation_status === 'pending' || i.validation_status === 'uncertain') && !isIlegivel(i)
          ? { ...i, validation_status: 'approved' }
          : i,
      ),
    )
  }

  const finish = async () => {
    if (!user?.id) return
    const decisions = items
      .filter((i) => i.validation_status === 'approved' || i.validation_status === 'rejected')
      .map((i) => ({
        id: i.id,
        action: (i.validation_status === 'approved' ? 'approve' : 'reject') as 'approve' | 'reject',
        name: i.name,
        value: i.value,
        unit: i.unit,
        reference_range: i.reference_range,
        date: i.date,
        status: i.status,
        source_page: i.source_page,
        evidence: i.evidence,
        sinalizacao: i.sinalizacao,
        anteriores: i.anteriores,
      }))
    if (decisions.length === 0) {
      toast.info('Nenhum item aprovado ou rejeitado ainda.')
      return
    }
    setSubmitting(true)
    try {
      const res = await submitImportReview({ examId, importId: importId || undefined, decisions })
      setSummary({
        pages: stats.pages,
        identified: items.length,
        created: res.created || 0,
        updated: res.updated || 0,
        duplicates: items.filter((i) => /duplic/i.test(i.uncertainty_reason || '')).length,
        conflicts: Array.isArray(res.conflicts) ? res.conflicts.length : 0,
        unreadable: items.filter((i) => i.validation_status === 'rejected').length,
      })
      toast.success(
        `Importação concluída: ${res.created || 0} registro(s) criado(s), ${res.updated || 0} atualizado(s).`,
      )
    } catch (err: any) {
      console.error('[ImportReviewPanel] review falhou:', err)
      toast.error(err?.response?.error || err?.message || 'Falha ao gravar a revisão.')
    } finally {
      setSubmitting(false)
    }
  }

  const doneAndClosed = () => {
    onFinished(examId)
    onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-emerald-600" />
            Revisão da importação
          </DialogTitle>
          <DialogDescription className="text-xs">
            Confira cada valor extraído contra o trecho original do documento antes de gravar em
            Biomarcadores.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados em revisão...
          </div>
        ) : summary ? (
          /* ---------- RESUMO FINAL ---------- */
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30 p-4 space-y-2 text-xs">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                Importação concluída
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <SummaryBlock label="Páginas processadas" value={summary.pages} />
                <SummaryBlock label="Informações identificadas" value={summary.identified} />
                <SummaryBlock label="Registros criados" value={summary.created} />
                <SummaryBlock label="Registros atualizados" value={summary.updated} />
                <SummaryBlock label="Duplicidades" value={summary.duplicates} />
                <SummaryBlock label="Conflitos" value={summary.conflicts} />
                <SummaryBlock label="Rejeitados / ilegíveis" value={summary.unreadable} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={doneAndClosed}
                className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="h-3.5 w-3.5" /> Concluir
              </Button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            Nenhum dado em staging para este exame. Se a extração acabou de terminar, aguarde um
            instante e reabra.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-muted-foreground">
                {stats.pending.length} item(ns) aguardando decisão
                {stats.uncertain.length > 0 ? ` • ${stats.uncertain.length} com incerteza` : ''}
                {items.filter(isIlegivel).length > 0
                  ? ` • ${items.filter(isIlegivel).length} ilegível(is)`
                  : ''}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={approveAll}
                className="h-7 px-2 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950"
              >
                <Check className="h-3 w-3" /> Aprovar todos
              </Button>
            </div>

            {/* Lista lado a lado: valor extraído | evidência */}
            <div className="space-y-2">
              {items.map((item) => {
                const decided =
                  item.validation_status === 'approved' || item.validation_status === 'rejected'
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 space-y-2 ${
                      item.validation_status === 'approved'
                        ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                        : item.validation_status === 'rejected'
                          ? 'border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20 opacity-75'
                          : 'border-border bg-card'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Valor extraído */}
                      <div className="rounded-lg border bg-background/70 p-2.5 space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Valor extraído
                        </p>
                        {editingId === item.id ? (
                          <div className="space-y-1.5">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Valor"
                              autoFocus
                            />
                            <Input
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Unidade"
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-semibold text-foreground">
                            {item.value}{' '}
                            <span className="text-xs font-normal text-muted-foreground">
                              {item.unit}
                            </span>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          {item.name}
                          {item.reference_range ? ` • Ref: ${item.reference_range}` : ''}
                          {item.date ? ` • ${item.date}` : ''}
                        </p>
                        {item.anteriores ? (
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-semibold">Anteriores:</span> {item.anteriores}
                          </p>
                        ) : null}
                        <div className="flex gap-1 flex-wrap">
                          {isIlegivel(item) && (
                            <Badge
                              tone="red"
                              icon={<FileWarning className="h-3 w-3" />}
                              label="Ilegível"
                              extra={
                                item.uncertainty_reason && !/ileg/i.test(item.value)
                                  ? item.uncertainty_reason
                                  : undefined
                              }
                            />
                          )}
                          {sinalBadge(item.sinalizacao) && !isIlegivel(item) && (
                            <Badge
                              tone={sinalBadge(item.sinalizacao)!.tone}
                              label={sinalBadge(item.sinalizacao)!.label}
                            />
                          )}
                          {item.validation_status === 'uncertain' && !isIlegivel(item) && (
                            <Badge
                              tone="amber"
                              icon={<HelpCircle className="h-3 w-3" />}
                              label="Incerto"
                              extra={item.uncertainty_reason}
                            />
                          )}
                          {/duplic/i.test(item.uncertainty_reason || '') && (
                            <Badge
                              tone="orange"
                              icon={<CopyX className="h-3 w-3" />}
                              label="Possível duplicado"
                            />
                          )}
                          {/conflit/i.test(item.uncertainty_reason || '') && (
                            <Badge
                              tone="red"
                              icon={<ShieldAlert className="h-3 w-3" />}
                              label="Conflito"
                            />
                          )}
                        </div>
                      </div>
                      {/* Evidência */}
                      <div className="rounded-lg border bg-muted/40 p-2.5 space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                          Evidência {item.source_page ? `— ${item.source_page}` : ''}
                        </p>
                        <blockquote className="text-[11px] text-foreground/85 italic whitespace-pre-line max-h-24 overflow-y-auto">
                          {item.evidence || '—'}
                        </blockquote>
                      </div>
                    </div>
                    {/* Ações */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {editingId === item.id ? (
                        <>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => saveEdit(item.id)}
                          >
                            <Check className="h-3 w-3" /> Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3" /> Cancelar
                          </Button>
                        </>
                      ) : decided ? (
                        <span className="text-[11px] text-muted-foreground">
                          {item.validation_status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                        </span>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1"
                            onClick={() => {
                              setEditingId(item.id)
                              setEditValue(item.value)
                              setEditUnit(item.unit)
                            }}
                          >
                            <Pencil className="h-3 w-3" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px] gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                            onClick={() => decide(item.id, 'reject')}
                          >
                            <X className="h-3 w-3" /> Rejeitar
                          </Button>
                          {isIlegivel(item) ? (
                            <span
                              className="inline-flex items-center h-7 px-2 rounded-md bg-muted text-[10px] font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
                              title="Trecho ilegível no documento"
                            >
                              Ilegível — corrija manualmente ou rejeite
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => decide(item.id, 'approve')}
                            >
                              <Check className="h-3 w-3" /> Aprovar
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Informações complementares: laudos descritivos, trechos ilegíveis, identificação e resumo */}
            {(complementary.length > 0 || examSummary) && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Info className="h-3.5 w-3.5 text-slate-500" /> Informações complementares
                </p>

                {complementary.filter((c) => c.type === 'identificacao').length > 0 && (
                  <div className="space-y-1">
                    {complementary
                      .filter((c) => c.type === 'identificacao')
                      .map((c, idx) => (
                        <p key={idx} className="text-[11px] text-foreground/90 whitespace-pre-line">
                          {identificacaoTexto(c.text)}
                        </p>
                      ))}
                  </div>
                )}

                {complementary.filter((c) => c.type === 'laudo').length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Laudos descritivos
                    </p>
                    {complementary
                      .filter((c) => c.type === 'laudo')
                      .map((c, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border bg-background/70 p-2 space-y-0.5"
                        >
                          <p className="text-[11px] font-medium text-foreground">
                            {c.name || 'Laudo descritivo'}
                            {c.page != null && c.page !== '' ? ` — pág. ${c.page}` : ''}
                          </p>
                          <p className="text-[11px] text-foreground/85 whitespace-pre-line max-h-40 overflow-y-auto">
                            {c.text}
                          </p>
                        </div>
                      ))}
                  </div>
                )}

                {complementary.filter((c) => c.type === 'ilegivel').length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1">
                      <FileWarning className="h-3 w-3" /> Trechos ilegíveis
                    </p>
                    {complementary
                      .filter((c) => c.type === 'ilegivel')
                      .map((c, idx) => (
                        <p key={idx} className="text-[11px] text-foreground/85 whitespace-pre-line">
                          {c.page != null && c.page !== '' ? `pág. ${c.page} — ` : ''}
                          {c.text}
                        </p>
                      ))}
                  </div>
                )}

                {examSummary ? (
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      Resumo consolidado
                    </p>
                    <p className="text-[11px] text-foreground/85 whitespace-pre-line max-h-44 overflow-y-auto">
                      {examSummary}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onClose} className="text-xs">
                Mais tarde
              </Button>
              <Button
                size="sm"
                onClick={finish}
                disabled={submitting}
                className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gravando...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Concluir revisão
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Badge({
  tone,
  icon,
  label,
  extra,
}: {
  tone: 'amber' | 'orange' | 'red' | 'blue'
  icon?: React.ReactNode
  label: string
  extra?: string
}) {
  const cls =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : tone === 'orange'
        ? 'bg-orange-100 text-orange-800 border-orange-200'
        : tone === 'blue'
          ? 'bg-sky-100 text-sky-800 border-sky-200'
          : 'bg-red-100 text-red-800 border-red-200'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      {icon}
      {label}
      {extra ? (
        <span className="font-normal opacity-80 truncate max-w-[14rem]">{extra}</span>
      ) : null}
    </span>
  )
}

/** Entrada de exams.supplementary_info (laudo / ilegível / identificação). */
interface ComplementaryEntry {
  type?: string
  name?: string
  page?: number | string | null
  text?: string
}

function parseSupplementary(raw: unknown): ComplementaryEntry[] {
  if (!raw) return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter((e) => e && typeof e === 'object')
    .map((e: any) => ({
      type: String(e.type || ''),
      name: e.name != null ? String(e.name) : '',
      page: e.page != null ? e.page : '',
      text: String(e.text || ''),
    }))
}

/** Identificação guardada como JSON no text — vira linha legível para o usuário. */
function identificacaoTexto(text: string): string {
  let obj: any = null
  try {
    obj = JSON.parse(text)
  } catch {
    return text
  }
  if (!obj || typeof obj !== 'object') return text
  const parts: string[] = []
  const push = (label: string, v: unknown) => {
    const s = String(v || '').trim()
    if (s) parts.push(`${label}: ${s}`)
  }
  push('Paciente', obj.paciente)
  push('Nascimento', obj.data_nascimento)
  push('Idade', obj.idade)
  push('Sexo', obj.sexo)
  push('Médico solicitante', obj.medico_solicitante)
  push('Convênio', obj.convenio)
  push('Laboratório', obj.laboratorio)
  push('Unidade', obj.unidade)
  push('Resp. técnico', obj.responsavel_tecnico)
  return parts.length > 0 ? parts.join(' • ') : text
}

/** Item marcado ILEGÍVEL no staging (validation_status uncertain + motivo
 * ILEGÍVEL, gravado pelo runner do exam_async). Ilegível nunca é aprovável. */
function isIlegivel(item: ImportReviewItem): boolean {
  return /ileg/i.test(item.uncertainty_reason || '') || /^ileg/i.test(item.value || '')
}

/** Badge da sinalização impressa no laudo (H/L/ALTO/BAIXO/*) — null quando não há. */
function sinalBadge(s: string): { label: string; tone: 'red' | 'amber' | 'blue' } | null {
  const v = String(s || '')
    .trim()
    .toUpperCase()
  if (!v) return null
  if (v === 'H' || v === 'ALTO') return { label: v === 'H' ? 'H — Alto' : 'Alto', tone: 'red' }
  if (v === 'L' || v === 'BAIXO') return { label: v === 'L' ? 'L — Baixo' : 'Baixo', tone: 'blue' }
  return { label: v, tone: 'amber' }
}

function SummaryBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/70 p-2">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
