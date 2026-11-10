import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Building2,
  Watch,
  Smartphone,
  Activity,
  HeartPulse,
  Flame,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Upload,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { WEARABLE_SERVICES, WearableService } from './wearableServicesData'

interface DataSourcesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getServiceIcon(id: string) {
  switch (id) {
    case 'garmin':
      return Watch
    case 'apple_health':
      return Smartphone
    case 'training_peaks':
      return Activity
    case 'whoop':
      return HeartPulse
    case 'strava':
      return Flame
    default:
      return Activity
  }
}

export function DataSourcesModal({ open, onOpenChange }: DataSourcesModalProps) {
  const [activeTab, setActiveTab] = useState<'wearables' | 'exports' | 'clinic'>('wearables')
  const [selectedService, setSelectedService] = useState<WearableService | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ name: string; service: string; size: string; date: string }>
  >([
    {
      name: 'garmin_export_hrv_sono_2026.csv',
      service: 'Garmin Connect',
      size: '2.4 MB',
      date: 'Hoje, 09:30',
    },
    {
      name: 'apple_health_export_recent.zip',
      service: 'Apple Health',
      size: '14.8 MB',
      date: 'Há 3 dias',
    },
  ])

  const handleFileUpload = (serviceName: string, file: File) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    const newEntry = {
      name: file.name,
      service: serviceName,
      size: `${sizeMb} MB`,
      date: 'Agora',
    }
    setUploadedFiles((prev) => [newEntry, ...prev])
    toast.success(
      `Arquivo "${file.name}" recebido com sucesso via conexão manual de ${serviceName}!`,
    )
    setSelectedService(null)
  }

  const SelectedIcon = selectedService ? getServiceIcon(selectedService.id) : Activity

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-border/80 rounded-2xl">
        <DialogHeader className="p-5 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Fontes de Dados (Data Sources)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Integrações via arquivo, central de downloads/exports e conexão com a Clínica Soul
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Abas */}
        <div className="flex border-b px-5 bg-background gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('wearables')
              setSelectedService(null)
            }}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'wearables'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Watch className="h-3.5 w-3.5" />
            Aplicativos & Aparelhos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('exports')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'exports'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            Downloads & Uploads de Arquivos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clinic')}
            className={`flex items-center gap-1.5 pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'clinic'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            Conexão com a Clínica
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* ABA 1: DISPOSITIVOS & APPS */}
          {activeTab === 'wearables' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <p className="font-semibold">Conexão via Arquivo de Exportação</p>
                  <p className="text-[11px] mt-0.5">
                    Nesta versão, a sincronização é realizada por{' '}
                    <b>upload manual do arquivo exportado</b> do seu aparelho ou serviço. Clique no
                    serviço desejado para visualizar o passo a passo de exportação e fazer o envio
                    do arquivo (.fit, .tcx, .csv ou .zip).
                  </p>
                </div>
              </div>

              {selectedService ? (
                /* Detalhe do serviço com instruções de export e botão de upload */
                <Card className={`border ${selectedService.bgColor}`}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-card border flex items-center justify-center shadow-xs">
                          <SelectedIcon className={`h-6 w-6 ${selectedService.color}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            {selectedService.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {selectedService.category}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedService(null)}
                        className="text-xs text-muted-foreground"
                      >
                        ← Voltar para lista
                      </Button>
                    </div>

                    <div className="space-y-2 rounded-xl bg-card border p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <HelpCircle className="h-4 w-4 text-emerald-600" />
                        <span>Como exportar do {selectedService.name}:</span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {selectedService.instructions}
                      </p>
                      {selectedService.exportUrl && (
                        <a
                          href={selectedService.exportUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold hover:underline pt-1"
                        >
                          Acessar portal do {selectedService.name}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Fazer upload do arquivo ({selectedService.fileFormats})
                      </p>
                      <div className="border border-dashed border-emerald-400 rounded-xl p-5 text-center bg-card hover:bg-muted/30 transition-colors">
                        <input
                          type="file"
                          id={`file-${selectedService.id}`}
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(selectedService.name, e.target.files[0])
                            }
                          }}
                        />
                        <label
                          htmlFor={`file-${selectedService.id}`}
                          className="cursor-pointer flex flex-col items-center justify-center gap-2"
                        >
                          <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <Upload className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            Clique para selecionar o arquivo de exportação
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Formatos aceitos: {selectedService.fileFormats} (até 50MB)
                          </span>
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Grid de serviços conhecidos */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WEARABLE_SERVICES.map((serv) => {
                    const Icon = getServiceIcon(serv.id)
                    return (
                      <button
                        key={serv.id}
                        type="button"
                        onClick={() => setSelectedService(serv)}
                        className="p-3.5 rounded-xl border bg-card hover:border-emerald-400 hover:shadow-xs transition-all text-left flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-muted/40 border flex items-center justify-center shrink-0">
                            <Icon className={`h-5 w-5 ${serv.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {serv.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {serv.category}
                            </p>
                            <Badge
                              variant="outline"
                              className="mt-1 text-[9px] px-1 py-0 border-border text-muted-foreground"
                            >
                              {serv.fileFormats.split(',')[0]} manual
                            </Badge>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: DOWNLOADS & EXPORTS */}
          {activeTab === 'exports' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      Upload Direto de Arquivo do Relógio
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Suba arquivos de HRV, sono, atividade física ou bioimpedância gerados pelo seu
                      aparelho
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    Processamento seguro
                  </Badge>
                </div>

                <div className="border border-dashed rounded-xl p-4 text-center bg-muted/20">
                  <input
                    type="file"
                    id="direct-upload-file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload('Upload Direto', e.target.files[0])
                      }
                    }}
                  />
                  <label
                    htmlFor="direct-upload-file"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="h-5 w-5 text-emerald-600" />
                    <span className="font-semibold text-foreground">
                      Selecionar arquivo (.csv, .zip, .fit, .xml)
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Compatível com dados de sono, HRV e passos
                    </span>
                  </label>
                </div>
              </div>

              {/* Histórico de uploads */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground flex items-center justify-between">
                  <span>Arquivos enviados recentemente</span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {uploadedFiles.length} arquivos
                  </span>
                </h4>
                <div className="space-y-2">
                  {uploadedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl border bg-card flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {f.service} • {f.size} • {f.date}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Processado
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: CONEXÃO COM A CLÍNICA */}
          {activeTab === 'clinic' && (
            <div className="space-y-4 text-xs">
              <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 via-card to-teal-50/30 dark:from-emerald-950/20 dark:to-card">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">Clínica Soul</h3>
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            Vínculo Ativo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Medicina Preventiva, Longevidade & Performance
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-card border space-y-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Stethoscope className="h-3 w-3 text-emerald-600" />
                        Equipe Acompanhante
                      </span>
                      <p className="font-semibold text-foreground">
                        Dr. Guilherme Almeida & Equipe
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Medicina Preventiva & Longevidade
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-card border space-y-1">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <ShieldCheck className="h-3 w-3 text-emerald-600" />
                        Compartilhamento de Dados
                      </span>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Sincronização Segura
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Exames, biomarcadores e métricas visíveis no painel médico
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-3 space-y-2">
                    <p className="font-semibold text-foreground text-xs">Sobre a sua conexão:</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Seu prontuário e métricas registradas no aplicativo ficam disponíveis em tempo
                      real para os profissionais da Clínica Soul durante suas consultas e revisões
                      periódicas do protocolo de saúde.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-muted/10 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
