import React, { useMemo } from 'react'
import { PillarItem } from '@/lib/preventiveScore'
import { PILLAR_SCIENCE_CATALOG, PillarItemScienceMeta } from '@/lib/pillarScienceCatalog'
import {
  extractPillarDetailData,
  PillarDetailData,
  PillarHistoryPoint,
} from '@/lib/pillarDetailHistory'
import { PillarDetailChart } from '@/components/profile/PillarDetailChart'
import { HealthMetric, Exam, ProfileBiomarker, ProfileVaccination, ProfileLifestyle } from '@/types'
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
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Microscope,
  Info,
  Clock,
  TrendingUp,
  History,
  Award,
} from 'lucide-react'

interface PillarItemDetailModalProps {
  item: PillarItem | null
  pillarName?: string
  isOpen: boolean
  onClose: () => void
  onNavigateTab?: (tab: string) => void
  onNavigateRoute?: (path: string) => void
  // Dados vivos do usuário
  metrics?: HealthMetric[]
  biomarkers?: ProfileBiomarker[]
  exams?: Exam[]
  vaccinations?: ProfileVaccination[]
  lifestyle?: ProfileLifestyle | null
}

export const PillarItemDetailModal: React.FC<PillarItemDetailModalProps> = ({
  item,
  pillarName,
  isOpen,
  onClose,
  onNavigateTab,
  onNavigateRoute,
  metrics = [],
  biomarkers = [],
  exams = [],
  vaccinations = [],
  lifestyle = null,
}) => {
  const meta: PillarItemScienceMeta | undefined = item ? PILLAR_SCIENCE_CATALOG[item.id] : undefined

  // Extração inteligente de histórico, último valor, gráficos e diretrizes OMS/AHA
  const detailData: PillarDetailData | null = useMemo(() => {
    if (!item) return null
    return extractPillarDetailData(item.id, {
      metrics,
      biomarkers,
      exams,
      vaccinations,
      lifestyle,
    })
  }, [item, metrics, biomarkers, exams, vaccinations, lifestyle])

  if (!item || !detailData) return null

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

  const { latest, history, chartData, chartType, unit, guideline } = detailData

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
          {/* 1. ÚLTIMO VALOR DA ANÁLISE / EXAME */}
          <div className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 via-card to-background dark:from-emerald-950/30 dark:via-card dark:to-background p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Última Medição Registrada
              </span>
              {latest.formattedDate && (
                <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  {latest.formattedDate}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-1">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {latest.value}
              </div>
              {latest.status === 'optimal' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  <CheckCircle2 className="w-3 h-3" />
                  Faixa Alvo
                </span>
              )}
              {latest.status === 'alert' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/40 px-2.5 py-0.5 rounded-full self-start sm:self-auto">
                  <AlertCircle className="w-3 h-3" />
                  Requer Atenção
                </span>
              )}
            </div>

            {/* Sub-valores (ex: LDL, HDL, Total, Triglicerídeos ou Sistólica/Diastólica) */}
            {latest.subValues && latest.subValues.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/40">
                {latest.subValues.map((sub, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-background/80 border border-border/50 text-center"
                  >
                    <div className="text-[10px] font-medium text-muted-foreground uppercase">
                      {sub.label}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                      {sub.value} {sub.unit || ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. EVOLUÇÃO TEMPORAL (GRÁFICO) */}
          {chartType !== 'none' && chartData.length >= 2 && (
            <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Evolução ao Longo do Tempo
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {chartData.length} registros cronológicos
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Trajetória das medições ao longo dos períodos registrados.
              </p>
              <PillarDetailChart type={chartType} data={chartData} unit={unit} />
            </div>
          )}

          {/* 3. HISTÓRICO DE MEDIÇÕES ANTERIORES */}
          <div className="rounded-xl border border-border/70 bg-card/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <History className="w-3.5 h-3.5 text-primary" />
                Histórico de Medições
              </div>
              <span className="text-[11px] text-muted-foreground">
                {history.length} {history.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {history.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum histórico anterior registrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/40 max-h-48 overflow-y-auto pr-1">
                {history.map((h: PillarHistoryPoint, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-semibold text-foreground truncate">{h.displayValue}</div>
                      {h.context && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {h.context}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {h.badgeLabel && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0.5 ${
                            h.badgeStatus === 'optimal'
                              ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10'
                              : h.badgeStatus === 'alert'
                                ? 'border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10'
                                : 'border-border text-muted-foreground bg-muted/30'
                          }`}
                        >
                          {h.badgeLabel}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {h.formattedDate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. VALORES DE REFERÊNCIA & DIRETRIZES DA OMS / AHA / ESPECIALIDADES */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Valores de Referência & Diretrizes Oficiais
              </div>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 border-primary/30 text-primary"
              >
                {guideline.badgeText}
              </Badge>
            </div>

            <div className="text-[11px] font-semibold text-foreground/90">
              Autoridades de referência:{' '}
              <span className="font-normal text-muted-foreground">{guideline.authority}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-background/90 border border-emerald-200/70 dark:border-emerald-900/50">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block text-[11px] uppercase tracking-wider mb-0.5">
                  Faixa Alvo / Ideal:
                </span>
                <span className="text-foreground text-xs leading-relaxed">
                  {guideline.optimalRange}
                </span>
              </div>

              {guideline.borderlineRange && (
                <div className="p-2.5 rounded-lg bg-background/90 border border-amber-200/70 dark:border-amber-900/50">
                  <span className="font-bold text-amber-700 dark:text-amber-400 block text-[11px] uppercase tracking-wider mb-0.5">
                    Atenção / Limítrofe:
                  </span>
                  <span className="text-foreground text-xs leading-relaxed">
                    {guideline.borderlineRange}
                  </span>
                </div>
              )}

              {guideline.alertRange && (
                <div className="p-2.5 rounded-lg bg-background/90 border border-rose-200/70 dark:border-rose-900/50 sm:col-span-2">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block text-[11px] uppercase tracking-wider mb-0.5">
                    Alerta Clínico:
                  </span>
                  <span className="text-foreground text-xs leading-relaxed">
                    {guideline.alertRange}
                  </span>
                </div>
              )}
            </div>

            {/* Recomendações em tópicos citando OMS e AHA */}
            <div className="pt-2 space-y-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Recomendações e Insights Baseados em Evidências
              </div>
              <ul className="space-y-1.5 pl-1">
                {guideline.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-foreground/80 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/40">
              {guideline.evidenceNote}
            </div>
          </div>

          {/* 5. EXPLICAÇÃO CIENTÍFICA (Saúde Geral, Coração e Longevidade) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Microscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-foreground tracking-tight">
                Por que este marcador é crucial para sua longevidade?
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3.5 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300">
                  <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Saúde Geral & Fisiologia Celular
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {meta?.scienceWhy.generalHealth}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Proteção Cardiovascular & Artérias
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {meta?.scienceWhy.cardiovascular}
                </p>
              </div>

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
