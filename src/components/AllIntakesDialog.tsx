import { useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { medicationService, type Medication } from '@/services/medications'
import { extractDosage } from '@/lib/dashboard'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pill } from 'lucide-react'

/**
 * Painel geral de todas as medicações já ingeridas: cada registro vem de
 * health_metrics (category 'remedio') — o mesmo formato lido pela grade semanal
 * (src/lib/medicationRows.ts) e pela linha do tempo. Tanto tomas pontuais
 * (notes "pontual") quanto tomas de rotina (notes "rotina") aparecem, ordenadas
 * da mais recente para a mais antiga, com um seletor de período no topo
 * (1S = semana, 1M = mês, 3M, 6M, 1A = ano, Tudo) que filtra as tomas até hoje.
 */

interface IntakeEntry {
  id: string
  name: string
  dosage: string
  /** "YYYY-MM-DD HH:MM" (possivelmente com segundos) */
  dateTime: string
  kind: 'rotina' | 'pontual'
}

type PeriodKey = '1S' | '1M' | '3M' | '6M' | '1A' | 'all'

const PERIODS: Array<{ key: PeriodKey; label: string; description: string }> = [
  { key: '1S', label: '1S', description: 'Última semana' },
  { key: '1M', label: '1M', description: 'Último mês' },
  { key: '3M', label: '3M', description: 'Últimos 3 meses' },
  { key: '6M', label: '6M', description: 'Últimos 6 meses' },
  { key: '1A', label: '1A', description: 'Último ano' },
  { key: 'all', label: 'Tudo', description: 'Todo o histórico' },
]

/** Limite do período, em dias (null = sem limite). */
const PERIOD_DAYS: Record<PeriodKey, number | null> = {
  '1S': 7,
  '1M': 30,
  '3M': 90,
  '6M': 182,
  '1A': 365,
  all: null,
}

const toDayStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const isPontualNotes = (notes?: string) => (notes ?? '').toLowerCase().includes('pontual')

/**
 * Dose exibida: notes vem como "rotina • 20mg" ou "pontual • 500mg" (veja
 * medicationService.registerIntake / createOccasionalIntake). Preferimos a dose
 * cadastrada na medicação (pareando pelo nome em minúsculas, como a grade
 * semanal faz); senão, o trecho depois de "•" nas notes; senão, extrai do texto.
 */
const doseFromNotes = (notes?: string): string => {
  const part = (notes ?? '').split('•')[1]?.trim()
  return part || ''
}

const buildEntry = (
  rec: { id: string; text_value?: string; notes?: string; date_time: string; unit?: string },
  dosageByName: Map<string, string>,
): IntakeEntry | null => {
  const name = (rec.text_value ?? '').trim()
  if (!name) return null
  const dosage =
    dosageByName.get(name.toLowerCase()) ||
    doseFromNotes(rec.notes) ||
    extractDosage(rec.text_value) ||
    ''
  return {
    id: rec.id,
    name,
    dosage,
    dateTime: (rec.date_time ?? '').replace('T', ' '),
    kind: isPontualNotes(rec.notes) ? 'pontual' : 'rotina',
  }
}

const groupLabelOf = (day: string) => {
  const today = toDayStr(new Date())
  const yesterday = toDayStr(new Date(Date.now() - 86400000))
  if (day === today) return 'Hoje'
  if (day === yesterday) return 'Ontem'
  const parsed = new Date(`${day}T00:00:00`)
  if (isNaN(parsed.getTime())) return day
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface AllIntakesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AllIntakesDialog({ open, onOpenChange }: AllIntakesDialogProps) {
  const [entries, setEntries] = useState<IntakeEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<PeriodKey>('1M')

  useEffect(() => {
    if (!open) return
    setEntries([])
    setLoading(true)
    const userId = pb.authStore.record?.id
    if (!userId) {
      setLoading(false)
      return
    }
    Promise.all([
      pb
        .collection('health_metrics')
        .getFullList({
          filter: `user = '${userId}' && category = 'remedio'`,
          sort: '-date_time',
          batch: 500,
        })
        .catch((err) => {
          console.error('Erro ao carregar histórico de medicações:', err)
          toast.error('Não foi possível carregar o histórico de medicações')
          return [] as any[]
        }),
      medicationService.list().catch(() => [] as Medication[]), // dose é opcional — não bloqueia o histórico
    ]).then(([records, meds]) => {
      const dosageByName = new Map<string, string>()
      for (const m of meds) {
        if (m.dosage?.trim()) dosageByName.set(m.name.trim().toLowerCase(), m.dosage.trim())
      }
      setEntries(
        records.map((r) => buildEntry(r, dosageByName)).filter((e): e is IntakeEntry => e !== null),
      )
      setLoading(false)
    })
  }, [open])

  // Toma mais antiga disponível (para aviso quando o histórico carregado for menor)
  const oldestDay = useMemo(
    () => (entries.length > 0 ? (entries[entries.length - 1].dateTime || '').slice(0, 10) : ''),
    [entries],
  )

  const filtered = useMemo(() => {
    const days = PERIOD_DAYS[period]
    if (days === null) return entries
    const limit = toDayStr(new Date(Date.now() - (days - 1) * 86400000))
    const out = entries.filter((e) => (e.dateTime || '').slice(0, 10) >= limit)
    return out
  }, [entries, period])

  const groups = useMemo(() => {
    const byDay = new Map<string, IntakeEntry[]>()
    for (const e of filtered) {
      const day = (e.dateTime || '').slice(0, 10)
      const arr = byDay.get(day) ?? []
      arr.push(e)
      byDay.set(day, arr)
    }
    return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const activePeriod = PERIODS.find((p) => p.key === period)!

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-emerald-600" />
            Histórico de medicações
          </DialogTitle>
          <DialogDescription className="text-xs">
            Todas as tomas registradas — rotina e pontuais — da mais recente para a mais antiga.
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de período */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              title={p.description}
              onClick={() => setPeriod(p.key)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                period === p.key
                  ? 'bg-emerald-600 border-emerald-600 text-white font-semibold'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {activePeriod.description} — {filtered.length} toma{filtered.length === 1 ? '' : 's'}
          </span>
          {!loading && entries.length > 0 && filtered.length > 0 && oldestDay && (
            <span>desde {new Date(`${oldestDay}T00:00:00`).toLocaleDateString('pt-BR')}</span>
          )}
        </div>

        {/* Lista do histórico */}
        <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border bg-muted/10 p-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-10 text-center">
              {entries.length === 0
                ? 'Nenhuma medicação registrada ainda. Use "Tomei medicação" para registrar a primeira toma.'
                : `Nenhuma toma registrada em ${activePeriod.description.toLowerCase()}.`}
            </p>
          ) : (
            groups.map(([day, items]) => (
              <div key={day} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sticky top-0 bg-background/95 backdrop-blur px-1 py-0.5 rounded">
                  {groupLabelOf(day)}
                </p>
                {items.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2"
                  >
                    <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                      <Pill className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium truncate">{e.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {(e.dateTime || '').slice(11, 16)}
                        {e.dosage ? ` • ${e.dosage}` : ''}
                      </span>
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] shrink-0 ${
                        e.kind === 'rotina'
                          ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
                          : 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {e.kind === 'rotina' ? 'Rotina' : 'Pontual'}
                    </Badge>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
