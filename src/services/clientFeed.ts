import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { authService } from '@/services/auth'
import { ClientFeedEvent, FeedGroup, METRIC_LABELS } from '@/lib/clientFeed'

/**
 * Feed de atualizações dos clientes, montado a partir das coleções reais.
 * As API rules dessas coleções já liberam leitura ao papel 'profissional'.
 */

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_da_manha: 'Café da manhã',
  almoco: 'Almoço',
  lanche: 'Lanche',
  jantar: 'Jantar',
  ceia: 'Ceia',
  extra: 'Extra',
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
}

function parseCreated(v: string): Date {
  const d = new Date(v.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? new Date(0) : d
}

/** Timestamp AAAA-MM-DD HH:mm:ss.SSSZ exigido pelo PocketBase (fuso do navegador). */
function pbTimestamp(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.` +
    `${String(d.getMilliseconds()).padStart(3, '0')}Z`
  )
}

function metricSummary(r: RecordModel): string {
  const value =
    typeof r.numeric_value === 'number'
      ? `${r.numeric_value} ${str(r.unit)}`.trim()
      : str(r.text_value)
  const notes = str(r.notes)
  return [value, notes].filter(Boolean).join(' · ')
}

interface Mapped {
  group: FeedGroup
  kind: string
  kindLabel: string
  summary: string
}

interface SourceDef {
  collection: string
  /** Campo da coleção que discrimina o tipo (quando há mais de um kind). */
  kindField?: string
  /** Prefixo do kind no feed correspondente ao kindField (ex.: 'metric:'). */
  kindPrefix?: string
  /** Todos os kinds do feed que esta coleção pode produzir. */
  kinds: string[]
  map: (r: RecordModel) => Mapped
}

const METRIC_KINDS = Object.keys(METRIC_LABELS).map((c) => `metric:${c}`)

const SOURCES: SourceDef[] = [
  {
    collection: 'health_metrics',
    kindField: 'category',
    kindPrefix: 'metric:',
    kinds: METRIC_KINDS,
    map: (r) => {
      const cat = str(r.category)
      return {
        group: 'monitoramento',
        kind: `metric:${cat}`,
        kindLabel: METRIC_LABELS[cat] ?? cat,
        summary: metricSummary(r),
      }
    },
  },
  {
    collection: 'meals',
    kinds: ['refeicao'],
    map: (r) => ({
      group: 'alimentacao',
      kind: 'refeicao',
      kindLabel: 'Refeição',
      summary: [str(r.title) || 'Refeição', MEAL_TYPE_LABELS[str(r.meal_type)] ?? '']
        .filter(Boolean)
        .join(' · '),
    }),
  },
  {
    collection: 'diets',
    kinds: ['dieta'],
    map: (r) => ({
      group: 'dieta',
      kind: 'dieta',
      kindLabel: 'Dieta prescrita',
      summary: str(r.title),
    }),
  },
  {
    collection: 'emotional_logs',
    kinds: ['humor'],
    map: (r) => ({
      group: 'emocional',
      kind: 'humor',
      kindLabel: 'Registro emocional',
      summary: `${str(r.mood_label)} (${str(r.mood_score)})`,
    }),
  },
  {
    collection: 'exams',
    kinds: ['exame'],
    map: (r) => ({
      group: 'exames',
      kind: 'exame',
      kindLabel: 'Exame',
      summary: [str(r.title), str(r.type)].filter(Boolean).join(' · '),
    }),
  },
  {
    collection: 'reminders',
    kinds: ['lembrete'],
    map: (r) => ({
      group: 'lembretes',
      kind: 'lembrete',
      kindLabel: 'Lembrete',
      summary: [str(r.title), str(r.status)].filter(Boolean).join(' · '),
    }),
  },
]

export interface ClientFeedResult {
  events: ClientFeedEvent[]
  /** true quando nenhuma coleção retornou página cheia (não há mais registros). */
  exhausted: boolean
}

export interface FetchClientFeedOptions {
  /** Quantos registros recentes ler de cada coleção (tamanho da página). */
  perSource: number
  /** Só traz registros criados a partir deste instante (filtro real no banco). */
  since?: Date | null
  /** Tipos de atualização selecionados (múltipla escolha). Vazio = todos. */
  kinds?: string[]
}

/**
 * Busca os últimos `perSource` registros de cada coleção criados desde `since`,
 * junta tudo e ordena do mais recente para o mais antigo. Só entram registros
 * de clientes conhecidos.
 */
export async function fetchClientFeed({
  perSource,
  since,
  kinds = [],
}: FetchClientFeedOptions): Promise<ClientFeedResult> {
  const clients = await authService.listClients()
  const names = new Map(clients.map((c) => [c.id, c.name || c.email]))

  const createdFilter = since ? `created >= "${pbTimestamp(since)}"` : ''

  // Filtro real no banco por múltiplos tipos: coleções sem nenhum tipo marcado
  // nem são consultadas; health_metrics recebe um IN sobre as categorias.
  const filterOf = (s: SourceDef): string | undefined => {
    const conds: string[] = []
    if (createdFilter) conds.push(createdFilter)
    const wanted = kinds.filter((k) => s.kinds.includes(k))
    if (wanted.length === 0) return 'id=""' // fonte fora do filtro: nada a buscar
    if (s.kindField && s.kindPrefix && wanted.length < s.kinds.length) {
      const cats = wanted.map((k) => k.slice(s.kindPrefix!.length))
      conds.push(`(${cats.map((c) => `${s.kindField}='${c}'`).join(' || ')})`)
    }
    return conds.length > 0 ? conds.join(' && ') : undefined
  }

  const results = await Promise.allSettled(
    SOURCES.map((s) =>
      pb.collection(s.collection).getList(1, perSource, {
        sort: '-created',
        filter: filterOf(s),
      }),
    ),
  )

  if (results.every((r) => r.status === 'rejected')) {
    throw new Error('Falha ao carregar o feed')
  }

  const events: ClientFeedEvent[] = []
  let exhausted = true

  results.forEach((res, i) => {
    if (res.status !== 'fulfilled') {
      exhausted = false
      return
    }
    if (res.value.items.length >= perSource) exhausted = false
    const source = SOURCES[i]
    for (const rec of res.value.items) {
      const clientId = str(rec.user)
      const clientName = names.get(clientId)
      if (!clientName) continue
      const mapped = source.map(rec)
      events.push({
        id: `${source.collection}:${rec.id}`,
        clientId,
        clientName,
        at: parseCreated(str(rec.created)),
        ...mapped,
      })
    }
  })

  events.sort((a, b) => b.at.getTime() - a.at.getTime())
  return { events, exhausted }
}
