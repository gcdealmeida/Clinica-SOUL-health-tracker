import { useEffect, useState } from 'react'
import { ClientFeedEvent } from '@/lib/clientFeed'
import { fetchClientFeed } from '@/services/clientFeed'

/** Intervalo do "tempo real": o feed é recarregado periodicamente. */
export const FEED_POLL_MS = 30000

/**
 * Carrega o feed dos clientes e o atualiza a cada `pollMs`.
 * `perSource` define quantos registros recentes são lidos de cada coleção.
 */
export function useClientFeed(perSource: number, pollMs: number = FEED_POLL_MS) {
  const [events, setEvents] = useState<ClientFeedEvent[]>([])
  const [exhausted, setExhausted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetchClientFeed(perSource)
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
  }, [perSource, pollMs])

  return { events, exhausted, loading, error }
}
