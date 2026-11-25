import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EMPTY_FEED_FILTERS, FEED_GROUP_LABELS, FeedFilters, FeedGroup } from '@/lib/clientFeed'

interface ClientFeedFiltersProps {
  filters: FeedFilters
  onChange: (next: FeedFilters) => void
  clients: { id: string; name: string }[]
  kinds: { value: string; label: string }[]
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

const GROUP_IDS = Object.keys(FEED_GROUP_LABELS) as FeedGroup[]

/** Filtros do feed (dia, cliente, programa, tipo de atualização). */
export function ClientFeedFilters({ filters, onChange, clients, kinds }: ClientFeedFiltersProps) {
  const set = (patch: Partial<FeedFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-display text-base font-semibold text-foreground">Filtros</h2>

      <div className="space-y-1.5">
        <Label htmlFor="feed-day" className="text-xs">
          Dia
        </Label>
        <Input
          id="feed-day"
          type="date"
          value={filters.day}
          onChange={(e) => set({ day: e.target.value })}
          className="text-xs h-9"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feed-client" className="text-xs">
          Cliente
        </Label>
        <select
          id="feed-client"
          value={filters.clientId}
          onChange={(e) => set({ clientId: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feed-group" className="text-xs">
          Programa
        </Label>
        <select
          id="feed-group"
          value={filters.group}
          onChange={(e) => set({ group: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os programas</option>
          {GROUP_IDS.map((g) => (
            <option key={g} value={g}>
              {FEED_GROUP_LABELS[g]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feed-kind" className="text-xs">
          Tipo de atualização
        </Label>
        <select
          id="feed-kind"
          value={filters.kind}
          onChange={(e) => set({ kind: e.target.value })}
          className={selectClass}
        >
          <option value="">Todos os tipos</option>
          {kinds.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs w-full"
        onClick={() => onChange(EMPTY_FEED_FILTERS)}
      >
        Limpar filtros
      </Button>
    </div>
  )
}
