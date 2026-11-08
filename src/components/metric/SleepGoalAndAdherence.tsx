import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Star, Flame, Trophy, Clock, Calendar, Check, RotateCcw } from 'lucide-react'
import { HealthMetric } from '@/types'
import { dayKey, addDaysStr, formatDayLabel } from '@/lib/metricDetail'
import { todayStr } from '@/lib/localDate'

interface SleepAdherenceItem {
  day: string
  hours: number
  achieved: boolean
  diff: number // hours - goal (positivo = acima, negativo = abaixo)
}

export interface SleepStreakStats {
  currentStreak: number
  maxStreak: number
  maxStreakEndDay: string | null
  maxHours: { value: number; day: string } | null
  totalHours: number
  totalMinutesRemainder: number
  firstDay: string | null
  count: number
}

/**
 * Calcula sequência atual e máxima de dias consecutivos com sono >= meta
 */
export function computeSleepStreaks(items: HealthMetric[], goalHours: number): SleepStreakStats {
  // Mapa de dia -> maior valor de sono registrado naquele dia
  const byDay = new Map<string, number>()
  for (const m of items) {
    if (!m.date_time) continue
    const d = dayKey(m.date_time)
    const val = typeof m.numeric_value === 'number' ? m.numeric_value : 0
    if (val > 0) {
      byDay.set(d, Math.max(byDay.get(d) ?? 0, val))
    }
  }

  const days = [...byDay.keys()].sort()
  if (!days.length) {
    return {
      currentStreak: 0,
      maxStreak: 0,
      maxStreakEndDay: null,
      maxHours: null,
      totalHours: 0,
      totalMinutesRemainder: 0,
      firstDay: null,
      count: 0,
    }
  }

  // Max value + day
  let maxVal = 0
  let maxDay = days[0]
  let sum = 0
  for (const d of days) {
    const v = byDay.get(d)!
    sum += v
    if (v > maxVal) {
      maxVal = v
      maxDay = d
    }
  }

  // Calcular sequências
  let maxStreak = 0
  let maxStreakEndDay: string | null = null

  // Iterar todos os dias do menor ao maior
  let currentRun = 0
  let lastDay: string | null = null

  for (const d of days) {
    const val = byDay.get(d)!
    const met = val >= goalHours

    if (met) {
      if (lastDay && addDaysStr(lastDay, 1) === d) {
        currentRun += 1
      } else {
        currentRun = 1
      }
      if (currentRun > maxStreak) {
        maxStreak = currentRun
        maxStreakEndDay = d
      }
    } else {
      currentRun = 0
    }
    lastDay = d
  }

  // Current streak (terminando hoje ou ontem)
  const today = todayStr()
  let curr = 0
  let checkDay = today
  if (!byDay.has(checkDay) || (byDay.get(checkDay) ?? 0) < goalHours) {
    // Tenta a partir de ontem
    checkDay = addDaysStr(today, -1)
  }

  while (byDay.has(checkDay) && (byDay.get(checkDay) ?? 0) >= goalHours) {
    curr += 1
    checkDay = addDaysStr(checkDay, -1)
  }

  const totalHrs = Math.floor(sum)
  const totalMins = Math.round((sum - totalHrs) * 60)

  return {
    currentStreak: curr,
    maxStreak,
    maxStreakEndDay,
    maxHours: maxVal > 0 ? { value: maxVal, day: maxDay } : null,
    totalHours: totalHrs,
    totalMinutesRemainder: totalMins,
    firstDay: days[0],
    count: days.length,
  }
}

/** Formata horas decimais em "Xh Ym" */
export function formatHoursMins(val: number): string {
  if (isNaN(val) || val <= 0) return '0h'
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

interface SleepGoalAndAdherenceProps {
  items: HealthMetric[]
  goalHours: number
  onSaveGoal: (newGoal: number) => Promise<void>
  onResetGoal: () => Promise<void>
}

/**
 * Bloco estilo Guava Sleep All-time Stats:
 * - Botão Change Goal e Reset
 * - CURRENT STREAK e MAX STREAK (com data)
 * - Matriz / Grid de estrelas + termômetro de aderência
 * - MAX com data e TOTAL acumulado desde a primeira medição
 */
export function SleepGoalAndAdherenceBlock({
  items,
  goalHours,
  onSaveGoal,
  onResetGoal,
}: SleepGoalAndAdherenceProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draftGoal, setDraftGoal] = useState<string>(String(goalHours))
  const [saving, setSaving] = useState(false)

  const streaks = useMemo(() => computeSleepStreaks(items, goalHours), [items, goalHours])

  // Últimos 70 dias (10 semanas) para a matriz tipo calendário do Guava
  const adherenceGrid = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const m of items) {
      if (!m.date_time) continue
      const d = dayKey(m.date_time)
      const val = typeof m.numeric_value === 'number' ? m.numeric_value : 0
      if (val > 0) byDay.set(d, Math.max(byDay.get(d) ?? 0, val))
    }

    const today = todayStr()
    const result: SleepAdherenceItem[] = []
    // 70 dias até hoje
    for (let i = 69; i >= 0; i--) {
      const d = addDaysStr(today, -i)
      const hours = byDay.get(d) ?? 0
      result.push({
        day: d,
        hours,
        achieved: hours >= goalHours,
        diff: hours > 0 ? hours - goalHours : -goalHours,
      })
    }
    return result
  }, [items, goalHours])

  // Contagem de dias atingidos no período
  const achievedCount = adherenceGrid.filter((d) => d.achieved).length
  const daysWithData = adherenceGrid.filter((d) => d.hours > 0).length
  const adherenceRate = daysWithData > 0 ? Math.round((achievedCount / daysWithData) * 100) : 0

  const handleOpenDialog = () => {
    setDraftGoal(String(goalHours))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const parsed = parseFloat(draftGoal.replace(',', '.'))
    if (isNaN(parsed) || parsed < 4 || parsed > 14) return
    setSaving(true)
    try {
      await onSaveGoal(parsed)
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      await onResetGoal()
      setDraftGoal('7')
      setDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const fmtDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  return (
    <Card className="border-indigo-100 dark:border-indigo-950/60 shadow-xs">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Cabeçalho da Meta estilo Guava: "≥ 7h" "Change Goal" "Reset" */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Star className="h-4 w-4 fill-indigo-600 dark:fill-indigo-400" />
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-bold text-foreground">
                ≥ {goalHours} h
              </span>
              <span className="text-xs text-muted-foreground font-medium">Meta diária</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenDialog}
              className="h-8 text-xs font-medium border-border/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              Alterar Meta
            </Button>
            {goalHours !== 7 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                disabled={saving}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset (7h)
              </Button>
            )}
          </div>
        </div>

        {/* Streaks: CURRENT STREAK e MAX STREAK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                Sequência Atual (Current Streak)
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{streaks.currentStreak}</span>
              <span className="text-xs text-muted-foreground">
                dia{streaks.currentStreak !== 1 ? 's' : ''} consecutivo
                {streaks.currentStreak !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {streaks.currentStreak > 0
                ? 'Mantendo a meta diária de sono'
                : 'Meta não atingida hoje/ontem'}
            </p>
          </div>

          <div className="rounded-xl border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Trophy className="h-3 w-3 text-amber-500" />
                Maior Sequência (Max Streak)
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground">{streaks.maxStreak}</span>
              <span className="text-xs text-muted-foreground">
                dia{streaks.maxStreak !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {streaks.maxStreakEndDay
                ? `Recorde até ${fmtDay(streaks.maxStreakEndDay)}`
                : 'Ainda sem sequência registrada'}
            </p>
          </div>
        </div>

        {/* Termômetro e Grid de Estrelas / Aderência nos últimos 70 dias */}
        <div className="rounded-xl border p-3.5 bg-card space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                Aderência à Meta & Calendário de Estrelas
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Dias em que você atingiu ≥ {goalHours}h de sono (azul/estrelas) vs. abaixo da meta
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {achievedCount} de {daysWithData} dias ({adherenceRate}%)
              </span>
            </div>
          </div>

          {/* Barra tipo Termômetro de aderência */}
          <div className="space-y-1">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${adherenceRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Distância da meta (0%)</span>
              <span>
                Termômetro: {achievedCount} dia{achievedCount !== 1 ? 's' : ''} na meta
              </span>
              <span>Excelente (100%)</span>
            </div>
          </div>

          {/* Grid de 10 semanas (70 dias) estilo Guava heatmap / estrelas */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-1.5 px-0.5">
              <span>Há 10 semanas</span>
              <span>Hoje</span>
            </div>
            <div className="grid grid-cols-10 sm:grid-cols-14 gap-1.5">
              {adherenceGrid.map((item) => {
                const hasSleep = item.hours > 0
                const isMet = item.achieved
                const diffLabel =
                  item.diff >= 0
                    ? `+${item.diff.toFixed(1)}h acima da meta`
                    : `${Math.abs(item.diff).toFixed(1)}h abaixo da meta`

                let cellBg = 'bg-muted/40 text-muted-foreground/40 border-border/40'
                if (hasSleep && isMet) {
                  cellBg =
                    'bg-indigo-600 text-white shadow-xs border-indigo-700 hover:scale-110 transition-transform'
                } else if (hasSleep && !isMet) {
                  // Proporcional: mais próximo de goal = lilás mais suave
                  const ratio = Math.max(0.2, item.hours / goalHours)
                  cellBg =
                    ratio > 0.8
                      ? 'bg-indigo-200 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 border-indigo-300'
                      : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200'
                }

                return (
                  <div
                    key={item.day}
                    title={`${item.day}: ${hasSleep ? `${item.hours}h (${diffLabel})` : 'Sem registro'}`}
                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center p-0.5 cursor-pointer text-[10px] ${cellBg}`}
                  >
                    {isMet ? (
                      <Star className="h-3 w-3 fill-white text-white" />
                    ) : hasSleep ? (
                      <span className="font-bold text-[9px]">{item.hours}h</span>
                    ) : (
                      <span className="text-[8px]">•</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legenda do termômetro de estrelas */}
            <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-indigo-600 flex items-center justify-center">
                  <Star className="h-2 w-2 fill-white text-white" />
                </span>
                <span>Atingiu meta (≥ {goalHours}h)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-indigo-200 dark:bg-indigo-900/50 border border-indigo-300" />
                <span>Quase lá (≥ 80%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-amber-100 dark:bg-amber-950/40 border border-amber-200" />
                <span>Abaixo da meta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-muted/40 border border-border/40" />
                <span>Sem registro</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAX e TOTAL estilo Guava */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="rounded-xl border p-3 bg-muted/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Máximo (MAX)
              </p>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {streaks.maxHours ? formatHoursMins(streaks.maxHours.value) : '--'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {streaks.maxHours ? fmtDay(streaks.maxHours.day) : 'sem registros'}
              </p>
            </div>
            <Clock className="h-5 w-5 text-indigo-500/40" />
          </div>

          <div className="rounded-xl border p-3 bg-muted/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Acumulado
              </p>
              <p className="text-xl font-bold text-foreground">
                {streaks.totalHours}h {streaks.totalMinutesRemainder}m
              </p>
              <p className="text-[11px] text-muted-foreground">
                {streaks.firstDay ? `desde ${fmtDay(streaks.firstDay)}` : 'sem registros'}
              </p>
            </div>
            <Trophy className="h-5 w-5 text-indigo-500/40" />
          </div>
        </div>

        {/* Diálogo de alteração de meta */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                Definir Meta Diária de Sono
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                A National Sleep Foundation recomenda entre 7h e 9h de sono por noite para adultos.
                Defina sua meta pessoal:
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Meta de sono (horas)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={4}
                    max={14}
                    step={0.5}
                    value={draftGoal}
                    onChange={(e) => setDraftGoal(e.target.value)}
                    className="text-base font-bold w-28"
                  />
                  <span className="text-sm font-medium text-muted-foreground">horas por noite</span>
                </div>
              </div>

              {/* Botões rápidos de meta */}
              <div className="flex items-center gap-2 flex-wrap">
                {[6.5, 7, 7.5, 8, 8.5].map((g) => (
                  <Button
                    key={g}
                    type="button"
                    size="sm"
                    variant={parseFloat(draftGoal) === g ? 'default' : 'outline'}
                    onClick={() => setDraftGoal(String(g))}
                    className="h-8 text-xs"
                  >
                    {g}h
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Salvar Meta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
