import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import {
  CalendarDays,
  PlusCircle,
  FileText,
  UtensilsCrossed,
  HeartPulse,
  Sparkles,
  Users,
  LogOut,
  UserCheck,
  Activity,
  FlaskConical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface NavbarProps {
  currentTab?: string
}

export function Navbar({ currentTab }: NavbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/', label: 'Hoje', icon: CalendarDays },
    { to: '/profile', label: 'Profile', icon: UserCheck },
    { to: '/biomarcadores', label: 'Biomarcadores', icon: FlaskConical },
    { to: '/registrar', label: 'Registrar', icon: PlusCircle },
    { to: '/exames-dietas', label: 'Exames & Dietas', icon: FileText },
    { to: '/refeicoes', label: 'Refeições (IA)', icon: UtensilsCrossed },
    { to: '/diario-emocional', label: 'Diário Emocional', icon: HeartPulse },
    { to: '/analises', label: 'Análises IA', icon: Sparkles },
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
              <Activity className="h-5 w-5" />
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
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-foreground leading-tight max-w-[140px] truncate">
                  {user.name || user.email}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                  {user.role === 'profissional' ? (
                    <Badge
                      variant="outline"
                      className="h-4 text-[9px] px-1 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Profissional
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-4 text-[9px] px-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      Cliente
                    </Badge>
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sair"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
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
