import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  CalendarDays,
  UserCheck,
  Lightbulb,
  FlaskConical,
  FolderOpen,
  Database,
  Users,
} from 'lucide-react'
import { SoulBrandLogo } from '@/components/brand/SoulLogo'
import { Button } from '@/components/ui/button'
import { UserMenuDropdown } from '@/components/menu/UserMenuDropdown'

interface NavbarProps {
  currentTab?: string
}

export function Navbar({ currentTab }: NavbarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const isProfissional = user?.role === 'profissional'

  // Navegação superior enxuta (padrão Guava): 6 destinos — SOMENTE visão cliente.
  // Registrar, Exames & Dietas, Refeições e Diário Emocional continuam com
  // suas rotas e são acessados a partir do Painel (quick actions/cards).
  const clientNavItems = [
    { to: '/', label: 'Painel', icon: CalendarDays },
    { to: '/profile', label: 'Profile', icon: UserCheck },
    { to: '/insights', label: 'Insights', icon: Lightbulb },
    { to: '/biomarcadores', label: 'Biomarcadores', icon: FlaskConical },
    { to: '/records', label: 'Records', icon: FolderOpen },
    { to: '/sources', label: 'Sources', icon: Database },
  ]

  // Papel profissional não recebe a navegação de paciente: só o link do painel clínico.
  const navItems = isProfissional
    ? [{ to: '/profissional', label: 'Acompanhamento', icon: Users }]
    : clientNavItems

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="flex items-center">
            {/* Logo oficial completo: símbolo + SOUL + HEALTH TRACKER, bloco único */}
            <SoulBrandLogo />
          </NavLink>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-soul-gold/15 text-soul-brown dark:bg-soul-gold/10 dark:text-soul-gold-light font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User profile & controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <UserMenuDropdown align="right" />
          ) : (
            <Button
              size="sm"
              onClick={() => navigate('/login')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Entrar
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden border-t bg-muted/40 px-2 py-1.5 overflow-x-auto flex items-center gap-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-soul-gold/20 text-soul-brown dark:bg-soul-gold/15 dark:text-soul-gold-light font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </header>
  )
}
