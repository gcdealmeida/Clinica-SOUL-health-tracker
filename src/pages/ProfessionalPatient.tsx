import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Navbar } from '@/components/Navbar'
import { SoulBrandLogo } from '@/components/brand/SoulLogo'
import { PatientProntuario } from '@/components/professional/PatientProntuario'
import { ClientFeedList } from '@/components/professional/ClientFeedList'
import { useClientFeed } from '@/hooks/use-client-feed'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { authService } from '@/services/auth'
import type { User } from '@/types'
import { ArrowLeft, History, UserRound } from 'lucide-react'

const HISTORY_PER_SOURCE = 100

/**
 * Página própria do paciente: prontuário completo (header, Síntese IA, alertas e
 * abas Medidas/Exames/Refeições/Dietas) + histórico de atualizações que ESTE
 * paciente realizou (mesmas fontes do feed do profissional).
 */
export default function ProfessionalPatientPage() {
  const { patientId = '' } = useParams()
  const navigate = useNavigate()

  const {
    events: history,
    loading: loadingHistory,
    error: historyError,
  } = useClientFeed(HISTORY_PER_SOURCE, null, undefined, [], patientId)

  // Paciente da URL resolvido a partir da lista de clientes do profissional.
  // (A própria rota já exige papel profissional; aqui só identificamos o paciente.)
  const { patient, loadingPatient, notFound } = usePatient(patientId)

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/profissional')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Voltar ao painel */}
        <div>
          <Button variant="ghost" size="sm" onClick={goBack} className="text-xs -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao Painel
          </Button>
        </div>

        <SoulBrandLogo className="h-16 w-auto" />

        {loadingPatient ? (
          <div className="space-y-4" aria-busy="true" aria-label="Carregando paciente">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : notFound || !patient ? (
          <Card className="border-border/60">
            <CardContent className="py-16 text-center space-y-3">
              <UserRound className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Paciente não encontrado ou sem acesso a esta página.
              </p>
              <Button asChild size="sm" variant="outline" className="text-xs">
                <Link to="/profissional">Voltar ao Painel</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Prontuário: header, Síntese IA, alertas e abas — mesmo bloco do painel */}
            <PatientProntuario client={patient} />

            {/* Histórico de atualizações realizadas por ESTE paciente */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <History className="h-4.5 w-4.5 text-amber-600" />
                    Histórico de Atualizações
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tudo que {patient.name || patient.email} lançou no Health Tracker · do mais
                    recente ao mais antigo · atualiza a cada 30 segundos
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory && history.length === 0 ? (
                  <div className="space-y-3" aria-busy="true" aria-label="Carregando histórico">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-lg" />
                    ))}
                  </div>
                ) : historyError && history.length === 0 ? (
                  <p role="alert" className="text-center py-6 text-xs text-destructive">
                    Não foi possível carregar o histórico agora.
                  </p>
                ) : history.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted-foreground">
                    Nenhuma atualização registrada por este paciente ainda.
                  </p>
                ) : (
                  <ClientFeedList events={history} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

/** Resolve o paciente da URL a partir da lista de clientes (regra já usada no painel). */
function usePatient(patientId: string): {
  patient: User | null
  loadingPatient: boolean
  notFound: boolean
} {
  const [state, setState] = useState<{
    patient: User | null
    loading: boolean
    notFound: boolean
  }>({ patient: null, loading: true, notFound: false })

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, notFound: false }))
    authService
      .listClients()
      .then((clients) => {
        if (!active) return
        const found = clients.find((c) => c.id === patientId) ?? null
        setState({ patient: found, loading: false, notFound: !found })
      })
      .catch(() => {
        if (!active) return
        setState({ patient: null, loading: false, notFound: false })
      })
    return () => {
      active = false
    }
  }, [patientId])

  return { patient: state.patient, loadingPatient: state.loading, notFound: state.notFound }
}
