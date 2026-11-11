import React from 'react'

interface SpeedometerGaugeProps {
  value: number // 1 a 5
  onChange?: (val: number) => void
  interactive?: boolean
  size?: number
}

const ZONES = [
  { level: 1, label: 'Sereno / Zen', color: '#10b981', desc: 'Tranquilidade e paz interior' },
  { level: 2, label: 'Leve / Confortável', color: '#84cc16', desc: 'Tensão sob controle' },
  { level: 3, label: 'Moderado', color: '#eab308', desc: 'Alguns prazos e exigências' },
  { level: 4, label: 'Elevado', color: '#f97316', desc: 'Pressão alta, irritabilidade' },
  { level: 5, label: 'Crítico / Alarme', color: '#ef4444', desc: 'Sobrecarga aguda e esgotamento' },
]

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  value,
  onChange,
  interactive = true,
  size = 220,
}) => {
  // Ângulo de -90 a +90 graus (semicírculo superior)
  // level 1 => -72°, 2 => -36°, 3 => 0°, 4 => 36°, 5 => 72°
  const needleAngle = -90 + ((value - 0.5) / 5) * 180

  const currentZone = ZONES.find((z) => z.level === value) || ZONES[2]

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.58 }}>
        <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
          {/* Fundo do arco (cinza) */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* 5 segmentos coloridos do arco */}
          {/* Segmento 1: 180° a 144° (Zen - Verde) */}
          <path
            d="M 20 100 A 80 80 0 0 1 32.7 53"
            fill="none"
            stroke="#10b981"
            strokeWidth={value === 1 ? '18' : '14'}
            strokeLinecap="round"
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => interactive && onChange?.(1)}
          />
          {/* Segmento 2: 144° a 108° (Leve - Lima) */}
          <path
            d="M 33.5 50.5 A 80 80 0 0 1 68.3 23.9"
            fill="none"
            stroke="#84cc16"
            strokeWidth={value === 2 ? '18' : '14'}
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => interactive && onChange?.(2)}
          />
          {/* Segmento 3: 108° a 72° (Moderado - Amarelo) */}
          <path
            d="M 70.5 22.8 A 80 80 0 0 1 129.5 22.8"
            fill="none"
            stroke="#eab308"
            strokeWidth={value === 3 ? '18' : '14'}
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => interactive && onChange?.(3)}
          />
          {/* Segmento 4: 72° a 36° (Elevado - Laranja) */}
          <path
            d="M 131.7 23.9 A 80 80 0 0 1 166.5 50.5"
            fill="none"
            stroke="#f97316"
            strokeWidth={value === 4 ? '18' : '14'}
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => interactive && onChange?.(4)}
          />
          {/* Segmento 5: 36° a 0° (Crítico - Vermelho) */}
          <path
            d="M 167.3 53 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#ef4444"
            strokeWidth={value === 5 ? '18' : '14'}
            strokeLinecap="round"
            className="cursor-pointer transition-all hover:opacity-80"
            onClick={() => interactive && onChange?.(5)}
          />

          {/* Ponteiro central do velocímetro */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: '100px 100px',
              transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Linha da agulha */}
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="34"
              stroke={currentZone.color}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Ponta da agulha */}
            <polygon points="97,36 103,36 100,28" fill={currentZone.color} />
          </g>

          {/* Eixo central (botão / pivô) */}
          <circle cx="100" cy="100" r="8" fill="#1e293b" />
          <circle cx="100" cy="100" r="4" fill={currentZone.color} />
        </svg>

        {/* Marcadores de extremos */}
        <div className="flex justify-between text-[10px] text-muted-foreground px-3 -mt-1 font-medium">
          <span className="text-emerald-600 dark:text-emerald-400">0% Zen</span>
          <span className="text-amber-500">Médio</span>
          <span className="text-rose-500">100% Alarme</span>
        </div>
      </div>

      {/* Botões seletores para toque fácil em mobile */}
      {interactive && (
        <div className="grid grid-cols-5 gap-1.5 w-full mt-2">
          {ZONES.map((z) => {
            const isSel = z.level === value
            return (
              <button
                key={z.level}
                type="button"
                onClick={() => onChange?.(z.level)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border transition-all ${
                  isSel
                    ? 'shadow-sm text-white'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                }`}
                style={{
                  backgroundColor: isSel ? z.color : undefined,
                  borderColor: isSel ? z.color : undefined,
                }}
              >
                Nível {z.level}
              </button>
            )
          })}
        </div>
      )}

      {/* Descrição da zona atual */}
      <div className="mt-2 text-center">
        <span
          className="text-xs font-bold px-2.5 py-0.5 rounded-full inline-block"
          style={{
            backgroundColor: `${currentZone.color}20`,
            color: currentZone.color,
          }}
        >
          {currentZone.label} ({value}/5)
        </span>
        <p className="text-[11px] text-muted-foreground mt-0.5">{currentZone.desc}</p>
      </div>
    </div>
  )
}
