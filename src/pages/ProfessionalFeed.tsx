import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { useClientFeed } from '@/hooks/use-client-feed'
import {
  EMPTY_FEED_FILTERS,
  FeedFilters,
  feedClientOptions,
  feedKindOptions,
  filterClientFeed,
} from '@/lib/clientFeed'
import { ClientFeedFilters } from '@/components/professional/ClientFeedFilters'
import { ClientFeedList } from '@/components/professional/ClientFeedList'

const PAGE_STEP = 50
const MAX_PER_SOURCE = 500

/** Feed completo das atualizações dos clientes, com filtros à esquerda e rolagem infinita. */
export default function ProfessionalFeedPage() {
  const [perSource, setPerSource] = useState(PAGE_STEP)
  const [filters, setFilters] = useState<FeedFilters>(EMPTY_FEED_FILTERS)
  const { events, exhausted, loading, error } = useClientFeed(perSource)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const hasMore = !exhausted && perSource < MAX_PER_SOURCE

  const filtered = useMemo(() => filterClientFeed(events, filters), [events, filters])
  const clients = useMemo(() => feedClientOptions(events), [events])
  const kinds = useMemo(() => feedKindOptions(events), [events])

  // Rolagem infinita: ao chegar no fim da lista, pede mais registros de cada coleção.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loading) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPerSource((p) => Math.min(p + PAGE_STEP, MAX_PER_SOURCE))
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, events.length])

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <div className="flex flex-col gap-2 border-b pb-4">
          <Link
            to="/profissional"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Painel do profissional
          </Link>
          <h1 className="font-display text-3xl font-semibold text-foreground">Feed dos Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Tudo o que os clientes registram, do mais recente ao mais antigo · atualiza a cada 30
            segundos
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside aria-label="Filtros do feed" className="lg:col-span-3 h-fit lg:sticky lg:top-4">
            <ClientFeedFilters
              filters={filters}
              onChange={setFilters}
              clients={clients}
              kinds={kinds}
            />
          </aside>

          <section aria-label="Atualizações" className="lg:col-span-9 space-y-4">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {loading
                ? 'Carregando atualizações...'
                : error && events.length === 0
                  ? 'Não foi possível carregar o feed agora.'
                  : `${filtered.length} atualização(ões) exibida(s)`}
            </p>

            {!loading && (
              <ClientFeedList
                events={filtered}
                emptyMessage="Nenhuma atualização corresponde aos filtros."
              />
            )}

            {hasMore && !loading && (
              <div className="flex flex-col items-center gap-2">
                <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setPerSource((p) => Math.min(p + PAGE_STEP, MAX_PER_SOURCE))}
                >
                  Carregar mais atualizações
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
