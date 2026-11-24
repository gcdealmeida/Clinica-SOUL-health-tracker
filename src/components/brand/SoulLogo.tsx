import { cn } from '@/lib/utils'

/**
 * Identidade visual da Clínica Soul (Saúde e Bem Estar).
 * Reconstruída em SVG a partir do logo oficial (símbolo do infinito em
 * gradiente dourado + ponto central cobre/rosé) para ficar nítida em
 * qualquer tamanho — o JPG anexado é a referência, não o asset embutido.
 */

const GRADIENT_ID = 'soul-gold-gradient'

export function SoulMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      className={cn('block', className)}
      role="img"
      aria-label="Clínica Soul"
    >
      <defs>
        <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#B98A44" />
          <stop offset="0.45" stopColor="#E8D3A8" />
          <stop offset="1" stopColor="#C69A5D" />
        </linearGradient>
        <radialGradient id="soul-copper-gradient" cx="0.35" cy="0.35" r="0.9">
          <stop offset="0" stopColor="#C98B72" />
          <stop offset="1" stopColor="#9E5B45" />
        </radialGradient>
      </defs>
      <path
        d="M25 30 C25 12 47 12 50 30 C53 48 75 48 75 30 C75 12 53 12 50 30 C47 48 25 48 25 30 Z"
        fill="none"
        stroke={`url(#${GRADIENT_ID})`}
        strokeWidth="8.5"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="30" r="6.5" fill="url(#soul-copper-gradient)" />
    </svg>
  )
}

/** Divisor fino com flor de lótus (eco do logo). */
export function LotusDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-soul-gold/60" />
      <svg
        viewBox="0 0 24 14"
        className="h-3.5 w-6 text-soul-gold"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 1 C10 4 10 8 12 11 C14 8 14 4 12 1 Z" />
        <path d="M12 11 C8 11.5 4 9.5 2.5 5.5 C7 5 10.5 7 12 11 Z" />
        <path d="M12 11 C16 11.5 20 9.5 21.5 5.5 C17 5 13.5 7 12 11 Z" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-soul-gold/60" />
    </div>
  )
}

/** Logo completo: símbolo + "CLÍNICA" + "SOUL" serifado + lótus + tagline. */
export function SoulLogo({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      <SoulMark className={cn('w-40', markClassName)} />
      <p className="eyebrow mt-3 text-[10px] text-soul-brown-light dark:text-soul-gold-light/80">
        Clínica
      </p>
      <p className="font-display text-5xl font-semibold leading-tight tracking-[0.22em] text-soul-brown dark:text-soul-gold-light">
        SOUL
      </p>
      <LotusDivider className="mt-1 w-44" />
      <p className="eyebrow mt-1.5 text-[9px] text-soul-brown/90 dark:text-soul-gold-light/70">
        Saúde e Bem Estar
      </p>
    </div>
  )
}

/** Símbolo do infinito com pulso — usado em estados de loading. */
export function SoulLoader({ className }: { className?: string }) {
  return <SoulMark className={cn('animate-pulse', className)} />
}
