import { useEffect, useState } from 'react'
import { searchActiveIngredients, type IngredientSuggestion } from '@/lib/openfda'

/**
 * Consulta o princípio ativo no OpenFDA enquanto o usuário digita o nome do remédio.
 * Debounce de 400ms; com menos de 3 letras não consulta. Falha não bloqueia o cadastro.
 */
export function useActiveIngredientSearch(query: string) {
  const [results, setResults] = useState<IngredientSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const term = query.trim()
    if (term.length < 3) {
      setResults([])
      setLoading(false)
      setFailed(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const list = await searchActiveIngredients(term, controller.signal)
        setResults(list)
        setFailed(false)
      } catch (_) {
        if (controller.signal.aborted) return
        setResults([])
        setFailed(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, loading, failed }
}
