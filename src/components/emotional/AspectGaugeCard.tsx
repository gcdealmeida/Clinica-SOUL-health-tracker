import React from 'react'
import { LifeAspectDefinition, LifeAspectKey } from '@/lib/emotionalDaylio'
import { Progress } from '@/components/ui/progress'

interface AspectGaugeCardProps {
  aspect: LifeAspectDefinition
  score: number // 0 a 100
  interactive?: boolean
  onChange?: (val: number) => void
  subtext?: string
}

export const AspectGaugeCard: React.FC<AspectGaugeCardProps> = ({
  aspect,
  score,
  interactive = false,
  onChange,
  subtext,
}) => {
  // Classificação textual do score
  const getScoreLabel = (s: number) => {
    if (s >= 85)
      return {
        label: 'Excelente',
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300',
      }
    if (s >= 70)
      return {
        label: 'Muito Bom',
        color: 'text-lime-600 bg-lime-50 dark:bg-lime-950/40 dark:text-lime-300',
      }
    if (s >= 50)
      return {
        label: 'Equilibrado',
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300',
      }
    if (s >= 30)
      return {
        label: 'Atenção',
        color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300',
      }
    return {
      label: 'Crítico',
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300',
    }
  }

  const status = getScoreLabel(score)

  // Renderizador específico pelo tipo de gauge visual
  const renderVisualMetric = () => {
    switch (aspect.gaugeType) {
      // 1. Termômetro (Saúde)
      case 'thermometer':
        return (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌡️</span>
              <div className="relative flex-1 h-3.5 bg-muted rounded-full overflow-hidden border">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-400 via-emerald-500 to-green-600"
                  style={{ width: `${score}%` }}
                />
              </div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm border -ml-1 border-white" />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground px-1">
              <span>Baixa Vitalidade</span>
              <span>Saúde Plena</span>
            </div>
          </div>
        )

      // 2. Bateria (Social)
      case 'battery': {
        const bars = Math.round((score / 100) * 5)
        return (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2 justify-center">
              <div className="relative inline-flex items-center p-1 bg-muted/60 rounded-lg border">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((b) => (
                    <div
                      key={b}
                      className={`w-6 h-5 rounded-sm transition-all ${
                        b <= bars ? 'bg-blue-500 shadow-sm' : 'bg-muted-foreground/15'
                      }`}
                    />
                  ))}
                </div>
                <div className="w-1.5 h-3 bg-muted-foreground/40 rounded-r-sm -mr-1 ml-1" />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Isolado</span>
              <span>Rede Ativa</span>
            </div>
          </div>
        )
      }

      // 3. Réguas com Marcadores (Parentes)
      case 'ruler':
        return (
          <div className="space-y-1.5 pt-1">
            <div className="relative h-4 bg-muted/60 rounded-md border flex items-center px-1">
              {/* Marcações da régua */}
              <div className="absolute inset-x-2 flex justify-between">
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className="w-px h-2 bg-muted-foreground/30" />
                ))}
              </div>
              <div
                className="h-2 rounded bg-cyan-500 transition-all duration-500 relative z-10"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Distante</span>
              <span>Harmonia Total</span>
            </div>
          </div>
        )

      // 4. Coração Pulsante (Conjugal)
      case 'heart': {
        const hearts = Math.round((score / 100) * 5)
        return (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-center gap-1.5 text-base">
              {[1, 2, 3, 4, 5].map((h) => (
                <span
                  key={h}
                  className={`transition-all transform ${
                    h <= hearts
                      ? 'text-pink-500 scale-110 drop-shadow-sm'
                      : 'text-muted/40 grayscale'
                  }`}
                >
                  ❤️
                </span>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Desalinhado</span>
              <span>Cumplicidade Máxima</span>
            </div>
          </div>
        )
      }

      // 5. Degraus / Passos (Filhos)
      case 'steps': {
        const steps = Math.round((score / 100) * 4)
        return (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-end justify-center gap-1.5 h-6">
              {[1, 2, 3, 4].map((st) => (
                <div
                  key={st}
                  className={`w-7 rounded-t transition-all ${
                    st <= steps ? 'bg-amber-500 shadow-sm' : 'bg-muted-foreground/15'
                  }`}
                  style={{ height: `${st * 25}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Pouco Tempo</span>
              <span>Presença & Vínculo</span>
            </div>
          </div>
        )
      }

      // 6. Lotus / Flor de Lótus (Espiritual)
      case 'lotus':
        return (
          <div className="space-y-1.5 pt-1">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden border">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-violet-400 to-purple-600"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Desconectado</span>
              <span className="flex items-center gap-1">Paz Interior 🕊️</span>
            </div>
          </div>
        )

      // 7. Estrelas / Lâmpada (Intelectual)
      case 'stars': {
        const stars = Math.round((score / 100) * 5)
        return (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-center gap-1 text-base">
              {[1, 2, 3, 4, 5].map((st) => (
                <span
                  key={st}
                  className={`transition-all ${
                    st <= stars ? 'text-indigo-500 drop-shadow-sm' : 'text-muted/30 grayscale'
                  }`}
                >
                  ⭐
                </span>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Rotina Passiva</span>
              <span>Estímulo Máximo 💡</span>
            </div>
          </div>
        )
      }

      // 8. Chamas / Foguete (Profissional)
      case 'flame':
        return (
          <div className="space-y-1.5 pt-1">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden border">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Estagnado</span>
              <span className="flex items-center gap-1">Alta Realização 🚀</span>
            </div>
          </div>
        )

      // 9. Manômetro / Escudo / Diamante (Financeiro)
      case 'gauge':
        return (
          <div className="space-y-1.5 pt-1">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden border">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-400 to-teal-600"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Sob Pressão</span>
              <span className="flex items-center gap-1">Segurança & Reserva 💎</span>
            </div>
          </div>
        )

      // 10. Escudo (Servir)
      case 'shield':
        return (
          <div className="space-y-1.5 pt-1">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden border">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-teal-400 to-cyan-600"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Pouco Impacto</span>
              <span className="flex items-center gap-1">Servindo ao Próximo 🤝</span>
            </div>
          </div>
        )

      // 11. Bússola (Emocional)
      case 'compass':
      default:
        return (
          <div className="space-y-1.5 pt-1">
            <div className="relative h-3 bg-muted rounded-full overflow-hidden border">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-400 to-violet-600"
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Vulnerável</span>
              <span className="flex items-center gap-1">Autocontrole Pleno 🧠</span>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="p-3.5 rounded-2xl border border-border/70 bg-card hover:shadow-sm transition-all flex flex-col justify-between">
      {/* Topo: Número, Ícone, Título e Badge de Score */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl p-1.5 rounded-xl bg-muted/40 border border-border/50">
              {aspect.emoji}
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-muted-foreground">
                  #{aspect.number}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                  {aspect.title}
                </h4>
              </div>
              <p
                className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5"
                title={aspect.description}
              >
                {aspect.description}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm sm:text-base font-extrabold text-foreground">{score}%</div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${status.color}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {/* Visual Ilustrativo Específico */}
        <div className="mt-3">{renderVisualMetric()}</div>
      </div>

      {/* Se interativo (permite ajuste fino 0 a 100) */}
      {interactive && onChange && (
        <div className="mt-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Ajustar percepção:</span>
            <span className="font-semibold text-foreground">{score}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={score}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
        </div>
      )}

      {subtext && (
        <div className="text-[10px] text-muted-foreground mt-2 italic bg-muted/20 px-2 py-1 rounded">
          {subtext}
        </div>
      )}
    </div>
  )
}
