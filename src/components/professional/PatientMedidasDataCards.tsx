import { useMemo } from 'react'
import { HealthMetric } from '@/types'
import { Medication } from '@/services/medications'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Droplets,
  Moon,
  HeartPulse,
  Heart,
  Scale,
  Coffee,
  Dumbbell,
  Droplet,
  Waves,
  Pill,
  Wine,
  Flame,
  Flower2,
  Stethoscope,
  LucideIcon,
} from 'lucide-react'
import { formatValue } from '@/lib/metricDetail'
import { InstitucionalBadge, isFromInstitutionalApp } from './PatientExtendedTabs'

/**
 * Aba MEDIDAS do prontuário profissional — CARDS DE DADOS (leitura rápida),
 * conforme pedido da clínica: cada categoria mostra os ÚLTIMOS LANÇAMENTOS do
 * cliente com data e quantidade — sem gráficos. Somente leitura.
 */

const MAX_ENTRIES = 4

interface DataCardDef {
  /** categoria em health_metrics */
  id: string
  title: string
  icon: LucideIcon
  unit: string
  /** true = somatório diário (água, café...) → mostra "Total hoje" no topo */
  dailySum?: boolean
}

/** Ordem e nomes exatamente como a clínica pediu. */
const DATA_CARDS: DataCardDef[] = [
  { id: 'agua', title: 'Água', icon: Droplets, unit: 'ml', dailySum: true },
  { id: 'sono', title: 'Sono', icon: Moon, unit: 'h' },
  { id: 'hrv', title: 'HRV (VFC)', icon: HeartPulse, unit: 'ms' },
  { id: 'pressao', title: 'Pressão', icon: Heart, unit: 'mmHg' },
  { id: 'peso', title: 'Peso', icon: Scale, unit: 'kg' },
  { id: 'cafe', title: 'Café', icon: Coffee, unit: 'xíc', dailySum: true },
  { id: 'atividade', title: 'Atividade', icon: Dumbbell, unit: 'min', dailySum: true },
  { id: 'glicemia', title: 'Glicemia', icon: Droplet, unit: 'mg/dL' },
  { id: 'saturacao', title: 'Saturação SpO2', icon: Waves, unit: '%' },
  { id: 'remedio', title: 'Remédios & Suplementos', icon: Pill, unit: '' },
  { id: 'alcool', title: 'Álcool', icon: Wine, unit: 'doses', dailySum: true },
  { id: 'sauna', title: 'Sauna / Banho Gelado', icon: Flame, unit: 'min', dailySum: true },
  { id: 'meditacao', title: 'Meditação / Respiração', icon: Flower2, unit: 'min', dailySum: true },
  { id: 'sintoma', title: 'Sintomas & Desconfortos', icon: Stethoscope, unit: '' },
]

const fmtNum = (n: number) =>
  n.toLocaleString('pt-BR', { maximumFractionDigits: n < 10 && !Number.isInteger(n) ? 1 : 0 })

const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const todayKey = () => localDayKey(new Date())

/** "hoje 08:30", "ontem 22:10", "12/05 09:00", "12/05/25" */
function formatWhen(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return dateStr
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const day = localDayKey(d)
  if (day === todayKey()) return `hoje ${hhmm}`
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (day === localDayKey(y)) return `ontem ${hhmm}`
  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (d.getFullYear() === new Date().getFullYear()) return `${dm} ${hhmm}`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

/** Valor legível de um lançamento ("1.500 ml", "120/80 mmHg", "7h 30m"...). */
function entryValue(m: HealthMetric): string {
  const cat = (m.category || '').toLowerCase()
  if (cat === 'pressao') {
    const text = (m.text_value || '').trim()
    if (text) return `${text} mmHg`
    return m.numeric_value != null ? `${Math.round(m.numeric_value)} mmHg` : '--'
  }
  if (cat === 'sono') {
    return m.numeric_value != null ? `${formatValue('sono', m.numeric_value)} h` : '--'
  }
  if (m.numeric_value != null) {
    const unit = (m.unit || '').trim()
    return `${fmtNum(m.numeric_value)}${unit ? ` ${unit}` : ''}`
  }
  return (m.text_value || '').trim() || '--'
}

/** Detalhe secundário (notas, fases do sono, composição corporal...). */
function entryDetail(m: HealthMetric): string {
  const cat = (m.category || '').toLowerCase()
  const parts: string[] = []
  if (cat === 'sono') {
    if (m.bedtime && m.wakeup) parts.push(`deitou ${m.bedtime} · acordou ${m.wakeup}`)
    else if (m.bedtime) parts.push(`deitou ${m.bedtime}`)
    else if (m.wakeup) parts.push(`acordou ${m.wakeup}`)
    const extra: string[] = []
    if (m.sleep_deep_hours) extra.push(`profundo ${formatValue('sono', m.sleep_deep_hours)}`)
    if (m.sleep_rem_hours) extra.push(`REM ${formatValue('sono', m.sleep_rem_hours)}`)
    if (extra.length) parts.push(extra.join(' · '))
  }
  if (cat === 'peso') {
    if (m.body_fat_pct) parts.push(`gordura ${fmtNum(m.body_fat_pct)}%`)
    if (m.lean_mass_kg) parts.push(`magra ${fmtNum(m.lean_mass_kg)} kg`)
  }
  if (cat === 'atividade' && m.text_value && !/^\d+([.,]\d+)?$/.test(m.text_value.trim())) {
    parts.push(m.text_value.trim())
  }
  if (m.notes) parts.push(m.notes)
  return parts.join(' · ')
}

function sortByRecency(items: HealthMetric[]): HealthMetric[] {
  return [...items].sort((a, b) => (b.date_time || '').localeCompare(a.date_time || ''))
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function routineLabel(med: Medication): string {
  if (med.routine === 'daily')
    return `Todos os dias${med.times.length ? ` às ${med.times.join(', ')}` : ''}`
  if (med.routine === 'weekly')
    return `${med.weekdays.map((d) => WEEKDAY_LABELS[d] ?? d).join(', ') || 'dias variados'}${
      med.times.length ? ` às ${med.times.join(', ')}` : ''
    }`
  return 'Uso pontual (sem rotina fixa)'
}

/* ------------------------------- Cards ------------------------------- */

/** Lista de lançamentos de um card de métrica (valor + data por linha). */
function EntriesList({ items }: { items: HealthMetric[] }) {
  const shown = items.slice(0, MAX_ENTRIES)
  const hidden = items.length - shown.length
  return (
    <ul role="list" className="space-y-1.5">
      {shown.map((m) => (
        <li key={m.id} className="text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-foreground">{entryValue(m)}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatWhen(m.date_time)}
            </span>
          </div>
          {(isFromInstitutionalApp(m) || entryDetail(m)) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {isFromInstitutionalApp(m) && <InstitucionalBadge />}
              {entryDetail(m) && (
                <p className="text-[10px] text-muted-foreground leading-snug">{entryDetail(m)}</p>
              )}
            </div>
          )}
        </li>
      ))}
      {hidden > 0 && (
        <li className="text-[10px] text-muted-foreground">+ {hidden} lançamentos anteriores</li>
      )}
    </ul>
  )
}

function MetricDataCard({
  def,
  items,
  loading,
}: {
  def: DataCardDef
  items: HealthMetric[]
  loading: boolean
}) {
  const Icon = def.icon
  const sorted = useMemo(() => sortByRecency(items), [items])
  const today = todayKey()
  const todayItems = sorted.filter((m) => (m.date_time || '').startsWith(today))
  const totalToday = def.dailySum
    ? todayItems.reduce((s, m) => s + (m.numeric_value || 0), 0)
    : null

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="p-3 pb-1.5 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Icon
              className="h-3.5 w-3.5"
              style={{ color: 'var(--soul-gold-deep)' }}
              aria-hidden="true"
            />
            {def.title}
          </h3>
          <Badge variant="outline" className="text-[9px] shrink-0">
            {sorted.length} {sorted.length === 1 ? 'registro' : 'registros'}
          </Badge>
        </div>
        {def.dailySum && totalToday !== null && (
          <p className="text-[10px] text-muted-foreground">
            Total hoje:{' '}
            <span className="font-semibold text-foreground">
              {totalToday > 0 ? `${fmtNum(totalToday)} ${def.unit}` : '—'}
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {sorted.length > 0 ? (
          <EntriesList items={sorted} />
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground border rounded-lg bg-muted/20">
            {loading ? 'Carregando...' : 'Nenhum lançamento registrado.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Card Remédios & Suplementos: rotina + tomas registradas (category 'remedio'). */
function RemediosCard({
  meds,
  metrics,
  loading,
}: {
  meds: Medication[]
  metrics: HealthMetric[]
  loading: boolean
}) {
  const def = DATA_CARDS.find((d) => d.id === 'remedio')!
  const tomas = useMemo(
    () => sortByRecency(metrics.filter((m) => (m.category || '').toLowerCase() === 'remedio')),
    [metrics],
  )
  const Icon = def.icon

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="p-3 pb-1.5 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Icon
              className="h-3.5 w-3.5"
              style={{ color: 'var(--soul-gold-deep)' }}
              aria-hidden="true"
            />
            {def.title}
          </h3>
          <Badge variant="outline" className="text-[9px] shrink-0">
            {meds.length} {meds.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {meds.length > 0 || tomas.length > 0 ? (
          <div className="space-y-2">
            {meds.map((med) => {
              const lastToma = tomas.find(
                (t) => (t.text_value || '').trim().toLowerCase() === med.name.trim().toLowerCase(),
              )
              return (
                <div key={med.id} className="text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {med.name}
                      {med.dosage ? (
                        <span className="font-normal text-muted-foreground"> · {med.dosage}</span>
                      ) : null}
                    </span>
                    {lastToma && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        última toma {formatWhen(lastToma.date_time)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{routineLabel(med)}</p>
                </div>
              )
            })}
            {tomas.slice(0, MAX_ENTRIES).map((t) => (
              <div key={t.id} className="text-xs flex items-baseline justify-between gap-2">
                <span className="font-semibold text-foreground">
                  {t.text_value || 'Toma registrada'}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatWhen(t.date_time)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground border rounded-lg bg-muted/20">
            {loading ? 'Carregando...' : 'Nenhum remédio ou suplemento registrado.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/** Card Sintomas & Desconfortos (mesma fonte da aba Sintomas: category 'sintoma'). */
function SintomasCard({ metrics, loading }: { metrics: HealthMetric[]; loading: boolean }) {
  const def = DATA_CARDS.find((d) => d.id === 'sintoma')!
  const sintomas = useMemo(
    () => sortByRecency(metrics.filter((m) => /sintom/i.test(m.category || ''))),
    [metrics],
  )
  const Icon = def.icon

  return (
    <Card className="border-border/60 bg-card">
      <CardHeader className="p-3 pb-1.5 space-y-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Icon
              className="h-3.5 w-3.5"
              style={{ color: 'var(--soul-gold-deep)' }}
              aria-hidden="true"
            />
            {def.title}
          </h3>
          <Badge variant="outline" className="text-[9px] shrink-0">
            {sintomas.length} {sintomas.length === 1 ? 'registro' : 'registros'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        {sintomas.length > 0 ? (
          <ul role="list" className="space-y-1.5">
            {sintomas.slice(0, MAX_ENTRIES).map((s) => (
              <li key={s.id} className="text-xs">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {s.text_value || 'Sintoma'}
                    {s.numeric_value != null && (
                      <Badge variant="secondary" className="text-[9px]">
                        Severidade {s.numeric_value}
                      </Badge>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatWhen(s.date_time)}
                  </span>
                </div>
                {s.notes && (
                  <p className="text-[10px] text-muted-foreground leading-snug">{s.notes}</p>
                )}
              </li>
            ))}
            {sintomas.length > MAX_ENTRIES && (
              <li className="text-[10px] text-muted-foreground">
                + {sintomas.length - MAX_ENTRIES} lançamentos anteriores
              </li>
            )}
          </ul>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground border rounded-lg bg-muted/20">
            {loading ? 'Carregando...' : 'Nenhum sintoma registrado.'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------ Aba ------------------------------ */

interface PatientMedidasDataCardsProps {
  metrics: HealthMetric[]
  meds: Medication[]
  loading: boolean
}

export function PatientMedidasDataCards({ metrics, meds, loading }: PatientMedidasDataCardsProps) {
  if (loading) {
    return (
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Últimos lançamentos do paciente por categoria · somente leitura
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DATA_CARDS.map((def) => {
          if (def.id === 'remedio')
            return <RemediosCard key={def.id} meds={meds} metrics={metrics} loading={loading} />
          if (def.id === 'sintoma')
            return <SintomasCard key={def.id} metrics={metrics} loading={loading} />
          const items = metrics.filter((m) => (m.category || '').toLowerCase() === def.id)
          return <MetricDataCard key={def.id} def={def} items={items} loading={loading} />
        })}
      </div>
    </div>
  )
}
