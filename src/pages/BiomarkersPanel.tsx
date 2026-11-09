import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProfileBiomarker, HealthMetric } from '@/types'
import { profileService } from '@/services/profile'
import { healthService } from '@/services/health'
import { useAuth } from '@/context/AuthContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ThermometerGauge } from '@/components/profile/ThermometerGauge'
import { Navbar } from '@/components/Navbar'
import { Search, ChevronDown, ArrowDown, ArrowUp, Minimize2, FlaskConical } from 'lucide-react'
import { buildBiomarkerPanel, PanelMarkerData, PanelMarkerStatus } from '@/lib/biomarkerPanelData'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 4

function formatDateBR(dateStr?: string): string | null {
  if (!dateStr) return null
  const parts = dateStr.slice(0, 10).split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

function StatusChip({
  status,
  label,
  color,
}: {
  status: PanelMarkerStatus
  label: string
  color: string
}) {
  if (status === 'no_data') {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sem dados
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function MarkerCard({ m }: { m: PanelMarkerData }) {
  // Réguas visíveis por padrão; o usuário pode recolher cada marcador pelo cabeçalho.
  const [open, setOpen] = useState(true)
  const noData = m.status === 'no_data'
  const dateLabel = formatDateBR(m.date)

  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card transition-shadow hover:shadow-sm',
        noData && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left p-3.5 sm:p-4 flex items-center gap-3"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{m.spec.name}</p>
            <StatusChip status={m.status} label={m.statusLabel} color={m.statusColor} />
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            {dateLabel ? <span>Exame de {dateLabel}</span> : <span>Sem exame registrado</span>}
            {m.referenceText && m.referenceText !== '—' && !noData && (
              <span className="hidden sm:inline">· Ref.: {m.referenceText}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            {noData ? (
              <span className="text-sm font-medium text-muted-foreground">—</span>
            ) : (
              <span className="text-lg sm:text-xl font-bold text-foreground tabular-nums">
                {m.rawValue}
                {m.unit && (
                  <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                    {m.unit}
                  </span>
                )}
              </span>
            )}
            <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
              {m.previousDate && formatDateBR(m.previousDate) && (
                <span>Anterior: {formatDateBR(m.previousDate)}</span>
              )}
              {m.deltaLabel && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-semibold',
                    m.deltaDir === 'up' ? 'text-amber-600' : 'text-emerald-600',
                  )}
                >
                  {m.deltaDir === 'up' ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {m.deltaLabel}
                </span>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              open && 'rotate-180',
            )}
          />
        </div>
      </button>

      {open && (
        <div className="px-3.5 sm:px-4 pb-4 space-y-2">
          <ThermometerGauge
            value={m.value}
            displayValue={m.rawValue}
            unit={m.unit}
            minDisplay={m.minDisplay}
            maxDisplay={m.maxDisplay}
            segments={m.segments}
            statusColor={m.statusColor}
            statusLabel={m.statusLabel}
            isOutOfRange={m.status === 'out_of_range'}
          />
          {(m.description || m.clinicalNote) && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {m.clinicalNote || m.description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function GroupSection({
  title,
  subtitle,
  markers,
}: {
  title: string
  subtitle?: string
  markers: PanelMarkerData[]
}) {
  const [expanded, setExpanded] = useState(true)
  const [page, setPage] = useState(1)
  const withData = markers.filter((m) => m.status !== 'no_data')

  const visible = markers.slice(0, page * PAGE_SIZE)
  const remaining = markers.length - visible.length

  return (
    <Card className="border-border/70 bg-card/80">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between gap-2 p-4 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
            {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {withData.length}/{markers.length} com resultado
            </p>
            {!expanded && withData.length > 0 && (
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate max-w-[60ch]">
                {withData
                  .slice(0, 3)
                  .map((m) => `${m.spec.name} ${m.rawValue}${m.unit ? ` ${m.unit}` : ''}`)
                  .join(' · ')}
              </p>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-muted-foreground transition-transform shrink-0',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {expanded && (
          <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-2">
            {visible.map((m) => (
              <MarkerCard key={m.spec.id} m={m} />
            ))}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="w-full rounded-xl border border-dashed border-border/70 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
              >
                Mostrar mais {remaining} marcador{remaining > 1 ? 'es' : ''}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function BiomarkersPanelPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [loading, setLoading] = useState(true)
  const [biomarkers, setBiomarkers] = useState<ProfileBiomarker[]>([])
  const [metrics, setMetrics] = useState<HealthMetric[]>([])
  const [query, setQuery] = useState('')
  const [outOnly, setOutOnly] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      try {
        const [bios, mets] = await Promise.all([
          profileService.getBiomarkers(user.id),
          healthService.listUserMetrics(user.id, 500),
        ])
        if (!cancelled) {
          setBiomarkers(bios)
          setMetrics(mets)
        }
      } catch (e) {
        console.error('Erro ao carregar biomarcadores', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const panel = useMemo(() => buildBiomarkerPanel({ biomarkers, metrics }), [biomarkers, metrics])

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    return panel.groups
      .map((g) => {
        const markers = g.markers.filter((m) => {
          if (outOnly && m.status !== 'out_of_range') return false
          if (q && !m.spec.name.toLowerCase().includes(q)) return false
          return true
        })
        return { ...g, markers }
      })
      .filter((g) => g.markers.length > 0)
  }, [panel, query, outOnly])

  const shownMarkers = filteredGroups.reduce((acc, g) => acc + g.markers.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 pb-28 pt-4 space-y-4">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-primary" />
              Biomarcadores
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? 'Carregando seus resultados…'
                : `${panel.totals.withData} de ${panel.totals.total} marcadores com resultado · ${panel.totals.outOfRange} fora da faixa`}
            </p>
          </div>
          {/* Filtro Fora da faixa / Todos */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setOutOnly(true)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                outOnly
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40'
                  : 'bg-card text-muted-foreground border-border/70 hover:bg-muted/40',
              )}
            >
              Fora da faixa ({panel.totals.outOfRange})
            </button>
            <button
              type="button"
              onClick={() => setOutOnly(false)}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors',
                !outOnly
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-card text-muted-foreground border-border/70 hover:bg-muted/40',
              )}
            >
              Todos ({panel.totals.total})
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar marcador (ex.: colesterol, hemoglobina, TSH)…"
            className="pl-9 bg-card border-border/70"
          />
        </div>

        {/* Skeletons de carregamento */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Estado vazio do filtro */}
        {!loading && filteredGroups.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center space-y-2">
              <FlaskConical className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                {outOnly ? 'Nenhum marcador fora da faixa 🎉' : 'Nenhum marcador encontrado'}
              </p>
              <p className="text-xs text-muted-foreground">
                {outOnly
                  ? 'Todos os seus resultados estão dentro das faixas de referência.'
                  : 'Tente outro termo de busca ou mude o filtro para "Todos".'}
              </p>
              {outOnly && (
                <button
                  type="button"
                  onClick={() => setOutOnly(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Ver todos os marcadores
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Grupos */}
        {filteredGroups.map((g) => (
          <GroupSection key={g.id} title={g.title} subtitle={g.subtitle} markers={g.markers} />
        ))}

        {!loading && filteredGroups.length > 0 && (
          <p className="text-center text-[11px] text-muted-foreground pb-4">
            {shownMarkers} marcador{shownMarkers !== 1 ? 'es' : ''} exibido
            {shownMarkers !== 1 ? 's' : ''} · dados dos seus exames e métricas de saúde
          </p>
        )}

        {/* Botão flutuante de volta ao painel Hoje (mobile) */}
        {isMobile && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="fixed bottom-20 right-4 z-40 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-1.5"
          >
            <Minimize2 className="h-4 w-4" />
            Hoje
          </button>
        )}
      </div>
    </div>
  )
}
