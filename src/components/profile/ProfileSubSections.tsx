import React, { useState } from 'react'
import {
  ProfileBiomarker,
  ProfileCondition,
  ProfileAllergy,
  ProfileVaccination,
  ProfileEvent,
  ProfileGenetics,
  ProfileCareProvider,
  ProfileLifestyle,
} from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  Calendar,
  HeartPulse,
  Syringe,
  AlertTriangle,
  Stethoscope,
  Dna,
  History,
  Activity,
  UserCheck,
  Flame,
  Moon,
  Cigarette,
  Wine,
  Save,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

// -------------------------------------------------------------
// 1. BIOMARKERS SECTION
// -------------------------------------------------------------
interface BiomarkersSectionProps {
  items: ProfileBiomarker[]
  onAdd: (data: Omit<ProfileBiomarker, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const BiomarkersSection: React.FC<BiomarkersSectionProps> = ({ items, onAdd, onDelete }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [unit, setUnit] = useState('')
  const [referenceRange, setReferenceRange] = useState('')
  const [category, setCategory] = useState('Geral')
  const [status, setStatus] = useState('otimo')
  const [date, setDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !value) return
    setSubmitting(true)
    try {
      await onAdd({
        name,
        value,
        unit: unit || undefined,
        reference_range: referenceRange || undefined,
        category: category || undefined,
        status,
        date: date || undefined,
      })
      toast({ title: 'Biomarcador adicionado' })
      setOpen(false)
      setName('')
      setValue('')
      setUnit('')
      setReferenceRange('')
      setDate('')
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            Biomarkers & Painéis Laboratoriais
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Marcadores clínicos, lipídicos, metabólicos e hormonais rastreados.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Biomarcador
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhum biomarcador registrado. Adicione seus índices lipídicos, glicêmicos ou hormonais.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-lg border border-border/70 bg-card/60 hover:bg-card transition-colors flex flex-col justify-between text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-foreground text-sm leading-tight">
                    {b.name}
                  </div>
                  <button
                    onClick={() => onDelete(b.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {b.value}
                  </span>
                  {b.unit && <span className="text-muted-foreground text-xs">{b.unit}</span>}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>Ref: {b.reference_range || 'N/A'}</span>
                  {b.date && <span>{b.date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Novo Biomarcador</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Nome do Biomarcador *</Label>
                  <Input
                    placeholder="Ex: Colesterol HDL, PCR-us, Vitamina D"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Valor *</Label>
                    <Input
                      placeholder="Ex: 58 ou 1.2"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unidade</Label>
                    <Input
                      placeholder="mg/dL, ng/mL"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Faixa de Referência</Label>
                  <Input
                    placeholder="Ex: > 40 mg/dL ou < 1.0 mg/L"
                    value={referenceRange}
                    onChange={(e) => setReferenceRange(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Input
                      placeholder="Lipidograma, Metabólico..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Data do Exame</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Salvando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 2. CONDITIONS & INJURIES
// -------------------------------------------------------------
interface ConditionsSectionProps {
  items: ProfileCondition[]
  onAdd: (data: Omit<ProfileCondition, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const ConditionsSection: React.FC<ConditionsSectionProps> = ({ items, onAdd, onDelete }) => {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('condicao')
  const [status, setStatus] = useState('ativa')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    setSubmitting(true)
    try {
      await onAdd({
        title,
        type,
        status,
        date: date || undefined,
        description: description || undefined,
      })
      toast({ title: 'Registro adicionado com sucesso' })
      setOpen(false)
      setTitle('')
      setDescription('')
      setDate('')
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            Conditions & Injuries (Cirurgias & Diagnósticos)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Condições de saúde prévias, cirurgias, fraturas ou lesões crônicas.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Condição
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhuma condição ou lesão informada.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{c.title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {c.type}
                    </Badge>
                    {c.status && (
                      <Badge variant="secondary" className="text-[10px]">
                        {c.status}
                      </Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-muted-foreground text-xs">{c.description}</p>
                  )}
                  {c.date && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Data / Início: {c.date}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDelete(c.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nova Condição, Lesão ou Cirurgia</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Título / Diagnóstico *</Label>
                  <Input
                    placeholder="Ex: Apendicectomia, Menisco do Joelho, Resistência à Insulina"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="condicao">Condição Clínica</SelectItem>
                        <SelectItem value="lesao">Lesão / Ortopédica</SelectItem>
                        <SelectItem value="cirurgia">Cirurgia / Procedimento</SelectItem>
                        <SelectItem value="cronica">Crônica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativa">Ativa</SelectItem>
                        <SelectItem value="resolvida">Resolvida</SelectItem>
                        <SelectItem value="em_tratamento">Em Tratamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Data de Ocorrência / Diagnóstico</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Detalhes / Observações</Label>
                  <Input
                    placeholder="Detalhes relevantes para o médico integrativo"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 3. ALLERGIES SECTION
// -------------------------------------------------------------
interface AllergiesSectionProps {
  items: ProfileAllergy[]
  onAdd: (data: Omit<ProfileAllergy, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const AllergiesSection: React.FC<AllergiesSectionProps> = ({ items, onAdd, onDelete }) => {
  const [open, setOpen] = useState(false)
  const [allergen, setAllergen] = useState('')
  const [reaction, setReaction] = useState('')
  const [severity, setSeverity] = useState('Moderada')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allergen) return
    setSubmitting(true)
    try {
      await onAdd({
        allergen,
        reaction: reaction || undefined,
        severity: severity || undefined,
        notes: notes || undefined,
      })
      toast({ title: 'Alergia registrada' })
      setOpen(false)
      setAllergen('')
      setReaction('')
      setNotes('')
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Allergies (Alergias & Reações)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Alergias medicamentosas, alimentares, ambientais e gravidade.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Alergia
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhuma alergia conhecida cadastrada.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-lg border border-red-200/60 dark:border-red-950/60 bg-red-50/20 dark:bg-red-950/10 flex items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">{a.allergen}</span>
                    {a.severity && (
                      <Badge variant="destructive" className="text-[10px]">
                        {a.severity}
                      </Badge>
                    )}
                  </div>
                  {a.reaction && (
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">Reação:</span> {a.reaction}
                    </div>
                  )}
                  {a.notes && <p className="text-[11px] text-muted-foreground">{a.notes}</p>}
                </div>
                <button
                  onClick={() => onDelete(a.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Registrar Alergia</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Alérgeno (Substância / Medicamento / Alimento) *</Label>
                  <Input
                    placeholder="Ex: Dipirona, Penicilina, Amendoim, Frutos do Mar"
                    value={allergen}
                    onChange={(e) => setAllergen(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Reação</Label>
                    <Input
                      placeholder="Ex: Urticária, Edema de glote"
                      value={reaction}
                      onChange={(e) => setReaction(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Gravidade</Label>
                    <Select value={severity} onValueChange={setSeverity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Leve">Leve</SelectItem>
                        <SelectItem value="Moderada">Moderada</SelectItem>
                        <SelectItem value="Severa / Anafilaxia">Severa / Anafilaxia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observações Adicionais</Label>
                  <Input
                    placeholder="Orientações e cuidados"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 4. VACCINATIONS SECTION
// -------------------------------------------------------------
interface VaccinationsSectionProps {
  items: ProfileVaccination[]
  onAdd: (data: Omit<ProfileVaccination, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const VaccinationsSection: React.FC<VaccinationsSectionProps> = ({
  items,
  onAdd,
  onDelete,
}) => {
  const [open, setOpen] = useState(false)
  const [vaccine, setVaccine] = useState('')
  const [dose, setDose] = useState('')
  const [date, setDate] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [batch, setBatch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vaccine || !date) return
    setSubmitting(true)
    try {
      await onAdd({
        vaccine,
        dose: dose || undefined,
        date,
        next_due_date: nextDueDate || undefined,
        batch_or_clinic: batch || undefined,
      })
      toast({ title: 'Vacina cadastrada com sucesso' })
      setOpen(false)
      setVaccine('')
      setDose('')
      setDate('')
      setNextDueDate('')
      setBatch('')
    } catch (err: any) {
      toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Syringe className="w-4 h-4 text-teal-600" />
            Vaccinations (Carteira de Vacinação)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Imunizações registradas e reforços preventivos necessários.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Vacina
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhuma vacina registrada na sua carteira digital.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col justify-between text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-foreground text-sm">{v.vaccine}</div>
                  <button
                    onClick={() => onDelete(v.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1 text-muted-foreground text-[11px]">
                  {v.dose && (
                    <div>
                      Dose / Reforço: <span className="text-foreground font-medium">{v.dose}</span>
                    </div>
                  )}
                  <div>
                    Aplicada em: <span className="text-foreground font-medium">{v.date}</span>
                  </div>
                  {v.next_due_date && (
                    <div>
                      Próximo reforço:{' '}
                      <span className="text-emerald-600 font-medium">{v.next_due_date}</span>
                    </div>
                  )}
                  {v.batch_or_clinic && <div>Local/Lote: {v.batch_or_clinic}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Nova Vacinação</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Nome da Vacina *</Label>
                  <Input
                    placeholder="Ex: Gripe (Influenza), Tétano (dT), Febre Amarela"
                    value={vaccine}
                    onChange={(e) => setVaccine(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Dose / Esquema</Label>
                    <Input
                      placeholder="Ex: Anual, 1ª dose, Reforço"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Data de Aplicação *</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Próximo Reforço (Opcional)</Label>
                    <Input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Clínica ou Lote</Label>
                    <Input
                      placeholder="Ex: Fleury, UBS Central"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 5. EVENTS SECTION
// -------------------------------------------------------------
interface EventsSectionProps {
  items: ProfileEvent[]
  onAdd: (data: Omit<ProfileEvent, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const EventsSection: React.FC<EventsSectionProps> = ({ items, onAdd, onDelete }) => {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Check-up')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [impact, setImpact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !date) return
    setSubmitting(true)
    try {
      await onAdd({
        title,
        category: category || undefined,
        date,
        description: description || undefined,
        impact: impact || undefined,
      })
      toast({ title: 'Evento registrado' })
      setOpen(false)
      setTitle('')
      setDescription('')
      setDate('')
      setImpact('')
    } catch (err: any) {
      toast({ title: 'Erro ao registrar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-500" />
            Events (Linha do Tempo de Saúde & Vida)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Marcos importantes, diagnósticos marcantes, viagens ou mudanças de rotina.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Evento
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhum evento registrado.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((e) => (
              <div
                key={e.id}
                className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{e.title}</span>
                    {e.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.category}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">{e.date}</span>
                  </div>
                  {e.description && (
                    <p className="text-muted-foreground text-xs">{e.description}</p>
                  )}
                  {e.impact && (
                    <div className="text-[11px] text-primary/80 font-medium">
                      Impacto / Desfecho: {e.impact}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onDelete(e.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Novo Evento de Saúde</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Título do Evento *</Label>
                  <Input
                    placeholder="Ex: Início do Protocolo Clínica Soul, Viagem ao Exterior"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Input
                      placeholder="Protocolo, Viagem, etc."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="O que aconteceu"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Impacto no Bem-Estar</Label>
                  <Input
                    placeholder="Ex: Melhora do sono, Ganho de energia"
                    value={impact}
                    onChange={(e) => setImpact(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 6. GENETICS SECTION
// -------------------------------------------------------------
interface GeneticsSectionProps {
  items: ProfileGenetics[]
  onAdd: (data: Omit<ProfileGenetics, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const GeneticsSection: React.FC<GeneticsSectionProps> = ({ items, onAdd, onDelete }) => {
  const [open, setOpen] = useState(false)
  const [trait, setTrait] = useState('')
  const [geneVariant, setGeneVariant] = useState('')
  const [category, setCategory] = useState('')
  const [riskOrStatus, setRiskOrStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trait) return
    setSubmitting(true)
    try {
      await onAdd({
        trait,
        gene_variant: geneVariant || undefined,
        category: category || undefined,
        risk_or_status: riskOrStatus || undefined,
        notes: notes || undefined,
      })
      toast({ title: 'Traço genético adicionado' })
      setOpen(false)
      setTrait('')
      setGeneVariant('')
      setCategory('')
      setRiskOrStatus('')
      setNotes('')
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Dna className="w-4 h-4 text-purple-500" />
            Genetics (Marcadores & Polimorfismos)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Testes genéticos de metabolismo, longevidade, sensibilidade a nutrientes e fármacos.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Traço
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhum dado genético cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-lg border border-purple-200/50 dark:border-purple-950/50 bg-purple-50/10 dark:bg-purple-950/10 flex items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{g.trait}</span>
                    {g.risk_or_status && (
                      <Badge variant="outline" className="text-[10px]">
                        {g.risk_or_status}
                      </Badge>
                    )}
                  </div>
                  {g.gene_variant && (
                    <div className="text-[11px] font-mono text-purple-700 dark:text-purple-300">
                      Variante: {g.gene_variant}
                    </div>
                  )}
                  {g.notes && <p className="text-muted-foreground text-xs">{g.notes}</p>}
                </div>
                <button
                  onClick={() => onDelete(g.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Novo Marcador Genético</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Traço / Fenótipo *</Label>
                  <Input
                    placeholder="Ex: Metabolismo Lento de Cafeína, Risco Cardiovascular ApoE"
                    value={trait}
                    onChange={(e) => setTrait(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Gene / Variante</Label>
                    <Input
                      placeholder="CYP1A2 rs762551, APOE ε3/ε3"
                      value={geneVariant}
                      onChange={(e) => setGeneVariant(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Input
                      placeholder="Metabolismo, Longevidade..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Status / Conclusão</Label>
                  <Input
                    placeholder="Típico, Atenção, Favorável..."
                    value={riskOrStatus}
                    onChange={(e) => setRiskOrStatus(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Recomendações e Notas</Label>
                  <Input
                    placeholder="Conduta clínica ou nutricional sugerida"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 7. CARE PROVIDERS SECTION
// -------------------------------------------------------------
interface CareProvidersSectionProps {
  items: ProfileCareProvider[]
  onAdd: (data: Omit<ProfileCareProvider, 'id' | 'user' | 'created' | 'updated'>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export const CareProvidersSection: React.FC<CareProvidersSectionProps> = ({
  items,
  onAdd,
  onDelete,
}) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [clinic, setClinic] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !specialty) return
    setSubmitting(true)
    try {
      await onAdd({
        name,
        specialty,
        clinic_or_hospital: clinic || undefined,
        phone: phone || undefined,
        email: email || undefined,
        is_primary: isPrimary,
        notes: notes || undefined,
      })
      toast({ title: 'Profissional adicionado' })
      setOpen(false)
      setName('')
      setSpecialty('')
      setClinic('')
      setPhone('')
      setEmail('')
      setNotes('')
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar', description: err.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-emerald-600" />
            Care Providers (Equipe Médica & Terapeutas)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Médicos, nutricionistas, psicólogos e fisioterapeutas de acompanhamento.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1 text-xs">
          <Plus className="w-3.5 h-3.5" />
          Adicionar Profissional
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            Nenhum profissional de saúde cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{p.name}</span>
                    {p.is_primary && (
                      <Badge variant="default" className="text-[10px] bg-emerald-600">
                        Principal
                      </Badge>
                    )}
                  </div>
                  <div className="text-primary font-medium">{p.specialty}</div>
                  {p.clinic_or_hospital && (
                    <div className="text-muted-foreground text-[11px]">{p.clinic_or_hospital}</div>
                  )}
                  {(p.phone || p.email) && (
                    <div className="text-[11px] text-muted-foreground">
                      {p.phone} {p.email ? `• ${p.email}` : ''}
                    </div>
                  )}
                  {p.notes && <p className="text-[11px] text-muted-foreground pt-1">{p.notes}</p>}
                </div>
                <button
                  onClick={() => onDelete(p.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                  title="Remover"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Novo Profissional de Saúde</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-3 text-xs">
                <div className="space-y-1">
                  <Label>Nome do Profissional *</Label>
                  <Input
                    placeholder="Ex: Dra. Carolina Silva, Dr. Roberto Dias"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Especialidade *</Label>
                  <Input
                    placeholder="Ex: Medicina Integrativa, Cardiologia, Nutrição Esportiva"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Clínica / Hospital</Label>
                  <Input
                    placeholder="Ex: Clínica Soul, Hospital Sírio-Libanês"
                    value={clinic}
                    onChange={(e) => setClinic(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Telefone / WhatsApp</Label>
                    <Input
                      placeholder="+55 11 99999-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      placeholder="medico@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Input
                    placeholder="Anotações de acompanhamento"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// 8. LIFESTYLE SECTION
// -------------------------------------------------------------
interface LifestyleSectionProps {
  lifestyle: ProfileLifestyle | null
  onSave: (data: Partial<ProfileLifestyle>) => Promise<void>
}

export const LifestyleSection: React.FC<LifestyleSectionProps> = ({ lifestyle, onSave }) => {
  const [smoking, setSmoking] = useState(lifestyle?.smoking_status || 'Não fumante')
  const [alcoholDrinks, setAlcoholDrinks] = useState(
    lifestyle?.alcohol_drinks_per_week !== undefined
      ? String(lifestyle.alcohol_drinks_per_week)
      : '2',
  )
  const [exerciseDays, setExerciseDays] = useState(
    lifestyle?.exercise_days_per_week !== undefined
      ? String(lifestyle.exercise_days_per_week)
      : '4',
  )
  const [exerciseMin, setExerciseMin] = useState(
    lifestyle?.exercise_minutes_per_week !== undefined
      ? String(lifestyle.exercise_minutes_per_week)
      : '200',
  )
  const [diet, setDiet] = useState(lifestyle?.diet_pattern || 'Mediterrânea')
  const [sleepHours, setSleepHours] = useState(
    lifestyle?.sleep_hours_typical !== undefined ? String(lifestyle.sleep_hours_typical) : '7.5',
  )
  const [stress, setStress] = useState(lifestyle?.stress_level_typical || 'Moderado')
  const [sunMin, setSunMin] = useState(
    lifestyle?.sun_exposure_min_day !== undefined ? String(lifestyle.sun_exposure_min_day) : '15',
  )
  const [notes, setNotes] = useState(lifestyle?.notes || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        smoking_status: smoking,
        alcohol_drinks_per_week: alcoholDrinks ? parseInt(alcoholDrinks, 10) : 0,
        exercise_days_per_week: exerciseDays ? parseInt(exerciseDays, 10) : 0,
        exercise_minutes_per_week: exerciseMin ? parseInt(exerciseMin, 10) : 0,
        diet_pattern: diet,
        sleep_hours_typical: sleepHours ? parseFloat(sleepHours.replace(',', '.')) : 7,
        stress_level_typical: stress,
        sun_exposure_min_day: sunMin ? parseInt(sunMin, 10) : 0,
        notes,
      })
      toast({
        title: 'Estilo de vida atualizado',
        description: 'Seus hábitos foram salvos e influenciam o Preventive Health Score.',
      })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-border/80 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          Lifestyle (Hábitos de Vida & Longevidade)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pilares essenciais do seu dia a dia que determinam seu pilar de Ação no Health Score.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Cigarette className="w-3.5 h-3.5 text-muted-foreground" />
                Tabagismo
              </Label>
              <Select value={smoking} onValueChange={setSmoking}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Não fumante">Não fumante</SelectItem>
                  <SelectItem value="Ex-fumante">Ex-fumante</SelectItem>
                  <SelectItem value="Fumante ocasional">Fumante ocasional</SelectItem>
                  <SelectItem value="Fumante regular">Fumante regular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Wine className="w-3.5 h-3.5 text-muted-foreground" />
                Álcool (Doses/semana)
              </Label>
              <Input
                type="number"
                min="0"
                max="50"
                value={alcoholDrinks}
                onChange={(e) => setAlcoholDrinks(e.target.value)}
                placeholder="ex: 2"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                Exercício (Minutos/semana)
              </Label>
              <Input
                type="number"
                min="0"
                step="15"
                value={exerciseMin}
                onChange={(e) => setExerciseMin(e.target.value)}
                placeholder="ex: 180"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                Sono Típico (Horas)
              </Label>
              <Input
                type="text"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="ex: 7.5"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Padrão Alimentar / Dieta</Label>
              <Select value={diet} onValueChange={setDiet}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mediterrânea">Mediterrânea</SelectItem>
                  <SelectItem value="Anti-inflamatória">Anti-inflamatória</SelectItem>
                  <SelectItem value="Low Carb / Cetogênica">Low Carb / Cetogênica</SelectItem>
                  <SelectItem value="Plant-based / Vegetariana">
                    Plant-based / Vegetariana
                  </SelectItem>
                  <SelectItem value="Equilibrada Geral">Equilibrada Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Nível Típico de Estresse</Label>
              <Select value={stress} onValueChange={setStress}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixo">Baixo</SelectItem>
                  <SelectItem value="Moderado">Moderado</SelectItem>
                  <SelectItem value="Elevado">Elevado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Exposição ao Sol (Minutos/dia)</Label>
              <Input
                type="number"
                min="0"
                value={sunMin}
                onChange={(e) => setSunMin(e.target.value)}
                placeholder="ex: 15"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Dias de Treino por Semana</Label>
              <Input
                type="number"
                min="0"
                max="7"
                value={exerciseDays}
                onChange={(e) => setExerciseDays(e.target.value)}
                placeholder="ex: 4"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notas e Objetivos Pessoais de Longevidade</Label>
            <Input
              placeholder="Ex: Treinos resistidos 4x na semana, foco em sono profundo e recuperação"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Salvando...' : 'Salvar Hábitos de Vida'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
