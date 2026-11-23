import PocketBase from 'pocketbase'

// URL canônica do backend Skip Cloud (fonte da página de Integração, curl
// de exemplo e client PocketBase do app).
export const BACKEND_URL =
  import.meta.env.VITE_POCKETBASE_URL ||
  'https://clinica-soul-health-tracker-333e7.shrd01.internal.goskip.dev'

const pb = new PocketBase(BACKEND_URL)
pb.autoCancellation(false)

export default pb
