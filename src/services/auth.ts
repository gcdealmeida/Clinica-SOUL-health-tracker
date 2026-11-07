import pb from '@/lib/pocketbase/client'
import { User, UserRole } from '@/types'

export const authService = {
  getCurrentUser(): User | null {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return null
    }
    const rec = pb.authStore.record
    return {
      id: rec.id,
      email: rec.email || '',
      name: rec.name || '',
      avatar: rec.avatar ? pb.files.getURL(rec, rec.avatar) : undefined,
      role: (rec.role as UserRole) || 'cliente',
      phone: rec.phone || '',
      created: rec.created,
      updated: rec.updated,
    }
  },

  async login(email: string, pass: string): Promise<User> {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    const rec = authData.record
    return {
      id: rec.id,
      email: rec.email || '',
      name: rec.name || '',
      avatar: rec.avatar ? pb.files.getURL(rec, rec.avatar) : undefined,
      role: (rec.role as UserRole) || 'cliente',
      phone: rec.phone || '',
      created: rec.created,
      updated: rec.updated,
    }
  },

  async signup(data: {
    email: string
    password: string
    passwordConfirm: string
    name: string
    role: UserRole
    phone?: string
  }): Promise<User> {
    const userRecord = await pb.collection('users').create({
      email: data.email,
      password: data.password,
      passwordConfirm: data.passwordConfirm,
      name: data.name,
      role: data.role,
      phone: data.phone || '',
    })

    // Auto login
    const authData = await pb.collection('users').authWithPassword(data.email, data.password)
    const rec = authData.record
    return {
      id: rec.id,
      email: rec.email || '',
      name: rec.name || '',
      avatar: rec.avatar ? pb.files.getURL(rec, rec.avatar) : undefined,
      role: (rec.role as UserRole) || 'cliente',
      phone: rec.phone || '',
      created: rec.created,
      updated: rec.updated,
    }
  },

  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return true
    } catch (err) {
      console.error('Password reset request error:', err)
      throw err
    }
  },

  logout(): void {
    pb.authStore.clear()
  },

  async listClients(): Promise<User[]> {
    const records = await pb.collection('users').getFullList({
      filter: "role = 'cliente'",
      sort: 'name',
    })
    return records.map((rec) => ({
      id: rec.id,
      email: rec.email || '',
      name: rec.name || '',
      avatar: rec.avatar ? pb.files.getURL(rec, rec.avatar) : undefined,
      role: 'cliente',
      phone: rec.phone || '',
      created: rec.created,
      updated: rec.updated,
    }))
  },
}
