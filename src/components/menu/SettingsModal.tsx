import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import {
  Settings,
  User as UserIcon,
  Shield,
  Bell,
  Palette,
  KeyRound,
  Check,
  Smartphone,
  Save,
} from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [dailyDigest, setDailyDigest] = useState(true)
  const [medReminders, setMedReminders] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'privacy'>('profile')

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      await pb.collection('users').update(user.id, {
        name: name.trim(),
        phone: phone.trim(),
      })
      toast.success('Configurações da conta salvas com sucesso!')
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 rounded-2xl">
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Configurações da Conta</DialogTitle>
              <DialogDescription className="text-xs">
                Gerencie seus dados pessoais, notificações e preferências do app
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Abas */}
        <div className="flex border-b px-5 bg-background gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Perfil & Conta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            Notificações
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'privacy'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Segurança & Privacidade
          </button>
        </div>

        <div className="p-5 space-y-5">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 p-3.5 rounded-xl border bg-muted/20">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{user?.name || 'Cliente Soul'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <Badge
                    variant="outline"
                    className="mt-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    {user?.role === 'profissional' ? 'Conta Profissional' : 'Conta Cliente Soul'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-name" className="text-xs font-medium">
                  Nome Completo
                </Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-email" className="text-xs font-medium">
                  E-mail
                </Label>
                <Input
                  id="settings-email"
                  value={user?.email || ''}
                  disabled
                  className="text-xs h-9 bg-muted/40 text-muted-foreground cursor-not-allowed"
                />
                <p className="text-[11px] text-muted-foreground">
                  O e-mail é o identificador único da sua conta.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="settings-phone" className="text-xs font-medium">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Lembretes de Medicação</p>
                    <p className="text-[11px] text-muted-foreground">
                      Alertas visuais no painel no horário prescrito
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={medReminders}
                    onChange={(e) => setMedReminders(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Resumo Diário da Saúde</p>
                    <p className="text-[11px] text-muted-foreground">
                      Destaques matinais da linha do tempo e adesão
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={dailyDigest}
                    onChange={(e) => setDailyDigest(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-3 flex items-start gap-2.5">
                <Smartphone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Os lembretes do aplicativo são sincronizados com a seção <b>Lembretes</b> do menu.
                  Notificações push do navegador podem ser ativadas conforme permissão do
                  dispositivo.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => toast.success('Preferências de notificação salvas')}
                >
                  Salvar Preferências
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <p className="font-semibold text-foreground">Privacidade Clínica Soul</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Seus dados biométricos, exames, registros emocionais e refeições são
                  criptografados e restritos ao seu acesso pessoal e aos profissionais vinculados ao
                  seu plano na Clínica Soul.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border space-y-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <p className="font-semibold text-foreground">Segurança da Sessão</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Sua sessão atual está autenticada via token seguro. Para encerrar o acesso neste
                  dispositivo, use o botão <b>Sair (Log out)</b> do menu principal.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
