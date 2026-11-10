import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SymptomDetailPanel } from '@/components/symptoms/SymptomDetailPanel'
import { healthService } from '@/services/health'
import { normalizeSymptomName } from '@/lib/symptomCatalog'
import type { HealthMetric } from '@/types'

interface AllSymptomsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Registros de sintoma já carregados no painel Hoje (evita refetch). */
  metrics?: HealthMetric[]
  /** Abre "Comparar" já com este sintoma pré-selecionado. */
  onCompare?: (name: string) => void
}

interface SymptomSummary {
  name: string
  count: number
  lastWhen: string
}

type Screen = { kind: 'list' } | { kind: 'detail'; key: string }

/** Formata "2025-11-05 14:30" (ou ISO) como "5 nov" (locale pt-BR). */
function formatLastDate(ds: string): string {
  const day = ds.slice(0, 10)
  const [y, m, d] = day.split('-').map(Number)
  if (!y || !m || !d) return ''
  const dt = new Date(y, m - 1, d)
  const month = dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').trim()
  return `${d} ${month}`
}

function pluralize(count: number): string {
  return count === 1 ? '1 registro' : `${count} registros`
}

/**
 * "Todos Sintomas": lista TODOS os sintomas já registrados pelo usuário
 * (health_metrics.category = 'sintoma'), em ordem alfabética, com contagem
 * de registros e data do último registro — estilo "Tracked Symptoms" do Guava.
 * Clicar num sintoma abre o painel de detalhe daquele sintoma (2º nível).
 */
export function AllSymptomsDialog({
  open,
  onOpenChange,
  metrics,
  onCompare,
}: AllSymptomsDialogProps) {
  const [symptoms, setSymptoms] = useState<SymptomSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [screen, setScreen] = useState<Screen>({ kind: 'list' })

  useEffect(() => {
    if (!open) {
      setScreen({ kind: 'list' })
      setQuery('')
      return
    }
    let cancelled = false
    setLoading(true)
    setQuery('')
    healthService
      .listAllSymptomMetrics()
      .then((rows) => {
        if (cancelled) return
        // Agrupa por nome normalizado; exibe o nome do registro mais recente.
        const byKey = new Map<string, SymptomSummary>()
        for (const m of rows) {
          const name = (m.text_value || m.notes || 'Sintoma').trim()
          const key = normalizeSymptomName(name)
          const prev = byKey.get(key)
          if (!prev) {
            byKey.set(key, { name, count: 1, lastWhen: m.date_time || '' })
          } else {
            prev.count += 1
            if ((m.date_time || '') > prev.lastWhen) {
              prev.lastWhen = m.date_time || ''
              prev.name = name
            }
          }
        }
        setSymptoms([...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
      })
      .catch((err) => console.error('Erro ao carregar sintomas:', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return symptoms
    return symptoms.filter((s) => s.name.toLowerCase().includes(q))
  }, [symptoms, query])

  const selectedKey = screen.kind === 'detail' ? screen.key : null

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setScreen({ kind: 'list' })
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        {screen.kind === 'list' ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">Todos Sintomas</DialogTitle>
              <DialogDescription className="text-xs">
                Sintomas já registrados, em ordem alfabética. Toque para ver o detalhe.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar sintoma…"
                className="h-8 pl-8 text-xs"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
              {loading ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Carregando…</p>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  {symptoms.length === 0
                    ? 'Nenhum sintoma registrado ainda.'
                    : 'Nenhum sintoma encontrado para esta busca.'}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {filtered.map((s) => (
                    <li key={s.name} className="py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setScreen({ kind: 'detail', key: normalizeSymptomName(s.name) })
                        }
                        className="w-full text-left group"
                      >
                        <p className="text-sm font-medium leading-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                          {s.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pluralize(s.count)}
                          {s.lastWhen ? ` • último: ${formatLastDate(s.lastWhen)}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <SymptomDetailPanel
            symptomKey={screen.key}
            metrics={metrics}
            onCompare={onCompare}
            onBack={() => setScreen({ kind: 'list' })}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
