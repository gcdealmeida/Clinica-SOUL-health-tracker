import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Smartphone,
  Watch,
  Activity,
  Bike,
  CloudUpload,
  Heart,
  HeartHandshake,
  HeartPulse,
  Stethoscope,
  TrendingUp,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WEARABLE_SERVICES } from '@/components/menu/wearableServicesData'
import ExamUploadSection from '@/components/sources/ExamUploadSection'
import { ImportFilesSection } from '@/components/sources/ImportFilesSection'

/**
 * Página Sources (padrão Guava): Devices & Apps com passo a passo de
 * exportação manual dos wearables (sincronização por arquivo nesta versão),
 * mais o bloco Clínica Soul (vínculo com a equipe).
 */

export default function SourcesPage() {
  const userName = pb.authStore.record?.name || 'Você'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar currentTab="sources" />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Fontes</h1>
          <p className="text-xs text-muted-foreground">
            De onde vêm seus dados: dispositivos, apps de saúde e sua equipe.
          </p>
        </div>

        {/* Upload Files / Downloads Exames */}
        <ExamUploadSection />

        {/* Importação inteligente de arquivos (PDF/JPG/PNG/DOCX/XLSX/CSV/TXT) */}
        <ImportFilesSection />

        {/* Devices & Apps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-emerald-600" />
              Dispositivos & Apps
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Nesta versão a sincronização é por arquivo: exporte os dados no app do wearable e
              envie o arquivo no Clínica Soul. Siga o passo a passo de cada fonte.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WEARABLE_SERVICES.map((s) => (
              <div
                key={s.id}
                className={cn('rounded-xl border bg-card p-3.5 space-y-2', s.bgColor)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn('h-9 w-9 rounded-lg flex items-center justify-center', s.color)}
                  >
                    {s.id === 'apple_health' ? (
                      <Heart className="h-5 w-5" />
                    ) : s.id === 'whoop' ? (
                      <Activity className="h-5 w-5" />
                    ) : s.id === 'strava' ? (
                      <Bike className="h-5 w-5" />
                    ) : s.id === 'google_fit' ? (
                      <HeartPulse className="h-5 w-5" />
                    ) : s.id === 'training_peaks' ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <Watch className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold truncate', s.color)}>{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.category}</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {s.instructions}
                </p>
                <p className="text-[10px] font-medium text-muted-foreground">
                  Formatos aceitos: {s.fileFormats}
                </p>
                {s.exportUrl && (
                  <a
                    href={s.exportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                  >
                    Abrir {s.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bloco Clínica Soul */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/60 via-card to-teal-50/40 dark:from-emerald-950/20 dark:to-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-emerald-600" />
              Clínica Soul
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-foreground/90 leading-relaxed">
              {userName}, os dados que você registra e conecta aqui ficam disponíveis para a sua
              equipe da Clínica Soul acompanhar sua evolução — nas consultas e no acompanhamento
              contínuo. Quanto mais fontes conectadas, mais completo é o seu acompanhamento.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-[11px] bg-background/70 gap-1">
                <Watch className="h-3 w-3" /> Wearables
              </Badge>
              <Badge variant="outline" className="text-[11px] bg-background/70 gap-1">
                <Activity className="h-3 w-3" /> Métricas diárias
              </Badge>
              <Badge variant="outline" className="text-[11px] bg-background/70 gap-1">
                <CloudUpload className="h-3 w-3" /> Exames enviados
              </Badge>
              <Badge variant="outline" className="text-[11px] bg-background/70 gap-1">
                <Stethoscope className="h-3 w-3" /> Equipe clínica
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Link to="/profile">Ver meu Profile</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link to="/records">Ver Records</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
