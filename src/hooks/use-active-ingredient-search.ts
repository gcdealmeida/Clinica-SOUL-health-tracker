import { useEffect, useState } from 'react'
import { searchActiveIngredients, type IngredientSuggestion } from '@/lib/med-search'

/**
 * Busca o princípio ativo enquanto o usuário digita o nome do remédio.
 * Consulta o backend (dataset aberto da ANVISA, fallback OpenFDA) com debounce
 * de 400ms; com menos de 3 letras não consulta. Falha não bloqueia o cadastro.
 */
export function useActiveIngredientSearch(query: string) {
  const [results, setResults] = useState<IngredientSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [source, setSource] = useState('')

  useEffect(() => {
    const term = query.trim()
    if (term.length < 3) {
      setResults([])
      setLoading(false)
      setFailed(false)
      setSource('')
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const list = await searchActiveIngredients(term, controller.signal)
        setResults(list)
        setFailed(false)
        setSource(list[0]?.source ?? '')
      } catch (_) {
        if (controller.signal.aborted) return
        setResults([])
        setFailed(true)
        setSource('')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, loading, failed, source }
}
