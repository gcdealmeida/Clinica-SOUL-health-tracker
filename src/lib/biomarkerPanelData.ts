import { ProfileBiomarker, HealthMetric } from '@/types'
import {
  PANEL_MARKERS,
  PANEL_GROUPS,
  MarkerSpec,
  normalizeName,
  normalizeUnitKey,
} from '@/lib/biomarkerPanels'
import {
  findBiomarkerDefinition,
  parseBiomarkerNumericValue,
  ReferenceRangeSegment,
  RangeStatus,
} from '@/lib/biomarkersCatalog'

/**
 * Camada de dados do painel Biomarcadores (estilo Guava "Biomarkers II").
 * Cruza o catálogo de marcadores do painel (PANEL_MARKERS) com:
 * - profile_biomarkers (leitura inteligente de exames + lançamentos manuais)
 * - health_metrics (pressão, peso, gordura corporal, massa magra)
 * e produz, para cada marcador, o último valor, o anterior (delta) e o status.
 */

export type PanelMarkerStatus = 'in_range' | 'out_of_range' | 'no_data'

export interface PanelMarkerData {
  spec: MarkerSpec
  groupTitle: string
  /** Último valor (numérico ou textual), já convertido para a unidade-base do marcador. */
  value: number | null
  /** Valor textual original (ex.: "Negativo", "120/80"). */
  rawValue: string
  unit: string
  date?: string
  /** Status clínico calculado. */
  status: PanelMarkerStatus
  statusLabel: string
  statusColor: string
  /** Resultado anterior e data (para o delta). */
  previousValue: number | null
  previousRawValue: string
  previousDate?: string
  delta: number | null
  deltaPct: number | null
  /** Delta textual (ex.: "+12", "-0.4"), null quando não há anterior ou é marcador textual. */
  deltaLabel: string | null
  /** Seta de direção: 'up' valor subiu, 'down' valor caiu, null sem comparação. */
  deltaDir: 'up' | 'down' | null
  /** Régua de faixas de referência (reusada do catálogo do Profile quando disponível). */
  minDisplay: number
  maxDisplay: number
  segments: ReferenceRangeSegment[]
  referenceText: string
  /** Descrição clínica vinda do catálogo do Profile, quando existe. */
  description?: string
  clinicalNote?: string
}

const COLOR_IN = '#10b981'
const COLOR_OUT = '#f59e0b'
const COLOR_NONE = '#94a3b8'

// ------------------------------------------------------------------
// Matching de registros de profile_biomarkers para um marcador do painel
// ------------------------------------------------------------------

interface BioPoint {
  value: number | null
  rawValue: string
  unit: string
  date?: string
}

function matchBioRecords(
  spec: MarkerSpec,
  byAlias: Map<string, ProfileBiomarker[]>,
): ProfileBiomarker[] {
  const candidates = new Map<string, ProfileBiomarker>()
  for (const alias of [normalizeName(spec.name), ...(spec.aliases || [])]) {
    for (const rec of byAlias.get(alias) || []) {
      if (!candidates.has(rec.id)) candidates.set(rec.id, rec)
    }
  }
  return [...candidates.values()].sort((a, b) => {
    const da = a.date || ''
    const db = b.date || ''
    if (da !== db) return da < db ? 1 : -1 // mais recente primeiro
    return (b.created || '') < (a.created || '') ? -1 : 1
  })
}

function unitScaleFor(spec: MarkerSpec, unit: string): number {
  const key = normalizeUnitKey(unit)
  if (!key || !spec.scales) return 1
  return spec.scales[key] ?? 1
}

function toBioPoint(spec: MarkerSpec, rec: ProfileBiomarker): BioPoint {
  const raw = (rec.value ?? '').toString().trim()
  const num = parseBiomarkerNumericValue(raw)
  const scale = unitScaleFor(spec, rec.unit || '')
  return {
    value: num !== null ? num * scale : null,
    rawValue: raw,
    unit: rec.unit || spec.unit || '',
    date: rec.date,
  }
}

// ------------------------------------------------------------------
// Métricas especiais (pressão, peso, gordura corporal, massa magra)
// ------------------------------------------------------------------

function metricPoints(metrics: HealthMetric[], category: string): BioPoint[] {
  return metrics
    .filter((m) => m.category === category)
    .map((m) => ({
      value:
        typeof m.numeric_value === 'number' && !isNaN(m.numeric_value) ? m.numeric_value : null,
      rawValue:
        m.text_value ||
        (typeof m.numeric_value === 'number' && !isNaN(m.numeric_value)
          ? String(m.numeric_value)
          : ''),
      unit: m.unit || '',
      date: m.date_time?.slice(0, 10),
    }))
}

function parseBpPoint(m: HealthMetric): BioPoint {
  const raw = m.text_value || `${m.numeric_value}`
  const match = raw.match(/(\d+)\s*[x/\s]\s*(\d+)/)
  const sys = match ? parseInt(match[1], 10) : m.numeric_value
  return {
    value: typeof sys === 'number' && !isNaN(sys) ? sys : null,
    rawValue: raw,
    unit: 'mmHg',
    date: m.date_time?.slice(0, 10),
  }
}

// ------------------------------------------------------------------
// Construção do painel
// ------------------------------------------------------------------

function pointsFor(spec: MarkerSpec, bios: BioPoint[], metrics: HealthMetric[]): BioPoint[] {
  if (spec.special === 'bp') {
    return metrics
      .filter((m) => m.category === 'pressao')
      .map(parseBpPoint)
      .filter((p) => p.date)
  }
  if (spec.special === 'weight') {
    return metricPoints(metrics, 'peso')
  }
  if (spec.special === 'body_fat') {
    return metricPoints(metrics, 'peso')
      .filter((p) => {
        const rec = metrics.find(
          (m) => m.category === 'peso' && m.date_time?.slice(0, 10) === p.date,
        )
        return typeof rec?.body_fat_pct === 'number' && !isNaN(rec.body_fat_pct)
      })
      .map((p) => {
        const rec = metrics.find(
          (m) => m.category === 'peso' && m.date_time?.slice(0, 10) === p.date,
        )!
        return {
          value: rec.body_fat_pct ?? null,
          rawValue: `${rec.body_fat_pct}`,
          unit: '%',
          date: p.date,
        }
      })
  }
  if (spec.special === 'lean_mass') {
    return metricPoints(metrics, 'peso')
      .filter((p) => {
        const rec = metrics.find(
          (m) => m.category === 'peso' && m.date_time?.slice(0, 10) === p.date,
        )
        return typeof rec?.lean_mass_kg === 'number' && !isNaN(rec.lean_mass_kg)
      })
      .map((p) => {
        const rec = metrics.find(
          (m) => m.category === 'peso' && m.date_time?.slice(0, 10) === p.date,
        )!
        return {
          value: rec.lean_mass_kg ?? null,
          rawValue: `${rec.lean_mass_kg}`,
          unit: 'kg',
          date: p.date,
        }
      })
  }
  return bios
}

/** Status e régua a partir das faixas do próprio marcador do painel. */
function statusFromSpec(
  spec: MarkerSpec,
  v: number,
): { status: PanelMarkerStatus; label: string; color: string } {
  if (spec.noStatus) return { status: 'in_range', label: '—', color: COLOR_NONE }

  // Zona ideal (verde) — verificada primeiro
  if (spec.ideal && v >= spec.ideal[0] && v <= spec.ideal[1]) {
    return { status: 'in_range', label: 'Ótimo', color: COLOR_IN }
  }
  // Zona limítrofe (amarela)
  if (spec.borderline && v >= spec.borderline[0] && v <= spec.borderline[1]) {
    return { status: 'out_of_range', label: 'Limítrofe', color: COLOR_OUT }
  }
  // Faixa normal
  if (spec.range && v >= spec.range[0] && v <= spec.range[1]) {
    return { status: 'in_range', label: spec.inRangeLabel || 'Na faixa', color: COLOR_IN }
  }
  // Fora de todas as faixas conhecidas
  if (spec.ideal || spec.borderline || spec.range) {
    const allMin = Math.min(
      spec.ideal?.[0] ?? Infinity,
      spec.range?.[0] ?? Infinity,
      spec.borderline?.[0] ?? Infinity,
    )
    const dir = v < allMin ? 'Abaixo' : 'Acima'
    return {
      status: 'out_of_range',
      label: dir === 'Abaixo' ? 'Abaixo da faixa' : 'Fora da faixa',
      color: COLOR_OUT,
    }
  }
  // Sem faixas definidas: só exibimos o valor
  return { status: 'in_range', label: '—', color: COLOR_NONE }
}

/** Régua visual: tenta o catálogo do Profile (definição clínica) ou deriva das faixas do painel. */
function gaugeFor(
  spec: MarkerSpec,
  v: number | null,
): {
  minDisplay: number
  maxDisplay: number
  segments: ReferenceRangeSegment[]
  referenceText: string
} {
  // 1. Definição clínica rica do catálogo do Profile (quando existe)
  const def = findBiomarkerDefinition(spec.name)
  if (def) {
    const r = def.getRanges()
    return {
      minDisplay: r.minDisplay,
      maxDisplay: r.maxDisplay,
      segments: r.segments,
      referenceText: r.optimalText,
    }
  }

  // 2. Marcadores especiais
  if (spec.special === 'bp') {
    return {
      minDisplay: 90,
      maxDisplay: 180,
      referenceText: '< 120/80 mmHg',
      segments: [
        { status: 'optimal', label: 'Ótima', min: 90, max: 120, color: '#10b981' },
        { status: 'borderline', label: 'Elevada', min: 120, max: 140, color: '#eab308' },
        { status: 'high', label: 'Alta', min: 140, max: 180, color: '#ef4444' },
      ],
    }
  }

  // 3. Deriva a régua das faixas do próprio marcador
  const bounds: number[] = []
  if (spec.ideal) bounds.push(spec.ideal[0], spec.ideal[1])
  if (spec.range) bounds.push(spec.range[0], spec.range[1])
  if (spec.borderline) bounds.push(spec.borderline[0], spec.borderline[1])
  if (v !== null) bounds.push(v)

  const segs: ReferenceRangeSegment[] = []
  if (spec.range) {
    segs.push({
      status: 'optimal' as RangeStatus,
      label: spec.inRangeLabel || 'Referência',
      min: spec.range[0],
      max: spec.range[1],
      color: COLOR_IN,
    })
  }
  if (spec.borderline) {
    segs.push({
      status: 'borderline' as RangeStatus,
      label: 'Limítrofe',
      min: spec.borderline[0],
      max: spec.borderline[1],
      color: COLOR_OUT,
    })
  }
  if (segs.length === 0) {
    const span = bounds.length >= 2 ? bounds[bounds.length - 1] - bounds[0] : 100
    const base = bounds.length >= 2 ? bounds[0] : 0
    segs.push({
      status: 'optimal' as RangeStatus,
      label: 'Referência',
      min: base,
      max: base + Math.max(span, 1),
      color: COLOR_IN,
    })
  }

  const values = [...bounds, ...(segs[0] ? [segs[0].min, segs[0].max] : [])]
  const minDisplay = values.length ? Math.min(...values) : 0
  const maxDisplay = values.length ? Math.max(...values) : 100
  return {
    minDisplay,
    maxDisplay,
    segments: segs,
    referenceText: spec.textOnly
      ? 'Resultado textual'
      : spec.unit
        ? `${segs[0].min} – ${segs[0].max} ${spec.unit}`
        : '—',
  }
}

/** TextOnly: considera "in range" quando o resultado textual não indica alteração. */
function textOnlyStatus(raw: string): { status: PanelMarkerStatus; label: string; color: string } {
  const neg = /negat|nao rea|não rea|ausen|nao detect|não detect|normal|nao constam|não constam/i
  if (!raw || neg.test(raw)) {
    return {
      status: raw ? 'in_range' : 'no_data',
      label: raw ? 'Normal' : 'No data',
      color: raw ? COLOR_IN : COLOR_NONE,
    }
  }
  return { status: 'out_of_range', label: 'Alterado', color: COLOR_OUT }
}

export interface BuildPanelInput {
  biomarkers: ProfileBiomarker[]
  metrics: HealthMetric[]
}

/** Monta todos os grupos do painel, na ordem do Guava. */
export function buildBiomarkerPanel({ biomarkers, metrics }: BuildPanelInput): {
  groups: { id: string; title: string; subtitle?: string; markers: PanelMarkerData[] }[]
  totals: { total: number; withData: number; outOfRange: number }
} {
  // Índice dos registros de profile_biomarkers por alias normalizado
  const byAlias = new Map<string, ProfileBiomarker[]>()
  for (const rec of biomarkers) {
    const key = normalizeName(rec.name || '')
    if (!key) continue
    const arr = byAlias.get(key) || []
    arr.push(rec)
    byAlias.set(key, arr)
  }

  const groups = PANEL_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    subtitle: g.subtitle,
    markers: [] as PanelMarkerData[],
  }))

  let withData = 0
  let outOfRange = 0

  for (const spec of PANEL_MARKERS) {
    const group = groups.find((g) => g.id === spec.group)
    if (!group) continue

    const bios = spec.special ? [] : matchBioRecords(spec, byAlias).map((r) => toBioPoint(spec, r))
    const points = pointsFor(spec, bios, metrics)

    const current = points[0]
    const previous = points[1]

    let status: PanelMarkerStatus = 'no_data'
    let statusLabel = 'No data'
    let statusColor = COLOR_NONE

    if (current) {
      if (spec.textOnly && current.value === null) {
        const t = textOnlyStatus(current.rawValue)
        status = t.status
        statusLabel = t.label
        statusColor = t.color
      } else if (current.value !== null) {
        const s = statusFromSpec(spec, current.value)
        status = s.status
        statusLabel = s.label
        statusColor = s.color
      } else {
        statusLabel = 'No data'
      }
    }

    let delta: number | null = null
    let deltaPct: number | null = null
    let deltaLabel: string | null = null
    let deltaDir: 'up' | 'down' | null = null
    if (
      current?.value !== null &&
      current &&
      previous?.value !== null &&
      previous &&
      current.value !== null &&
      previous.value !== null
    ) {
      delta = Math.round((current.value - previous.value) * 100) / 100
      if (delta !== 0) {
        deltaPct =
          previous.value !== 0 ? Math.round((delta / Math.abs(previous.value)) * 1000) / 10 : null
        deltaDir = delta > 0 ? 'up' : 'down'
        const sign = delta > 0 ? '+' : ''
        deltaLabel = `${sign}${delta}`
      }
    }

    if (current) withData++
    if (status === 'out_of_range') outOfRange++

    const gauge = gaugeFor(spec, current?.value ?? null)
    const def = findBiomarkerDefinition(spec.name)

    group.markers.push({
      spec,
      groupTitle: group.title,
      value: current?.value ?? null,
      rawValue: current?.rawValue || '',
      unit: current?.unit || spec.unit || '',
      date: current?.date,
      status,
      statusLabel: status === 'no_data' ? 'Sem dados' : statusLabel,
      statusColor,
      previousValue: previous?.value ?? null,
      previousRawValue: previous?.rawValue || '',
      previousDate: previous?.date,
      delta,
      deltaPct,
      deltaLabel,
      deltaDir,
      minDisplay: gauge.minDisplay,
      maxDisplay: gauge.maxDisplay,
      segments: gauge.segments,
      referenceText: gauge.referenceText,
      description: def?.description,
      clinicalNote: def?.clinicalNote,
    })
  }

  const totals = { total: PANEL_MARKERS.length, withData, outOfRange }
  return { groups: groups.filter((g) => g.markers.length > 0), totals }
}
