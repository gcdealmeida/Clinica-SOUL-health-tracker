import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { healthService } from '@/services/health'
import { normalizeSymptomName } from '@/lib/symptomCatalog'
import type { HealthMetric } from '@/types'

interface AllSymptomsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SymptomSummary {
  name: string
  count: number
  lastWhen: string
}

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
 */
export function AllSymptomsDialog({ open, onOpenChange }: AllSymptomsDialogProps) {
  const [symptoms, setSymptoms] = useState<SymptomSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Todos Sintomas</DialogTitle>
          <DialogDescription className="text-xs">
            Sintomas já registrados, em ordem alfabética.
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
                  <p className="text-sm font-medium leading-tight">{s.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pluralize(s.count)}
                    {s.lastWhen ? ` • último: ${formatLastDate(s.lastWhen)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
