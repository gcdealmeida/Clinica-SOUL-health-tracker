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
  monitoramento: 'Monitoramento',
  alimentacao: 'Refeições',
  dieta: 'Diário alimentar',
  emocional: 'Diário emocional',
  exames: 'Exames',
  lembretes: 'Lembretes',
}

/** Tipos de atualização que o cliente lança no Health Tracker (coleção health_metrics). */
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
  remedio: 'Remédio / suplemento',
  alcool: 'Álcool',
  sauna: 'Sauna',
  meditacao: 'Meditação',
  outro: 'Outro',
  sintoma: 'Sintoma',
}

/** Catálogo completo de tipos de atualização do feed (para o filtro da sidebar). */
export const FEED_KIND_CATALOG: { value: string; label: string; group: FeedGroup }[] = [
  // Monitoramento (health_metrics)
  { value: 'metric:agua', label: 'Água', group: 'monitoramento' },
  { value: 'metric:cafe', label: 'Café', group: 'monitoramento' },
  { value: 'metric:sono', label: 'Sono', group: 'monitoramento' },
  { value: 'metric:hrv', label: 'HRV', group: 'monitoramento' },
  { value: 'metric:atividade', label: 'Atividade física', group: 'monitoramento' },
  { value: 'metric:pressao', label: 'Pressão', group: 'monitoramento' },
  { value: 'metric:peso', label: 'Peso', group: 'monitoramento' },
  { value: 'metric:glicemia', label: 'Glicemia', group: 'monitoramento' },
  { value: 'metric:saturacao', label: 'Saturação', group: 'monitoramento' },
  { value: 'metric:remedio', label: 'Remédio / suplemento', group: 'monitoramento' },
  { value: 'metric:alcool', label: 'Álcool', group: 'monitoramento' },
  { value: 'metric:sauna', label: 'Sauna', group: 'monitoramento' },
  { value: 'metric:meditacao', label: 'Meditação', group: 'monitoramento' },
  { value: 'metric:outro', label: 'Outro registro de monitoramento', group: 'monitoramento' },
  { value: 'metric:sintoma', label: 'Sintoma', group: 'monitoramento' },
  // Refeições
  { value: 'refeicao', label: 'Refeição', group: 'alimentacao' },
  // Dietas
  { value: 'dieta', label: 'Dieta prescrita', group: 'dieta' },
  // Diário emocional
  { value: 'humor', label: 'Registro emocional', group: 'emocional' },
  // Exames
  { value: 'exame', label: 'Exame', group: 'exames' },
  // Lembretes
  { value: 'lembrete', label: 'Lembrete', group: 'lembretes' },
]

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

/** Períodos prontos do filtro (24h, 48h, 1 semana). */
export type FeedPeriod = '24h' | '48h' | '1w'

export const FEED_PERIOD_OPTIONS: { value: FeedPeriod; label: string; hours: number }[] = [
  { value: '24h', label: 'Últimas 24 horas', hours: 24 },
  { value: '48h', label: 'Últimas 48 horas', hours: 48 },
  { value: '1w', label: 'Última semana', hours: 24 * 7 },
]

export interface FeedFilters {
  /** Dia específico no formato AAAA-MM-DD (fuso local). Vazio = todos. */
  day: string
  /** Período pronto selecionado (24h/48h/1 semana). Vazio = nenhum. */
  period: FeedPeriod | ''
  clientId: string
  group: string
  kind: string
}

export const EMPTY_FEED_FILTERS: FeedFilters = {
  day: '',
  period: '',
  clientId: '',
  group: '',
  kind: '',
}

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

/**
 * Início do intervalo (Date) correspondente aos filtros de período/dia:
 * - período escolhido: agora menos as horas do período;
 * - dia específico: começo daquele dia (00:00 local);
 * - nenhum: null (sem corte temporal — o servidor decide o quanto paginar).
 */
export function feedSinceDate(f: Pick<FeedFilters, 'day' | 'period'>): Date | null {
  if (f.period) {
    const opt = FEED_PERIOD_OPTIONS.find((o) => o.value === f.period)
    if (!opt) return null
    return new Date(Date.now() - opt.hours * 60 * 60 * 1000)
  }
  if (f.day) {
    const [y, m, d] = f.day.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d, 0, 0, 0, 0)
  }
  return null
}

/**
 * Interação coerente entre período e dia:
 * escolher um período limpa o dia específico (o intervalo do período é mais amplo
 * e inclui o dia), e escolher um dia limpa o período.
 */
export function normalizePeriodDay(patch: Partial<FeedFilters>): Partial<FeedFilters> {
  if (patch.period) return { ...patch, day: '' }
  if (patch.day) return { ...patch, period: '' }
  return patch
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

/**
 * Tipos de atualização para o filtro: catálogo completo (tudo que o cliente lança
 * no painel) seguido dos tipos que só existem nos dados já carregados.
 */
export function feedKindOptions(events: ClientFeedEvent[]): { value: string; label: string }[] {
  const map = new Map<string, string>()
  for (const item of FEED_KIND_CATALOG) map.set(item.value, item.label)
  for (const e of events) {
    if (!map.has(e.kind)) map.set(e.kind, e.kindLabel)
  }
  return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
    a.label.localeCompare(b.label, 'pt-BR'),
  )
}

/** Rótulo legível do intervalo ativo (período ou dia) para a barra da lista. */
export function feedRangeLabel(f: Pick<FeedFilters, 'day' | 'period'>): string | null {
  if (f.period) {
    const opt = FEED_PERIOD_OPTIONS.find((o) => o.value === f.period)
    return opt ? opt.label : null
  }
  if (f.day) {
    const [y, m, d] = f.day.split('-').map(Number)
    if (!y || !m || !d) return null
    const date = new Date(y, m - 1, d)
    return `Dia ${date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`
  }
  return null
}
