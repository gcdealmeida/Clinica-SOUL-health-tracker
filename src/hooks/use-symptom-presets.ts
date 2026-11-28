import { useMemo } from 'react'
import { HealthMetric, HealthCategory } from '@/types'

export interface SymptomPreset {
  label: string
  sublabel: string
  textValue: string
  numericValue: number
  severity: number
  notes?: string
}

/** Normaliza um texto de sintoma em uma chave canônica para contagem de frequência. */
export function normalizeSymptomKey(text: string): string {
  const trimmed = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (!trimmed) return ''

  // Remove prefixos comuns para agrupar variações do mesmo sintoma
  return trimmed
    .replace(/^(dor de|dor no|dor na|sensacao de|ataque de|crise de|episodio de)\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca os sintomas mais frequentes do usuário (category='sintoma') e retorna
 * até 5 opções pré-prontas, ordenadas da mais para a menos registrada.
 */
export async function fetchTopSymptomPresets(count = 5): Promise<SymptomPreset[]> {
  const { healthService } = await import('@/services/health')
  const all = await healthService.listAllSymptomMetrics()
  return buildTopSymptomPresets(all, count)
}

/**
 * Computa as opções pré-prontas a partir do histórico de sintomas, mantendo as
 * funções puras separadas (para testes) da busca de dados (efeito).
 */
export function buildTopSymptomPresets(history: HealthMetric[], count = 5): SymptomPreset[] {
  type Acc = { text: string; count: number; lastSeverity: number; lastNotes?: string }
  const byKey = new Map<string, Acc>()

  for (const metric of history) {
    const symptomName = (metric.text_value ?? '').trim()
    if (!symptomName) continue
    const key = normalizeSymptomKey(symptomName)
    if (!key) continue

    const prev = byKey.get(key)
    if (prev) {
      prev.count += 1
      if (metric.numeric_value !== undefined && metric.numeric_value !== null) {
        prev.lastSeverity = Math.round(metric.numeric_value)
      }
      if (metric.notes) prev.lastNotes = metric.notes
    } else {
      byKey.set(key, {
        text: symptomName,
        count: 1,
        lastSeverity:
          metric.numeric_value !== undefined && metric.numeric_value !== null
            ? Math.round(metric.numeric_value)
            : 5,
        lastNotes: metric.notes,
      })
    }
  }

  const sorted = [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.text.localeCompare(b.text),
  )

  return sorted.slice(0, count).map((item) => ({
    label: item.text,
    sublabel: `Registrado ${item.count}× • severidade ${item.lastSeverity}/10`,
    textValue: item.text,
    numericValue: item.lastSeverity,
    severity: item.lastSeverity,
    notes: item.lastNotes,
  }))
}

/** Opções padrão (cliente sem histórico de sintomas) — no máximo 5. */
export const DEFAULT_SYMPTOM_PRESETS: SymptomPreset[] = [
  {
    label: 'Dor de cabeça',
    sublabel: 'Cefaleia / enxaqueca',
    textValue: 'Dor de cabeça',
    numericValue: 4,
    severity: 4,
  },
  {
    label: 'Enjoo / Náusea',
    sublabel: 'Desconforto estomacal',
    textValue: 'Enjoo / Náusea',
    numericValue: 4,
    severity: 4,
  },
  {
    label: 'Cansaço / Fadiga',
    sublabel: 'Falta de energia',
    textValue: 'Cansaço / Fadiga',
    numericValue: 5,
    severity: 5,
  },
  {
    label: 'Ansiedade',
    sublabel: 'Tensão / nervosismo',
    textValue: 'Ansiedade',
    numericValue: 4,
    severity: 4,
  },
  {
    label: 'Insônia',
    sublabel: 'Dificuldade para dormir',
    textValue: 'Insônia',
    numericValue: 5,
    severity: 5,
  },
]

/** Opções pré-prontas finais: personalizadas (top 5) ou padrão quando não há histórico. */
export function useSymptomPresets(
  history: HealthMetric[],
  category: HealthCategory,
  count = 5,
): SymptomPreset[] {
  return useMemo(() => {
    if (category !== 'sintoma') return []
    const custom = buildTopSymptomPresets(history, count)
    return custom.length > 0 ? custom : DEFAULT_SYMPTOM_PRESETS
  }, [history, category, count])
}
