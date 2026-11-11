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
import { Button } from '@/components/ui/button'
import { UserMenuDropdown } from '@/components/menu/UserMenuDropdown'

interface NavbarProps {
  currentTab?: string
}

export function Navbar({ currentTab }: NavbarProps) {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Navegação superior enxuta (padrão Guava): 6 destinos.
  // Registrar, Exames & Dietas, Refeições e Diário Emocional continuam com
  // suas rotas e são acessados a partir do Painel (quick actions/cards).
  const navItems = [
    { to: '/', label: 'Painel', icon: CalendarDays },
    { to: '/profile', label: 'Profile', icon: UserCheck },
    { to: '/insights', label: 'Insights', icon: Lightbulb },
    { to: '/biomarcadores', label: 'Biomarcadores', icon: FlaskConical },
    { to: '/records', label: 'Records', icon: FolderOpen },
    { to: '/sources', label: 'Sources', icon: Database },
  ]

  if (user?.role === 'profissional') {
    navItems.push({ to: '/profissional', label: 'Acompanhamento', icon: Users })
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md">
              <CalendarDays className="h-5 w-5 hidden" />
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 3c3 4 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6 6-10Z" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-lg tracking-tight text-foreground flex items-center gap-1.5">
                Clínica Soul
                <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
                  Health Tracker
                </span>
              </span>
            </div>
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
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold'
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
              className="bg-emerald-600 hover:bg-emerald-700"
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
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 font-semibold'
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
