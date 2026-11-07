import pb from '@/lib/pocketbase/client'

/**
 * Busca rápida de medicamentos brasileiros (nome comercial + princípio ativo).
 *
 * Chama a rota POST /backend/v1/meds/search do pb_hook med-search.js, que
 * consulta o dataset aberto da ANVISA (registros ativos de medicamentos) com
 * fallback para a OpenFDA. Rodar via backend evita CORS e permite cachear o
 * índice da ANVISA em memória no servidor.
 */

export interface IngredientSuggestion {
  label: string // nome comercial/genérico encontrado
  activeIngredient: string // princípio ativo
  category?: string // categoria regulatória (Genérico, Similar, Referência...)
  source?: string // fonte da resposta: "anvisa" | "openfda" | "none"
}

interface MedSearchResponse {
  source?: string
  results?: Array<{
    label?: string
    activeIngredient?: string
    category?: string
  }>
}

/** Busca pelo nome do remédio; falha de rede devolve lista vazia (não bloqueia o cadastro). */
export async function searchActiveIngredients(
  term: string,
  signal?: AbortSignal,
): Promise<IngredientSuggestion[]> {
  const clean = term.trim()
  if (clean.length < 3) return []

  const res = await pb.send('/backend/v1/meds/search', {
    method: 'POST',
    body: JSON.stringify({ term: clean }),
    signal,
  })

  const data = res as MedSearchResponse
  const list = Array.isArray(data?.results) ? data.results : []
  const out: IngredientSuggestion[] = []
  const seen = new Set<string>()
  for (const r of list) {
    const label = String(r?.label ?? '').trim()
    const active = String(r?.activeIngredient ?? '').trim()
    if (!label || !active) continue
    const key = `${label}|${active}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      label,
      activeIngredient: active,
      category: r?.category ? String(r.category) : undefined,
      source: data?.source,
    })
    if (out.length >= 5) break
  }
  return out
}
