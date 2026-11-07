import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService } from '@/services/health'
import { HealthCategory, HealthMetric } from '@/types'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Droplets,
  Coffee,
  Moon,
  Activity,
  Heart,
  Scale,
  Pill,
  Wine,
  Wind,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'

export const CATEGORY_DEFINITIONS: Array<{
  id: HealthCategory
  name: string
  icon: any
  defaultUnit: string
  placeholder: string
  quickAmounts?: number[]
  color: string
  isNumericOnly?: boolean
}> = [
  {
    id: 'agua',
    name: 'Água',
    icon: Droplets,
    defaultUnit: 'ml',
    placeholder: 'Ex: 250, 500',
    quickAmounts: [250, 350, 500, 750],
    color: 'text-blue-500',
    isNumericOnly: true,
  },
  {
    id: 'cafe',
    name: 'Café',
    icon: Coffee,
    defaultUnit: 'xícaras',
    placeholder: 'Ex: 1, 2',
    quickAmounts: [1, 2],
    color: 'text-amber-700',
    isNumericOnly: true,
  },
  {
    id: 'sono',
    name: 'Sono (Relógio/Manual)',
    icon: Moon,
    defaultUnit: 'horas',
    placeholder: 'Ex: 7.5 (7h30)',
    quickAmounts: [6.5, 7.0, 7.5, 8.0],
    color: 'text-indigo-500',
    isNumericOnly: true,
  },
  {
    id: 'hrv',
    name: 'HRV (Variabilidade)',
    icon: Activity,
    defaultUnit: 'ms',
    placeholder: 'Ex: 65, 75',
    color: 'text-emerald-500',
    isNumericOnly: true,
  },
  {
    id: 'atividade',
    name: 'Atividade Física',
    icon: Activity,
    defaultUnit: 'min',
    placeholder: 'Ex: 45',
    quickAmounts: [30, 45, 60, 90],
    color: 'text-orange-500',
    isNumericOnly: true,
  },
  {
    id: 'pressao',
    name: 'Pressão Arterial',
    icon: Heart,
    defaultUnit: 'mmHg',
    placeholder: 'Ex: 120/80',
    color: 'text-rose-500',
    isNumericOnly: false,
  },
  {
    id: 'glicemia',
    name: 'Glicemia',
    icon: Activity,
    defaultUnit: 'mg/dL',
    placeholder: 'Ex: 85, 95',
    color: 'text-teal-500',
    isNumericOnly: true,
  },
  {
    id: 'peso',
    name: 'Peso Corporal',
    icon: Scale,
    defaultUnit: 'kg',
    placeholder: 'Ex: 72.5',
    color: 'text-slate-600',
    isNumericOnly: true,
  },
  {
    id: 'saturacao',
    name: 'Saturação de Oxigênio (SpO2)',
    icon: Activity,
    defaultUnit: '%',
    placeholder: 'Ex: 98',
    color: 'text-cyan-500',
    isNumericOnly: true,
  },
  {
    id: 'remedio',
    name: 'Remédios & Suplementos',
    icon: Pill,
    defaultUnit: 'dose',
    placeholder: 'Nome do medicamento ou suplemento',
    color: 'text-purple-500',
    isNumericOnly: false,
  },
  {
    id: 'alcool',
    name: 'Álcool',
    icon: Wine,
    defaultUnit: 'doses',
    placeholder: 'Ex: 1 taça de vinho, 1 cerveja',
    quickAmounts: [1, 2, 3],
    color: 'text-red-700',
    isNumericOnly: false,
  },
  {
    id: 'sauna',
    name: 'Sauna / Banho Gelado',
    icon: Activity,
    defaultUnit: 'min',
    placeholder: 'Ex: 20 min sauna seca',
    quickAmounts: [15, 20, 30],
    color: 'text-amber-600',
    isNumericOnly: true,
  },
  {
    id: 'meditacao',
    name: 'Meditação / Respiração',
    icon: Wind,
    defaultUnit: 'min',
    placeholder: 'Ex: 15 min mindfulness',
    quickAmounts: [10, 15, 20],
    color: 'text-emerald-700',
    isNumericOnly: true,
  },
  {
    id: 'sintoma',
    name: 'Sintoma',
    icon: ClipboardList,
    defaultUnit: '/10',
    placeholder: 'Ex: Ansiedade, Taquicardia, Tremor',
    color: 'text-amber-600',
    isNumericOnly: false,
  },
]

export default function RegisterMetricPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const initialCat = (searchParams.get('category') as HealthCategory) || 'agua'
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory>(initialCat)

  // Form
  const [dateTime, setDateTime] = useState<string>(() => {
    const now = new Date()
    return `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [numericValue, setNumericValue] = useState<string>('')
  const [textValue, setTextValue] = useState<string>('')
  const [severity, setSeverity] = useState<string>('5')
  const [notes, setNotes] = useState<string>('')
  const [fileAttachment, setFileAttachment] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // History list
  const [history, setHistory] = useState<HealthMetric[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const currentDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategory) || CATEGORY_DEFINITIONS[0]

  useEffect(() => {
    loadHistory(selectedCategory)
  }, [selectedCategory])

  const loadHistory = async (cat: HealthCategory) => {
    try {
      setLoadingHistory(true)
      const res = await healthService.listUserMetrics(undefined, 20, cat)
      setHistory(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSelectQuick = (amount: number) => {
    setNumericValue(String(amount))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numericValue && !textValue) {
      toast.error('Informe o valor a ser registrado')
      return
    }

    setIsSubmitting(true)
    try {
      await healthService.createMetric({
        category: selectedCategory,
        date_time: dateTime,
        numeric_value:
          selectedCategory === 'sintoma'
            ? parseFloat(severity)
            : numericValue
              ? parseFloat(numericValue.replace(',', '.'))
              : undefined,
        text_value: textValue || undefined,
        unit: currentDef.defaultUnit,
        notes: notes || undefined,
        attachment: fileAttachment || undefined,
      })

      toast.success(`${currentDef.name} registrado com sucesso!`)
      setNumericValue('')
      setTextValue('')
      setSeverity('5')
      setNotes('')
      setFileAttachment(null)
      await loadHistory(selectedCategory)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar o registro')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await healthService.deleteMetric(id)
      toast.success('Registro removido')
      setHistory((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      toast.error('Erro ao excluir registro')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Registrar Hábitos e Sinais Vitais</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lançamento manual e flexível com foto/arquivo ou integração de dados do relógio
          </p>
        </div>

        {/* Categories selector horizontal scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORY_DEFINITIONS.map((cat) => {
            const Icon = cat.icon
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-card text-muted-foreground border-border/80 hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : cat.color}`} />
                {cat.name}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Card */}
          <Card className="lg:col-span-7 border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <currentDef.icon className={`h-5 w-5 ${currentDef.color}`} />
                <CardTitle className="text-lg">Novo Registro de {currentDef.name}</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Insira o valor correspondente e notas clínicas se desejar.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Data e hora */}
                <div className="space-y-1.5">
                  <Label htmlFor="date-time" className="text-xs">
                    Data e Hora
                  </Label>
                  <Input
                    id="date-time"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    placeholder="AAAA-MM-DD HH:MM"
                    className="text-xs"
                    required
                  />
                </div>

                {/* Valor numérico / texto */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metric-value" className="text-xs">
                      Valor ({currentDef.defaultUnit})
                    </Label>
                    {currentDef.quickAmounts && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Rápido:</span>
                        {currentDef.quickAmounts.map((amt) => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => handleSelectQuick(amt)}
                            className="text-[10px] bg-muted hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950 px-1.5 py-0.5 rounded transition-colors"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {currentDef.id === 'sintoma' ? (
                    <div className="space-y-2.5">
                      <Input
                        id="metric-value"
                        placeholder={currentDef.placeholder}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="text-sm"
                        required
                      />
                      <div>
                        <Label className="text-[11px] text-muted-foreground">
                          Severidade: <b className="text-foreground">{severity || '—'}/10</b>
                        </Label>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                          className="w-full accent-amber-500"
                        />
                        <div className="flex justify-between text-[9px] text-muted-foreground">
                          <span>sem sintoma</span>
                          <span>intolerável</span>
                        </div>
                      </div>
                    </div>
                  ) : currentDef.id === 'pressao' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Ex: 120/80"
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="text-sm font-semibold"
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Sistólica (ex: 120)"
                        value={numericValue}
                        onChange={(e) => setNumericValue(e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ) : currentDef.isNumericOnly ? (
                    <div className="relative">
                      <Input
                        id="metric-value"
                        type="number"
                        step="any"
                        placeholder={currentDef.placeholder}
                        value={numericValue}
                        onChange={(e) => setNumericValue(e.target.value)}
                        className="text-base font-semibold pr-16"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium pointer-events-none">
                        {currentDef.defaultUnit}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        id="metric-value"
                        placeholder={currentDef.placeholder}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="text-sm"
                        required
                      />
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label htmlFor="metric-notes" className="text-xs">
                    Observações / Contexto (opcional)
                  </Label>
                  <Input
                    id="metric-notes"
                    placeholder="Ex: em repouso, pós-treino, acordando bem disposto..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Upload foto do relógio ou documento */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs flex items-center justify-between">
                    <span>Foto do Relógio / Arquivo de Exportação (Opcional)</span>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  </Label>
                  <div className="border border-dashed rounded-lg p-3 text-center bg-muted/20">
                    <input
                      type="file"
                      id="metric-file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileAttachment(e.target.files[0])
                        }
                      }}
                    />
                    <label
                      htmlFor="metric-file"
                      className="cursor-pointer text-xs text-emerald-600 hover:underline flex flex-col items-center justify-center gap-1"
                    >
                      {fileAttachment ? (
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {fileAttachment.name}
                        </span>
                      ) : (
                        <>
                          <span>Anexar print do smartwatch, HRV ou arquivo</span>
                          <span className="text-[10px] text-muted-foreground">
                            PNG, JPG, PDF até 10MB
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                >
                  {isSubmitting ? 'Salvando...' : `Registrar ${currentDef.name}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Histórico da Categoria */}
          <Card className="lg:col-span-5 border-border/60">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Histórico Recente</CardTitle>
                <CardDescription className="text-xs">
                  Últimos registros de {currentDef.name}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Carregando histórico...
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-semibold text-sm text-foreground">
                            {item.numeric_value !== undefined && item.numeric_value !== null
                              ? item.numeric_value
                              : item.text_value}
                          </span>
                          <span className="text-[11px] text-muted-foreground">{item.unit}</span>
                          {item.text_value && item.numeric_value !== undefined && (
                            <span className="text-[10px] text-muted-foreground">
                              ({item.text_value})
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.date_time}
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-foreground/80 mt-1">{item.notes}</p>
                        )}
                        {item.attachment && (
                          <a
                            href={item.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-[10px] text-blue-600 underline mt-0.5"
                          >
                            Ver anexo
                          </a>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-1">
                  <p>Nenhum registro de {currentDef.name} ainda.</p>
                  <p className="text-[10px]">
                    Use o formulário ao lado para fazer o primeiro lançamento.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
