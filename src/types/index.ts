export type UserRole = 'cliente' | 'profissional'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: UserRole
  phone?: string
  created: string
  updated: string
}

export type HealthCategory =
  | 'agua'
  | 'cafe'
  | 'sono'
  | 'hrv'
  | 'atividade'
  | 'pressao'
  | 'peso'
  | 'glicemia'
  | 'saturacao'
  | 'remedio'
  | 'alcool'
  | 'sauna'
  | 'meditacao'
  | 'outro'

export interface HealthMetric {
  id: string
  user: string
  category: HealthCategory
  date_time: string
  numeric_value?: number
  text_value?: string
  unit?: string
  notes?: string
  attachment?: string
  created: string
  updated: string
}

export interface MedicalRecord {
  id: string
  user: string
  type: 'cirurgia' | 'alergia' | 'doenca_previa' | 'medicamento_continuo'
  title: string
  date?: string
  description?: string
  severity?: string
  created: string
  updated: string
}

export interface EmotionalLog {
  id: string
  user: string
  date: string
  mood_score: number // 1 a 5
  mood_label: string
  affecting_factors?: string
  notes?: string
  energy_level?: number
  stress_level?: number
  created: string
  updated: string
}

export interface Exam {
  id: string
  user: string
  title: string
  type: string
  date: string
  laboratory?: string
  summary_results?: string
  file?: string
  status?: 'normal' | 'alterado' | 'pendente'
  created: string
  updated: string
}

export interface Diet {
  id: string
  user: string
  title: string
  objective?: string
  prescription?: string
  photo?: string
  active?: boolean
  start_date?: string
  end_date?: string
  created: string
  updated: string
}

export interface DetectedFoodItem {
  name: string
  weight_g: number
  calories: number
}

export interface Meal {
  id: string
  user: string
  meal_type: 'cafe_da_manha' | 'almoco' | 'lanche' | 'jantar' | 'ceia' | 'extra'
  date_time: string
  title?: string
  photo?: string
  photo_url?: string
  items_detected?: string
  estimated_weight_g?: number
  estimated_calories?: number
  notes?: string
  created: string
  updated: string
}

export interface AiAnalysis {
  id: string
  user: string
  variables: string
  question?: string
  insights: string
  summary?: string
  created: string
  updated: string
}
