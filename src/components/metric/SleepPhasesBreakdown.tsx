import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Moon, Sparkles, AlertCircle, Clock, Sunrise, Sunset } from 'lucide-react'
import { HealthMetric } from '@/types'
import { formatDayLabel, dayKey } from '@/lib/metricDetail'
import { formatHoursMins } from './SleepGoalAndAdherence'

export type SleepPhaseTab = 'total' | 'deep' | 'rem' | 'awake' | 'bedtime' | 'wakeup'

interface SleepPhasesBreakdownProps {
  items: HealthMetric[]
  activeTab: SleepPhaseTab
  onSelectTab: (tab: SleepPhaseTab) => void
}

/**
 * Seletor de abas de fases de sono estilo Guava:
 * [Total] [Deep] [REM] [Awake] [Bedtime] [Wakeup]
 * com detalhamento das fases da medição mais recente e médias do período
 */
export function SleepPhasesBreakdown({ items, activeTab, onSelectTab }: SleepPhasesBreakdownProps) {
  // Último registro de sono com dados
  const latest = items[0]

  // Médias de fases
  const stats = useMemo(() => {
    let deepSum = 0
    let deepCount = 0
    let remSum = 0
    let remCount = 0
    let awakeSum = 0
    let awakeCount = 0
    let totalSum = 0
    let totalCount = 0

    for (const m of items) {
      if (typeof m.numeric_value === 'number' && m.numeric_value > 0) {
        totalSum += m.numeric_value
        totalCount += 1
      }
      if (typeof m.sleep_deep_hours === 'number' && m.sleep_deep_hours > 0) {
        deepSum += m.sleep_deep_hours
        deepCount += 1
      }
      if (typeof m.sleep_rem_hours === 'number' && m.sleep_rem_hours > 0) {
        remSum += m.sleep_rem_hours
        remCount += 1
      }
      if (typeof m.sleep_awake_hours === 'number' && m.sleep_awake_hours > 0) {
        awakeSum += m.sleep_awake_hours
        awakeCount += 1
      }
    }

    return {
      avgTotal: totalCount ? totalSum / totalCount : null,
      avgDeep: deepCount ? deepSum / deepCount : null,
      avgRem: remCount ? remSum / remCount : null,
      avgAwake: awakeCount ? awakeSum / awakeCount : null,
      countWithPhases: Math.max(deepCount, remCount),
    }
  }, [items])

  const tabs: { id: SleepPhaseTab; label: string; sub?: string }[] = [
    {
      id: 'total',
      label: 'Total',
      sub: stats.avgTotal ? formatHoursMins(stats.avgTotal) : undefined,
    },
    {
      id: 'deep',
      label: 'Deep (Profundo)',
      sub: stats.avgDeep ? formatHoursMins(stats.avgDeep) : undefined,
    },
    { id: 'rem', label: 'REM', sub: stats.avgRem ? formatHoursMins(stats.avgRem) : undefined },
    {
      id: 'awake',
      label: 'Awake (Acordado)',
      sub: stats.avgAwake ? formatHoursMins(stats.avgAwake) : undefined,
    },
    { id: 'bedtime', label: 'Bedtime', sub: latest?.bedtime || '--' },
    { id: 'wakeup', label: 'Wakeup', sub: latest?.wakeup || '--' },
  ]

  // Barra de proporção de fases do registro mais recente
  const currentTotal = latest?.numeric_value ?? 0
  const currentDeep = latest?.sleep_deep_hours ?? 0
  const currentRem = latest?.sleep_rem_hours ?? 0
  const currentAwake = latest?.sleep_awake_hours ?? 0
  const currentLight = Math.max(0, currentTotal - currentDeep - currentRem)

  const hasPhasesOnLatest = currentDeep > 0 || currentRem > 0 || currentAwake > 0

  return (
    <div className="space-y-3">
      {/* Abas no estilo Guava: Total | Deep | REM | Awake | Bedtime | Wakeup */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex flex-col items-center gap-0.5 border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {tab.sub && (
                <span
                  className={`text-[10px] font-normal ${isActive ? 'text-indigo-100' : 'text-muted-foreground/70'}`}
                >
                  {tab.sub}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Card visual com o resumo da última noite e das fases */}
      {latest && (
        <Card className="border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/30 dark:bg-indigo-950/15">
          <CardContent className="p-3.5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600">
                  <Moon className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Última Noite (
                    {new Date(`${dayKey(latest.date_time)}T00:00:00`).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                    )
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Total:{' '}
                    <strong className="text-foreground">{formatHoursMins(currentTotal)}</strong>
                    {latest.bedtime && latest.wakeup
                      ? ` • Deitou ${latest.bedtime} → Acordou ${latest.wakeup}`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Horários se existirem */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {latest.bedtime && (
                  <div className="flex items-center gap-1">
                    <Sunset className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      Deitou: <strong className="text-foreground">{latest.bedtime}</strong>
                    </span>
                  </div>
                )}
                {latest.wakeup && (
                  <div className="flex items-center gap-1">
                    <Sunrise className="h-3.5 w-3.5 text-orange-500" />
                    <span>
                      Acordou: <strong className="text-foreground">{latest.wakeup}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra empilhada de fases do sono */}
            {hasPhasesOnLatest && currentTotal > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="h-3 rounded-full bg-muted overflow-hidden flex shadow-inner">
                  {currentDeep > 0 && (
                    <div
                      title={`Profundo (Deep): ${currentDeep}h`}
                      className="bg-indigo-700 h-full transition-all"
                      style={{ width: `${(currentDeep / currentTotal) * 100}%` }}
                    />
                  )}
                  {currentRem > 0 && (
                    <div
                      title={`REM: ${currentRem}h`}
                      className="bg-purple-500 h-full transition-all"
                      style={{ width: `${(currentRem / currentTotal) * 100}%` }}
                    />
                  )}
                  {currentLight > 0 && (
                    <div
                      title={`Leve (Light): ${currentLight.toFixed(1)}h`}
                      className="bg-indigo-400 h-full transition-all"
                      style={{ width: `${(currentLight / currentTotal) * 100}%` }}
                    />
                  )}
                  {currentAwake > 0 && (
                    <div
                      title={`Acordado (Awake): ${currentAwake}h`}
                      className="bg-amber-400 h-full transition-all"
                      style={{ width: `${(currentAwake / currentTotal) * 100}%` }}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-700 shrink-0" />
                    <span className="text-muted-foreground">Deep:</span>
                    <strong className="text-foreground">{formatHoursMins(currentDeep)}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-purple-500 shrink-0" />
                    <span className="text-muted-foreground">REM:</span>
                    <strong className="text-foreground">{formatHoursMins(currentRem)}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-indigo-400 shrink-0" />
                    <span className="text-muted-foreground">Light:</span>
                    <strong className="text-foreground">{formatHoursMins(currentLight)}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-400 shrink-0" />
                    <span className="text-muted-foreground">Awake:</span>
                    <strong className="text-foreground">{formatHoursMins(currentAwake)}</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
