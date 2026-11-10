import { Fragment } from 'react'
import { severityDotClass, type SymptomGrid, type SymptomPeriod } from '@/lib/symptomGrid'

// Largura de cada coluna da grade por período (px)
const CELL_WIDTH: Record<SymptomPeriod, number> = { 7: 30, 28: 20, 90: 38 }

/** Template de colunas: nome | severidade | dias/semanas. Compartilhado pelo cabeçalho e pelas linhas. */
export function symptomGridTemplate(period: SymptomPeriod, columns: number): string {
  return `minmax(104px,1fr) auto repeat(${columns}, ${CELL_WIDTH[period]}px)`
}

/**
 * Grade estilo Guava: colunas terminando hoje, uma linha por sintoma,
 * bolinha colorida (cor e opacidade pela severidade) nos dias com registro,
 * pontinho cinza nos demais e círculo vazio hoje. Rola na horizontal no mobile.
 */
export function SymptomGridTable({ grid, period }: { grid: SymptomGrid; period: SymptomPeriod }) {
  const template = symptomGridTemplate(period, grid.columns.length)

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-max">
        <div className="grid items-center" style={{ gridTemplateColumns: template }}>
          <span />
          <span />
          {grid.columns.map((c) => (
            <span
              key={c.key}
              className={`mx-auto text-[10px] leading-none py-1 ${
                c.isToday
                  ? 'h-4 w-4 flex items-center justify-center rounded-full bg-emerald-600 text-white font-bold'
                  : 'text-muted-foreground'
              } ${period === 90 ? 'whitespace-nowrap text-[9px]' : ''}`}
            >
              {c.header}
            </span>
          ))}

          {grid.rows.map((row, rowIdx) => {
            const border = rowIdx > 0 ? 'border-t border-border/50' : ''
            return (
              <Fragment key={row.name}>
                <div className={`min-w-0 py-2.5 pr-2 ${border}`}>
                  <p className="text-xs font-medium truncate" title={row.name}>
                    {row.name}
                  </p>
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full mr-1"
                    style={{ backgroundColor: row.group.color }}
                    aria-hidden
                  />
                  <span className="text-[10px] text-muted-foreground">{row.group.label}</span>
                </div>
                <div
                  className={`py-2.5 pr-2 text-[11px] text-muted-foreground whitespace-nowrap self-center ${border}`}
                >
                  severidade {row.latestSeverity}/10
                </div>
                {row.cells.map((sev, j) => {
                  const col = grid.columns[j]
                  const todayCls = col.isToday
                    ? `bg-emerald-50/70 dark:bg-emerald-950/30 border-l border-dashed border-muted-foreground/40 ${
                        rowIdx === 0 ? 'rounded-t-md' : ''
                      } ${rowIdx === grid.rows.length - 1 ? 'rounded-b-md' : ''}`
                    : ''
                  return (
                    <div
                      key={col.key}
                      className={`flex items-center justify-center py-2.5 ${border} ${todayCls}`}
                      title={
                        sev !== null
                          ? `${row.name} · ${col.header} · severidade ${sev}/10`
                          : `${row.name} · sem registro`
                      }
                    >
                      {sev !== null ? (
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${severityDotClass(sev)}`}
                          style={{ opacity: 0.45 + (sev / 10) * 0.55 }}
                        />
                      ) : col.isToday ? (
                        <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground/70" />
                      ) : (
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                  )
                })}
              </Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
