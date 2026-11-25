import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services/auth'
import { User } from '@/types'
import { Navbar } from '@/components/Navbar'
import { SoulBrandLogo } from '@/components/brand/SoulLogo'
import { ClientFeedSummary } from '@/components/professional/ClientFeedSummary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Users, Search, Phone } from 'lucide-react'

export default function ProfessionalDashboardPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const list = await authService.listClients()
      setClients(list)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao listar clientes')
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <SoulBrandLogo className="h-16 w-auto" />

        {/* Header do painel profissional */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-semibold text-foreground">
                Painel do Profissional Clínica Soul
              </h1>
              <Badge className="bg-amber-600 text-white text-xs">Visão Médica / Terapêutica</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Acompanhamento longitudinal de evolução, medidas diárias, exames e intervenções
              nutricionais
            </p>
          </div>
        </div>

        {/* Duas colunas: Atualizações dos Clientes (esquerda) + Pacientes/Clientes (direita).
            Breakpoint md (768px) — janelas desktop comuns têm < 1024px e com lg: caíam para 1 coluna. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Coluna da Esquerda: Últimas atualizações dos clientes */}
          <ClientFeedSummary />

          {/* Coluna da Direita: Lista de Pacientes / Clientes */}
          <Card className="border-border/60 h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Pacientes / Clientes
                </span>
                <Badge variant="secondary" className="text-xs">
                  {clients.length}
                </Badge>
              </CardTitle>
              <div className="pt-2">
                <div className="relative">
                  <Search className="h-4 w-4 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    aria-label="Buscar paciente por nome ou e-mail"
                    placeholder="Buscar por nome ou e-mail..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Carregando pacientes...
                </div>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => navigate(`/profissional/paciente/${client.id}`)}
                    className="w-full text-left p-3 rounded-xl border border-border/70 hover:bg-muted transition-all flex items-start gap-3"
                    aria-label={`Abrir página do paciente ${client.name || client.email}`}
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                      {client.name ? client.name.slice(0, 2).toUpperCase() : 'CL'}
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {client.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{client.email}</p>
                      {client.phone && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" /> {client.phone}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhum paciente encontrado.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
