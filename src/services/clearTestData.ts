import pb from '@/lib/pocketbase/client'

/**
 * "Limpar dados de teste" (Settings) — zera o perfil do usuário logado.
 *
 * Apaga SOMENTE REGISTROS (linhas) das coleções de dados do app, via endpoint
 * autenticado do hook clear-test-data.js. Nunca apaga o usuário (auth), o
 * perfil, as preferências (user_preferences) nem nenhuma coleção inteira —
 * a estrutura do banco permanece intacta.
 */

export interface ClearTestDataTotals {
  [collection: string]: number
}

export interface ClearTestDataResult {
  ok: boolean
  dry_run: boolean
  totals: ClearTestDataTotals
  total_deleted: number
  failures: string[]
}

/** Rótulos legíveis para o diálogo de confirmação / resumo pós-limpeza. */
export const CLEARABLE_LABELS: Array<{ collection: string; label: string }> = [
  { collection: 'profile_biomarkers', label: 'Biomarcadores do perfil' },
  { collection: 'exams', label: 'Exames (Upload/Download em Sources)' },
  { collection: 'exam_imports', label: 'Fila de importação de arquivos' },
  {
    collection: 'health_metrics',
    label: 'Medições de saúde (peso, pressão, glicemia, café, água, sono, HRV, sintomas…)',
  },
  { collection: 'medications', label: 'Medicamentos e rotinas de medicação' },
  { collection: 'meals', label: 'Refeições' },
  { collection: 'diets', label: 'Dietas' },
  { collection: 'emotional_logs', label: 'Diário emocional (Daylio)' },
  { collection: 'medical_records', label: 'Registros médicos (cirurgias, condições…)' },
  { collection: 'ai_analyses', label: 'Análises de IA' },
  { collection: 'reminders', label: 'Lembretes' },
  { collection: 'profile_conditions', label: 'Condições de saúde' },
  { collection: 'profile_allergies', label: 'Alergias' },
  { collection: 'profile_vaccinations', label: 'Vacinas' },
  { collection: 'profile_events', label: 'Eventos de saúde' },
  { collection: 'profile_genetics', label: 'Genética' },
  { collection: 'profile_care_providers', label: 'Profissionais de saúde' },
  { collection: 'profile_lifestyle', label: 'Estilo de vida' },
]

/**
 * Prévia (dry run): quantos registros o usuário tem por coleção, SEM apagar
 * nada. Usada no diálogo de confirmação e para contagem antes/depois.
 */
export async function clearTestDataPreview(): Promise<ClearTestDataResult> {
  return (await pb.send('/backend/v1/data/clear-test-data', {
    method: 'POST',
    body: JSON.stringify({ dry_run: true }),
  })) as ClearTestDataResult
}

/** Executa a limpeza de fato (após a confirmação do usuário). */
export async function clearTestData(): Promise<ClearTestDataResult> {
  return (await pb.send('/backend/v1/data/clear-test-data', {
    method: 'POST',
    body: JSON.stringify({ dry_run: false }),
  })) as ClearTestDataResult
}
