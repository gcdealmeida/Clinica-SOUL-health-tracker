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
import { loadStagedBiomarkers, submitImportReview } from '@/services/importFiles'
import type { ImportReviewItem } from '@/services/importFiles'
import { Loader2, Check, X, Pencil, ShieldAlert, CopyX, HelpCircle, ScrollText } from 'lucide-react'

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
      prev.map((i) =>
        i.id === id
          ? { ...i, validation_status: action === 'approve' ? 'approved' : 'rejected' }
          : i,
      ),
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
        i.validation_status === 'pending' || i.validation_status === 'uncertain'
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
                        <div className="flex gap-1 flex-wrap">
                          {item.validation_status === 'uncertain' && (
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
                          <Button
                            size="sm"
                            className="h-7 px-2 text-[11px] gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => decide(item.id, 'approve')}
                          >
                            <Check className="h-3 w-3" /> Aprovar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

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
  tone: 'amber' | 'orange' | 'red'
  icon: React.ReactNode
  label: string
  extra?: string
}) {
  const cls =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : tone === 'orange'
        ? 'bg-orange-100 text-orange-800 border-orange-200'
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

function SummaryBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/70 p-2">
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
