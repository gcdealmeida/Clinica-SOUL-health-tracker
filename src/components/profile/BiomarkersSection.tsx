import React, { useState, useMemo } from 'react'
import { ProfileBiomarker, Exam } from '@/types'
import {
  BIOMARKER_AREAS,
  BIOMARKER_DEFINITIONS,
  BiomarkerArea,
  BiomarkerDefinition,
  findBiomarkerDefinition,
  parseBiomarkerNumericValue,
  classifyBiomarkerValue,
  ReferenceRangeSegment,
} from '@/lib/biomarkersCatalog'
import { ThermometerGauge } from './ThermometerGauge'

import {
  Heart,
  Activity,
  Droplet,
  ShieldAlert,
  Flame,
  Sparkles,
  Sun,
  AlertTriangle,
  Dna,
  Layers,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'

export interface BiomarkersSectionProps {
  items: ProfileBiomarker[]
  exams?: Exam[]
  userGender?: string
  onAdd: (data: Omit<ProfileBiomarker, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// Representação unificada de um item exibido no painel
export interface UnifiedBiomarkerItem {
  id: string
  name: string
  area: BiomarkerArea
  areaTitle: string
  areaColor: string
  definition: BiomarkerDefinition | null
  // Valores atuais
  hasRecord: boolean
  displayValue: string
  numericValue: number | null
  unit: string
  date?: string
  sourceType: 'profile' | 'exam' | 'none'
  sourceLabel?: string
  originalRecordId?: string // para delete se for da profile_biomarkers
  // Faixas clínicas & status
  status: 'optimal' | 'borderline' | 'high' | 'low' | 'none'
  statusLabel: string
  statusColor: string
  isOutOfRange: boolean
  referenceText: string
  minDisplay: number
  maxDisplay: number
  segments: ReferenceRangeSegment[]
  description?: string
  clinicalNote?: string
}

export const BiomarkersSection: React.FC<BiomarkersSectionProps> = ({
  items,
  exams = [],
  userGender,
  onAdd,
  onDelete,
}) => {
  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all')
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>(() => {
    // Inicialmente todas abertas
    const init: Record<string, boolean> = {}
    BIOMARKER_AREAS.forEach((a) => {
      init[a.id] = true
    })
    init['other'] = true
    return init
  })

  // Modal de adicionar/editar biomarcador
  const [openAddModal, setOpenAddModal] = useState(false)
  const [formName, setFormName] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formUnit, setFormUnit] = useState('')
  const [formRefRange, setFormRefRange] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDate, setFormDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Alterna colapso da área
  const toggleArea = (areaId: string) => {
    setExpandedAreas((prev) => ({
      ...prev,
      [areaId]: !prev[areaId],
    }))
  }

  // Preenche dados padrão no modal quando o usuário clica em "Adicionar" para uma definição pré-existente
  const openAddForDefinition = (def: BiomarkerDefinition) => {
    setFormName(def.name)
    setFormUnit(def.defaultUnit)
    const ranges = def.getRanges(userGender)
    setFormRefRange(ranges.optimalText)
    setFormCategory(def.area)
    setFormValue('')
    setFormDate(new Date().toISOString().split('T')[0])
    setOpenAddModal(true)
  }

  // Abre modal livre
  const openAddFree = () => {
    setFormName('')
    setFormValue('')
    setFormUnit('')
    setFormRefRange('')
    setFormCategory('lipid')
    setFormDate(new Date().toISOString().split('T')[0])
    setOpenAddModal(true)
  }

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formValue.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome e o valor do biomarcador.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      await onAdd({
        name: formName.trim(),
        value: formValue.trim(),
        unit: formUnit.trim() || undefined,
        reference_range: formRefRange.trim() || undefined,
        category: formCategory || undefined,
        date: formDate || undefined,
        status: 'otimo',
      })

      toast({
        title: 'Biomarcador registrado',
        description: `${formName} adicionado com sucesso.`,
      })
      setOpenAddModal(false)
      setFormName('')
      setFormValue('')
      setFormUnit('')
      setFormRefRange('')
      setFormDate('')
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Extração inteligente de marcadores dos exames caso não estejam em profile_biomarkers
  const examExtractedMap = useMemo(() => {
    const map = new Map<string, { value: string; date: string; examTitle: string }>()

    // Itera pelos exames mais recentes
    for (const ex of exams) {
      if (!ex.summary_results) continue
      const text = ex.summary_results

      // Procura padrões comuns em summary_results (ex: "Glicemia de jejum: 88 mg/dL", "Vitamina D: 48 ng/mL")
      for (const def of BIOMARKER_DEFINITIONS) {
        if (map.has(def.id)) continue // já temos um mais recente

        for (const alias of [def.name, ...def.aliases]) {
          const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(`${escaped}\\s*[:=-]\\s*([0-9.,]+)\\s*([a-zA-Z/%³]*)`, 'i')
          const m = text.match(regex)
          if (m && m[1]) {
            map.set(def.id, {
              value: m[1].trim(),
              date: ex.date,
              examTitle: ex.title,
            })
            break
          }
        }
      }
    }
    return map
  }, [exams])

  // Consolidação de todos os biomarcadores unificados
  const unifiedBiomarkers: UnifiedBiomarkerItem[] = useMemo(() => {
    const list: UnifiedBiomarkerItem[] = []
    const coveredDefIds = new Set<string>()

    // 1. Processa todos os cadastrados em profile_biomarkers
    for (const item of items) {
      const def = findBiomarkerDefinition(item.name)
      const area = def?.area || (item.category as BiomarkerArea) || 'other'
      const areaMeta = BIOMARKER_AREAS.find((a) => a.id === area) || {
        id: 'other' as BiomarkerArea,
        title: 'Outros Marcadores',
        subtitle: 'Biomarcadores adicionais',
        color: '#64748b',
        iconName: 'FileText',
      }

      if (def) coveredDefIds.add(def.id)

      const numVal = parseBiomarkerNumericValue(item.value)
      const ranges = def
        ? def.getRanges(userGender)
        : {
            minDisplay: 0,
            maxDisplay: numVal ? Math.max(100, numVal * 1.5) : 100,
            optimalText: item.reference_range || 'Faixa de referência livre',
            segments: [
              {
                status: 'optimal' as const,
                label: 'Referência',
                min: 0,
                max: numVal ? Math.max(100, numVal * 1.5) : 100,
                color: '#10b981',
              },
            ],
          }

      let classified = numVal !== null ? classifyBiomarkerValue(numVal, ranges) : null

      list.push({
        id: item.id,
        name: item.name,
        area: areaMeta.id,
        areaTitle: areaMeta.title,
        areaColor: areaMeta.color,
        definition: def,
        hasRecord: true,
        displayValue: item.value,
        numericValue: numVal,
        unit: item.unit || def?.defaultUnit || '',
        date: item.date,
        sourceType: 'profile',
        sourceLabel: item.date ? `Registro em ${item.date}` : 'Registro do Perfil',
        originalRecordId: item.id,
        status: classified?.status || 'optimal',
        statusLabel:
          classified?.segmentLabel || (item.status === 'alterado' ? 'Fora da Faixa' : 'Normal'),
        statusColor: classified?.color || (item.status === 'alterado' ? '#ef4444' : '#10b981'),
        isOutOfRange: classified?.isOutOfRange ?? item.status === 'alterado',
        referenceText: item.reference_range || ranges.optimalText,
        minDisplay: ranges.minDisplay,
        maxDisplay: ranges.maxDisplay,
        segments: ranges.segments,
        description: def?.description,
        clinicalNote: def?.clinicalNote,
      })
    }

    // 2. Para as definições do catálogo que NÃO estão em profile_biomarkers:
    // Verifica se vieram de exames ou se ficam como "Sem registro"
    for (const def of BIOMARKER_DEFINITIONS) {
      if (coveredDefIds.has(def.id)) continue

      const areaMeta = BIOMARKER_AREAS.find((a) => a.id === def.area) || {
        id: 'other' as BiomarkerArea,
        title: 'Outros Marcadores',
        subtitle: 'Biomarcadores adicionais',
        color: '#64748b',
        iconName: 'FileText',
      }

      const ranges = def.getRanges(userGender)
      const fromExam = examExtractedMap.get(def.id)

      if (fromExam) {
        const numVal = parseBiomarkerNumericValue(fromExam.value)
        const classified = numVal !== null ? classifyBiomarkerValue(numVal, ranges) : null

        list.push({
          id: `exam-${def.id}`,
          name: def.name,
          area: def.area,
          areaTitle: areaMeta.title,
          areaColor: areaMeta.color,
          definition: def,
          hasRecord: true,
          displayValue: fromExam.value,
          numericValue: numVal,
          unit: def.defaultUnit,
          date: fromExam.date,
          sourceType: 'exam',
          sourceLabel: `Extraído de "${fromExam.examTitle}" (${fromExam.date})`,
          status: classified?.status || 'optimal',
          statusLabel: classified?.segmentLabel || 'Normal',
          statusColor: classified?.color || '#10b981',
          isOutOfRange: classified?.isOutOfRange ?? false,
          referenceText: ranges.optimalText,
          minDisplay: ranges.minDisplay,
          maxDisplay: ranges.maxDisplay,
          segments: ranges.segments,
          description: def.description,
          clinicalNote: def.clinicalNote,
        })
      } else {
        // Sem registro ainda
        list.push({
          id: `empty-${def.id}`,
          name: def.name,
          area: def.area,
          areaTitle: areaMeta.title,
          areaColor: areaMeta.color,
          definition: def,
          hasRecord: false,
          displayValue: '--',
          numericValue: null,
          unit: def.defaultUnit,
          date: undefined,
          sourceType: 'none',
          status: 'none',
          statusLabel: 'Sem registro',
          statusColor: '#94a3b8',
          isOutOfRange: false,
          referenceText: ranges.optimalText,
          minDisplay: ranges.minDisplay,
          maxDisplay: ranges.maxDisplay,
          segments: ranges.segments,
          description: def.description,
          clinicalNote: def.clinicalNote,
        })
      }
    }

    return list
  }, [items, exams, userGender, examExtractedMap])

  // Filtragem e agrupamento por área
  const groupedBiomarkers = useMemo(() => {
    // Aplica filtro de busca
    let filtered = unifiedBiomarkers
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(term) ||
          b.areaTitle.toLowerCase().includes(term) ||
          (b.definition?.aliases || []).some((a) => a.toLowerCase().includes(term)),
      )
    }

    if (selectedAreaFilter !== 'all') {
      filtered = filtered.filter((b) => b.area === selectedAreaFilter)
    }

    // Agrupa nas áreas oficiais na ordem de BIOMARKER_AREAS
    const groups: {
      meta: (typeof BIOMARKER_AREAS)[0]
      items: UnifiedBiomarkerItem[]
      recordedCount: number
      outOfRangeCount: number
    }[] = []

    for (const area of BIOMARKER_AREAS) {
      const areaItems = filtered.filter((b) => b.area === area.id)
      if (areaItems.length > 0) {
        const recordedCount = areaItems.filter((i) => i.hasRecord).length
        const outOfRangeCount = areaItems.filter((i) => i.isOutOfRange).length
        groups.push({
          meta: area,
          items: areaItems,
          recordedCount,
          outOfRangeCount,
        })
      }
    }

    return groups
  }, [unifiedBiomarkers, searchTerm, selectedAreaFilter])

  // Métricas gerais do painel
  const stats = useMemo(() => {
    const totalPossible = unifiedBiomarkers.length
    const withData = unifiedBiomarkers.filter((b) => b.hasRecord).length
    const inRange = unifiedBiomarkers.filter((b) => b.hasRecord && !b.isOutOfRange).length
    const outOfRange = unifiedBiomarkers.filter((b) => b.hasRecord && b.isOutOfRange).length
    return { totalPossible, withData, inRange, outOfRange }
  }, [unifiedBiomarkers])

  // Renderiza ícone dinâmico da área
  const renderAreaIcon = (iconName: string, color: string) => {
    const className = 'w-4 h-4 shrink-0'
    switch (iconName) {
      case 'Heart':
        return <Heart className={className} style={{ color }} />
      case 'Activity':
        return <Activity className={className} style={{ color }} />
      case 'Droplet':
        return <Droplet className={className} style={{ color }} />
      case 'ShieldAlert':
        return <ShieldAlert className={className} style={{ color }} />
      case 'Flame':
        return <Flame className={className} style={{ color }} />
      case 'Sparkles':
        return <Sparkles className={className} style={{ color }} />
      case 'Sun':
        return <Sun className={className} style={{ color }} />
      case 'AlertTriangle':
        return <AlertTriangle className={className} style={{ color }} />
      case 'Dna':
        return <Dna className={className} style={{ color }} />
      case 'Layers':
        return <Layers className={className} style={{ color }} />
      default:
        return <FileText className={className} style={{ color }} />
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header do Painel com Resumo Clínico estilo Guava */}
      <Card className="border-border/80 bg-gradient-to-br from-card via-card to-rose-500/5 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Heart className="w-3.5 h-3.5" />
                Painel de Biomarcadores Laboratoriais
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Biomarcadores & Réguas de Referência
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Acompanhe cada marcador agrupado por sistema clínico. A régua de termômetro
                posiciona seus valores frente às faixas de referência e sinaliza alterações
                precocemente.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={openAddFree}
                size="sm"
                className="gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Novo Biomarcador
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Métricas rápidas do painel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-xl border border-border/60 bg-background/60 space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Marcadores Monitorados
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-foreground">
                {stats.withData}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  de {stats.totalPossible}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-0.5">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Dentro da Faixa
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {stats.inRange}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-0.5">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Atenção / Fora da Faixa
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                {stats.outOfRange}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border/60 bg-background/60 space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Sem Registro
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-muted-foreground">
                {stats.totalPossible - stats.withData}
              </div>
            </div>
          </div>

          {/* Barra de Busca e Filtro de Área */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar por marcador (ex: LDL, Glicemia, Ferritina, TSH...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 bg-background/80"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedAreaFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  selectedAreaFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted text-muted-foreground border-border/70'
                }`}
              >
                Todas as Áreas
              </button>
              {BIOMARKER_AREAS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAreaFilter(a.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                    selectedAreaFilter === a.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border/70'
                  }`}
                >
                  {a.title}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Áreas Clínicas com Headers Colapsáveis e Réguas de Termômetro */}
      {groupedBiomarkers.length === 0 ? (
        <Card className="p-8 text-center border-border/80">
          <p className="text-sm font-semibold text-foreground">Nenhum marcador encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tente outro termo de busca ou limpe o filtro de área.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedBiomarkers.map(({ meta, items: areaItems, recordedCount, outOfRangeCount }) => {
            const isExpanded = expandedAreas[meta.id] ?? true

            return (
              <Card
                key={meta.id}
                className="border-border/80 shadow-xs overflow-hidden transition-all duration-200"
              >
                {/* Header da Área (Colapsável) */}
                <button
                  onClick={() => toggleArea(meta.id)}
                  className="w-full px-4 sm:px-5 py-3.5 bg-muted/30 hover:bg-muted/50 border-b border-border/60 transition-colors flex items-center justify-between text-left gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shadow-xs shrink-0"
                      style={{ backgroundColor: `${meta.color}18` }}
                    >
                      {renderAreaIcon(meta.iconName, meta.color)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                          {meta.title}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-background border border-border/70 text-muted-foreground shrink-0">
                          {recordedCount} de {areaItems.length} monitorados
                        </span>
                        {outOfRangeCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0">
                            {outOfRangeCount} fora da faixa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate hidden sm:block">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Conteúdo da Área (Cards dos Marcadores) */}
                {isExpanded && (
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {areaItems.map((biomarker) => (
                        <div
                          key={biomarker.id}
                          className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
                            biomarker.isOutOfRange
                              ? 'border-amber-300/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                              : biomarker.hasRecord
                                ? 'border-border/80 bg-card hover:border-border'
                                : 'border-dashed border-border/70 bg-muted/20 opacity-85 hover:opacity-100'
                          }`}
                        >
                          {/* Cabeçalho do Marcador */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-foreground leading-tight">
                                  {biomarker.name}
                                </h4>
                                {biomarker.isOutOfRange && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 rounded">
                                    Atenção
                                  </span>
                                )}
                              </div>
                              {biomarker.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1">
                                  {biomarker.description}
                                </p>
                              )}
                            </div>

                            {/* Ações (remover se for customizado, ou registrar se vazio) */}
                            <div className="flex items-center gap-1 shrink-0">
                              {biomarker.originalRecordId && (
                                <button
                                  onClick={() => onDelete(biomarker.originalRecordId!)}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                  title="Remover biomarcador"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Valor + Status Atual */}
                          <div className="flex items-end justify-between gap-3 pt-1">
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                                Último Valor Registrado
                              </span>
                              <div className="flex items-baseline gap-1.5">
                                <span
                                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                                    biomarker.hasRecord
                                      ? 'text-foreground'
                                      : 'text-muted-foreground/60'
                                  }`}
                                >
                                  {biomarker.displayValue}
                                </span>
                                {biomarker.unit && (
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {biomarker.unit}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              {biomarker.hasRecord ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs"
                                  style={{
                                    backgroundColor: `${biomarker.statusColor}15`,
                                    color: biomarker.statusColor,
                                    borderColor: `${biomarker.statusColor}40`,
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: biomarker.statusColor }}
                                  />
                                  {biomarker.statusLabel}
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    biomarker.definition
                                      ? openAddForDefinition(biomarker.definition)
                                      : openAddFree()
                                  }
                                  className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                >
                                  <Plus className="w-3 h-3" />
                                  Registrar Valor
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* RÉGUA DE TERMÔMETRO ESTILO GUAVA */}
                          <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-medium text-muted-foreground">
                                Régua de Referência:
                              </span>
                              <span className="font-semibold text-foreground/90">
                                {biomarker.referenceText}
                              </span>
                            </div>

                            <ThermometerGauge
                              value={biomarker.numericValue}
                              displayValue={biomarker.displayValue}
                              unit={biomarker.unit}
                              minDisplay={biomarker.minDisplay}
                              maxDisplay={biomarker.maxDisplay}
                              segments={biomarker.segments}
                              statusColor={biomarker.statusColor}
                              statusLabel={biomarker.statusLabel}
                              isOutOfRange={biomarker.isOutOfRange}
                            />
                          </div>

                          {/* Rodapé com Data do Exame / Origem */}
                          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <Calendar className="w-3 h-3 shrink-0" />
                              {biomarker.date ? (
                                <span>
                                  Exame realizado em:{' '}
                                  <strong className="text-foreground/80">{biomarker.date}</strong>
                                </span>
                              ) : (
                                <span>Aguardando data do exame</span>
                              )}
                            </span>

                            {biomarker.sourceType === 'exam' && (
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                                Extraído de Exame Anexo
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* 3. Modal Unificado para Adicionar ou Atualizar Biomarcador */}
      <Dialog open={openAddModal} onOpenChange={setOpenAddModal}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Heart className="w-4 h-4 text-rose-500" />
                Registrar Valor de Biomarcador
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <Label>Nome do Biomarcador *</Label>
                <Input
                  placeholder="Ex: Colesterol LDL, Glicemia de Jejum, Ferritina..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Valor Medido *</Label>
                  <Input
                    placeholder="Ex: 94 ou 5.2"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade</Label>
                  <Input
                    placeholder="mg/dL, %, ng/mL..."
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Faixa de Referência</Label>
                <Input
                  placeholder="Ex: < 100 mg/dL ou 70 - 99 mg/dL"
                  value={formRefRange}
                  onChange={(e) => setFormRefRange(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Área / Categoria</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {BIOMARKER_AREAS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label>Data do Exame</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setOpenAddModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="font-semibold">
                {submitting ? 'Salvando...' : 'Salvar Biomarcador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
