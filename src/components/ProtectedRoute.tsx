import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { UserRole } from '@/types'

interface ProtectedRouteProps {
  requiredRole?: UserRole
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Usuário profissional não deve ver telas de cliente (Painel Hoje, Profile,
  // Insights, Biomarcadores...): é levado ao painel profissional. Cobrir o boot
  // com sessão já existente (refresh) e o acesso manual a essas rotas.
  const isProfessional = user.role === 'profissional'
  const isClientScreen = !requiredRole // rotas dentro do bloco sem requiredRole

  if (isProfessional && isClientScreen) {
    return <Navigate to="/profissional" replace state={{ from: location }} />
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'profissional') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
