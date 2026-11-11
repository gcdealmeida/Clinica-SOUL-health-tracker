import { EmotionalLog } from '@/types'

// ==========================================
// 1. HUMOR (5 Carinhas - Vermelho a Verde)
// ==========================================
export interface MoodLevelDef {
  score: number // 1 a 5
  id: string
  label: string
  shortLabel: string
  emoji: string
  color: string // Tailwind bg/text
  ringColor: string
  bgLight: string
  description: string
}

export const MOOD_LEVELS: MoodLevelDef[] = [
  {
    score: 1,
    id: 'horrivel',
    label: 'Exausto / Horrível',
    shortLabel: 'horrível',
    emoji: '😫',
    color: 'bg-rose-500 text-white',
    ringColor: 'ring-rose-500 border-rose-500',
    bgLight: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    description: 'Esgotamento físico ou mental acentuado, dia muito pesado.',
  },
  {
    score: 2,
    id: 'ruim',
    label: 'Ruim / Cansado',
    shortLabel: 'ruim',
    emoji: '🙁',
    color: 'bg-amber-500 text-white',
    ringColor: 'ring-amber-500 border-amber-500',
    bgLight: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    description: 'Sensação de sobrecarga, desânimo ou tensão constante.',
  },
  {
    score: 3,
    id: 'neutro',
    label: 'Médio / Neutro',
    shortLabel: 'médio',
    emoji: '😐',
    color: 'bg-slate-400 text-white',
    ringColor: 'ring-slate-400 border-slate-400',
    bgLight: 'bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
    description: 'Dia rotineiro, sem oscilações expressivas.',
  },
  {
    score: 4,
    id: 'bom',
    label: 'Bom / Disposto',
    shortLabel: 'bom',
    emoji: '😊',
    color: 'bg-lime-500 text-white',
    ringColor: 'ring-lime-500 border-lime-500',
    bgLight: 'bg-lime-50 text-lime-800 dark:bg-lime-950/40 dark:text-lime-300',
    description: 'Bom equilíbrio, produtivo, motivado e focado.',
  },
  {
    score: 5,
    id: 'excelente',
    label: 'Excelente / Radical',
    shortLabel: 'radical',
    emoji: '😄',
    color: 'bg-emerald-500 text-white',
    ringColor: 'ring-emerald-500 border-emerald-500',
    bgLight: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    description: 'Muita disposição, clareza mental, energia máxima e plenitude.',
  },
]

// ==========================================
// 2. ENERGIA (5 Níveis com Bateria)
// ==========================================
export interface EnergyLevelDef {
  level: number // 1 a 5
  label: string
  sublabel: string
  emoji: string
  batteryBars: number // 1 a 5
  color: string
}

export const ENERGY_LEVELS: EnergyLevelDef[] = [
  {
    level: 1,
    label: 'Esgotada',
    sublabel: 'Bateria no fim (0-20%)',
    emoji: '🥱',
    batteryBars: 1,
    color: 'text-rose-500',
  },
  {
    level: 2,
    label: 'Baixa',
    sublabel: 'Reserva fraca (21-40%)',
    emoji: '😔',
    batteryBars: 2,
    color: 'text-amber-500',
  },
  {
    level: 3,
    label: 'Moderada',
    sublabel: 'Estável (41-60%)',
    emoji: '😌',
    batteryBars: 3,
    color: 'text-yellow-500',
  },
  {
    level: 4,
    label: 'Boa',
    sublabel: 'Carregado (61-80%)',
    emoji: '⚡',
    batteryBars: 4,
    color: 'text-lime-600',
  },
  {
    level: 5,
    label: 'No Máximo',
    sublabel: '100% vitalidade',
    emoji: '🔥',
    batteryBars: 5,
    color: 'text-emerald-600',
  },
]

// ==========================================
// 3. ESTRESSE (1 a 5 - Velocímetro / Manômetro)
// ==========================================
export interface StressLevelDef {
  level: number
  label: string
  description: string
  color: string
}

export const STRESS_LEVELS: StressLevelDef[] = [
  {
    level: 1,
    label: 'Sereno / Zen',
    description: 'Tranquilidade e paz interior',
    color: '#10b981',
  },
  { level: 2, label: 'Leve / Confortável', description: 'Tensão sob controle', color: '#84cc16' },
  { level: 3, label: 'Moderado', description: 'Alguns prazos e exigências', color: '#eab308' },
  { level: 4, label: 'Elevado', description: 'Pressão alta, irritabilidade', color: '#f97316' },
  {
    level: 5,
    label: 'Crítico / Alarme',
    description: 'Sobrecarga aguda e esgotamento',
    color: '#ef4444',
  },
]

// ==========================================
// 4. EMOÇÕES (Estilo Daylio com Emojis)
// ==========================================
export interface EmotionChip {
  id: string
  label: string
  emoji: string
  category: 'positiva' | 'desafio' | 'tranquila'
}

export const DAYLIO_EMOTIONS: EmotionChip[] = [
  { id: 'feliz', label: 'feliz', emoji: '🎈', category: 'positiva' },
  { id: 'empolgacao', label: 'empolgação', emoji: '🎉', category: 'positiva' },
  { id: 'gratidao', label: 'gratidão', emoji: '💚', category: 'positiva' },
  { id: 'relaxamento', label: 'relaxamento', emoji: '🌴', category: 'tranquila' },
  { id: 'satisfacao', label: 'satisfação', emoji: '🙏', category: 'positiva' },
  { id: 'confiante', label: 'confiante', emoji: '🦁', category: 'positiva' },
  { id: 'cansaco', label: 'cansaço', emoji: '🛏️', category: 'desafio' },
  { id: 'incerteza', label: 'incerteza', emoji: '👤', category: 'desafio' },
  { id: 'tedio', label: 'tédio', emoji: '🍃', category: 'desafio' },
  { id: 'ansiedade', label: 'ansiedade', emoji: '🌩️', category: 'desafio' },
  { id: 'com_raiva', label: 'com raiva', emoji: '🌋', category: 'desafio' },
  { id: 'estresse', label: 'estresse', emoji: '⚡', category: 'desafio' },
  { id: 'triste', label: 'triste', emoji: '💧', category: 'desafio' },
  { id: 'desespero', label: 'desespero', emoji: '👐', category: 'desafio' },
  { id: 'esperanca', label: 'esperança', emoji: '🌱', category: 'positiva' },
  { id: 'em_paz', label: 'em paz', emoji: '🕊️', category: 'tranquila' },
  { id: 'amoroso', label: 'amoroso', emoji: '🥰', category: 'positiva' },
  { id: 'focado', label: 'focado', emoji: '🎯', category: 'positiva' },
]

// ==========================================
// 5. STATUS DE SONO (Régua Colorida)
// ==========================================
export const SLEEP_OPTIONS = [
  {
    value: 'bom',
    label: 'Bom sono',
    emoji: '🛌',
    color: 'bg-emerald-500 text-white',
    border: 'border-emerald-500',
  },
  {
    value: 'medio',
    label: 'Médio / Mais ou menos',
    emoji: '🛏️',
    color: 'bg-amber-500 text-white',
    border: 'border-amber-500',
  },
  {
    value: 'ruim',
    label: 'Sono ruim',
    emoji: '😫',
    color: 'bg-rose-500 text-white',
    border: 'border-rose-500',
  },
]

// ==========================================
// 6. ATIVIDADE FÍSICA (Medidor Colorido)
// ==========================================
export const PHYSICAL_ACTIVITY_OPTIONS = [
  {
    value: 'muito_otimo',
    label: 'Muito / Ótimo',
    emoji: '🏃‍♂️',
    score: 100,
    color: 'bg-emerald-500 text-white',
  },
  {
    value: 'mais_ou_menos',
    label: 'Mais ou menos',
    emoji: '🚶‍♂️',
    score: 66,
    color: 'bg-lime-500 text-white',
  },
  { value: 'pouco', label: 'Pouco', emoji: '🧘', score: 33, color: 'bg-amber-500 text-white' },
  { value: 'nada', label: 'Nada', emoji: '🛋️', score: 0, color: 'bg-slate-400 text-white' },
]

// ==========================================
// 7. ALIMENTAÇÃO (5 Níveis: Ótima -> Péssima)
// ==========================================
export const NUTRITION_OPTIONS = [
  { value: 'otima', label: 'Ótima', emoji: '🥗', score: 100, color: 'bg-emerald-600 text-white' },
  { value: 'boa', label: 'Boa', emoji: '🥑', score: 80, color: 'bg-lime-600 text-white' },
  {
    value: 'razoavel',
    label: 'Razoável',
    emoji: '🍲',
    score: 60,
    color: 'bg-amber-500 text-white',
  },
  { value: 'ruim', label: 'Ruim', emoji: '🍕', score: 40, color: 'bg-orange-500 text-white' },
  { value: 'pessima', label: 'Péssima', emoji: '🍔', score: 20, color: 'bg-rose-600 text-white' },
]

// ==========================================
// 8. SOCIAL (Amigos: Alta, Mais ou menos, Pouco, Nada)
// ==========================================
export const SOCIAL_OPTIONS = [
  { value: 'alta', label: 'Alta dedicação', emoji: '🎉', score: 100 },
  { value: 'mais_ou_menos', label: 'Mais ou menos', emoji: '☕', score: 66 },
  { value: 'pouco', label: 'Pouco convívio', emoji: '💬', score: 33 },
  { value: 'nada', label: 'Nada / Isolado', emoji: '🏠', score: 0 },
]

// ==========================================
// 9 a 15. ESCALA ALTA / MÉDIA / BAIXA
// ==========================================
export const HIGH_MED_LOW_OPTIONS = [
  { value: 'alta', label: 'Alta', emoji: '🟢', score: 100, color: 'bg-emerald-500 text-white' },
  { value: 'media', label: 'Média', emoji: '🟡', score: 60, color: 'bg-amber-500 text-white' },
  { value: 'baixa', label: 'Baixa', emoji: '🔴', score: 20, color: 'bg-rose-500 text-white' },
]

// ==========================================
// 11 ASPECTOS DA VIDA 360 (Descrições Verbatim)
// ==========================================
export type LifeAspectKey =
  | 'espiritual'
  | 'parentes'
  | 'conjugal'
  | 'filhos'
  | 'social'
  | 'saude'
  | 'servir'
  | 'intelectual'
  | 'financeiro'
  | 'profissional'
  | 'emocional'

export interface LifeAspectDefinition {
  key: LifeAspectKey
  number: number
  title: string
  description: string // Verbatim da solicitação
  emoji: string
  color: string // Cor tema
  gaugeType:
    | 'thermometer'
    | 'battery'
    | 'gauge'
    | 'steps'
    | 'ruler'
    | 'stars'
    | 'heart'
    | 'flame'
    | 'shield'
    | 'compass'
    | 'lotus'
}

export const LIFE_ASPECTS: LifeAspectDefinition[] = [
  {
    key: 'espiritual',
    number: 1,
    title: 'Espiritual',
    description:
      'Sua conexão com o seu propósito maior, fé, paz interior e valores transcendentais.',
    emoji: '🕊️',
    color: '#8b5cf6', // violet
    gaugeType: 'lotus',
  },
  {
    key: 'parentes',
    number: 2,
    title: 'Parentes',
    description:
      'A qualidade da relação, comunicação e harmonia com pais, irmãos e outros familiares de origem.',
    emoji: '👨‍👩‍👦',
    color: '#06b6d4', // cyan
    gaugeType: 'ruler',
  },
  {
    key: 'conjugal',
    number: 3,
    title: 'Conjugal',
    description:
      'O nível de companheirismo, afeto, respeito e alinhamento de futuro com o parceiro ou parceira.',
    emoji: '💍',
    color: '#ec4899', // pink
    gaugeType: 'heart',
  },
  {
    key: 'filhos',
    number: 4,
    title: 'Filhos',
    description:
      'A dedicação, tempo de qualidade, presença e o vínculo construído com os filhos (se houver).',
    emoji: '🧸',
    color: '#f59e0b', // amber
    gaugeType: 'steps',
  },
  {
    key: 'social',
    number: 5,
    title: 'Social',
    description:
      'O convívio com amigos, lazer, participação em comunidades e a qualidade da sua rede de apoio.',
    emoji: '👥',
    color: '#3b82f6', // blue
    gaugeType: 'battery',
  },
  {
    key: 'saude',
    number: 6,
    title: 'Saúde',
    description:
      'Cuidados com o corpo físico e mental, incluindo disposição, alimentação, sono e atividades físicas.',
    emoji: '🌿',
    color: '#10b981', // emerald
    gaugeType: 'thermometer',
  },
  {
    key: 'servir',
    number: 7,
    title: 'Servir (Contribuição Social)',
    description:
      'O impacto positivo gerado no mundo, dedicação ao próximo ou participação em causas sociais.',
    emoji: '🤝',
    color: '#14b8a6', // teal
    gaugeType: 'shield',
  },
  {
    key: 'intelectual',
    number: 8,
    title: 'Intelectual',
    description:
      'Busca por conhecimento contínuo, leitura, novos aprendizados e estímulo à capacidade crítica.',
    emoji: '💡',
    color: '#6366f1', // indigo
    gaugeType: 'stars',
  },
  {
    key: 'financeiro',
    number: 9,
    title: 'Financeiro',
    description:
      'Gestão do dinheiro, investimentos, reservas de segurança e a saúde das suas finanças pessoais.',
    emoji: '💎',
    color: '#059669', // green
    gaugeType: 'gauge',
  },
  {
    key: 'profissional',
    number: 10,
    title: 'Profissional',
    description:
      'Realização profissional, satisfação com a carreira atual, crescimento e alinhamento com seus talentos.',
    emoji: '🚀',
    color: '#f97316', // orange
    gaugeType: 'flame',
  },
  {
    key: 'emocional',
    number: 11,
    title: 'Emocional',
    description:
      'Autocontrole, autoconhecimento, inteligência emocional e a habilidade de lidar com estresses diários.',
    emoji: '🧠',
    color: '#a855f7', // purple
    gaugeType: 'compass',
  },
]

// ==========================================
// CÁLCULO / DERIVAÇÃO DOS 11 ASPECTOS
// ==========================================
const HIGH_MED_LOW_MAP: Record<string, number> = {
  alta: 90,
  media: 60,
  baixa: 30,
}

const NUTRITION_MAP: Record<string, number> = {
  otima: 100,
  boa: 80,
  razoavel: 60,
  ruim: 40,
  pessima: 20,
}

const SLEEP_MAP: Record<string, number> = {
  bom: 95,
  medio: 60,
  ruim: 30,
}

const PHYSICAL_MAP: Record<string, number> = {
  muito_otimo: 100,
  mais_ou_menos: 65,
  pouco: 35,
  nada: 10,
}

const SOCIAL_MAP: Record<string, number> = {
  alta: 95,
  mais_ou_menos: 65,
  pouco: 35,
  nada: 10,
}

/**
 * Converte um check-in completo nas notas 0-100 dos 11 aspectos da vida
 */
export function deriveLifeAspectsFromLog(
  log: Partial<EmotionalLog>,
): Record<LifeAspectKey, number> {
  // Se já tiver snapshot salvo no log, mescla com fallback calculado
  const custom = (log.life_aspects || {}) as Record<string, number>

  // 1. Espiritualidade (direto do status espiritualidade + bônus de paz)
  const espBase = log.spirituality_status ? (HIGH_MED_LOW_MAP[log.spirituality_status] ?? 60) : 60
  const espiritual = custom.espiritual ?? espBase

  // 2. Parentes (status família)
  const parBase = log.family_status ? (HIGH_MED_LOW_MAP[log.family_status] ?? 60) : 60
  const parentes = custom.parentes ?? parBase

  // 3. Conjugal (status esposa/esposo)
  const conjBase = log.partner_status ? (HIGH_MED_LOW_MAP[log.partner_status] ?? 60) : 60
  const conjugal = custom.conjugal ?? conjBase

  // 4. Filhos (status família + hobbies/presença ou rating direto)
  const filBase =
    custom.filhos ?? (log.family_status ? (HIGH_MED_LOW_MAP[log.family_status] ?? 65) : 65)
  const filhos = filBase

  // 5. Social (dedicação amigos)
  const socBase = log.social_status ? (SOCIAL_MAP[log.social_status] ?? 60) : 60
  const social = custom.social ?? socBase

  // 6. Saúde (combinação de sono, atividade física, alimentação e energia)
  const nutVal = log.nutrition ? (NUTRITION_MAP[log.nutrition] ?? 60) : 60
  const sleepVal = log.sleep_status ? (SLEEP_MAP[log.sleep_status] ?? 60) : 60
  const physVal = log.physical_activity ? (PHYSICAL_MAP[log.physical_activity] ?? 60) : 60
  const energyVal = log.energy_level ? (log.energy_level / 5) * 100 : 60
  const saudeCalculada = Math.round(
    nutVal * 0.25 + sleepVal * 0.25 + physVal * 0.25 + energyVal * 0.25,
  )
  const saude = custom.saude ?? saudeCalculada

  // 7. Servir (contribuição social)
  const servBase = log.service_status ? (HIGH_MED_LOW_MAP[log.service_status] ?? 60) : 60
  const servir = custom.servir ?? servBase

  // 8. Intelectual (status intelecto)
  const intBase = log.intellect_status ? (HIGH_MED_LOW_MAP[log.intellect_status] ?? 60) : 60
  const intelectual = custom.intelectual ?? intBase

  // 9. Financeiro (status financeiro)
  const finBase = log.financial_status ? (HIGH_MED_LOW_MAP[log.financial_status] ?? 60) : 60
  const financeiro = custom.financeiro ?? finBase

  // 10. Profissional (dedução via energia, hobbies, estresse ou rating direto)
  let profBase = custom.profissional
  if (profBase === undefined) {
    const stressInvert = log.stress_level ? ((6 - log.stress_level) / 5) * 100 : 60
    const energy = log.energy_level ? (log.energy_level / 5) * 100 : 60
    profBase = Math.round(stressInvert * 0.5 + energy * 0.5)
  }
  const profissional = profBase

  // 11. Emocional (humor + inverso do estresse + energia)
  let emoBase = custom.emocional
  if (emoBase === undefined) {
    const moodVal = log.mood_score ? (log.mood_score / 5) * 100 : 60
    const stressVal = log.stress_level ? ((6 - log.stress_level) / 5) * 100 : 60
    emoBase = Math.round(moodVal * 0.6 + stressVal * 0.4)
  }
  const emocional = emoBase

  return {
    espiritual: Math.max(0, Math.min(100, espiritual)),
    parentes: Math.max(0, Math.min(100, parentes)),
    conjugal: Math.max(0, Math.min(100, conjugal)),
    filhos: Math.max(0, Math.min(100, filhos)),
    social: Math.max(0, Math.min(100, social)),
    saude: Math.max(0, Math.min(100, saude)),
    servir: Math.max(0, Math.min(100, servir)),
    intelectual: Math.max(0, Math.min(100, intelectual)),
    financeiro: Math.max(0, Math.min(100, financeiro)),
    profissional: Math.max(0, Math.min(100, profissional)),
    emocional: Math.max(0, Math.min(100, emocional)),
  }
}

// ==========================================
// FILTROS TEMPORAIS: DIÁRIO, SEMANAL, MENSAL, ANUAL
// ==========================================
export type TimeScope = 'diario' | 'semanal' | 'mensal' | 'anual'

export interface AspectAverage {
  aspect: LifeAspectDefinition
  score: number // 0 a 100
  previousScore?: number
  trend: 'up' | 'down' | 'stable'
  count: number
}

export function filterLogsByScope(
  logs: EmotionalLog[],
  scope: TimeScope,
  targetDate = new Date(),
): EmotionalLog[] {
  const dStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const targetDay = dStr(targetDate)

  if (scope === 'diario') {
    return logs.filter((l) => (l.date || '').slice(0, 10) === targetDay)
  }

  if (scope === 'semanal') {
    // últimos 7 dias
    const past7 = new Date(targetDate.getTime() - 6 * 86400000)
    const startStr = dStr(past7)
    return logs.filter((l) => {
      const d = (l.date || '').slice(0, 10)
      return d >= startStr && d <= targetDay
    })
  }

  if (scope === 'mensal') {
    // últimos 30 dias
    const past30 = new Date(targetDate.getTime() - 29 * 86400000)
    const startStr = dStr(past30)
    return logs.filter((l) => {
      const d = (l.date || '').slice(0, 10)
      return d >= startStr && d <= targetDay
    })
  }

  if (scope === 'anual') {
    // últimos 365 dias
    const past365 = new Date(targetDate.getTime() - 364 * 86400000)
    const startStr = dStr(past365)
    return logs.filter((l) => {
      const d = (l.date || '').slice(0, 10)
      return d >= startStr && d <= targetDay
    })
  }

  return logs
}

/**
 * Calcula a média de cada um dos 11 aspectos para a lista de logs
 */
export function computeAspectAverages(logs: EmotionalLog[]): AspectAverage[] {
  if (logs.length === 0) {
    return LIFE_ASPECTS.map((aspect) => ({
      aspect,
      score: 0,
      trend: 'stable',
      count: 0,
    }))
  }

  const totals: Record<LifeAspectKey, number> = {
    espiritual: 0,
    parentes: 0,
    conjugal: 0,
    filhos: 0,
    social: 0,
    saude: 0,
    servir: 0,
    intelectual: 0,
    financeiro: 0,
    profissional: 0,
    emocional: 0,
  }

  logs.forEach((log) => {
    const aspects = deriveLifeAspectsFromLog(log)
    ;(Object.keys(totals) as LifeAspectKey[]).forEach((k) => {
      totals[k] += aspects[k]
    })
  })

  const count = logs.length

  return LIFE_ASPECTS.map((aspect) => {
    const avg = Math.round(totals[aspect.key] / count)
    return {
      aspect,
      score: avg,
      trend: 'stable',
      count,
    }
  })
}

/**
 * Média geral da vida 360 (todas as 11 áreas)
 */
export function computeGlobalLifeScore(averages: AspectAverage[]): number {
  if (!averages.length) return 0
  const sum = averages.reduce((acc, a) => acc + a.score, 0)
  return Math.round(sum / averages.length)
}

export function findEmotionMeta(id: string): EmotionChip {
  const found = DAYLIO_EMOTIONS.find((e) => e.id === id)
  if (found) return found
  return {
    id,
    label: id,
    emoji: '💭',
    category: 'tranquila',
  }
}

export function formatDateFriendly(dateStr: string): string {
  if (!dateStr) return ''
  const clean = dateStr.slice(0, 10)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (clean === today) return 'Hoje'

  try {
    const [y, m, d] = clean.split('-')
    const dt = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
    return dt.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return clean
  }
}

export type PeriodFilter =
  | 'diario'
  | 'semanal'
  | 'mensal'
  | 'anual'
  | 'day'
  | 'week'
  | 'month'
  | 'year'

export function filterLogsByPeriod(
  logs: EmotionalLog[],
  period: PeriodFilter,
  targetDate = new Date(),
): EmotionalLog[] {
  const scopeMap: Record<PeriodFilter, TimeScope> = {
    diario: 'diario',
    day: 'diario',
    semanal: 'semanal',
    week: 'semanal',
    mensal: 'mensal',
    month: 'mensal',
    anual: 'anual',
    year: 'anual',
  }
  return filterLogsByScope(logs, scopeMap[period] || 'mensal', targetDate)
}
