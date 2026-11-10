export interface WearableService {
  id: string
  name: string
  category: string
  color: string
  bgColor: string
  fileFormats: string
  instructions: string
  exportUrl?: string
}

export const WEARABLE_SERVICES: WearableService[] = [
  {
    id: 'garmin',
    name: 'Garmin Connect',
    category: 'Smartwatch / Monitor Esportivo',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200',
    fileFormats: '.FIT, .TCX, .CSV, .ZIP',
    instructions:
      'Acesse connect.garmin.com > Relatórios ou Atividades > Exportar CSV/FIT, ou Configurações da Conta > Exportar seus Dados (ZIP com histórico completo de passos, sono, HRV e batimentos).',
    exportUrl: 'https://connect.garmin.com',
  },
  {
    id: 'apple_health',
    name: 'Apple Health (Saúde)',
    category: 'iOS / Apple Watch',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200',
    fileFormats: 'export.xml, export.zip, .csv',
    instructions:
      'No iPhone, abra o app Saúde > Toque na sua foto de perfil (canto superior direito) > Role até o final > "Exportar Todos os Dados de Saúde". O arquivo export.zip gerado contém todo o histórico.',
  },
  {
    id: 'training_peaks',
    name: 'TrainingPeaks',
    category: 'Treinamento & Performance',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200',
    fileFormats: '.CSV, .PWX, .FIT',
    instructions:
      'No site trainingpeaks.com > Vá em Configurações de Perfil > Exportar Dados ou abra os treinos/métricas de carga e exporte o arquivo CSV com TSS, FC e potência.',
    exportUrl: 'https://www.trainingpeaks.com',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    category: 'Recuperação & Sono',
    color: 'text-stone-700 dark:text-stone-300',
    bgColor: 'bg-stone-100 dark:bg-stone-900 border-stone-200',
    fileFormats: '.CSV de Recuperação / Sono',
    instructions:
      'Acesse app.whoop.com pelo navegador > Menu de Configurações > "Export Data" > Escolha o intervalo de tempo desejado para baixar a planilha com Recovery, Strain e Sleep Performance.',
    exportUrl: 'https://app.whoop.com',
  },
  {
    id: 'strava',
    name: 'Strava',
    category: 'Ciclismo, Corrida & Atividades',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200',
    fileFormats: '.GPX, .TCX, .FIT, activities.csv',
    instructions:
      'No Strava.com > Configurações > Minha Conta > "Baixar ou Excluir sua Conta" > Solicitar Arquivo de Dados. Você receberá um e-mail com o download de todas as atividades em CSV e FIT.',
    exportUrl: 'https://www.strava.com',
  },
  {
    id: 'google_fit',
    name: 'Google Fit / Health Connect',
    category: 'Android / Smartwatches WearOS',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200',
    fileFormats: 'Google Takeout (ZIP com CSVs/JSON)',
    instructions:
      'Acesse takeout.google.com > Desmarque tudo e marque apenas "Google Fit" > Criar exportação. Os dados de passos, frequência cardíaca e sono serão compactados em um arquivo ZIP.',
    exportUrl: 'https://takeout.google.com',
  },
]
