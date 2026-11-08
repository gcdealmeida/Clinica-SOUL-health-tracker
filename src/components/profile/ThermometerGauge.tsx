import React, { useState } from 'react'
import { ReferenceRangeSegment, RangeStatus } from '@/lib/biomarkersCatalog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ThermometerGaugeProps {
  value: number | null
  displayValue?: string
  unit?: string
  minDisplay: number
  maxDisplay: number
  segments: ReferenceRangeSegment[]
  statusColor?: string
  statusLabel?: string
  isOutOfRange?: boolean
  className?: string
}

/**
 * Régua de termômetro horizontal estilo Guava / Health Scale:
 * - Barra horizontal dividida nos segmentos coloridos proporcionais à faixa clínica
 * - Marcador visual tipo pino/círculo posicionado exatamente no valor do usuário
 * - Tooltip interativo mostrando valor exato, unidade, faixa em que se encontra e legenda
 */
export const ThermometerGauge: React.FC<ThermometerGaugeProps> = ({
  value,
  displayValue,
  unit,
  minDisplay,
  maxDisplay,
  segments,
  statusColor = '#10b981',
  statusLabel,
  isOutOfRange,
  className = '',
}) => {
  const [hovered, setHovered] = useState(false)

  // Se não há valor registrado, desenha uma régua esmaecida
  const hasValue = value !== null && !isNaN(value)
  const totalSpan = Math.max(1, maxDisplay - minDisplay)

  // Calcula a posição percentual (0% a 100%) da agulha
  const needlePct = hasValue
    ? Math.max(0, Math.min(100, ((value - minDisplay) / totalSpan) * 100))
    : 0

  return (
    <div className={`space-y-1.5 ${className}`}>
      <TooltipProvider delayDuration={150}>
        <Tooltip open={hovered}>
          <TooltipTrigger asChild>
            <div
              className="relative py-2.5 cursor-pointer group"
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
            >
              {/* Barra segmentada de fundo */}
              <div className="h-2.5 sm:h-3 w-full rounded-full overflow-hidden flex bg-muted/60 shadow-inner">
                {segments.map((seg, idx) => {
                  const segSpan = Math.max(0, seg.max - seg.min)
                  const widthPct = (segSpan / totalSpan) * 100
                  return (
                    <div
                      key={idx}
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: seg.color,
                        opacity: hasValue ? 0.9 : 0.35,
                      }}
                      className="h-full transition-opacity duration-200 border-r border-background/20 last:border-r-0"
                      title={`${seg.label}: ${seg.min} - ${seg.max} ${unit || ''}`}
                    />
                  )
                })}
              </div>

              {/* Marcador / Pino da Régua */}
              {hasValue ? (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-10 flex flex-col items-center pointer-events-none"
                  style={{ left: `${needlePct}%` }}
                >
                  <div
                    className="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2 border-background shadow-md flex items-center justify-center transition-transform group-hover:scale-125"
                    style={{ backgroundColor: statusColor }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                  </div>
                  {/* Linha vertical sutil que corta a régua */}
                  <div
                    className="w-0.5 h-3.5 -mt-0.5 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-medium text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full border border-border/50">
                    Sem registro para posicionar na régua
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>

          <TooltipContent
            side="top"
            align="center"
            className="p-3 max-w-xs bg-popover/95 backdrop-blur-md border border-border shadow-lg rounded-xl text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-1.5">
              <span className="font-semibold text-foreground">
                {hasValue ? (
                  <>
                    Valor:{' '}
                    <span className="font-extrabold text-sm" style={{ color: statusColor }}>
                      {displayValue ?? value} {unit}
                    </span>
                  </>
                ) : (
                  'Aguardando primeiro registro'
                )}
              </span>
              {statusLabel && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${statusColor}20`,
                    color: statusColor,
                    borderColor: `${statusColor}40`,
                  }}
                >
                  {statusLabel}
                </span>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">Faixas clínicas da régua:</p>
              <div className="grid grid-cols-1 gap-1 pt-0.5">
                {segments.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      {seg.label}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {seg.min} – {seg.max} {unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isOutOfRange && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-border/40">
                ⚠ Este marcador está fora da faixa de referência ideal.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Rótulos de mínimo e máximo sob a barra */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
        <span>Min: {minDisplay}</span>
        <div className="flex items-center gap-2">
          {segments.map((seg, i) => (
            <span
              key={i}
              className="hidden sm:inline-flex items-center gap-1 text-[9px] text-muted-foreground/80"
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </span>
          ))}
        </div>
        <span>
          Max: {maxDisplay} {unit}
        </span>
      </div>
    </div>
  )
}
