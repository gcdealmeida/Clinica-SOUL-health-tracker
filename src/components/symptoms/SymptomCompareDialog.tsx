import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SymptomGridTable } from '@/components/symptoms/SymptomGridTable'
import { buildSymptomGrid, SYMPTOM_PERIODS, type SymptomPeriod } from '@/lib/symptomGrid'
import type { HealthMetric } from '@/types'

interface SymptomCompareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metrics: HealthMetric[]
  period: SymptomPeriod
  /** Sintoma pré-selecionado ao abrir (ex.: vindo do painel de detalhe). */
  initialSelected?: string
}

/** "Comparar": escolhe 2 ou mais sintomas do período e mostra a grade compartilhada deles. */
export function SymptomCompareDialog({
  open,
  onOpenChange,
  metrics,
  period,
  initialSelected,
}: SymptomCompareDialogProps) {
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (open && initialSelected) setPicked([initialSelected])
    if (!open) setPicked([])
  }, [open, initialSelected])

  const fullGrid = useMemo(() => buildSymptomGrid(metrics, period), [metrics, period])

  const selectedRows = useMemo(
    () => fullGrid.rows.filter((r) => picked.includes(r.name)),
    [fullGrid, picked],
  )

  const toggle = (name: string) =>
    setPicked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))

  const periodLabel = SYMPTOM_PERIODS.find((p) => p.id === period)?.label ?? ''

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setPicked([])
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Comparar sintomas</DialogTitle>
          <DialogDescription className="text-xs">
            Escolha 2 ou mais sintomas com registro em {periodLabel.toLowerCase()} para compará-los.
          </DialogDescription>
        </DialogHeader>

        {fullGrid.rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6">
            Nenhum sintoma registrado neste período.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {fullGrid.rows.map((r) => {
                const active = picked.includes(r.name)
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => toggle(r.name)}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-card hover:bg-muted'
                    }`}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {r.name}
                  </button>
                )
              })}
            </div>

            {selectedRows.length >= 2 ? (
              <div className="rounded-xl border p-3">
                <SymptomGridTable
                  grid={{ columns: fullGrid.columns, rows: selectedRows }}
                  period={period}
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Selecione pelo menos 2 sintomas para ver a comparação.
              </p>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPicked([])}>
                Limpar seleção
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
