/* Side-effect import no main.tsx: define o favicon como o SVG OFICIAL do
 * logo da Clínica Soul. O index.html aponta para /favicon.ico (protegido e
 * não substituível), então o href correto é aplicado em runtime, no boot.
 */
import soulLogoUrl from '@/assets/soulhealthtrackerbege-1cc42.svg'

if (typeof document !== 'undefined') {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (existing) {
    existing.type = 'image/svg+xml'
    existing.href = soulLogoUrl
  } else {
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/svg+xml'
    link.href = soulLogoUrl
    document.head.appendChild(link)
  }
}
