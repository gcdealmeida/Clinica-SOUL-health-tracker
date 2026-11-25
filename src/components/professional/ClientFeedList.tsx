import { Badge } from '@/components/ui/badge'
import { ClientFeedEvent, FEED_GROUP_LABELS, formatEventTime } from '@/lib/clientFeed'

interface ClientFeedListProps {
  events: ClientFeedEvent[]
  emptyMessage: string
}

/** Lista cronológica (mais recente primeiro) das atualizações dos clientes. */
export function ClientFeedList({ events, emptyMessage }: ClientFeedListProps) {
  if (events.length === 0) {
    return (
      <p className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ol className="space-y-2">
      {events.map((e) => (
        <li
          key={e.id}
          className="p-3 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center gap-2 text-xs"
        >
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">{e.clientName}</span>
              <Badge variant="secondary" className="text-[10px]">
                {e.kindLabel}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {FEED_GROUP_LABELS[e.group]}
              </span>
            </div>
            {e.summary && <p className="text-foreground/90 break-words">{e.summary}</p>}
          </div>
          <time
            dateTime={e.at.toISOString()}
            className="text-[11px] text-muted-foreground shrink-0"
          >
            {formatEventTime(e.at)}
          </time>
        </li>
      ))}
    </ol>
  )
}
