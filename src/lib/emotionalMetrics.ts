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
