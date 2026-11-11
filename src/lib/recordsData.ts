import pb from '@/lib/pocketbase/client'
import type {
  HealthMetric,
  Medication,
  MedicationRoutine,
  ProfileBiomarker,
  ProfileCondition,
  ProfileVaccination,
  ProfileEvent,
  EmotionalLog,
  Meal,
  SymptomLog,
} from '@/types'
import {
  Activity,
  CalendarClock,
  ClipboardList,
  Dna,
  FileText,
  FlaskConical,
  HeartPulse,
  Image as ImageIcon,
  Pill,
  Salad,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from 'lucide-react'

/**
 * Coleta e unifica TODOS os registros inseridos no app para a página Records:
 * métricas, exames/uploads, medicações, vacinas, condições, procedimentos/
 * eventos, biomarcadores, refeições, sintomas e check-ins do diário emocional.
 * Tudo em uma lista cronológica (mais recente primeiro) com fonte e categoria.
 */

export type RecordSource = 'upload' | 'manual' | 'ai'

export type RecordCategoryId =
  | 'vital_signs'
  | 'lab_tests'
  | 'social_history'
  | 'vaccinations'
  | 'procedures'
  | 'medications'
  | 'conditions'
  | 'imaging'
  | 'documents'
  | 'encounters'

export interface UnifiedRecord {
  id: string
  title: string
  subtitle?: string
  origin: string
  date: string // ISO
  formattedDate: string
  source: RecordSource
  sourceLabel: string
  category: RecordCategoryId
  navigateTo?: string
}

export const RECORD_CATEGORIES: { id: RecordCategoryId; label: string }[] = [
  { id: 'vital_signs', label: 'Sinais Vitais' },
  { id: 'lab_tests', label: 'Exames Laboratoriais' },
  { id: 'social_history', label: 'História Social' },
  { id: 'vaccinations', label: 'Vacinas' },
  { id: 'procedures', label: 'Procedimentos' },
  { id: 'medications', label: 'Medicamentos' },
  { id: 'conditions', label: 'Condições' },
  { id: 'imaging', label: 'Imagem' },
  { id: 'documents', label: 'Documentos' },
  { id: 'encounters', label: 'Consultas' },
]

export const CATEGORY_ICON: Record<
  RecordCategoryId,
  { Icon: LucideIcon; bgClass: string; colorClass: string }
> = {
  vital_signs: { Icon: HeartPulse, bgClass: 'bg-rose-500', colorClass: 'text-rose-500' },
  lab_tests: { Icon: FlaskConical, bgClass: 'bg-emerald-600', colorClass: 'text-emerald-600' },
  social_history: { Icon: Dna, bgClass: 'bg-slate-500', colorClass: 'text-slate-500' },
  vaccinations: { Icon: Syringe, bgClass: 'bg-amber-500', colorClass: 'text-amber-500' },
  procedures: { Icon: Stethoscope, bgClass: 'bg-teal-600', colorClass: 'text-teal-600' },
  medications: { Icon: Pill, bgClass: 'bg-sky-500', colorClass: 'text-sky-500' },
  conditions: { Icon: ClipboardList, bgClass: 'bg-violet-500', colorClass: 'text-violet-500' },
  imaging: { Icon: ImageIcon, bgClass: 'bg-indigo-500', colorClass: 'text-indigo-500' },
  documents: { Icon: FileText, bgClass: 'bg-slate-600', colorClass: 'text-slate-600' },
  encounters: { Icon: CalendarClock, bgClass: 'bg-purple-500', colorClass: 'text-purple-500' },
}

const SOURCE_LABEL: Record<RecordSource, string> = {
  upload: 'Arquivo Enviado',
  manual: 'Registro Manual',
  ai: 'Gerado por IA',
}

const df = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })
const dfFull = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function fmt(dateStr: string, withTime: boolean): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return withTime ? dfFull.format(d) : df.format(d)
}

function record(
  partial: Omit<UnifiedRecord, 'formattedDate' | 'sourceLabel'> & { withTime?: boolean },
): UnifiedRecord {
  return {
    ...partial,
    formattedDate: fmt(partial.date, partial.withTime ?? true),
    sourceLabel: SOURCE_LABEL[partial.source],
  }
}

// Mapeamento de categorias de métricas para as categorias do Records.
const METRIC_CATEGORY_MAP: Record<string, RecordCategoryId> = {
  peso: 'vital_signs',
  pressao: 'vital_signs',
  pressao_arterial: 'vital_signs',
  glicemia: 'vital_signs',
  hrv: 'vital_signs',
  temperatura: 'vital_signs',
  sono: 'vital_signs',
  agua: 'vital_signs',
  cafe: 'vital_signs',
  alcool: 'social_history',
  atividade_fisica: 'vital_signs',
  exercicio: 'vital_signs',
  humor: 'social_history',
}

const METRIC_TITLES: Record<string, string> = {
  peso: 'Peso',
  pressao: 'Pressão arterial',
  pressao_arterial: 'Pressão arterial',
  glicemia: 'Glicemia',
  hrv: 'HRV (variabilidade cardíaca)',
  temperatura: 'Temperatura',
  sono: 'Sono',
  agua: 'Água',
  cafe: 'Café',
  alcool: 'Álcool',
  atividade_fisica: 'Atividade física',
  exercicio: 'Exercício',
  humor: 'Humor',
}

function metricRecords(items: HealthMetric[]): UnifiedRecord[] {
  return items.map((m) =>
    record({
      id: `metric-${m.id}`,
      title: `${METRIC_TITLES[m.category] || m.category}${m.numeric_value != null ? `: ${m.numeric_value}` : ''}`,
      origin: 'Medição registrada',
      date: m.date_time || m.created || new Date().toISOString(),
      source: 'manual',
      category: METRIC_CATEGORY_MAP[m.category] || 'vital_signs',
      navigateTo: `/metrics/${m.category}`,
      withTime: true,
    }),
  )
}

function examRecords(exams: unknown[]): UnifiedRecord[] {
  return (exams as Record<string, unknown>[]).map((e) =>
    record({
      id: `exam-${String(e.id)}`,
      title: String(e.title || e.name || 'Exame'),
      subtitle: e.ai_summary ? String(e.ai_summary).slice(0, 90) : undefined,
      origin: String(e.type || 'Exame'),
      date: String(e.date || e.created || new Date().toISOString()),
      source: 'upload',
      category: 'documents',
      navigateTo: '/exames-dietas',
      withTime: false,
    }),
  )
}

function medicationRecords(items: Medication[]): UnifiedRecord[] {
  return items.map((m) =>
    record({
      id: `med-${m.id}`,
      title: m.name,
      subtitle: m.dosage ? `${m.dosage}${m.frequency ? ` • ${m.frequency}` : ''}` : m.frequency,
      origin: 'Medicamento/suplemento',
      date: m.created || new Date().toISOString(),
      source: 'manual',
      category: 'medications',
      navigateTo: '/medicamentos',
      withTime: true,
    }),
  )
}

function vaccinationRecords(items: ProfileVaccination[]): UnifiedRecord[] {
  return items.map((v) =>
    record({
      id: `vac-${v.id}`,
      title: v.vaccine_name || v.name || 'Vacina',
      origin: 'Vacina registrada',
      date: v.date || v.created || new Date().toISOString(),
      source: 'manual',
      category: 'vaccinations',
      navigateTo: '/profile',
      withTime: false,
    }),
  )
}

function conditionRecords(items: ProfileCondition[]): UnifiedRecord[] {
  return items.map((c) =>
    record({
      id: `cond-${c.id}`,
      title: c.condition || c.name || 'Condição',
      origin: 'Condição de saúde',
      date: c.created || new Date().toISOString(),
      source: 'manual',
      category: 'conditions',
      navigateTo: '/profile',
      withTime: false,
    }),
  )
}

function eventRecords(items: ProfileEvent[]): UnifiedRecord[] {
  return items.map((e) =>
    record({
      id: `event-${e.id}`,
      title: e.title || e.event_name || 'Procedimento/Consulta',
      subtitle: e.notes,
      origin: e.event_type === 'consulta' ? 'Consulta' : 'Procedimento',
      date: e.date || e.created || new Date().toISOString(),
      source: 'manual',
      category: e.event_type === 'consulta' ? 'encounters' : 'procedures',
      navigateTo: '/profile',
      withTime: false,
    }),
  )
}

function biomarkerRecords(items: ProfileBiomarker[]): UnifiedRecord[] {
  return items.map((b) =>
    record({
      id: `bio-${b.id}`,
      title: b.name || 'Biomarcador',
      subtitle: b.value != null ? `Valor: ${b.value} ${b.unit || ''}` : undefined,
      origin: 'Exame laboratorial',
      date: b.date || b.created || new Date().toISOString(),
      source: 'manual',
      category: 'lab_tests',
      navigateTo: '/biomarcadores',
      withTime: false,
    }),
  )
}

function mealRecords(items: Meal[]): UnifiedRecord[] {
  return items.map((m) =>
    record({
      id: `meal-${m.id}`,
      title: m.name || m.description || 'Refeição',
      origin: 'Refeição registrada',
      date: m.date_time || m.created || new Date().toISOString(),
      source: m.image ? 'upload' : 'manual',
      category: 'social_history',
      navigateTo: '/refeicoes',
      withTime: true,
    }),
  )
}

function symptomRecords(items: SymptomLog[]): UnifiedRecord[] {
  return items.map((s) =>
    record({
      id: `sym-${s.id}`,
      title: s.symptom_name || s.name || 'Sintoma',
      subtitle: s.severity != null ? `Intensidade: ${s.severity}/10` : undefined,
      origin: 'Sintoma registrado',
      date: s.date_time || s.created || new Date().toISOString(),
      source: 'manual',
      category: 'social_history',
      navigateTo: '/',
      withTime: true,
    }),
  )
}

function emotionalRecords(items: EmotionalLog[]): UnifiedRecord[] {
  return items.map((l) =>
    record({
      id: `emo-${l.id}`,
      title: `Check-in do diário (humor ${l.mood_score}/5)`,
      subtitle: l.notes,
      origin: 'Diário Emocional',
      date: l.date || l.created || new Date().toISOString(),
      source: 'manual',
      category: 'social_history',
      navigateTo: '/diario-emocional',
      withTime: true,
    }),
  )
}

const uid = pb.authStore.record?.id

/** Busca todas as coleções relevantes e devolve a lista unificada, mais recente primeiro. */
export async function listAllRecords(): Promise<UnifiedRecord[]> {
  if (!pb.authStore.record?.id) return []
  const userFilter = `user = '${uid}'`

  const results = await Promise.allSettled([
    pb.collection('health_metrics').getFullList({ filter: userFilter, sort: '-date_time' }),
    pb.collection('exams').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('medications').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('profile_vaccinations').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('profile_conditions').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('profile_events').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('profile_biomarkers').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('meals').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('symptom_logs').getFullList({ filter: userFilter, sort: '-created' }),
    pb.collection('emotional_logs').getFullList({ filter: userFilter, sort: '-created' }),
  ])

  const arr = (
    fn: PromiseSettledResult<unknown[]>,
    mapper: (items: unknown[]) => UnifiedRecord[],
  ): UnifiedRecord[] => (fn.status === 'fulfilled' ? mapper(fn.value) : [])

  const all: UnifiedRecord[] = [
    ...arr(results[0], metricRecords),
    ...arr(results[1], examRecords),
    ...arr(results[2], medicationRecords),
    ...arr(results[3], vaccinationRecords),
    ...arr(results[4], conditionRecords),
    ...arr(results[5], eventRecords),
    ...arr(results[6], biomarkerRecords),
    ...arr(results[7], mealRecords),
    ...arr(results[8], symptomRecords),
    ...arr(results[9], emotionalRecords),
  ]

  all.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  return all
}
