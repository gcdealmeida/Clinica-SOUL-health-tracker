import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  MOOD_LEVELS,
  ENERGY_LEVELS,
  DAYLIO_EMOTIONS,
  SLEEP_OPTIONS,
  PHYSICAL_ACTIVITY_OPTIONS,
  NUTRITION_OPTIONS,
  SOCIAL_OPTIONS,
  HIGH_MED_LOW_OPTIONS,
  deriveLifeAspectsFromLog,
} from '@/lib/emotionalDaylio'
import { SpeedometerGauge } from './SpeedometerGauge'
import { emotionalService } from '@/services/emotional'
import { todayStr } from '@/lib/localDate'
import { EmotionalLog } from '@/types'
import { CheckCircle2 } from 'lucide-react'

export interface CheckinFormState {
  moodScore: number
  energyLevel: number
  stressLevel: number
  selectedEmotions: string[]
  sleepStatus: string
  physicalActivity: string
  nutrition: string
  socialStatus: string
  familyStatus: string
  partnerStatus: string
  hobbiesStatus: string
  spiritualityStatus: string
  intellectStatus: string
  serviceStatus: string
  financialStatus: string
  affectingFactors: string
  notes: string
}

export const initialFormStateFromLog = (log?: EmotionalLog | null): CheckinFormState => ({
  moodScore: log?.mood_score ?? 4,
  energyLevel: log?.energy_level ?? 4,
  stressLevel: log?.stress_level ?? 2,
  selectedEmotions: log?.emotions ?? ['feliz', 'gratidao'],
  sleepStatus: log?.sleep_status ?? 'bom',
  physicalActivity: log?.physical_activity ?? 'mais_ou_menos',
  nutrition: log?.nutrition ?? 'boa',
  socialStatus: log?.social_status ?? 'mais_ou_menos',
  familyStatus: log?.family_status ?? 'alta',
  partnerStatus: log?.partner_status ?? 'alta',
  hobbiesStatus: log?.hobbies_status ?? 'media',
  spiritualityStatus: log?.spirituality_status ?? 'alta',
  intellectStatus: log?.intellect_status ?? 'media',
  serviceStatus: log?.service_status ?? 'media',
  financialStatus: log?.financial_status ?? 'alta',
  affectingFactors: log?.affecting_factors ?? '',
  notes: log?.notes ?? '',
})

interface DaylioCheckinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (savedLog: EmotionalLog) => void
  initialLog?: EmotionalLog | null
}

export const DaylioCheckinModal: React.FC<DaylioCheckinModalProps> = ({
  open,
  onOpenChange,
  onSaved,
  initialLog,
}) => {
  const [form, setForm] = useState<CheckinFormState>(() => initialFormStateFromLog(initialLog))
  const [submitting, setSubmitting] = useState(false)

  const updateField = <K extends keyof CheckinFormState>(key: K, val: CheckinFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const toggleEmotion = (id: string) => {
    setForm((prev) => ({
      ...prev,
      selectedEmotions: prev.selectedEmotions.includes(id)
        ? prev.selectedEmotions.filter((e) => e !== id)
        : [...prev.selectedEmotions, id],
    }))
  }

  const currentMood = MOOD_LEVELS.find((m) => m.score === form.moodScore) || MOOD_LEVELS[3]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const today = todayStr()

    try {
      const draftLog: Partial<EmotionalLog> = {
        mood_score: form.moodScore,
        energy_level: form.energyLevel,
        stress_level: form.stressLevel,
        sleep_status: form.sleepStatus,
        physical_activity: form.physicalActivity,
        nutrition: form.nutrition,
        social_status: form.socialStatus,
        family_status: form.familyStatus,
        partner_status: form.partnerStatus,
        hobbies_status: form.hobbiesStatus,
        spirituality_status: form.spiritualityStatus,
        intellect_status: form.intellectStatus,
        service_status: form.serviceStatus,
        financial_status: form.financialStatus,
      }
      const lifeAspects = deriveLifeAspectsFromLog(draftLog)

      const saved = await emotionalService.saveCheckin({
        date: today,
        mood_score: form.moodScore,
        mood_label: currentMood.label,
        energy_level: form.energyLevel,
        stress_level: form.stressLevel,
        emotions: form.selectedEmotions,
        sleep_status: form.sleepStatus,
        physical_activity: form.physicalActivity,
        nutrition: form.nutrition,
        social_status: form.socialStatus,
        family_status: form.familyStatus,
        partner_status: form.partnerStatus,
        hobbies_status: form.hobbiesStatus,
        spirituality_status: form.spiritualityStatus,
        intellect_status: form.intellectStatus,
        service_status: form.serviceStatus,
        financial_status: form.financialStatus,
        life_aspects: lifeAspects,
        affecting_factors: form.affectingFactors || undefined,
        notes: form.notes || undefined,
      })

      toast.success('Check-in do dia salvo com sucesso!')
      onSaved?.(saved)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar check-in')
    } finally {
      setSubmitting(false)
    }
  }

  const quickFactors = [
    'Qualidade do sono',
    'Carga de trabalho / prazos',
    'Alimentação pesada / limpa',
    'Treino físico vigoroso',
    'Momento com a família',
    'Meditação / Oração',
    'Tempo ao ar livre',
    'Preocupação financeira',
  ]

  const addQuickFactor = (factor: string) => {
    if (!form.affectingFactors) {
      updateField('affectingFactors', factor)
    } else if (!form.affectingFactors.includes(factor)) {
      updateField('affectingFactors', `${form.affectingFactors}, ${factor}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl rounded-2xl">
        {/* Topo no estilo Daylio */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl font-bold">
              {currentMood.emoji}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Check-in de Hoje
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Registro automático de hoje • Percepção & Vida 360º
              </DialogDescription>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-sm gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* 15 Seções na ordem exata */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* 1. HUMOR */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-[10px]">
                  1
                </span>
                Como você está hoje? (Humor)
              </Label>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentMood.bgLight}`}>
                {currentMood.label}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {MOOD_LEVELS.map((m) => {
                const isSel = form.moodScore === m.score
                return (
                  <button
                    key={m.score}
                    type="button"
                    onClick={() => updateField('moodScore', m.score)}
                    className={`py-3 px-1 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
                      isSel
                        ? `${m.bgLight} ${m.ringColor} ring-2 shadow-sm scale-105`
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-2xl sm:text-3xl mb-1">{m.emoji}</span>
                    <span className="text-[11px] font-bold capitalize text-foreground leading-tight">
                      {m.shortLabel}
                    </span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">
                      Nota {m.score}/5
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl">
              {currentMood.description}
            </p>
          </div>

          {/* 2. ENERGIA */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px]">
                  2
                </span>
                Nível de Energia & Disposição
              </Label>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                {ENERGY_LEVELS[form.energyLevel - 1].label} ({form.energyLevel}/5)
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {ENERGY_LEVELS.map((en) => {
                const isSel = form.energyLevel === en.level
                return (
                  <button
                    key={en.level}
                    type="button"
                    onClick={() => updateField('energyLevel', en.level)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center text-center transition-all ${
                      isSel
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-500 shadow-sm'
                        : 'border-border/60 hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-xl mb-1">{en.emoji}</span>
                    <div className="flex items-center gap-0.5 my-1 p-0.5 bg-muted rounded border border-border/60">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <div
                          key={bar}
                          className={`w-1.5 h-3 rounded-2xs ${
                            bar <= en.batteryBars ? 'bg-amber-500' : 'bg-muted-foreground/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-foreground">{en.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground text-center">
              {ENERGY_LEVELS[form.energyLevel - 1].sublabel}
            </p>
          </div>

          {/* 3. ESTRESSE */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-[10px]">
                3
              </span>
              Nível de Estresse (Acelerômetro)
            </Label>
            <SpeedometerGauge
              value={form.stressLevel}
              onChange={(val) => updateField('stressLevel', val)}
              size={240}
            />
          </div>

          {/* 4. EMOÇÕES */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center text-[10px]">
                  4
                </span>
                Emoções Presentes Hoje (Seleção Múltipla)
              </Label>
              <span className="text-xs text-muted-foreground">
                {form.selectedEmotions.length} selecionada(s)
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DAYLIO_EMOTIONS.map((emo) => {
                const isSelected = form.selectedEmotions.includes(emo.id)
                return (
                  <button
                    key={emo.id}
                    type="button"
                    onClick={() => toggleEmotion(emo.id)}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500 shadow-sm'
                        : 'border-border/60 hover:bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-lg mb-1">
                      {emo.emoji}
                    </div>
                    <span className="text-[11px] font-medium leading-tight text-center capitalize">
                      {emo.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. SONO */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px]">
                5
              </span>
              Status do Sono (Última Noite)
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {SLEEP_OPTIONS.map((sl) => {
                const isSel = form.sleepStatus === sl.value
                return (
                  <button
                    key={sl.value}
                    type="button"
                    onClick={() => updateField('sleepStatus', sl.value)}
                    className={`py-3 px-2 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isSel
                        ? `${sl.border} ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm font-bold text-foreground`
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-2xl mb-1">{sl.emoji}</span>
                    <span className="text-xs font-semibold">{sl.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 6. ATIVIDADE FÍSICA */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-[10px]">
                6
              </span>
              Atividade Física Hoje
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PHYSICAL_ACTIVITY_OPTIONS.map((act) => {
                const isSel = form.physicalActivity === act.value
                return (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => updateField('physicalActivity', act.value)}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isSel
                        ? 'border-teal-500 ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-950/40 font-bold text-foreground shadow-sm'
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-2xl mb-1">{act.emoji}</span>
                    <span className="text-xs text-center">{act.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 7. ALIMENTAÇÃO */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">
                7
              </span>
              Alimentação (Quão Saudável foi Hoje?)
            </Label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {NUTRITION_OPTIONS.map((nut) => {
                const isSel = form.nutrition === nut.value
                return (
                  <button
                    key={nut.value}
                    type="button"
                    onClick={() => updateField('nutrition', nut.value)}
                    className={`py-3 px-1 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isSel
                        ? 'border-emerald-600 ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-foreground shadow-sm'
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-2xl mb-1">{nut.emoji}</span>
                    <span className="text-[11px] font-semibold">{nut.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 8. SOCIAL */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px]">
                8
              </span>
              Social — Dedicação aos Amigos
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SOCIAL_OPTIONS.map((soc) => {
                const isSel = form.socialStatus === soc.value
                return (
                  <button
                    key={soc.value}
                    type="button"
                    onClick={() => updateField('socialStatus', soc.value)}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isSel
                        ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/40 font-bold text-foreground shadow-sm'
                        : 'border-border/60 hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <span className="text-xl mb-1">{soc.emoji}</span>
                    <span className="text-xs text-center">{soc.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 9 a 15. ASPECTOS COM ALTA / MÉDIA / BAIXA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilares Pessoais (Escala Alta / Média / Baixa)
              </span>
              <div className="flex-1 h-px bg-border/60" />
            </div>

            {/* 9. Família */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/10 text-cyan-600 flex items-center justify-center text-[10px]">
                    9
                  </span>
                  Família (filhos, pais, irmãos)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Como está a harmonia e contato hoje?
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('familyStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.familyStatus === hml.value
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-200 ring-1 ring-cyan-500'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 10. Esposa/Esposo */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-pink-500/10 text-pink-600 flex items-center justify-center text-[10px]">
                    10
                  </span>
                  Esposa / Esposo / Conjugal
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Companheirismo e afeto com parceiro(a)
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('partnerStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.partnerStatus === hml.value
                        ? 'border-pink-500 bg-pink-50 text-pink-900 dark:bg-pink-950/50 dark:text-pink-200 ring-1 ring-pink-500'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 11. Hobbies */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px]">
                    11
                  </span>
                  Hobbies & Lazer
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Tempo dedicado ao que você ama fazer
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('hobbiesStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.hobbiesStatus === hml.value
                        ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 ring-1 ring-amber-500'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 12. Espiritualidade */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-[10px]">
                    12
                  </span>
                  Espiritualidade & Fé
                </Label>
                <p className="text-[11px] text-muted-foreground">Paz interior e propósito maior</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('spiritualityStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.spiritualityStatus === hml.value
                        ? 'border-violet-500 bg-violet-50 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200 ring-1 ring-violet-500'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 13. Intelecto */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-[10px]">
                    13
                  </span>
                  Intelecto & Estudos
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Leitura, novos aprendizados e foco mental
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('intellectStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.intellectStatus === hml.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200 ring-1 ring-indigo-500'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 14. Servir */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center text-[10px]">
                    14
                  </span>
                  Servir (Contribuição Social)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Ajudar o próximo e impacto positivo
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('serviceStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.serviceStatus === hml.value
                        ? 'border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200 ring-1 ring-teal-500'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 15. Financeiro */}
            <div className="p-3.5 rounded-2xl border border-border/70 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-[10px]">
                    15
                  </span>
                  Financeiro & Reservas
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Controle de gastos e segurança das finanças
                </p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:w-64">
                {HIGH_MED_LOW_OPTIONS.map((hml) => (
                  <button
                    key={hml.value}
                    type="button"
                    onClick={() => updateField('financialStatus', hml.value)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all ${
                      form.financialStatus === hml.value
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/50 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-border/60 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {hml.emoji} {hml.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CAMPOS ORIGINAIS PRESERVADOS */}
          <div className="p-4 rounded-2xl border border-border/70 bg-card space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              O que mais tem te afetado hoje?
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {quickFactors.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => addQuickFactor(q)}
                  className="text-[11px] bg-muted hover:bg-emerald-100 hover:text-emerald-900 px-2.5 py-1 rounded-full transition-colors"
                >
                  + {q}
                </button>
              ))}
            </div>
            <Input
              placeholder="Ex: Dormi menos de 6h, excesso de reuniões de trabalho..."
              value={form.affectingFactors}
              onChange={(e) => updateField('affectingFactors', e.target.value)}
              className="text-xs rounded-xl"
            />

            <div className="pt-2">
              <Label className="text-xs font-medium">Reflexão / Anotações Livres (Opcional)</Label>
              <Textarea
                placeholder="Algo específico que gostaria de compartilhar com sua equipe da Clínica Soul?"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="text-xs rounded-xl mt-1"
                rows={2}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-2xl text-sm shadow-md gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Salvando check-in...' : 'Concluir Check-in do Dia'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
