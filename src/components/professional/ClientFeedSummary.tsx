import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useClientFeed } from '@/hooks/use-client-feed'
import { ClientFeedList } from '@/components/professional/ClientFeedList'

const SUMMARY_SIZE = 12

/** Resumo do feed (últimas atualizações dos clientes) para o painel do profissional. */
export function ClientFeedSummary() {
  const { events, loading, error } = useClientFeed(SUMMARY_SIZE + 3)
  const latest = events.slice(0, SUMMARY_SIZE)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="font-display text-lg">Atualizações dos clientes</CardTitle>
          <CardDescription className="text-xs">
            Últimos registros de todos os clientes · atualiza a cada 30 segundos
          </CardDescription>
        </div>
        <Button asChild size="sm" variant="outline" className="text-xs">
          <Link to="/profissional/feed">Feed dos Clientes</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-6 text-xs text-muted-foreground">
            Carregando atualizações...
          </p>
        ) : error && events.length === 0 ? (
          <p role="alert" className="text-center py-6 text-xs text-destructive">
            Não foi possível carregar o feed agora.
          </p>
        ) : latest.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground">
            Nenhuma atualização dos clientes registrada ainda.
          </p>
        ) : (
          <ClientFeedList events={latest} />
        )}
      </CardContent>
    </Card>
  )
}
