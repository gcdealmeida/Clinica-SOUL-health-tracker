/**
 * Modelo e funções puras do feed de atualizações dos clientes (visão do profissional).
 * Não acessa o banco: a busca fica em src/services/clientFeed.ts.
 */

/** "Programa": de onde vem a atualização (coleção de origem agrupada). */
export type FeedGroup =
  | 'monitoramento'
  | 'alimentacao'
  | 'dieta'
  | 'emocional'
  | 'exames'
  | 'lembretes'

export const FEED_GROUP_LABELS: Record<FeedGroup, string> = {
  monitoramento: 'Monitoramento (medidas)',
  alimentacao: 'Refeições',
  dieta: 'Dietas prescritas',
  emocional: 'Diário emocional',
  exames: 'Exames',
  lembretes: 'Lembretes',
}

export const METRIC_LABELS: Record<string, string> = {
  agua: 'Água',
  cafe: 'Café',
  sono: 'Sono',
  hrv: 'HRV',
  atividade: 'Atividade física',
  pressao: 'Pressão',
  peso: 'Peso',
  glicemia: 'Glicemia',
  saturacao: 'Saturação',
  remedio: 'Remédio',
  alcool: 'Álcool',
  sauna: 'Sauna',
  meditacao: 'Meditação',
  outro: 'Outro',
  sintoma: 'Sintoma',
}

export interface ClientFeedEvent {
  id: string
  group: FeedGroup
  /** Tipo de atualização (chave estável usada pelo filtro). */
  kind: string
  kindLabel: string
  clientId: string
  clientName: string
  summary: string
  /** Momento do registro (campo created do PocketBase). */
  at: Date
}

export interface FeedFilters {
  /** Dia no formato AAAA-MM-DD (fuso local). Vazio = todos. */
  day: string
  clientId: string
  group: string
  kind: string
}

export const EMPTY_FEED_FILTERS: FeedFilters = { day: '', clientId: '', group: '', kind: '' }

/** Chave AAAA-MM-DD no fuso local. */
export function localDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatEventTime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function filterClientFeed(events: ClientFeedEvent[], f: FeedFilters): ClientFeedEvent[] {
  return events.filter(
    (e) =>
      (!f.day || localDayKey(e.at) === f.day) &&
      (!f.clientId || e.clientId === f.clientId) &&
      (!f.group || e.group === f.group) &&
      (!f.kind || e.kind === f.kind),
  )
}

/** Clientes presentes no feed carregado, ordenados por nome. */
export function feedClientOptions(events: ClientFeedEvent[]): { id: string; name: string }[] {
  const map = new Map<string, string>()
  for (const e of events) map.set(e.clientId, e.clientName)
  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, 'pt-BR'),
  )
}

/** Tipos de atualização presentes no feed carregado (água, pressão, refeições…). */
export function feedKindOptions(events: ClientFeedEvent[]): { value: string; label: string }[] {
  const map = new Map<string, string>()
  for (const e of events) map.set(e.kind, e.kindLabel)
  return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR'),
  )
}
