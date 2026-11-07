import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { User, UserRole } from '@/types'
import { authService } from '@/services/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, pass: string) => Promise<User>
  signup: (data: {
    email: string
    password: string
    passwordConfirm: string
    name: string
    role: UserRole
    phone?: string
  }) => Promise<User>
  logout: () => void
  refreshUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = () => {
    const current = authService.getCurrentUser()
    setUser(current)
  }

  useEffect(() => {
    refreshUser()
    setIsLoading(false)

    // PocketBase auth store listener
    const unsubscribe = pb.authStore.onChange(() => {
      refreshUser()
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const loggedUser = await authService.login(email, pass)
    setUser(loggedUser)
    return loggedUser
  }

  const signup = async (data: {
    email: string
    password: string
    passwordConfirm: string
    name: string
    role: UserRole
    phone?: string
  }) => {
    const newUser = await authService.signup(data)
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
