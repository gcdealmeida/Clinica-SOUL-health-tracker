/**
 * Busca de princípio ativo na API pública OpenFDA (sem chave).
 * Chamada direta do frontend, sem proxy no backend.
 */

export interface IngredientSuggestion {
  label: string // nome comercial/genérico encontrado
  activeIngredient: string // princípio ativo (active_ingredient do rótulo)
}

const ENDPOINT = 'https://api.fda.gov/drug/label.json'

/** Procura rótulos por brand_name/generic_name começando com o texto digitado. */
export async function searchActiveIngredients(
  term: string,
  signal?: AbortSignal,
): Promise<IngredientSuggestion[]> {
  const words = term
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
  if (words.length === 0) return []

  const search = words
    .map((w) => `(openfda.brand_name:${w}* OR openfda.generic_name:${w}*)`)
    .join(' AND ')
  const url = `${ENDPOINT}?search=${encodeURIComponent(search)}&limit=10`

  const res = await fetch(url, { signal })
  if (res.status === 404) return [] // nenhum rótulo encontrado
  if (!res.ok) throw new Error(`OpenFDA respondeu ${res.status}`)

  const data = await res.json()
  const out: IngredientSuggestion[] = []
  const seen = new Set<string>()
  for (const r of data?.results ?? []) {
    const ingredient = Array.isArray(r?.active_ingredient) ? r.active_ingredient[0] : undefined
    const label = r?.openfda?.brand_name?.[0] ?? r?.openfda?.generic_name?.[0]
    if (!ingredient || !label) continue
    const activeIngredient = String(ingredient).trim().slice(0, 160)
    const key = `${label}|${activeIngredient}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ label: String(label), activeIngredient })
    if (out.length >= 5) break
  }
  return out
}
