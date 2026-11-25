import { useEffect, useMemo, useRef, useState } from 'react'
import { Navbar } from '@/components/Navbar'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientFeedFilters } from '@/components/professional/ClientFeedFilters'
import { ClientFeedList } from '@/components/professional/ClientFeedList'
import {
  EMPTY_FEED_FILTERS,
  FeedFilters,
  feedRangeLabel,
  feedSinceDate,
  filterClientFeed,
  normalizePeriodDay,
} from '@/lib/clientFeed'
import { useClientFeed } from '@/hooks/use-client-feed'

const PAGE_SIZE = 20
const PER_SOURCE = 120

/**
 * Feed dos Clientes: sidebar compacta de filtros à esquerda (período, calendário,
 * cliente, programa e tipos) e a lista de atualizações à direita, com rolagem
 * infinita dentro do intervalo filtrado.
 */
export default function ProfessionalFeedPage() {
  const [filters, setFilters] = useState<FeedFilters>(EMPTY_FEED_FILTERS)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const since = useMemo(() => feedSinceDate(filters), [filters])
  const kinds = useMemo(() => filters.kinds, [filters.kinds.join(',')])
  const { events, exhausted, loading, error } = useClientFeed(PER_SOURCE, since, undefined, kinds)

  const filtered = useMemo(() => filterClientFeed(events, filters), [events, filters])

  // Novo filtro ou novo lote de dados: volta ao topo da lista paginada.
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [filters, events])

  // Rolagem infinita dentro do intervalo filtrado.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !exhausted && visible < filtered.length) {
          setVisible((v) => v + PAGE_SIZE)
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [exhausted, visible, filtered.length])

  const clients = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of events) map.set(e.clientId, e.clientName)
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR'),
    )
  }, [events])

  const changeFilters = (next: FeedFilters) =>
    setFilters((prev) => ({ ...prev, ...normalizePeriodDay(next) }))

  const rangeLabel = feedRangeLabel(filters)

  return (
    <div className="min-h-dvh bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Feed dos Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as atualizações lançadas pelos clientes no Health Tracker.
          </p>
        </header>

        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Sidebar de filtros compacta (colapsa para o topo em telas pequenas) */}
          <aside
            className="w-full md:w-60 md:shrink-0 md:sticky md:top-20"
            aria-label="Filtros do feed"
          >
            <ClientFeedFilters filters={filters} onChange={changeFilters} clients={clients} />
          </aside>

          {/* Lista de atualizações */}
          <section aria-label="Atualizações dos clientes">
            {rangeLabel && (
              <p className="mb-3 text-xs text-muted-foreground" role="status">
                Mostrando atualizações de: <span className="font-medium">{rangeLabel}</span>
              </p>
            )}

            {loading && events.length === 0 ? (
              <div className="space-y-3" aria-busy="true" aria-label="Carregando atualizações">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Não foi possível carregar o feed. Tente novamente em instantes.
              </p>
            ) : filtered.length === 0 ? (
              <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                Nenhuma atualização encontrada com os filtros atuais.
              </p>
            ) : (
              <>
                <ClientFeedList events={filtered.slice(0, visible)} />
                {visible < filtered.length && (
                  <div ref={sentinelRef} className="h-8" aria-hidden="true" />
                )}
                {visible >= filtered.length && !exhausted && filtered.length > 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    Role para carregar mais — o intervalo filtrado é buscado no servidor.
                  </p>
                )}
                {visible >= filtered.length && exhausted && filtered.length > 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">
                    Você chegou ao fim das atualizações deste intervalo.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
