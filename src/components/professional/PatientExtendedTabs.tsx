import { EmotionalLog, HealthMetric } from '@/types'
import { Medication } from '@/services/medications'
import { Life360View } from '@/components/emotional/Life360View'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Pill, Activity, Gauge, Sparkles, Building2 } from 'lucide-react'

/** Linha de biomarcador já normalizada (o mapeamento defensivo fica no prontuário). */
export interface PatientBiomarkerRow {
  id: string
  name: string
  value: string
  unit: string
  date: string
}

/**
 * Marca registros gravados pelo App Institucional (o hook de confiança grava
 * "via app institucional (Nome do Profissional)" nos campos de texto livres).
 */
export function isFromInstitutionalApp(item: {
  notes?: string | null
  text_value?: string | null
  title?: string | null
}): boolean {
  const hay = [item.notes, item.text_value, item.title].join(' ').toLowerCase()
  return hay.includes('institucional')
}

export function InstitucionalBadge() {
  return (
    <Badge className="text-[9px] py-0 px-1.5 bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 gap-0.5">
      <Building2 className="h-2.5 w-2.5" /> App Institucional
    </Badge>
  )
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const localDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function daysAgoStr(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDateStr(d)
}

/* ============================ ABA MEDICAÇÕES ============================ */

export function MedicacoesTab({
  meds,
  metrics,
  loading,
}: {
  meds: Medication[]
  metrics: HealthMetric[]
  loading: boolean
}) {
  // Adesão: tomas registradas (health_metrics category remedio) nos últimos 7 dias
  const inicio = daysAgoStr(6)
  const tomas7d = metrics.filter(
    (m) => /remed/i.test(m.category || '') && (m.date_time || '') >= inicio,
  )
  const takenFor = (med: Medication) =>
    tomas7d.filter(
      (t) => (t.text_value || '').trim().toLowerCase() === med.name.trim().toLowerCase(),
    ).length

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold text-foreground">
        Medicações do Paciente · adesão nos últimos 7 dias
      </h3>
      {meds.length > 0 ? (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {meds.map((med) => {
            const taken = takenFor(med)
            return (
              <div key={med.id} className="p-2.5 rounded-lg border bg-card space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-emerald-600" />
                    {med.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {med.routine === 'daily'
                      ? 'Diária'
                      : med.routine === 'weekly'
                        ? 'Semanal'
                        : 'Pontual'}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {med.dosage && <span>{med.dosage} • </span>}
                  {med.routine === 'daily' &&
                    `Todos os dias${med.times.length ? ` às ${med.times.join(', ')}` : ''}`}
                  {med.routine === 'weekly' &&
                    `${med.weekdays.map((d) => WEEKDAY_LABELS[d] ?? d).join(', ') || 'dias variados'}${med.times.length ? ` às ${med.times.join(', ')}` : ''}`}
                  {med.routine === 'once' && 'Uso pontual (sem rotina fixa)'}
                </p>
                {med.routine !== 'once' && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    ✅ {taken} toma(s) registrada(s) nos últimos 7 dias
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
          {loading ? 'Carregando medicações...' : 'Nenhuma medicação cadastrada por este paciente.'}
        </div>
      )}
    </div>
  )
}

/* ============================ ABA SINTOMAS ============================ */

export function SintomasTab({ metrics, loading }: { metrics: HealthMetric[]; loading: boolean }) {
  const sintomas = metrics
    .filter((m) => /sintom/i.test(m.category || ''))
    .sort((a, b) => (b.date_time || '').localeCompare(a.date_time || ''))

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold text-foreground">Sintomas Registrados</h3>
      {sintomas.length > 0 ? (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {sintomas.map((s) => (
            <div
              key={s.id}
              className="p-2.5 rounded-lg border bg-card flex items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-foreground">{s.text_value || 'Sintoma'}</span>
                  {s.numeric_value !== undefined && s.numeric_value !== null && (
                    <Badge variant="secondary" className="text-[10px]">
                      Severidade {s.numeric_value}
                    </Badge>
                  )}
                  {isFromInstitutionalApp(s) && <InstitucionalBadge />}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {s.date_time}
                  {s.notes && <span> • {s.notes}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
          {loading ? 'Carregando sintomas...' : 'Nenhum sintoma registrado por este paciente.'}
        </div>
      )}
    </div>
  )
}

/* ========================= ABA EMOCIONAL / VIDA 360º ========================= */

export function EmocionalTab({ logs }: { logs: EmotionalLog[] }) {
  if (!logs.length) {
    return (
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          Diário Emocional &amp; Vida 360º (Estilo Daylio)
        </h3>
        <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
          Nenhum check-in emocional registrado por este paciente.
        </div>
      </div>
    )
  }
  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Diário Emocional &amp; Vida 360º (Estilo Daylio) · somente leitura
      </h3>
      <Life360View logs={logs} />
    </div>
  )
}

/* ========================= ABA BIOMARCADORES ========================= */

export function BiomarcadoresTab({
  biomarkers,
  loading,
}: {
  biomarkers: PatientBiomarkerRow[]
  loading: boolean
}) {
  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold text-foreground">
        Biomarcadores do Perfil (Resultados de Exames)
      </h3>
      {biomarkers.length > 0 ? (
        <div className="space-y-2 max-h-[420px] overflow-y-auto">
          {biomarkers.map((b) => (
            <div
              key={b.id}
              className="p-2.5 rounded-lg border bg-card flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-amber-600" />
                  {b.name}
                </span>
                <p className="text-[10px] text-muted-foreground">{b.date}</p>
              </div>
              <span className="font-semibold text-foreground">
                {b.value} {b.unit}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-xs text-muted-foreground border rounded-lg">
          {loading ? 'Carregando biomarcadores...' : 'Nenhum biomarcador extraído de exames ainda.'}
        </div>
      )}
    </div>
  )
}

/* ============================ ABA SCORE GERAL ============================ */

interface ScoreParts {
  vida360: number | null
  adesao: number | null
  regularidade: number
}

/** Média de humor + energia + estresse (invertido) dos últimos 30 check-ins, 0–100. */
export function scoreVida360(logs: EmotionalLog[]): number | null {
  if (!logs.length) return null
  const recent = logs.slice(0, 30)
  let sum = 0
  let n = 0
  for (const l of recent) {
    sum += (l.mood_score ?? 3) * 20
    sum += (l.energy_level ?? 3) * 20
    sum += (6 - (l.stress_level ?? 3)) * 20
    n += 3
  }
  return n ? Math.round(sum / n) : null
}

export function scoreAdesao(meds: Medication[], metrics: HealthMetric[]): number | null {
  const routine = meds.filter((m) => m.routine !== 'once')
  if (!routine.length) return null
  const inicio = daysAgoStr(6)
  const tomas = metrics.filter(
    (m) => /remed/i.test(m.category || '') && (m.date_time || '') >= inicio,
  )
  const taken = tomas.filter((t) =>
    routine.some((r) => (t.text_value || '').trim().toLowerCase() === r.name.trim().toLowerCase()),
  ).length
  let expected = 0
  for (const r of routine) {
    const dosesPerDay = Math.max(1, r.times.length || 1)
    if (r.routine === 'daily') expected += 7 * dosesPerDay
    else {
      // dias da semana agendados dentro da janela de 7 dias (aproximação: média semanal)
      const perWeek = Math.max(1, r.weekdays.length || 1)
      expected += Math.min(7, perWeek) * dosesPerDay
    }
  }
  return Math.min(100, Math.round((taken / Math.max(1, expected)) * 100))
}

export function scoreRegularidade(
  metrics: HealthMetric[],
  mealsCount: number[],
  logs: EmotionalLog[],
): number {
  const days = new Set<string>()
  const inicio = daysAgoStr(6)
  metrics.forEach((m) => {
    if ((m.date_time || '') >= inicio) days.add((m.date_time || '').slice(0, 10))
  })
  logs.forEach((l) => {
    if ((l.date || '') >= inicio) days.add((l.date || '').slice(0, 10))
  })
  mealsCount.forEach((_) => {
    /* refeições chegam como lista completa; dias contados abaixo */
  })
  return Math.min(100, Math.round((days.size / 7) * 100))
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{value === null ? '—' : `${value}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  )
}

export type { ScoreParts }
export function computeScoreGeral(
  logs: EmotionalLog[],
  meds: Medication[],
  metrics: HealthMetric[],
): ScoreParts & { total: number | null } {
  const parts: ScoreParts = {
    vida360: scoreVida360(logs),
    adesao: scoreAdesao(meds, metrics),
    regularidade: scoreRegularidade(metrics, [], logs),
  }
  // pesos: Vida 360º 50% · adesão 30% · regularidade 20% (sem adesão, redistribui)
  const total =
    parts.adesao !== null
      ? 0.5 * (parts.vida360 ?? 0) + 0.3 * parts.adesao + 0.2 * parts.regularidade
      : 0.7 * (parts.vida360 ?? 0) + 0.3 * parts.regularidade
  return { ...parts, total: Math.round(total) }
}

export function ScoreGeralTab({
  metrics,
  meds,
  logs,
}: {
  metrics: HealthMetric[]
  meds: Medication[]
  logs: EmotionalLog[]
}) {
  const { total: geral, ...parts } = computeScoreGeral(logs, meds, metrics)

  const tone = geral >= 75 ? 'text-emerald-600' : geral >= 50 ? 'text-amber-600' : 'text-rose-600'

  return (
    <div className="space-y-3 mt-4">
      <h3 className="text-sm font-semibold text-foreground">Score Geral do Paciente</h3>
      <Card className="border-border/60">
        <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center shrink-0">
            <div className={`font-display text-5xl font-bold ${tone} flex items-center gap-1.5`}>
              <Sparkles className="h-7 w-7" />
              {geral}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">de 100 pontos</p>
          </div>
          <div className="flex-1 w-full space-y-3">
            <ScoreBar label="Bem-estar emocional & Vida 360º (50%)" value={parts.vida360} />
            <ScoreBar label="Adesão à medicação · 7 dias (30%)" value={parts.adesao} />
            <ScoreBar label="Regularidade de registros · 7 dias (20%)" value={parts.regularidade} />
            <p className="text-[10px] text-muted-foreground flex items-start gap-1">
              <Activity className="h-3 w-3 mt-0.5 shrink-0" />
              Índice interno da Clínica Soul: combina humor, energia, estresse, adesão às medicações
              e constância de auto-registro. Não substitui avaliação clínica.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
