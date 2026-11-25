import { CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EMPTY_FEED_FILTERS,
  FEED_GROUP_LABELS,
  FEED_KIND_CATALOG,
  FEED_PERIOD_OPTIONS,
  FeedFilters,
  FeedGroup,
  localDayKey,
} from '@/lib/clientFeed'

interface ClientFeedFiltersProps {
  filters: FeedFilters
  onChange: (next: FeedFilters) => void
  clients: { id: string; name: string }[]
}

const GROUP_IDS = Object.keys(FEED_GROUP_LABELS) as FeedGroup[]

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  )
}

/**
 * Sidebar compacta de filtros (estilo marketplace): Período, Data (calendário),
 * Cliente, Programa e Tipos de atualização, empilhados à esquerda.
 */
export function ClientFeedFilters({ filters, onChange, clients }: ClientFeedFiltersProps) {
  const set = (patch: Partial<FeedFilters>) => onChange({ ...filters, ...patch })

  const toggleKind = (value: string) => {
    set({ kind: filters.kind === value ? '' : value })
  }

  const hasAnyFilter = Boolean(
    filters.day || filters.period || filters.clientId || filters.group || filters.kind,
  )

  const selectedDate = filters.day
    ? (() => {
        const [y, m, d] = filters.day.split('-').map(Number)
        return new Date(y, m - 1, d)
      })()
    : undefined

  const kindsByGroup = new Map<FeedGroup, typeof FEED_KIND_CATALOG>()
  for (const item of FEED_KIND_CATALOG) {
    const list = kindsByGroup.get(item.group) ?? []
    list.push(item)
    kindsByGroup.set(item.group, list)
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-foreground">Filtros</h2>
        {hasAnyFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => onChange(EMPTY_FEED_FILTERS)}
          >
            <X className="h-3 w-3 mr-1" aria-hidden="true" />
            Limpar
          </Button>
        )}
      </div>

      {/* Período: 24h / 48h / 1 semana */}
      <FilterSection title="Período">
        <div className="flex flex-col gap-1.5" role="group" aria-label="Período do feed">
          {FEED_PERIOD_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer hover:bg-accent/50 focus-within:outline-none focus-within:ring-1 focus-within:ring-ring"
            >
              <input
                type="radio"
                name="feed-period"
                className="sr-only"
                checked={filters.period === opt.value}
                onChange={() => set({ period: filters.period === opt.value ? '' : opt.value })}
              />
              <span
                aria-hidden="true"
                className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  filters.period === opt.value ? 'border-primary' : 'border-muted-foreground/40'
                }`}
              >
                {filters.period === opt.value && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </span>
              {opt.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Data: escolha pelo calendário (sem digitação) */}
      <FilterSection title="Data">
        <div className="flex flex-col gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left text-xs font-normal h-9"
                aria-label={
                  filters.day
                    ? `Data selecionada: ${format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}. Alterar`
                    : 'Escolher data no calendário'
                }
              >
                <CalendarIcon
                  className="mr-2 h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                {filters.day
                  ? format(selectedDate!, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Escolher data no calendário'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  set({ day: date ? localDayKey(date) : '' })
                }}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {filters.day && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7 px-2 w-fit text-muted-foreground hover:text-foreground"
              onClick={() => set({ day: '' })}
            >
              <X className="h-3 w-3 mr-1" aria-hidden="true" />
              Limpar data
            </Button>
          )}
        </div>
      </FilterSection>

      {/* Cliente */}
      <FilterSection title="Cliente">
        <Select value={filters.clientId} onValueChange={(v) => set({ clientId: v })}>
          <SelectTrigger className="h-9 text-xs" aria-label="Filtrar por cliente">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      {/* Programa */}
      <FilterSection title="Programa">
        <Select value={filters.group} onValueChange={(v) => set({ group: v })}>
          <SelectTrigger className="h-9 text-xs" aria-label="Filtrar por programa">
            <SelectValue placeholder="Todos os programas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os programas</SelectItem>
            {GROUP_IDS.map((g) => (
              <SelectItem key={g} value={g}>
                {FEED_GROUP_LABELS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterSection>

      {/* Tipos de atualização: tudo que o cliente lança no painel */}
      <FilterSection title="Tipos de atualização">
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {[...kindsByGroup.entries()].map(([group, kinds]) => (
            <div key={group} className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {FEED_GROUP_LABELS[group]}
              </p>
              {kinds.map((k) => (
                <div key={k.value} className="flex items-center gap-2 px-1">
                  <Checkbox
                    id={`feed-kind-${k.value}`}
                    checked={filters.kind === k.value}
                    onCheckedChange={() => toggleKind(k.value)}
                    className="h-3.5 w-3.5"
                  />
                  <Label
                    htmlFor={`feed-kind-${k.value}`}
                    className="text-xs font-normal cursor-pointer leading-tight"
                  >
                    {k.label}
                  </Label>
                </div>
              ))}
            </div>
          ))}
        </div>
      </FilterSection>
    </div>
  )
}
