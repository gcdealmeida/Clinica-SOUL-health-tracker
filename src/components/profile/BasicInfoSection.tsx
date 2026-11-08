import React, { useState } from 'react'
import { UserBasicProfile } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Edit2, Save, X, User as UserIcon, Heart, Calendar, Phone, Mail } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface BasicInfoSectionProps {
  profile: UserBasicProfile
  onSave: (data: Partial<UserBasicProfile>) => Promise<void>
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ profile, onSave }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(profile.name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [birthDate, setBirthDate] = useState(profile.birthDate || '')
  const [gender, setGender] = useState(profile.gender || 'Não informado')
  const [bloodType, setBloodType] = useState(profile.bloodType || '')
  const [heightCm, setHeightCm] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [weightKg, setWeightKg] = useState(profile.weightKg ? String(profile.weightKg) : '')
  const [contactNotes, setContactNotes] = useState(profile.contactNotes || '')

  // Reset form quando abrir edição ou perfil mudar
  const handleStartEdit = () => {
    setName(profile.name || '')
    setPhone(profile.phone || '')
    setBirthDate(profile.birthDate || '')
    setGender(profile.gender || 'Não informado')
    setBloodType(profile.bloodType || '')
    setHeightCm(profile.heightCm ? String(profile.heightCm) : '')
    setWeightKg(profile.weightKg ? String(profile.weightKg) : '')
    setContactNotes(profile.contactNotes || '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name,
        phone,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        bloodType: bloodType || undefined,
        heightCm: heightCm ? parseInt(heightCm, 10) : undefined,
        weightKg: weightKg ? parseFloat(weightKg.replace(',', '.')) : undefined,
        contactNotes,
      })
      toast({
        title: 'Perfil salvo com sucesso',
        description: 'Suas informações básicas foram atualizadas.',
      })
      setIsEditing(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar perfil',
        description: err.message || 'Tente novamente',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Idade calculada
  const computeAge = (birth?: string) => {
    if (!birth) return null
    const parts = birth.split('-')
    if (parts.length !== 3) return null
    const birthDateObj = new Date(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    )
    const diff = Date.now() - birthDateObj.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  const age = computeAge(profile.birthDate)

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            Informações Pessoais & Biometria
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Dados demográficos essenciais para calibração de scores clínicos e metas de saúde.
          </p>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={handleStartEdit} className="gap-1.5 text-xs">
            <Edit2 className="w-3.5 h-3.5" />
            Editar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prof-name" className="text-xs">
                  Nome Completo
                </Label>
                <Input
                  id="prof-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-email" className="text-xs">
                  Email (somente leitura)
                </Label>
                <Input id="prof-email" value={profile.email} disabled className="bg-muted/50" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-phone" className="text-xs">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="prof-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-birth" className="text-xs">
                  Data de Nascimento
                </Label>
                <Input
                  id="prof-birth"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-gender" className="text-xs">
                  Gênero
                </Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger id="prof-gender">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                    <SelectItem value="Não informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-blood" className="text-xs">
                  Tipo Sanguíneo
                </Label>
                <Select value={bloodType} onValueChange={setBloodType}>
                  <SelectTrigger id="prof-blood">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-height" className="text-xs">
                  Altura (cm)
                </Label>
                <Input
                  id="prof-height"
                  type="number"
                  placeholder="ex: 180"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prof-weight" className="text-xs">
                  Peso Atual / Meta (kg)
                </Label>
                <Input
                  id="prof-weight"
                  type="text"
                  placeholder="ex: 82.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                <Label htmlFor="prof-contact" className="text-xs">
                  Contato de Emergência
                </Label>
                <Input
                  id="prof-contact"
                  placeholder="Nome e telefone de emergência"
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary/70" />
                Nascimento / Idade
              </span>
              <p className="font-semibold text-foreground text-sm">
                {profile.birthDate || 'Não informado'}
                {age !== null ? ` (${age} anos)` : ''}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-primary/70" />
                Gênero
              </span>
              <p className="font-semibold text-foreground text-sm">
                {profile.gender || 'Não informado'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500/80" />
                Tipo Sanguíneo
              </span>
              <p className="font-semibold text-foreground text-sm">
                {profile.bloodType ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
                    {profile.bloodType}
                  </span>
                ) : (
                  'Não informado'
                )}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground">Altura</span>
              <p className="font-semibold text-foreground text-sm">
                {profile.heightCm ? `${profile.heightCm} cm` : 'Não informada'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground">Peso Referência</span>
              <p className="font-semibold text-foreground text-sm">
                {profile.weightKg ? `${profile.weightKg} kg` : 'Não informado'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-primary/70" />
                Telefone
              </span>
              <p className="font-semibold text-foreground text-sm truncate">
                {profile.phone || 'Não informado'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-primary/70" />
                Email
              </span>
              <p className="font-semibold text-foreground text-sm truncate">{profile.email}</p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-muted-foreground">Contato Emergência</span>
              <p className="font-semibold text-foreground text-sm truncate">
                {profile.contactNotes || 'Nenhum'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
