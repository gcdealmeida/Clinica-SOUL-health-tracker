import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown } from 'lucide-react'
import { MetricMeta, formatValue as fmtVal } from '@/lib/metricDetail'
import { ReferenceNote, AllTimeStats, WeekdayStat, HourStat, YearStat } from '@/lib/metricReference'

const fmtDayShort = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const fmtSince = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

// ---------- Nota de referência (colapsável quando tem faixas) ----------

export function ReferenceNoteBlock({ note }: { note: ReferenceNote }) {
  const hasRanges = !!note.ranges?.length
  return (
    <div className="rounded-lg bg-muted/40 border p-3 space-y-2">
      <p className="text-[11px] leading-relaxed text-muted-foreground">{note.text}</p>
      {hasRanges && (
        <details className="group">
          <summary className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 cursor-pointer select-none">
            Ver faixas de classificação
            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 space-y-1">
            {note.ranges!.map((r) => (
              <div key={r.label} className="flex items-start gap-2 text-[11px]">
                <span
                  className="shrink-0 font-semibold w-32 sm:w-44"
                  style={{ color: r.color ?? 'inherit' }}
                >
                  {r.label}:
                </span>
                <span className="text-muted-foreground">{r.range}</span>
              </div>
            ))}
          </div>
        </details>
      )}
      {note.source && <p className="text-[10px] text-muted-foreground/80">Fonte: {note.source}</p>}
    </div>
  )
}

// ---------- All-time Stats (MAX / TOTAL-média / desde) ----------

export function AllTimeStatsBlock({
  stats,
  meta,
  metricId,
}: {
  stats: AllTimeStats
  meta: MetricMeta
  metricId: string
}) {
  const fmt = (v: number | null | undefined) => fmtVal(metricId, v)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="rounded-lg border p-3 space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Máximo
        </p>
        <div className="flex items-baseline gap-1">
          <span className={`text-base font-bold ${meta.color}`}>{fmt(stats.max?.value)}</span>
          <span className="text-[10px] text-muted-foreground">{meta.unit}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {stats.max ? fmtDayShort(stats.max.day) : 'sem registros'}
        </p>
      </div>
      <div className="rounded-lg border p-3 space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {meta.dailySum ? 'Total' : 'Média'}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold">
            {fmt(meta.dailySum ? stats.total : stats.avg)}
          </span>
          <span className="text-[10px] text-muted-foreground">{meta.unit}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {meta.dailySum ? 'somatório de todos os dias' : 'média de todos os registros'}
        </p>
      </div>
      <div className="rounded-lg border p-3 space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Histórico
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold">{stats.since ? 'desde' : '--'}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {stats.since
            ? `${fmtSince(stats.since)} • ${stats.count} registro${stats.count !== 1 ? 's' : ''}`
            : 'sem registros'}
        </p>
      </div>
    </div>
  )
}

// ---------- Dias da semana: mediana / média / total ----------

export function WeekdayStatsBlock({
  stats,
  meta,
  metricId,
}: {
  stats: WeekdayStat[]
  meta: MetricMeta
  metricId: string
}) {
  const fmt = (v: number | null | undefined) => fmtVal(metricId, v)
  const hasAny = stats.some((s) => s.mean !== null)
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Dias da semana</h3>
        {hasAny ? (
          <>
            {/* cabeçalho estilo Guava: colunas Median Mean Total */}
            <div className="hidden sm:grid grid-cols-[3rem_1fr_1fr_1fr] gap-2 text-[10px] font-medium text-muted-foreground uppercase">
              <span />
              <span>Mediana</span>
              <span>Média</span>
              <span>Total</span>
            </div>
            <div className="space-y-1.5">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="grid grid-cols-3 sm:grid-cols-[3rem_1fr_1fr_1fr] gap-2 items-center text-[11px]"
                >
                  <span className="font-semibold text-[10px] text-muted-foreground">{s.label}</span>
                  <span className="text-right sm:text-left">{fmt(s.median)}</span>
                  <span className="text-right sm:text-left text-muted-foreground">
                    {fmt(s.mean)}
                  </span>
                  <span className="text-right sm:text-left text-muted-foreground">
                    {meta.dailySum ? fmt(s.total) : '--'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {meta.dailySum ? 'Total diário' : 'Valor do dia'} por dia da semana (todos os
              registros)
            </p>
          </>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Sem dados suficientes — registre valores em dias diferentes.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Por ano ----------

export function YearStatsBlock({
  stats,
  meta,
  metricId,
}: {
  stats: YearStat[]
  meta: MetricMeta
  metricId: string
}) {
  const fmt = (v: number | null | undefined) => fmtVal(metricId, v)
  const max = Math.max(...stats.map((s) => s.value), 0)
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Anos</h3>
        {stats.length ? (
          <div className="space-y-2">
            {stats.map((y) => (
              <div key={y.label} className="flex items-center gap-2">
                <span className="w-10 text-[11px] font-semibold">{y.label}</span>
                <div className="flex-1 h-3.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${max > 0 ? Math.max(3, (y.value / max) * 100) : 3}%`,
                      backgroundColor: meta.fill,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="w-20 text-right text-[11px] text-muted-foreground">
                  {fmt(y.value)} {meta.unit}
                </span>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              {meta.dailySum ? 'Total por ano' : 'Média por ano'} (últimos 5 anos)
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Sem dados suficientes para comparação anual.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------- Horas do dia (métricas com horário) ----------

export function HourStatsBlock({
  stats,
  meta,
  metricId,
}: {
  stats: HourStat[]
  meta: MetricMeta
  metricId: string
}) {
  const fmt = (v: number | null | undefined) => fmtVal(metricId, v)
  const max = Math.max(...stats.map((s) => s.value), 0)
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold">Horas do dia</h3>
        <div className="grid grid-cols-6 gap-1.5">
          {stats.map((h) => (
            <div key={h.label} className="text-center space-y-1">
              <div className="h-20 flex items-end justify-center">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${max > 0 && h.value > 0 ? Math.max(4, (h.value / max) * 100) : 4}%`,
                    backgroundColor: meta.fill,
                    opacity: h.value > 0 ? 0.85 : 0.15,
                  }}
                />
              </div>
              <p className="text-[9px] font-medium">{h.label}</p>
              <p className="text-[9px] text-muted-foreground">{fmt(h.value)}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Distribuição por faixa de 4 horas (0h–4h, 4h–8h … 20h–24h)
        </p>
      </CardContent>
    </Card>
  )
}
