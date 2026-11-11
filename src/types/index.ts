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

export interface UserBasicProfile {
  name: string
  email: string
  phone?: string
  birthDate?: string // YYYY-MM-DD
  gender?: string // Masculino, Feminino, Outro, Não informado
  bloodType?: string // A+, A-, B+, B-, AB+, AB-, O+, O-
  heightCm?: number
  weightKg?: number
  contactNotes?: string
}

export interface ProfileBiomarker {
  id: string
  user: string
  name: string
  value: string
  unit?: string
  reference_range?: string
  category?: string
  status?: string // 'otimo' | 'normal' | 'alterado'
  date?: string
  notes?: string
  created: string
  updated: string
}

export interface ProfileCondition {
  id: string
  user: string
  title: string
  type: 'condicao' | 'lesao' | 'cirurgia' | 'cronica' | string
  status?: 'ativa' | 'resolvida' | 'em_tratamento' | string
  date?: string
  description?: string
  created: string
  updated: string
}

export interface ProfileAllergy {
  id: string
  user: string
  allergen: string
  reaction?: string
  severity?: 'Leve' | 'Moderada' | 'Severa' | string
  diagnosed_date?: string
  notes?: string
  created: string
  updated: string
}

export interface ProfileVaccination {
  id: string
  user: string
  vaccine: string
  dose?: string
  date: string
  next_due_date?: string
  batch_or_clinic?: string
  notes?: string
  created: string
  updated: string
}

export interface ProfileEvent {
  id: string
  user: string
  title: string
  category?: string
  date: string
  description?: string
  impact?: string
  created: string
  updated: string
}

export interface ProfileGenetics {
  id: string
  user: string
  trait: string
  gene_variant?: string
  category?: string
  risk_or_status?: string
  notes?: string
  created: string
  updated: string
}

export interface ProfileCareProvider {
  id: string
  user: string
  name: string
  specialty: string
  clinic_or_hospital?: string
  phone?: string
  email?: string
  notes?: string
  is_primary?: boolean
  created: string
  updated: string
}

export interface ProfileLifestyle {
  id: string
  user: string
  smoking_status?: string // 'Não fumante', 'Ex-fumante', 'Fumante ocasional', 'Fumante regular'
  alcohol_drinks_per_week?: number
  exercise_days_per_week?: number
  exercise_minutes_per_week?: number
  diet_pattern?: string // 'Mediterrânea', 'Anti-inflamatória', 'Low Carb', 'Geral', etc.
  sleep_hours_typical?: number
  stress_level_typical?: string // 'Baixo', 'Moderado', 'Elevado'
  sun_exposure_min_day?: number
  notes?: string
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
  | 'sintoma'
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
  body_fat_pct?: number // % de gordura corporal (registros de peso)
  lean_mass_kg?: number // massa magra em kg (registros de peso)
  sleep_deep_hours?: number // sono profundo em horas (ex: 1.5)
  sleep_rem_hours?: number // sono REM em horas (ex: 1.8)
  sleep_awake_hours?: number // tempo acordado durante a noite em horas (ex: 0.5)
  bedtime?: string // horário em que foi para a cama (ex: "23:15")
  wakeup?: string // horário em que acordou (ex: "07:00")
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

export type SleepStatus = 'bom' | 'medio' | 'ruim'
export type PhysicalActivityStatus = 'muito_otimo' | 'mais_ou_menos' | 'pouco' | 'nada'
export type NutritionStatus = 'otima' | 'boa' | 'razoavel' | 'ruim' | 'pessima'
export type HighMedLowStatus = 'alta' | 'media' | 'baixa'
export type SocialStatus = 'alta' | 'mais_ou_menos' | 'pouco' | 'nada'

export interface LifeAspectRatings {
  espiritual?: number // 0 a 100
  parentes?: number
  conjugal?: number
  filhos?: number
  social?: number
  saude?: number
  servir?: number
  intelectual?: number
  financeiro?: number
  profissional?: number
  emocional?: number
}

export interface EmotionalLog {
  id: string
  user: string
  date: string
  mood_score: number // 1 a 5
  mood_label: string
  affecting_factors?: string
  notes?: string
  energy_level?: number // 1 a 5
  stress_level?: number // 1 a 5
  emotions?: string[] // tags das emoções selecionadas
  sleep_status?: SleepStatus | string
  physical_activity?: PhysicalActivityStatus | string
  nutrition?: NutritionStatus | string
  social_status?: SocialStatus | string
  family_status?: HighMedLowStatus | string
  partner_status?: HighMedLowStatus | string
  hobbies_status?: HighMedLowStatus | string
  spirituality_status?: HighMedLowStatus | string
  intellect_status?: HighMedLowStatus | string
  service_status?: HighMedLowStatus | string
  financial_status?: HighMedLowStatus | string
  life_aspects?: LifeAspectRatings
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

export type ReminderType = 'remedio' | 'exame' | 'consulta' | 'habito' | 'outro'
export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly'
export type ReminderStatus = 'pending' | 'completed' | 'cancelled'

export interface Reminder {
  id: string
  user: string
  type: ReminderType
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  repeat?: ReminderRepeat
  status?: ReminderStatus
  notes?: string
  created: string
  updated: string
}
