import soulLogoFullUrl from '@/assets/soulhealthtrackerbege-1cc42.svg'
import soulLogoRaw from '@/assets/soulhealthtrackerbege-1cc42.svg?raw'
import { cn } from '@/lib/utils'

/**
 * Logo OFICIAL da Clínica Soul (Health Tracker).
 *
 * A fonte da verdade é o SVG oficial enviado pela clínica
 * (src/assets/soulhealthtrackerbege-1cc42.svg): símbolo do infinito-DNA em
 * gradiente dourado (#B77522→#FFD998→…→#AB7941) com traços cobre, sobre fundo
 * creme #F4EFE8, wordmark SOUL serifado #542A17 e subtítulo HEALTH TRACKER.
 *
 * O vetor NÃO é redesenhado aqui — usamos o arquivo inteiro (importado pelo
 * Vite) para o logo completo, e a região do símbolo (viewBox recortado com as
 * MESMAS coordenadas e gradientes do arquivo) para o SoulMark do Navbar.
 */

/**
 * Símbolo do infinito-DNA: recorte exato do SVG oficial.
 * As coordenadas vêm do arquivo original — nada foi recalculado nem
 * redesenhado; apenas limitamos a janela de visualização ao símbolo.
 */
const SYMBOL_VIEWBOX = '108 160 668 250'

export function SoulMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={cn('block', className)}
      role="img"
      aria-label="Clínica Soul — Health Tracker"
    >
      <image href={soulLogoFullUrl} x="0" y="0" width="887" height="887" />
    </svg>
  )
}

/** Logo completo na íntegra: arte oficial do anexo, sem recriação. */
export function SoulLogo({ className }: { className?: string }) {
  return (
    <img
      src={soulLogoFullUrl}
      alt="Clínica Soul — Health Tracker"
      className={cn('block w-64 max-w-full select-none', className)}
      draggable={false}
    />
  )
}

/**
 * Bloco completo da marca para o cabeçalho: símbolo + SOUL + HEALTH TRACKER,
 * como um único desenho. É o MESMO SVG oficial, apenas com a janela de
 * visualização (viewBox) enquadrando símbolo e escritos e com o rect de fundo
 * creme removido (fundo transparente no menu). Nenhum vetor é redesenhado.
 */
// Janela enquadra símbolo (y≈167–702, x≈132–768) e escritos abaixo dele.
const BRAND_BLOCK_X = 100
const BRAND_BLOCK_Y = 140
const BRAND_BLOCK_WIDTH = 700
const BRAND_BLOCK_HEIGHT = 580
const brandBlockUrl =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    soulLogoRaw
      .replace(
        'width="887" height="887" viewBox="0 0 887 887"',
        `width="${BRAND_BLOCK_WIDTH}" height="${BRAND_BLOCK_HEIGHT}" viewBox="${BRAND_BLOCK_X} ${BRAND_BLOCK_Y} ${BRAND_BLOCK_WIDTH} ${BRAND_BLOCK_HEIGHT}"`,
      )
      .replace('<rect id="fundo" width="100%" height="100%" fill="#F4EFE8"/>', ''),
  )

/** Logo completo (símbolo + escritos) para o cabeçalho, sem fundo creme. */
export function SoulBrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={brandBlockUrl}
      alt="Clínica Soul — Health Tracker"
      width={BRAND_BLOCK_WIDTH}
      height={BRAND_BLOCK_HEIGHT}
      className={cn('block h-14 w-auto select-none', className)}
      draggable={false}
    />
  )
}

/** Símbolo do infinito-DNA com pulso — usado em estados de loading. */
export function SoulLoader({ className }: { className?: string }) {
  return <SoulMark className={cn('animate-pulse', className)} />
}

/**
 * Divisor fino com gradiente dourado (eco da marca).
 * A antiga flor de lótus foi desenhada à mão e não faz parte da arte oficial;
 * mantemos apenas o traço dourado que acompanha o subtítulo do logo.
 */
export function LotusDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-soul-gold/60" />
      <span className="h-px w-8 bg-soul-gold" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-soul-gold/60" />
    </div>
  )
}
