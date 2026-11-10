import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { SettingsModal } from './SettingsModal'
import { DataSourcesModal } from './DataSourcesModal'
import { RemindersModal } from './RemindersModal'
import { ChevronDown, Settings, UploadCloud, Bell, LogOut, ChevronUp } from 'lucide-react'

interface UserMenuDropdownProps {
  /**
   * Classe customizada opcional para o botão trigger
   */
  className?: string
  /**
   * Se deve alinhar o menu à direita (padrão true)
   */
  align?: 'left' | 'right'
}

export function UserMenuDropdown({ className = '', align = 'right' }: UserMenuDropdownProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [openDataSources, setOpenDataSources] = useState(false)
  const [openReminders, setOpenReminders] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Iniciais do Avatar
  const avatarInitial = (user?.name?.trim()?.[0] || user?.email?.[0] || 'U').toUpperCase()
  const displayName = user?.name || 'Minha Conta'

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
    navigate('/auth')
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Botão trigger: Nome da pessoa + avatar/chevron */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted/60 transition-colors text-sm font-medium text-foreground cursor-pointer focus:outline-hidden"
      >
        <span className="truncate max-w-[140px] sm:max-w-[200px]">{displayName}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Dropdown Menu Flutuante Estilo Guava */}
      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-72 sm:w-80 rounded-2xl bg-card border border-border/80 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-100`}
        >
          {/* Cabeçalho: Avatar com inicial + Nome completo + botão fechar/toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/70">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                {avatarInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              title="Recolher menu"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          {/* Lista de Opções (estilo Guava: ícone + rótulo) */}
          <div className="py-1">
            {/* 1. Fontes de Dados (Data sources) */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setOpenDataSources(true)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors text-left cursor-pointer"
            >
              <UploadCloud className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Fontes de Dados (Data sources)</span>
            </button>

            {/* 2. Lembretes (Reminders) */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setOpenReminders(true)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors text-left cursor-pointer"
            >
              <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Lembretes (Reminders)</span>
            </button>

            {/* 3. Configurações (Settings) */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setOpenSettings(true)
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors text-left cursor-pointer"
            >
              <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Configurações (Settings)</span>
            </button>
          </div>

          {/* Separador e Logout */}
          <div className="border-t border-border/70 pt-1 mt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors text-left cursor-pointer"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sair (Log out)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modais de suporte */}
      <SettingsModal open={openSettings} onOpenChange={setOpenSettings} />
      <DataSourcesModal open={openDataSources} onOpenChange={setOpenDataSources} />
      <RemindersModal open={openReminders} onOpenChange={setOpenReminders} />
    </div>
  )
}
