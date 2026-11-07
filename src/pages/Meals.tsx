import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { mealService, MealAiDetectionResult } from '@/services/mealsAndAi'
import { Meal } from '@/types'
import { Navbar } from '@/components/Navbar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  UtensilsCrossed,
  Sparkles,
  Camera,
  Scale,
  Flame,
  CheckCircle2,
  Trash2,
  Clock,
  UploadCloud,
  Loader2,
  Info,
} from 'lucide-react'

export default function MealsPage() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)

  // Form states
  const [mealType, setMealType] = useState<Meal['meal_type']>('almoco')
  const [dateTime, setDateTime] = useState<string>(() => {
    const now = new Date()
    return `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  // AI recognition states
  const [analyzingAi, setAnalyzingAi] = useState(false)
  const [aiResult, setAiResult] = useState<MealAiDetectionResult | null>(null)
  const [savingMeal, setSavingMeal] = useState(false)

  // Editable fields after AI estimation
  const [customTitle, setCustomTitle] = useState('')
  const [customWeight, setCustomWeight] = useState<string>('')
  const [customCalories, setCustomCalories] = useState<string>('')
  const [customItems, setCustomItems] = useState<string>('')

  useEffect(() => {
    loadMeals()
  }, [])

  const loadMeals = async () => {
    try {
      setLoading(true)
      const list = await mealService.listMeals()
      setMeals(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar refeições')
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setPhotoFile(file)
      // Usa a mesma rotina de compressão do envio à IA para o preview:
      // o usuário vê EXATAMENTE o que a IA receberá (orientação EXIF correta).
      compressPhoto(file)
        .then(setPhotoPreview)
        .catch(() => setPhotoPreview(URL.createObjectURL(file)))
    }
  }

  // Redimensiona/comprime a foto para JPEG (~1280px, qualidade 0.9) e devolve
  // data URL base64 pronta para ser enviada à IA — blob: e URLs gigantes nunca
  // vão ao backend. A qualidade 0.9 preserva nitidez suficiente para a IA ler
  // texturas dos alimentos sem estourar o payload.
  const compressPhoto = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Não foi possível ler a foto selecionada'))
      reader.onload = () => {
        const img = new Image()
        img.onerror = () => reject(new Error('Formato de imagem não suportado'))
        img.onload = () => {
          const maxSide = 1280
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(img.width * scale))
          canvas.height = Math.max(1, Math.round(img.height * scale))
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Não foi possível processar a foto'))
            return
          }
          // Fundo branco evita halo preto em PNGs com transparência no JPEG.
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.9))
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })

  const handleRunAiAnalysis = async () => {
    if (!photoFile && !description.trim()) {
      toast.error('Tire uma foto ou descreva brevemente a refeição')
      return
    }

    setAnalyzingAi(true)
    try {
      // Envia a FOTO REAL (base64 comprimida) para a IA enxergar o prato.
      // Sem foto, a análise usa apenas a descrição escrita pelo cliente.
      const photoBase64 = photoFile ? await compressPhoto(photoFile) : undefined
      const result = await mealService.analyzeMealWithAi({
        photoBase64,
        description: description.trim(),
        mealType,
      })

      setAiResult(result)
      setCustomTitle(result.title)
      setCustomWeight(String(result.total_weight_g))
      setCustomCalories(String(result.total_calories))

      const itemsStr = result.items
        .map((i) => `${i.name} (${i.weight_g}g - ${i.calories} kcal)`)
        .join(', ')
      setCustomItems(itemsStr)

      toast.success('Prato reconhecido pela Inteligência Artificial!')
    } catch (err: any) {
      console.error(err)
      const raw =
        err?.response?.error ||
        err?.response?.message ||
        err?.message ||
        'Não foi possível analisar a foto do prato. Tente novamente.'
      // O hook devolve 400 com mensagem clara quando a IA realmente não
      // consegue identificar alimentos — exibimos a causa real, sem fabricar
      // resultado. Se a falha foi na entrega da imagem (503), o toast já
      // mostra o pedido de retry descrito pelo backend.
      const msg =
        typeof raw === 'string'
          ? raw
          : 'Não foi possível analisar a foto do prato. Tente novamente.'
      toast.error(msg)
    } finally {
      setAnalyzingAi(false)
    }
  }

  const handleSaveMeal = async () => {
    if (!customTitle && !description) {
      toast.error('Informe um título ou realize a análise com IA')
      return
    }

    setSavingMeal(true)
    try {
      await mealService.createMeal({
        meal_type: mealType,
        date_time: dateTime,
        title: customTitle || description,
        photo: photoFile || undefined,
        items_detected: customItems || undefined,
        estimated_weight_g: customWeight ? parseFloat(customWeight) : undefined,
        estimated_calories: customCalories ? parseInt(customCalories, 10) : undefined,
        notes: aiResult?.nutritional_assessment || description,
      })

      toast.success('Refeição salva com sucesso!')
      // Reset form
      setPhotoFile(null)
      setPhotoPreview(null)
      setDescription('')
      setAiResult(null)
      setCustomTitle('')
      setCustomWeight('')
      setCustomCalories('')
      setCustomItems('')
      await loadMeals()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar a refeição')
    } finally {
      setSavingMeal(false)
    }
  }

  const handleDeleteMeal = async (id: string) => {
    try {
      await mealService.deleteMeal(id)
      toast.success('Refeição excluída')
      setMeals((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      toast.error('Erro ao excluir refeição')
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Registro de Refeições com IA</h1>
            <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Claude Vision
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tire uma foto do seu prato: a IA identifica os alimentos, calcula o peso estimado e
            estima calorias
          </p>
        </div>

        {/* Bloco de Novo Registro com IA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="lg:col-span-7 border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-600" />
                Fotografar ou Descrever Refeição
              </CardTitle>
              <CardDescription className="text-xs">
                O modelo analisa porções visuais e proporções de macronutrientes.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Refeição</Label>
                  <select
                    value={mealType}
                    onChange={(e: any) => setMealType(e.target.value)}
                    className="w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1"
                  >
                    <option value="cafe_da_manha">Café da Manhã</option>
                    <option value="almoco">Almoço</option>
                    <option value="lanche">Lanche da Tarde</option>
                    <option value="jantar">Jantar</option>
                    <option value="ceia">Ceia</option>
                    <option value="extra">Extra / Lanche Rápido</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Data e Hora</Label>
                  <Input
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="text-xs"
                    placeholder="AAAA-MM-DD HH:MM"
                  />
                </div>
              </div>

              {/* Upload de foto */}
              <div className="space-y-1.5">
                <Label className="text-xs">Foto do Prato</Label>
                <div className="border border-dashed rounded-xl p-4 text-center bg-muted/20 relative overflow-hidden">
                  {photoPreview ? (
                    <div className="relative inline-block max-h-48 rounded-lg overflow-hidden border">
                      <img
                        src={photoPreview}
                        alt="Preview do prato"
                        className="max-h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setPhotoFile(null)
                          setPhotoPreview(null)
                        }}
                        className="absolute top-2 right-2 text-xs h-7 px-2"
                      >
                        Trocar Foto
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="meal-photo-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                      <label
                        htmlFor="meal-photo-input"
                        className="cursor-pointer flex flex-col items-center justify-center gap-1.5 py-4 text-emerald-600 hover:text-emerald-700"
                      >
                        <Camera className="h-8 w-8 text-emerald-600 mb-1" />
                        <span className="text-xs font-semibold">
                          Tirar Foto ou Escolher da Galeria
                        </span>
                        <span className="text-[10px] text-muted-foreground">PNG, JPG até 15MB</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Descrição opcional */}
              <div className="space-y-1">
                <Label className="text-xs">
                  Descrição ou Ingredientes (ajuda a IA no reconhecimento)
                </Label>
                <Input
                  placeholder="Ex: Salada de folhas, salmão grelhado e arroz integral"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Botão de Reconhecimento com IA */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={analyzingAi}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  {analyzingAi ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Identificando alimentos e pesando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Identificar Alimentos & Estimar Peso com IA
                    </>
                  )}
                </Button>
              </div>

              {/* Resultado retornado pela IA para conferência e edição */}
              {aiResult && (
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Estimativa Gerada pela IA
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white border-emerald-300">
                      Editável
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Nome do Prato</Label>
                      <Input
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="text-xs bg-white dark:bg-card"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          <Scale className="h-3 w-3 text-muted-foreground" />
                          Peso Estimado (g)
                        </Label>
                        <Input
                          type="number"
                          value={customWeight}
                          onChange={(e) => setCustomWeight(e.target.value)}
                          className="text-xs bg-white dark:bg-card font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium flex items-center gap-1">
                          <Flame className="h-3 w-3 text-amber-600" />
                          Calorias Estimadas (kcal)
                        </Label>
                        <Input
                          type="number"
                          value={customCalories}
                          onChange={(e) => setCustomCalories(e.target.value)}
                          className="text-xs bg-white dark:bg-card font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">
                        Alimentos e Porções Identificados
                      </Label>
                      <Textarea
                        value={customItems}
                        onChange={(e) => setCustomItems(e.target.value)}
                        className="text-xs bg-white dark:bg-card"
                        rows={2}
                      />
                    </div>

                    {aiResult.nutritional_assessment && (
                      <div className="text-[11px] text-foreground/80 bg-white/70 dark:bg-card/70 p-2.5 rounded-lg border border-emerald-100">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                          Avaliação da Nutrição Clínica:
                        </span>
                        {aiResult.nutritional_assessment}
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleSaveMeal}
                    disabled={savingMeal}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs"
                  >
                    {savingMeal ? 'Salvando...' : 'Confirmar e Salvar no Diário Nutricional'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dicas e Como Funciona */}
          <Card className="lg:col-span-5 border-border/60 bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-600" />
                Dicas para Alta Precisão
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex gap-2.5">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  1
                </div>
                <p>
                  Fotografe o prato de cima com boa iluminação para evidenciar todos os componentes.
                </p>
              </div>

              <div className="flex gap-2.5">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  2
                </div>
                <p>
                  Se houver ingredientes ocultos (molhos, queijos, azeite extra), mencione no campo
                  de descrição.
                </p>
              </div>

              <div className="flex gap-2.5">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  3
                </div>
                <p>Você pode sempre ajustar o peso estimado antes de confirmar o salvamento.</p>
              </div>

              <div className="p-3 rounded-lg border bg-card text-foreground/90 space-y-1 mt-4">
                <p className="font-semibold text-xs text-emerald-800 dark:text-emerald-300">
                  Acompanhamento Profissional
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Os profissionais da Clínica Soul têm acesso aos pratos e calorias calculadas para
                  orientar ajustes no plano alimentar.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Refeições */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-emerald-600" />
              Diário de Refeições ({meals.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Carregando refeições...
            </div>
          ) : meals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {meals.map((m) => (
                <Card
                  key={m.id}
                  className="overflow-hidden border-border/60 hover:shadow-md transition-shadow"
                >
                  {m.photo || m.photo_url ? (
                    <div className="h-44 w-full bg-muted relative overflow-hidden">
                      <img
                        src={m.photo || m.photo_url}
                        alt={m.title || 'Foto do prato'}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-black/75 text-white text-[10px] backdrop-blur-sm">
                        {m.meal_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  ) : null}

                  <CardContent className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground leading-tight">
                        {m.title || 'Refeição'}
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMeal(m.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {m.date_time}
                    </div>

                    {m.items_detected && (
                      <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-2 rounded-md">
                        {m.items_detected}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {m.estimated_weight_g ? (
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          ⚖️ {m.estimated_weight_g}g
                        </Badge>
                      ) : null}
                      {m.estimated_calories ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-700 bg-amber-50 border-amber-200"
                        >
                          🔥 {m.estimated_calories} kcal
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-2">
              <UtensilsCrossed className="h-8 w-8 mx-auto opacity-30" />
              <p>Nenhuma refeição registrada no histórico.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
