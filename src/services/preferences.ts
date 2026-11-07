import pb from '@/lib/pocketbase/client'

/**
 * Preferências do usuário para o painel "Hoje":
 * lista ordenada das métricas visíveis nos cards (customização estilo Guava).
 * Guardado na coleção `user_preferences` (1 registro por usuário).
 */

export interface DashboardPreferences {
  metrics: string[] // ids de METRIC_CARDS, na ordem escolhida
}

export const DEFAULT_DASHBOARD_METRICS: string[] = [
  'agua',
  'sono',
  'hrv',
  'pressao',
  'peso',
  'cafe',
  'atividade',
  'glicemia',
]

/** Lê as preferências do usuário logado; devolve default quando não existem. */
export async function loadDashboardPreferences(): Promise<DashboardPreferences> {
  const current = pb.authStore.record
  if (!current?.id) return { metrics: DEFAULT_DASHBOARD_METRICS }

  try {
    const rec = await pb.collection('user_preferences').getFirstListItem(`user = '${current.id}'`)
    const raw =
      typeof rec.dashboard_metrics === 'string'
        ? JSON.parse(rec.dashboard_metrics || 'null')
        : rec.dashboard_metrics
    const metrics = Array.isArray(raw) ? raw.filter((m) => typeof m === 'string') : []
    return {
      metrics: metrics.length > 0 ? metrics : [...DEFAULT_DASHBOARD_METRICS],
    }
  } catch (_) {
    // Sem registro ainda — usa o padrão
    return { metrics: [...DEFAULT_DASHBOARD_METRICS] }
  }
}

/** Cria ou atualiza o registro de preferências do usuário logado. */
export async function saveDashboardPreferences(prefs: DashboardPreferences): Promise<void> {
  const current = pb.authStore.record
  if (!current?.id) throw new Error('Usuário não autenticado')

  const body = { user: current.id, dashboard_metrics: JSON.stringify(prefs.metrics) }

  try {
    const rec = await pb.collection('user_preferences').getFirstListItem(`user = '${current.id}'`)
    await pb.collection('user_preferences').update(rec.id, body)
  } catch (err: any) {
    if (err?.status === 404) {
      await pb.collection('user_preferences').create(body)
      return
    }
    throw err
  }
}
