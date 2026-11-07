import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { emotionalService } from '@/services/emotional'
import { EmotionalLog } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  HeartPulse,
  Smile,
  Frown,
  Meh,
  SunMedium,
  Zap,
  Activity,
  Calendar,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

const MOOD_OPTIONS = [
  {
    score: 5,
    label: 'Excelente / Pleno',
    emoji: '✨',
    description: 'Muita disposição, clareza mental e paz de espírito.',
  },
  {
    score: 4,
    label: 'Bem disposto / Focado',
    emoji: '😊',
    description: 'Bom equilíbrio, produtivo e motivado.',
  },
  {
    score: 3,
    label: 'Neutro / Estável',
    emoji: '😐',
    description: 'Dia rotineiro, sem oscilações expressivas.',
  },
  {
    score: 2,
    label: 'Cansado / Ansioso',
    emoji: '😟',
    description: 'Sensação de sobrecarga, irritabilidade ou desânimo leve.',
  },
  {
    score: 1,
    label: 'Exausto / Estressado',
    emoji: '😫',
    description: 'Esgotamento físico ou mental acentuado.',
  },
]

export default function EmotionalDiaryPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<EmotionalLog[]>([])
  const [loading, setLoading] = useState(true)

  // Form
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedScore, setSelectedScore] = useState<number>(4)
  const [affectingFactors, setAffectingFactors] = useState('')
  const [notes, setNotes] = useState('')
  const [energyLevel, setEnergyLevel] = useState<number>(4)
  const [stressLevel, setStressLevel] = useState<number>(2)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const res = await emotionalService.listLogs()
      setLogs(res)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar diário emocional')
    } finally {
      setLoading(false)
    }
  }

  const currentOption = MOOD_OPTIONS.find((o) => o.score === selectedScore) || MOOD_OPTIONS[1]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await emotionalService.createLog({
        date,
        mood_score: selectedScore,
        mood_label: currentOption.label,
        affecting_factors: affectingFactors || undefined,
        notes: notes || undefined,
        energy_level: energyLevel,
        stress_level: stressLevel,
      })

      toast.success('Check-in emocional registrado!')
      setAffectingFactors('')
      setNotes('')
      await loadLogs()
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
    'Consumo de cafeína tarde',
    'Término de projeto',
    'Preocupação financeira',
  ]

  const addQuickFactor = (factor: string) => {
    if (!affectingFactors) {
      setAffectingFactors(factor)
    } else if (!affectingFactors.includes(factor)) {
      setAffectingFactors(`${affectingFactors}, ${factor}`)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Diário Emocional Soul</h1>
            <Badge className="bg-violet-600 text-white border-0 text-xs flex items-center gap-1">
              <HeartPulse className="h-3 w-3" />
              Mente & Emoções
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe a relação entre seu humor, nível de estresse, clareza mental e hábitos do dia
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário de Check-in */}
          <Card className="lg:col-span-7 border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smile className="h-4 w-4 text-violet-600" />
                Como você está se sentindo hoje?
              </CardTitle>
              <CardDescription className="text-xs">
                Seu check-in diário ajuda a identificar gatilhos de estresse e bem-estar.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs">Data do Registro</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs max-w-xs"
                    required
                  />
                </div>

                {/* Seletor de Humor */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Selecione o estado geral de hoje:</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {MOOD_OPTIONS.map((opt) => {
                      const isSelected = selectedScore === opt.score
                      return (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() => setSelectedScore(opt.score)}
                          className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                            isSelected
                              ? 'border-violet-600 bg-violet-50 text-violet-950 dark:bg-violet-950/40 dark:text-violet-200 shadow-sm ring-1 ring-violet-500'
                              : 'border-border/70 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <span className="text-2xl mb-1">{opt.emoji}</span>
                          <span className="text-xs font-semibold leading-tight">
                            {opt.label.split(' / ')[0]}
                          </span>
                          <span className="text-[10px] opacity-70 mt-0.5">Nota {opt.score}/5</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">
                    <span className="font-medium text-foreground">{currentOption.label}: </span>
                    {currentOption.description}
                  </p>
                </div>

                {/* Níveis de Energia e Estresse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5 p-3 rounded-lg border bg-muted/10">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Nível de Energia
                      </Label>
                      <span className="text-xs font-bold text-foreground">{energyLevel} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={energyLevel}
                      onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Sem energia</span>
                      <span>Cheio de vitalidade</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-lg border bg-muted/10">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-rose-500" />
                        Nível de Estresse
                      </Label>
                      <span className="text-xs font-bold text-foreground">{stressLevel} / 5</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={stressLevel}
                      onChange={(e) => setStressLevel(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Totalmente em paz</span>
                      <span>Sob alta pressão</span>
                    </div>
                  </div>
                </div>

                {/* O que mais tem afetado */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">O que mais tem te afetado hoje?</Label>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {quickFactors.map((q) => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => addQuickFactor(q)}
                        className="text-[10px] bg-muted hover:bg-violet-100 hover:text-violet-900 px-2 py-0.5 rounded-full transition-colors"
                      >
                        + {q}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Ex: Dormi menos de 6h, excesso de reuniões de trabalho..."
                    value={affectingFactors}
                    onChange={(e) => setAffectingFactors(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Notas livres */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Reflexão / Anotações Livres (Opcional)
                  </Label>
                  <Textarea
                    placeholder="Algo específico que gostaria de compartilhar com sua equipe da Clínica Soul?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-medium"
                >
                  {submitting ? 'Salvando...' : 'Registrar Check-in Emocional'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Dicas e Conexão Corpo-Mente */}
          <Card className="lg:col-span-5 border-border/60 bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                Saúde Integrativa & Emoções
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs text-muted-foreground">
              <div className="p-3 rounded-lg border bg-card text-foreground/90 space-y-1">
                <p className="font-semibold text-xs text-violet-900 dark:text-violet-300">
                  Eixo Intestino-Cérebro & HRV
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Dias com estresse elevado (nota 4 ou 5) costumam antecipar quedas na Variabilidade
                  da Frequência Cardíaca (HRV) na manhã seguinte e alterações na digestão.
                </p>
              </div>

              <div className="p-3 rounded-lg border bg-card text-foreground/90 space-y-1">
                <p className="font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                  Cruzamento com a IA Soul
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Na aba <strong>Análises IA</strong>, você pode cruzar os dados deste diário
                  emocional com o consumo de café, sono e exames de sangue para descobrir
                  correlações surpreendentes.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico do Diário */}
        <section className="space-y-3 pt-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-600" />
            Histórico de Check-ins Emocionais
          </h2>

          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Carregando diário...
            </div>
          ) : logs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {logs.map((log) => {
                const opt = MOOD_OPTIONS.find((o) => o.score === log.mood_score) || MOOD_OPTIONS[2]
                return (
                  <Card key={log.id} className="border-border/60 hover:shadow-sm transition-shadow">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{opt.emoji}</span>
                          <div>
                            <span className="font-semibold text-sm text-foreground">
                              {log.mood_label}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {log.date}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs bg-violet-50 text-violet-800 border-violet-200"
                        >
                          {log.mood_score} / 5
                        </Badge>
                      </div>

                      {log.affecting_factors && (
                        <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md">
                          <span className="font-medium text-foreground">Fatores: </span>
                          {log.affecting_factors}
                        </div>
                      )}

                      {log.notes && (
                        <p className="text-xs text-foreground/80 italic pl-1 border-l-2 border-violet-300">
                          "{log.notes}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                        <span>⚡ Energia: {log.energy_level || 3}/5</span>
                        <span>🌊 Estresse: {log.stress_level || 3}/5</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-2">
              <Smile className="h-8 w-8 mx-auto opacity-30" />
              <p>Nenhum check-in emocional gravado ainda.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
