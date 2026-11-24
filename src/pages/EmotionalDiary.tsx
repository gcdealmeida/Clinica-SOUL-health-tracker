import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { emotionalService } from '@/services/emotional'
import { EmotionalLog } from '@/types'
import { todayStr } from '@/lib/localDate'
import { DaylioCheckinModal } from '@/components/emotional/DaylioCheckinModal'
import { DaylioHistoryCard } from '@/components/emotional/DaylioHistoryCard'
import { Life360View } from '@/components/emotional/Life360View'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles,
  Calendar,
  Compass,
  Heart,
  Plus,
  Smile,
  Zap,
  TrendingUp,
  Brain,
  Award,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'

export const EmotionalDiaryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [logs, setLogs] = useState<EmotionalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'360' | 'history'>('360')
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<EmotionalLog | null>(null)
  const [guidelinesOpen, setGuidelinesOpen] = useState(true)

  const today = todayStr()
  const todayLog = logs.find((l) => (l.date || '').slice(0, 10) === today)

  const fetchLogs = async () => {
    try {
      const data = await emotionalService.listLogs(undefined, 60)
      setLogs(data)
    } catch (err) {
      console.error(err)
      toast.error('Não foi possível carregar os registros do diário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // Suporte a deep-link: /diario-emocional?checkin=1 abre direto o modal do dia
  useEffect(() => {
    if (searchParams.get('checkin') === '1' || searchParams.get('checkin') === 'true') {
      // Se tiver log de hoje, preenche para edição, senão novo
      setEditingLog(todayLog || null)
      setCheckinOpen(true)
      // Limpa a query param sem recarregar para manter a URL limpa
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('checkin')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, todayLog, setSearchParams])

  const handleOpenNewCheckin = () => {
    setEditingLog(todayLog || null)
    setCheckinOpen(true)
  }

  const handleEditLog = (log: EmotionalLog) => {
    setEditingLog(log)
    setCheckinOpen(true)
  }

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Deseja excluir este registro de check-in?')) return
    try {
      await emotionalService.delete(id)
      setLogs((prev) => prev.filter((l) => l.id !== id))
      toast.success('Registro excluído')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir')
    }
  }

  const handleSavedCheckin = (saved: EmotionalLog) => {
    setLogs((prev) => {
      const exists = prev.some(
        (l) => l.id === saved.id || (l.date || '').slice(0, 10) === saved.date,
      )
      if (exists) {
        return prev.map((l) =>
          l.id === saved.id || (l.date || '').slice(0, 10) === saved.date ? saved : l,
        )
      }
      return [saved, ...prev]
    })
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Banner Superior Verde: Diretrizes do Diário Emocional & Ação Principal de Check-in */}
        <div className="rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Diário Emocional & Vida 360º • Estilo Daylio</span>
              </div>

              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight flex items-center gap-2.5">
                  <Award className="w-6 h-6 text-amber-300 shrink-0 hidden sm:inline" />
                  Diretrizes do Diário Emocional
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-emerald-100 mt-1">
                  Diretriz Clínica Soul — Equilíbrio integral entre corpo, mente, relações e
                  propósito
                </p>
              </div>

              <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
                A verdadeira saúde preventiva vai muito além de exames de sangue e pesagem. Ela se
                ancora na harmonia dos 11 aspectos da sua vida.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 self-start md:self-auto">
              <Button
                onClick={handleOpenNewCheckin}
                className="bg-white hover:bg-white/90 text-emerald-800 font-bold px-6 py-3 h-12 rounded-2xl shadow-md text-sm gap-2 transition-all hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" />
                {todayLog ? 'Editar Check-in de Hoje' : 'Fazer Check-in de Hoje'}
              </Button>
            </div>
          </div>

          {/* Bloco de Interpretação da Vida 360º (Legenda de Percentuais com alto contraste e clareza) */}
          <div className="relative z-10 mt-5 pt-4 border-t border-white/20">
            <div className="rounded-2xl bg-black/20 backdrop-blur-md border border-white/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>💡</span>
                  <span>Como interpretar sua Vida 360º:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setGuidelinesOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-100 hover:text-white px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="Alternar exibição da legenda"
                >
                  <span>{guidelinesOpen ? 'Recolher' : 'Exibir'}</span>
                  {guidelinesOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {guidelinesOpen && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/15 border border-white/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 mt-1 shrink-0 shadow-xs" />
                    <div className="text-xs leading-snug">
                      <span className="font-bold text-white block">80-100%</span>
                      <span className="text-emerald-50">Pilar nutrido e resiliente.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/15 border border-white/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300 mt-1 shrink-0 shadow-xs" />
                    <div className="text-xs leading-snug">
                      <span className="font-bold text-white block">50-79%</span>
                      <span className="text-amber-100">
                        Equilibrado com oportunidades de melhora.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/15 border border-white/20">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-300 mt-1 shrink-0 shadow-xs" />
                    <div className="text-xs leading-snug">
                      <span className="font-bold text-white block">Abaixo de 50%</span>
                      <span className="text-rose-100">Sugere sobrecarga ou afastamento.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Destaque rápido se já preencheu hoje */}
          {todayLog && (
            <div className="relative z-10 mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center gap-3 text-xs text-white/95">
              <span className="font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                Hoje registrado:
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/25 backdrop-blur-sm font-bold">
                {todayLog.mood_label || 'Humor registrado'} ({todayLog.mood_score}/5)
              </span>
              {typeof todayLog.energy_level === 'number' && (
                <span>⚡ Energia {todayLog.energy_level}/5</span>
              )}
              {typeof todayLog.stress_level === 'number' && (
                <span>⏱️ Estresse {todayLog.stress_level}/5</span>
              )}
              {todayLog.emotions && todayLog.emotions.length > 0 && (
                <span>• {todayLog.emotions.length} emoções</span>
              )}
            </div>
          )}
        </div>

        {/* Abas Superiores: Vida 360º vs Histórico Daylio */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-border/80 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('360')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === '360'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Avaliação Vida 360º (11 Aspectos)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Histórico Daylio ({logs.length})</span>
            </button>
          </div>

          <Button
            onClick={handleOpenNewCheckin}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Fazer Check-in de Hoje
          </Button>
        </div>

        {/* Conteúdo da Aba Ativa */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground text-sm space-y-2">
            <Smile className="w-8 h-8 mx-auto animate-spin opacity-50" />
            <p>Carregando dados do diário emocional...</p>
          </div>
        ) : activeTab === '360' ? (
          <Life360View logs={logs} onOpenCheckin={handleOpenNewCheckin} />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Seus Momentos & Check-ins
                </h2>
                <p className="text-xs text-muted-foreground">
                  Cards cronológicos com carinha de humor, chips de emoções e notas estilo Daylio
                </p>
              </div>
              <Button
                onClick={handleOpenNewCheckin}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Registro
              </Button>
            </div>

            {logs.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-3xl bg-card text-muted-foreground space-y-3">
                <Smile className="h-12 w-12 mx-auto text-emerald-500/50" />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Nenhum check-in gravado</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                    Comece registrando o momento de hoje com as 5 carinhas e seus sentimentos.
                  </p>
                </div>
                <Button
                  onClick={handleOpenNewCheckin}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs"
                >
                  Registrar Agora
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {logs.map((log) => (
                  <DaylioHistoryCard
                    key={log.id}
                    log={log}
                    onDelete={handleDeleteLog}
                    onEdit={handleEditLog}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Check-in Estilo Daylio (15 seções) */}
      <DaylioCheckinModal
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        onSaved={handleSavedCheckin}
        initialLog={editingLog}
      />
    </div>
  )
}

export default EmotionalDiaryPage
