import { useEffect, useState } from 'react'
import { ClientFeedEvent } from '@/lib/clientFeed'
import { fetchClientFeed } from '@/services/clientFeed'

/** Intervalo do "tempo real": o feed é recarregado periodicamente. */
export const FEED_POLL_MS = 30000

/** Estabiliza o instante "desde" entre renders (evita recarga a cada mudança de ms). */
function sinceKey(since: Date | null): number | null {
  if (!since) return null
  return Math.floor(since.getTime() / 60000)
}

/**
 * Carrega o feed dos clientes e o atualiza a cada `pollMs`.
 * `perSource` define quantos registros recentes são lidos de cada coleção;
 * `since` é aplicado como filtro real no banco (created >= since) e `kinds`
 * como filtro real por tipo (múltipla escolha) em cada coleção de origem.
 */
export function useClientFeed(
  perSource: number,
  since?: Date | null,
  pollMs: number = FEED_POLL_MS,
  kinds: string[] = [],
  clientId?: string,
) {
  const [events, setEvents] = useState<ClientFeedEvent[]>([])
  const [exhausted, setExhausted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const key = sinceKey(since)
  const kindsKey = [...kinds].sort().join(',')

  useEffect(() => {
    let active = true
    // Filtro de intervalo real: recarrega com o "created >= ..." da data/período ativo.
    const sinceDate = since ?? null

    const load = async () => {
      try {
        const res = await fetchClientFeed({ perSource, since: sinceDate, kinds, clientId })
        if (!active) return
        setEvents(res.events)
        setExhausted(res.exhausted)
        setError(false)
      } catch (err) {
        console.error(err)
        if (active) setError(true)
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    const id = window.setInterval(load, pollMs)
    return () => {
      active = false
      window.clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perSource, pollMs, key, kindsKey, clientId])

  return { events, exhausted, loading, error }
}
