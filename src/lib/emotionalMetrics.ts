import { EmotionalLog } from '@/types'
import { LifeAspectKey, LIFE_ASPECTS, deriveLifeAspectsFromLog } from './emotionalDaylio'

export interface RadarDataPoint {
  aspect: string
  score: number
  fullMark: number
}

export function buildRadarData(logs: EmotionalLog[]): RadarDataPoint[] {
  if (!logs.length) {
    return LIFE_ASPECTS.map((a) => ({
      aspect: a.title.split(' ')[0],
      score: 0,
      fullMark: 100,
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
    const asp = deriveLifeAspectsFromLog(log)
    ;(Object.keys(totals) as LifeAspectKey[]).forEach((k) => {
      totals[k] += asp[k]
    })
  })

  return LIFE_ASPECTS.map((a) => ({
    aspect: a.title.split(' ')[0],
    score: Math.round(totals[a.key] / logs.length),
    fullMark: 100,
  }))
}

export interface AspectTimelinePoint {
  date: string
  label: string
  scores: Record<LifeAspectKey, number>
}

export function buildTimelinePoints(logs: EmotionalLog[], limit = 14): AspectTimelinePoint[] {
  const sorted = [...logs].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const recent = sorted.slice(-limit)

  return recent.map((log) => {
    const scores = deriveLifeAspectsFromLog(log)
    const d = (log.date || '').slice(5, 10) // MM-DD
    return {
      date: log.date,
      label: d,
      scores,
    }
  })
}

export interface EmotionalScoreSummary {
  hasData: boolean
  score: number // 0 a 10 (ex: 8.4)
  level: string
  color: string
  ringClass: string
  bgClass: string
  checkinsCount: number
  lastCheckinDate?: string
  aspectsAverage?: number // 0 a 100
}

/**
 * Calcula o Score do Diário Emocional (0 a 10) para o perfil/dashboard.
 * Fórmula simples e ilustrativa:
 * - Pondera os check-ins mais recentes (últimos 7 dias ou até 7 check-ins disponíveis)
 * - Humor normalizado (1-5 -> 0-10)
 * - Energia normalizada (1-5 -> 0-10)
 * - Estresse invertido (1-5 -> 0-10, onde menor estresse = nota maior)
 * - Vida 360º (se existirem aspectos avaliados nos logs, média 0-100 convertida para 0-10)
 */
export function computeEmotionalScore(logs: EmotionalLog[]): EmotionalScoreSummary {
  if (!logs || logs.length === 0) {
    return {
      hasData: false,
      score: 0,
      level: 'Sem registros',
      color: '#94a3b8',
      ringClass: 'text-slate-400',
      bgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300',
      checkinsCount: 0,
    }
  }

  // Ordena por data decrescente
  const sorted = [...logs].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  // Pega os check-ins mais recentes (até 7)
  const recent = sorted.slice(0, 7)

  let sumDailyScore = 0
  let countDaily = 0
  let sumLifeAspects = 0
  let countLifeAspects = 0

  recent.forEach((log) => {
    // Componente diário: humor (50%), energia (25%), estresse invertido (25%)
    let dailyParts = 0
    let dailyWeight = 0

    if (typeof log.mood_score === 'number' && log.mood_score > 0) {
      // 1..5 normalizado para 0..10 => (score / 5) * 10
      const moodNorm = (Math.min(5, Math.max(1, log.mood_score)) / 5) * 10
      dailyParts += moodNorm * 0.5
      dailyWeight += 0.5
    }

    if (typeof log.energy_level === 'number' && log.energy_level > 0) {
      const energyNorm = (Math.min(5, Math.max(1, log.energy_level)) / 5) * 10
      dailyParts += energyNorm * 0.25
      dailyWeight += 0.25
    }

    if (typeof log.stress_level === 'number' && log.stress_level > 0) {
      // Menor estresse = maior bem-estar: 1 => 10, 5 => 2
      const stressNorm = ((6 - Math.min(5, Math.max(1, log.stress_level))) / 5) * 10
      dailyParts += stressNorm * 0.25
      dailyWeight += 0.25
    }

    if (dailyWeight > 0) {
      sumDailyScore += dailyParts / dailyWeight
      countDaily += 1
    }

    // Aspectos da Vida 360º deste log
    const aspects = deriveLifeAspectsFromLog(log)
    const aspectValues = Object.values(aspects)
    if (aspectValues.length > 0) {
      const avg = aspectValues.reduce((acc, v) => acc + v, 0) / aspectValues.length
      sumLifeAspects += avg // 0..100
      countLifeAspects += 1
    }
  })

  const dailyAvg = countDaily > 0 ? sumDailyScore / countDaily : 7
  const lifeAvg = countLifeAspects > 0 ? sumLifeAspects / countLifeAspects / 10 : dailyAvg

  // Combinação equilibrada: 50% média diária recente (humor/energia/estresse) + 50% Vida 360º
  const rawScore = dailyAvg * 0.5 + lifeAvg * 0.5
  // Limita em [0, 10] e arredonda para 1 casa decimal
  const finalScore = Math.max(0, Math.min(10, Math.round(rawScore * 10) / 10))

  let level = 'Equilibrado'
  let color = '#10b981' // emerald-500
  let ringClass = 'text-emerald-500'
  let bgClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'

  if (finalScore >= 8.5) {
    level = 'Excelente'
    color = '#059669' // emerald-600
    ringClass = 'text-emerald-600'
    bgClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
  } else if (finalScore >= 7.0) {
    level = 'Muito Bom'
    color = '#10b981' // emerald-500
    ringClass = 'text-emerald-500'
    bgClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  } else if (finalScore >= 5.5) {
    level = 'Moderado'
    color = '#eab308' // yellow-500
    ringClass = 'text-yellow-500'
    bgClass = 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300'
  } else if (finalScore >= 4.0) {
    level = 'Atenção'
    color = '#f97316' // orange-500
    ringClass = 'text-orange-500'
    bgClass = 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
  } else {
    level = 'Crítico'
    color = '#ef4444' // red-500
    ringClass = 'text-rose-500'
    bgClass = 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
  }

  return {
    hasData: true,
    score: finalScore,
    level,
    color,
    ringClass,
    bgClass,
    checkinsCount: logs.length,
    lastCheckinDate: sorted[0]?.date,
    aspectsAverage:
      countLifeAspects > 0 ? Math.round(sumLifeAspects / countLifeAspects) : undefined,
  }
}
