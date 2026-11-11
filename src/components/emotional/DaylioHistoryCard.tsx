import React from 'react'
import { EmotionalLog } from '@/types'
import {
  MOOD_LEVELS,
  findEmotionMeta,
  formatDateFriendly,
  SLEEP_OPTIONS,
  NUTRITION_OPTIONS,
  PHYSICAL_ACTIVITY_OPTIONS,
  HIGH_MED_LOW_OPTIONS,
} from '@/lib/emotionalDaylio'
import { Button } from '@/components/ui/button'
import { Trash2, Calendar, Sparkles } from 'lucide-react'

interface DaylioHistoryCardProps {
  log: EmotionalLog
  onDelete?: (id: string) => void
  onEdit?: (log: EmotionalLog) => void
}

export const DaylioHistoryCard: React.FC<DaylioHistoryCardProps> = ({ log, onDelete, onEdit }) => {
  const mood = MOOD_LEVELS.find((m) => m.score === log.mood_score) || MOOD_LEVELS[2]

  const dateLabel = formatDateFriendly(log.date || '')

  // Emoções Daylio selecionadas
  const emotionsList = Array.isArray(log.emotions) ? log.emotions : []

  // Labels complementares
  const sleepOpt = SLEEP_OPTIONS.find((s) => s.value === log.sleep_status)
  const nutOpt = NUTRITION_OPTIONS.find((n) => n.value === log.nutrition)
  const actOpt = PHYSICAL_ACTIVITY_OPTIONS.find((a) => a.value === log.physical_activity)

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
      {/* Topo: Ícone de Humor do Daylio + Data amigável + Ações */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar de humor estilo Daylio */}
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${mood.bgLight} ${mood.ringColor} ring-1`}
          >
            {mood.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dateLabel}
              </span>
              <span className="text-[10px] text-muted-foreground/60">•</span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {(log.created || '').slice(11, 16) || 'Check-in diário'}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-foreground capitalize tracking-tight mt-0.5">
              {log.mood_label || mood.label}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(log)}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 rounded-xl"
            >
              Editar
            </Button>
          )}
          {onDelete && log.id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(log.id)}
              className="h-8 w-8 text-muted-foreground/60 hover:text-rose-500 rounded-xl"
              title="Excluir este registro"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Chips de Emoções no estilo Daylio (pílulas com ícone) */}
      {emotionsList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {emotionsList.map((emoId) => {
            const meta = findEmotionMeta(emoId)
            return (
              <span
                key={emoId}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted/60 border border-border/60 text-foreground hover:bg-muted transition-colors"
              >
                <span>{meta.emoji}</span>
                <span className="capitalize">{meta.label}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Chips de Hábitos & Percepções do dia (Sono, Alimentação, Exercício, Social) */}
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {sleepOpt && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
            {sleepOpt.emoji} sono {sleepOpt.label.toLowerCase()}
          </span>
        )}
        {actOpt && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50">
            {actOpt.emoji} {actOpt.label.toLowerCase()}
          </span>
        )}
        {nutOpt && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
            {nutOpt.emoji} alimentação {nutOpt.label.toLowerCase()}
          </span>
        )}
        {typeof log.energy_level === 'number' && log.energy_level > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50">
            ⚡ energia {log.energy_level}/5
          </span>
        )}
        {typeof log.stress_level === 'number' && log.stress_level > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50">
            ⏱️ estresse {log.stress_level}/5
          </span>
        )}
      </div>

      {/* O que afetou / Fatores externos */}
      {log.affecting_factors && (
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-xs">
          <span className="font-semibold text-foreground">Fatores do dia: </span>
          <span className="text-muted-foreground">{log.affecting_factors}</span>
        </div>
      )}

      {/* Reflexões / Notas livres */}
      {log.notes && (
        <div className="p-3 rounded-2xl bg-muted/20 border border-border/40 text-xs italic text-muted-foreground">
          &ldquo;{log.notes}&rdquo;
        </div>
      )}
    </div>
  )
}
