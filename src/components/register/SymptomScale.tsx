import React from 'react'
import { Label } from '@/components/ui/label'

const SCALE_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function severityLabel(sev: number): string {
  if (sev <= 2) return 'Muito leve'
  if (sev <= 4) return 'Leve'
  if (sev <= 6) return 'Moderado'
  if (sev <= 8) return 'Intenso'
  return 'Severo'
}

function severityColor(sev: number): string {
  // verde → amarelo → laranja → vermelho
  if (sev <= 2) return 'bg-emerald-500'
  if (sev <= 4) return 'bg-amber-400'
  if (sev <= 6) return 'bg-orange-500'
  if (sev <= 8) return 'bg-rose-500'
  return 'bg-red-600'
}

function severityText(sev: number): string {
  if (sev <= 2) return 'text-emerald-600 dark:text-emerald-400'
  if (sev <= 4) return 'text-amber-600 dark:text-amber-400'
  if (sev <= 6) return 'text-orange-600 dark:text-orange-400'
  if (sev <= 8) return 'text-rose-600 dark:text-rose-400'
  return 'text-red-600 dark:text-red-400'
}

interface SymptomScaleProps {
  severity: string
  onChange: (sev: string) => void
}

export function SymptomScale({ severity, onChange }: SymptomScaleProps) {
  const sev = Number(severity) || 0
  return (
    <div
      className="space-y-3 pt-2 mt-3 rounded-xl border-2 border-primary/30 bg-primary/5 p-4 shadow-sm"
      aria-label="Escala de severidade e intensidade do sintoma"
    >
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold text-foreground flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${severityColor(sev)} motion-safe:animate-pulse`}
          />
          Escala de Severidade / Intensidade
        </Label>
        <span
          className={`text-lg font-extrabold px-3 py-1 rounded-lg bg-card border-2 shadow-sm ${severityText(sev)}`}
        >
          {sev}/10
        </span>
      </div>

      {/* Botões grandes clicáveis — cor se intensifica conforme o nível escolhido */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {SCALE_LEVELS.map((lvl) => {
          const isSelected = sev === lvl
          return (
            <button
              key={lvl}
              type="button"
              aria-label={`Severidade ${lvl} de 10`}
              aria-pressed={isSelected}
              onClick={() => onChange(String(lvl))}
              className={`relative h-11 w-11 rounded-xl border-2 font-bold text-base transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                isSelected
                  ? `scale-115 shadow-md border-foreground/30 text-white ${severityColor(lvl)}`
                  : 'bg-card text-muted-foreground border-border hover:scale-105 hover:border-primary/40 hover:bg-muted/60'
              }`}
            >
              {lvl}
              {isSelected && (
                <span
                  className={`absolute inset-x-0 -bottom-1.5 mx-auto w-1.5 h-1.5 rounded-full ${severityColor(lvl)} motion-safe:animate-ping`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Barra de progresso colorida da severidade atual */}
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${severityColor(sev)} motion-reduce:transition-none`}
          style={{ width: `${(sev / 10) * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
        <span>0 — Imperceptível</span>
        <span className={`font-bold ${severityText(sev)}`}>{severityLabel(sev)}</span>
        <span>10 — Intenso / Intolerável</span>
      </div>
    </div>
  )
}
