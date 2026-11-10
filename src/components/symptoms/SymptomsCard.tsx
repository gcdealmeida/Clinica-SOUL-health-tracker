import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SymptomGridTable } from '@/components/symptoms/SymptomGridTable'
import { SymptomPickerDialog } from '@/components/symptoms/SymptomPickerDialog'
import { SymptomCompareDialog } from '@/components/symptoms/SymptomCompareDialog'
import { buildSymptomGrid, SYMPTOM_PERIODS, type SymptomPeriod } from '@/lib/symptomGrid'
import type { HealthMetric } from '@/types'

interface SymptomsCardProps {
  metrics: HealthMetric[]
  onChanged: () => void
}

/** Seção Sintomas do painel Hoje: grade do período + "+ Sintomas" e "Comparar". */
export function SymptomsCard({ metrics, onChanged }: SymptomsCardProps) {
  const [period, setPeriod] = useState<SymptomPeriod>(7)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  const grid = useMemo(() => buildSymptomGrid(metrics, period), [metrics, period])

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Sintomas</CardTitle>
        <Link to="/registrar?category=sintoma" className="text-xs text-emerald-600 hover:underline">
          Registrar
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1.5">
          {SYMPTOM_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`text-[11px] px-3 py-1 rounded-full transition-colors ${
                period === p.id
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {grid.rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            Nenhum sintoma registrado neste período.
          </p>
        ) : (
          <SymptomGridTable grid={grid} period={period} />
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Sintomas
          </Button>
          <Button
            size="sm"
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setCompareOpen(true)}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
            Comparar
          </Button>
        </div>
      </CardContent>

      <SymptomPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSaved={onChanged} />
      <SymptomCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        metrics={metrics}
        period={period}
      />
    </Card>
  )
}
