import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { aiAnalysisService } from '@/services/mealsAndAi'
import { AiAnalysis } from '@/types'
import { Navbar } from '@/components/Navbar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Sparkles,
  Activity,
  Layers,
  BrainCircuit,
  Loader2,
  Clock,
  History,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'

const AVAILABLE_VARIABLES = [
  { id: 'sono', label: 'Horas e Qualidade de Sono', category: 'Descanso' },
  { id: 'cafe', label: 'Consumo de Café / Cafeína', category: 'Estímulo' },
  { id: 'hrv', label: 'HRV (Variabilidade Cardíaca)', category: 'Recuperação' },
  { id: 'humor', label: 'Humor & Estresse (Diário)', category: 'Emocional' },
  { id: 'agua', label: 'Ingestão de Água', category: 'Hidratação' },
  { id: 'atividade', label: 'Exercício / Atividade Física', category: 'Movimento' },
  { id: 'glicemia', label: 'Glicemia / Exames de Sangue', category: 'Metabolismo' },
  { id: 'pressao', label: 'Pressão Arterial', category: 'Cardiovascular' },
  { id: 'refeicoes', label: 'Alimentação & Calorias', category: 'Nutrição' },
]

export default function AiAnalysesPage() {
  const { user } = useAuth()
  const [selectedVars, setSelectedVars] = useState<string[]>(['sono', 'cafe', 'hrv', 'humor'])
  const [customQuestion, setCustomQuestion] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentInsight, setCurrentInsight] = useState<string | null>(null)

  // Histórico de análises
  const [history, setHistory] = useState<AiAnalysis[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const res = await aiAnalysisService.listAnalyses()
      setHistory(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const toggleVariable = (id: string) => {
    if (selectedVars.includes(id)) {
      if (selectedVars.length === 1) {
        toast.error('Escolha pelo menos 1 variável')
        return
      }
      setSelectedVars(selectedVars.filter((v) => v !== id))
    } else {
      setSelectedVars([...selectedVars, id])
    }
  }

  const handleRunAnalysis = async () => {
    if (selectedVars.length === 0) {
      toast.error('Selecione pelo menos uma variável para cruzar')
      return
    }

    setAnalyzing(true)
    setCurrentInsight(null)
    try {
      const res = await aiAnalysisService.runCorrelationAnalysis({
        variables: selectedVars,
        question: customQuestion || undefined,
      })

      setCurrentInsight(res.insights)
      toast.success('Cruzamento concluído pela Inteligência Artificial!')
      await loadHistory()
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao processar análise de correlação na IA')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              Cruzamento Inteligente de Variáveis
            </h1>
            <Badge className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-0 text-xs flex items-center gap-1">
              <BrainCircuit className="h-3 w-3" />
              IA Claude Soul
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Descubra como o café afeta seu sono e HRV, ou como seu humor se relaciona com hidratação
            e refeições
          </p>
        </div>

        {/* Card Seletor de Variáveis */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" />
              1. Selecione as Variáveis para Cruzamento
            </CardTitle>
            <CardDescription className="text-xs">
              A IA analisará todos os seus registros de saúde das categorias selecionadas para
              apontar relações e padrões.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {AVAILABLE_VARIABLES.map((v) => {
                const isSelected = selectedVars.includes(v.id)
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVariable(v.id)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col justify-between h-20 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-200 ring-1 ring-emerald-500 font-medium'
                        : 'border-border/80 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {v.category}
                    </span>
                    <span className="line-clamp-2">{v.label}</span>
                    <span className="text-[10px] self-end">
                      {isSelected ? '✓ Selecionado' : '+ Adicionar'}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Pergunta ou Foco Opcional */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Dúvida Específica ou Foco Clínico (Opcional)
              </Label>
              <Input
                placeholder="Ex: Por que meu HRV cai nas terças-feiras? O consumo de café após as 15h está prejudicando meu sono REM?"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-700 hover:to-cyan-800 text-white font-medium text-xs sm:text-sm shadow-md flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cruzando variáveis e registros com a IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Gerar Análise de Correlação com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Card do Resultado da Análise Atual */}
        {currentInsight && (
          <Card className="border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md">
            <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-foreground">
                      Relatório de Insights da IA
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Baseado nos seus dados reais gravados na Clínica Soul
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-white border-emerald-300 text-emerald-800"
                >
                  {selectedVars.join(' + ')}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3">
              <div className="text-xs sm:text-sm leading-relaxed text-foreground whitespace-pre-line bg-card/80 p-4 rounded-xl border border-border/60">
                {currentInsight}
              </div>

              {/* Disclaimer de saúde integrativa */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 text-xs border border-amber-200">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Aviso da Clínica Soul:</strong> As análises da inteligência artificial
                  identificam padrões e correlações para enriquecer suas consultas, não constituindo
                  laudo ou diagnóstico médico isolado. Discuta esses achados com sua equipe de
                  saúde.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico de Análises Anteriores */}
        <section className="space-y-3 pt-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-600" />
            Análises Salvas no Histórico ({history.length})
          </h2>

          {loadingHistory ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Carregando histórico...
            </div>
          ) : history.length > 0 ? (
            <div className="space-y-3">
              {history.map((h) => (
                <Card key={h.id} className="border-border/60 hover:shadow-sm transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          Variáveis: {h.variables}
                        </Badge>
                        {h.question && (
                          <span className="text-xs font-medium text-foreground italic truncate max-w-sm">
                            "{h.question}"
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {h.created.slice(0, 10)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-1">
                    <div className="text-xs text-foreground/90 bg-muted/30 p-3 rounded-lg whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed">
                      {h.insights}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border border-dashed rounded-xl bg-card text-muted-foreground text-xs space-y-2">
              <Sparkles className="h-8 w-8 mx-auto opacity-30" />
              <p>Nenhuma análise gerada anteriormente.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
