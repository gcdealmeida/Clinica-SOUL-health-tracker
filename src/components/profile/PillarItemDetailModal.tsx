import React from 'react'
import { PillarItem } from '@/lib/preventiveScore'
import { PILLAR_SCIENCE_CATALOG, PillarItemScienceMeta } from '@/lib/pillarScienceCatalog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Heart,
  Activity,
  Sparkles,
  Database,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Microscope,
  Info,
  Clock,
} from 'lucide-react'

interface PillarItemDetailModalProps {
  item: PillarItem | null
  pillarName?: string
  isOpen: boolean
  onClose: () => void
  onNavigateTab?: (tab: string) => void
  onNavigateRoute?: (path: string) => void
}

export const PillarItemDetailModal: React.FC<PillarItemDetailModalProps> = ({
  item,
  pillarName,
  isOpen,
  onClose,
  onNavigateTab,
  onNavigateRoute,
}) => {
  if (!item) return null

  const meta: PillarItemScienceMeta | undefined = PILLAR_SCIENCE_CATALOG[item.id]

  const handleAction = (target: PillarItemScienceMeta['actionTarget']) => {
    onClose()
    if (target.type === 'profile-tab' && target.tab && onNavigateTab) {
      onNavigateTab(target.tab)
    } else if (target.type === 'route' && target.path && onNavigateRoute) {
      onNavigateRoute(target.path)
    }
  }

  const handleSecondaryAction = (action?: PillarItemScienceMeta['secondaryAction']) => {
    if (!action) return
    onClose()
    if (action.type === 'profile-tab' && action.tab && onNavigateTab) {
      onNavigateTab(action.tab)
    } else if (action.type === 'route' && action.path && onNavigateRoute) {
      onNavigateRoute(action.path)
    }
  }

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      const parts = dateStr.slice(0, 10).split('-')
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 bg-background shadow-xl">
        {/* Cabeçalho do Modal */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="text-[11px] font-semibold px-2 py-0.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
            >
              {meta?.pillarTitle || pillarName || 'Preventive Health'}
            </Badge>
            {item.fulfilled ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Em dia
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[11px] flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Pendente de atualização
              </Badge>
            )}
          </div>

          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {item.title}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
              {item.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 sm:p-6 space-y-6 text-sm">
          {/* 1. ESTADO ATUAL & DE ONDE VEM O DADO */}
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                Origem & Estado dos Dados
              </span>
              {item.lastDate && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Último registro: {formatDateDisplay(item.lastDate)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                <div className="text-[11px] text-muted-foreground font-medium mb-1">
                  Fonte no App:
                </div>
                <div className="text-xs font-semibold text-foreground">
                  {meta?.sourceName || 'Métricas de Saúde e Perfil'}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  {meta?.sourceCollection}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                <div className="text-[11px] text-muted-foreground font-medium mb-1">
                  Valor Atual Detectado:
                </div>
                {item.valueLabel ? (
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {item.valueLabel}
                  </div>
                ) : item.fulfilled ? (
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Critério cumprido recentemente
                  </div>
                ) : (
                  <div className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Nenhum dado recente encontrado
                  </div>
                )}
                {item.recommendation && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Nota: {item.recommendation}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-1">
              {meta?.sourceDescription ||
                'Este indicador é calculado automaticamente ao cruzar exames anexados, biomarcadores e registros de saúde dos últimos meses.'}
            </p>
          </div>

          {/* 2. EXPLICAÇÃO CIENTÍFICA (Saúde Geral, Coração e Longevidade) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Microscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-foreground tracking-tight">
                Por que este marcador é crucial para sua saúde?
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Saúde Geral */}
              <div className="p-3.5 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Saúde Geral & Fisiologia Celular
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {meta?.scienceWhy.generalHealth}
                </p>
              </div>

              {/* Coração */}
              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Proteção Cardiovascular & Artérias
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {meta?.scienceWhy.cardiovascular}
                </p>
              </div>

              {/* Longevidade */}
              <div className="p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Longevidade Saudável & Compressão da Morbidade
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {meta?.scienceWhy.longevity}
                </p>
              </div>
            </div>
          </div>

          {/* 3. FAIXAS DE REFERÊNCIA CLÍNICAS */}
          {meta?.referenceRanges && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Info className="w-3.5 h-3.5 text-primary" />
                Faixas de Referência e Parâmetros Clínicos
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-background/80 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 block text-[11px] uppercase tracking-wider mb-0.5">
                    Faixa Alvo / Ideal:
                  </span>
                  <span className="text-foreground">{meta.referenceRanges.optimal}</span>
                </div>

                {meta.referenceRanges.borderline && (
                  <div className="p-2.5 rounded-lg bg-background/80 border border-amber-200/60 dark:border-amber-900/40">
                    <span className="font-semibold text-amber-700 dark:text-amber-400 block text-[11px] uppercase tracking-wider mb-0.5">
                      Atenção / Limítrofe:
                    </span>
                    <span className="text-foreground">{meta.referenceRanges.borderline}</span>
                  </div>
                )}

                {meta.referenceRanges.alert && (
                  <div className="p-2.5 rounded-lg bg-background/80 border border-rose-200/60 dark:border-rose-900/40 sm:col-span-2">
                    <span className="font-semibold text-rose-700 dark:text-rose-400 block text-[11px] uppercase tracking-wider mb-0.5">
                      Alerta Clínico:
                    </span>
                    <span className="text-foreground">{meta.referenceRanges.alert}</span>
                  </div>
                )}
              </div>

              {meta.referenceRanges.note && (
                <div className="text-[11px] text-muted-foreground italic pt-1">
                  Fonte de diretriz: {meta.referenceRanges.note}
                </div>
              )}
            </div>
          )}

          {/* 4. IMPACTO CLÍNICO */}
          {meta?.clinicalImpact && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-foreground/90 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-primary">Evidência Clínica: </span>
                {meta.clinicalImpact}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações e Atalhos */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto text-xs">
            Fechar
          </Button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {meta?.secondaryAction && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSecondaryAction(meta.secondaryAction)}
                className="text-xs gap-1.5 flex-1 sm:flex-initial"
              >
                {meta.secondaryAction.label}
              </Button>
            )}

            {meta?.actionLabel && meta?.actionTarget && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAction(meta.actionTarget)}
                className="text-xs gap-1.5 bg-primary text-primary-foreground flex-1 sm:flex-initial"
              >
                <span>{meta.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
