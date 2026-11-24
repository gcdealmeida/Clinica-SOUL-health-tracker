import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { healthService } from '@/services/health'
import { HealthCategory, HealthMetric } from '@/types'
import { todayStr } from '@/lib/localDate'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Droplets,
  Coffee,
  Moon,
  Activity,
  Heart,
  Scale,
  Pill,
  Wine,
  Wind,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  ClipboardList,
  Sparkles,
  ChevronRight,
  Flame,
  Info,
} from 'lucide-react'

export interface QuickOption {
  label: string
  sublabel?: string
  numericValue?: number
  textValue?: string
  notes?: string
}

export interface MetricVisualConfig {
  id: HealthCategory
  name: string
  icon: any
  defaultUnit: string
  placeholder: string
  quickAmounts?: number[]
  color: string // Tailwind text color
  theme: {
    bgLight: string // classes de fundo sutil
    badgeBg: string
    borderAccent: string
    buttonBg: string
    buttonHover: string
    gradientHeader: string
  }
  subtitle: string
  isNumericOnly?: boolean
  quickPresets?: QuickOption[]
}

export const CATEGORY_DEFINITIONS: MetricVisualConfig[] = [
  {
    id: 'agua',
    name: 'Água',
    icon: Droplets,
    defaultUnit: 'ml',
    placeholder: 'Ex: 250, 500, 1000',
    quickAmounts: [250, 500, 750, 1000],
    color: 'text-blue-500',
    theme: {
      bgLight: 'bg-blue-50/50 dark:bg-blue-950/20',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      borderAccent: 'border-blue-200 dark:border-blue-900',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      buttonHover: 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40',
      gradientHeader: 'from-blue-600 to-cyan-600',
    },
    subtitle: 'Hidratação corporal essencial',
    isNumericOnly: true,
    quickPresets: [
      { label: '250 ml', sublabel: 'Copo padrão', numericValue: 250, notes: 'Copo de água' },
      { label: '350 ml', sublabel: 'Copo grande', numericValue: 350, notes: 'Copo grande' },
      { label: '500 ml', sublabel: 'Garrafa pequena', numericValue: 500, notes: 'Garrafa 500ml' },
      { label: '750 ml', sublabel: 'Squeeze / Shake', numericValue: 750, notes: 'Garrafa 750ml' },
      { label: '1.000 ml', sublabel: '1 Litro', numericValue: 1000, notes: '1 Litro de água' },
    ],
  },
  {
    id: 'cafe',
    name: 'Café & Cafeína',
    icon: Coffee,
    defaultUnit: 'xícaras',
    placeholder: 'Ex: 1, 2 xícaras',
    quickAmounts: [1, 2],
    color: 'text-amber-700',
    theme: {
      bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
      borderAccent: 'border-amber-200 dark:border-amber-900',
      buttonBg: 'bg-amber-700 hover:bg-amber-800 text-white',
      buttonHover: 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40',
      gradientHeader: 'from-amber-700 to-orange-700',
    },
    subtitle: 'Consumo de cafeína e estado de alerta',
    isNumericOnly: false,
    quickPresets: [
      {
        label: 'Espresso Simples',
        sublabel: '~75 mg cafeína',
        numericValue: 1,
        textValue: 'Espresso simples',
        notes: 'Dose simples de espresso (~75mg cafeína)',
      },
      {
        label: 'Espresso Duplo',
        sublabel: '~150 mg cafeína',
        numericValue: 2,
        textValue: 'Espresso duplo',
        notes: 'Dose dupla de espresso (~150mg cafeína)',
      },
      {
        label: 'Xícara Coada',
        sublabel: '~95 mg cafeína',
        numericValue: 1,
        textValue: 'Café coado/filtrado',
        notes: 'Xícara de café coado 150ml (~95mg cafeína)',
      },
      {
        label: 'Caneca Grande',
        sublabel: '~160 mg cafeína',
        numericValue: 2,
        textValue: 'Caneca de café',
        notes: 'Caneca de café coado 250ml (~160mg cafeína)',
      },
      {
        label: 'Descafeinado',
        sublabel: '~3 mg cafeína',
        numericValue: 1,
        textValue: 'Café descafeinado',
        notes: 'Café descafeinado',
      },
    ],
  },
  {
    id: 'pressao',
    name: 'Pressão Arterial',
    icon: Heart,
    defaultUnit: 'mmHg',
    placeholder: 'Ex: 120/80',
    color: 'text-rose-500',
    theme: {
      bgLight: 'bg-rose-50/50 dark:bg-rose-950/20',
      badgeBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
      borderAccent: 'border-rose-200 dark:border-rose-900',
      buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
      buttonHover: 'hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40',
      gradientHeader: 'from-rose-600 to-pink-600',
    },
    subtitle: 'Sinal vital cardiovascular essencial',
    isNumericOnly: false,
    quickPresets: [
      {
        label: '120/80',
        sublabel: 'Ótima / Padrão',
        numericValue: 120,
        textValue: '120/80',
        notes: 'Pressão ótima de repouso',
      },
      {
        label: '110/70',
        sublabel: 'Baixa / Normal',
        numericValue: 110,
        textValue: '110/70',
        notes: 'Pressão normal de repouso',
      },
      {
        label: '130/85',
        sublabel: 'Limítrofe',
        numericValue: 130,
        textValue: '130/85',
        notes: 'Pressão limítrofe',
      },
      {
        label: '140/90',
        sublabel: 'Atenção / Hipertensa',
        numericValue: 140,
        textValue: '140/90',
        notes: 'Nível elevado — avaliar repouso e acompanhamento',
      },
    ],
  },
  {
    id: 'sono',
    name: 'Sono & Repouso',
    icon: Moon,
    defaultUnit: 'horas',
    placeholder: 'Ex: 7.5 (7h30)',
    quickAmounts: [6.0, 7.0, 7.5, 8.0, 8.5],
    color: 'text-indigo-500',
    theme: {
      bgLight: 'bg-indigo-50/50 dark:bg-indigo-950/20',
      badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
      borderAccent: 'border-indigo-200 dark:border-indigo-900',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      buttonHover: 'hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
      gradientHeader: 'from-indigo-600 to-purple-600',
    },
    subtitle: 'Recuperação metabólica e hormonal',
    isNumericOnly: true,
    quickPresets: [
      {
        label: '6h00',
        sublabel: 'Sono curto',
        numericValue: 6.0,
        notes: 'Sono de 6 horas',
      },
      {
        label: '7h00',
        sublabel: 'Sono bom',
        numericValue: 7.0,
        notes: 'Sono de 7 horas',
      },
      {
        label: '7h30',
        sublabel: 'Meta recomendada',
        numericValue: 7.5,
        notes: 'Sono de 7h30 — reparador',
      },
      {
        label: '8h00',
        sublabel: 'Excelente recuperação',
        numericValue: 8.0,
        notes: 'Sono de 8 horas reparador',
      },
      {
        label: '8h30+',
        sublabel: 'Sono profundo',
        numericValue: 8.5,
        notes: 'Sono prolongado e profundo',
      },
    ],
  },
  {
    id: 'atividade',
    name: 'Atividade Física',
    icon: Activity,
    defaultUnit: 'min',
    placeholder: 'Ex: 45 min',
    quickAmounts: [30, 45, 60, 90],
    color: 'text-orange-500',
    theme: {
      bgLight: 'bg-orange-50/50 dark:bg-orange-950/20',
      badgeBg: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      borderAccent: 'border-orange-200 dark:border-orange-900',
      buttonBg: 'bg-orange-600 hover:bg-orange-700 text-white',
      buttonHover: 'hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40',
      gradientHeader: 'from-orange-600 to-amber-600',
    },
    subtitle: 'Exercício, treino e movimento corporal',
    isNumericOnly: true,
    quickPresets: [
      {
        label: 'Musculação',
        sublabel: '50 min • Força',
        numericValue: 50,
        notes: 'Musculação / Treino de força',
      },
      {
        label: 'Caminhada',
        sublabel: '40 min • Zona 2',
        numericValue: 40,
        notes: 'Caminhada rápida aeróbica (Zona 2)',
      },
      {
        label: 'Corrida',
        sublabel: '35 min • Cardio',
        numericValue: 35,
        notes: 'Corrida ao ar livre / esteira',
      },
      {
        label: 'Bicicleta / Bike',
        sublabel: '45 min • Giro',
        numericValue: 45,
        notes: 'Ciclismo indoor / spinning',
      },
      {
        label: 'Alongamento / Yoga',
        sublabel: '25 min • Mobilidade',
        numericValue: 25,
        notes: 'Mobilidade, yoga e alongamento',
      },
    ],
  },
  {
    id: 'peso',
    name: 'Peso Corporal & Composição',
    icon: Scale,
    defaultUnit: 'kg',
    placeholder: 'Ex: 82.5',
    color: 'text-slate-600',
    theme: {
      bgLight: 'bg-slate-50/50 dark:bg-slate-900/30',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      borderAccent: 'border-slate-200 dark:border-slate-800',
      buttonBg: 'bg-slate-700 hover:bg-slate-800 text-white',
      buttonHover: 'hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40',
      gradientHeader: 'from-slate-700 to-zinc-700',
    },
    subtitle: 'Acompanhamento ponderal e bioimpedância',
    isNumericOnly: true,
  },
  {
    id: 'hrv',
    name: 'HRV (Variabilidade Cardíaca)',
    icon: Activity,
    defaultUnit: 'ms',
    placeholder: 'Ex: 65, 75',
    color: 'text-emerald-500',
    theme: {
      bgLight: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
      borderAccent: 'border-emerald-200 dark:border-emerald-900',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      buttonHover: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
      gradientHeader: 'from-emerald-600 to-teal-600',
    },
    subtitle: 'Equilíbrio autonômico e tolerância ao estresse',
    isNumericOnly: true,
  },
  {
    id: 'glicemia',
    name: 'Glicemia',
    icon: Activity,
    defaultUnit: 'mg/dL',
    placeholder: 'Ex: 85, 95',
    color: 'text-teal-500',
    theme: {
      bgLight: 'bg-teal-50/50 dark:bg-teal-950/20',
      badgeBg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
      borderAccent: 'border-teal-200 dark:border-teal-900',
      buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
      buttonHover: 'hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40',
      gradientHeader: 'from-teal-600 to-emerald-600',
    },
    subtitle: 'Controle glicêmico e sensibilidade à insulina',
    isNumericOnly: true,
    quickPresets: [
      { label: 'Jejum ~85', sublabel: 'Ótima (<99)', numericValue: 85, notes: 'Glicemia de jejum' },
      { label: 'Jejum ~95', sublabel: 'Normal', numericValue: 95, notes: 'Glicemia de jejum' },
      {
        label: 'Pós-prandial ~115',
        sublabel: '2h pós refeição',
        numericValue: 115,
        notes: 'Pós-prandial 2h',
      },
    ],
  },
  {
    id: 'saturacao',
    name: 'Saturação SpO2',
    icon: Activity,
    defaultUnit: '%',
    placeholder: 'Ex: 98',
    color: 'text-cyan-500',
    theme: {
      bgLight: 'bg-cyan-50/50 dark:bg-cyan-950/20',
      badgeBg: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
      borderAccent: 'border-cyan-200 dark:border-cyan-900',
      buttonBg: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      buttonHover: 'hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40',
      gradientHeader: 'from-cyan-600 to-blue-600',
    },
    subtitle: 'Oxigenação sanguínea arterial em repouso',
    isNumericOnly: true,
    quickPresets: [
      { label: '99%', sublabel: 'Excelente', numericValue: 99, notes: 'Oximetria em repouso' },
      { label: '98%', sublabel: 'Ótima', numericValue: 98, notes: 'Oximetria em repouso' },
      { label: '97%', sublabel: 'Normal', numericValue: 97, notes: 'Oximetria em repouso' },
      { label: '95%', sublabel: 'Atenção', numericValue: 95, notes: 'Oximetria em repouso' },
    ],
  },
  {
    id: 'remedio',
    name: 'Remédios & Suplementos',
    icon: Pill,
    defaultUnit: 'dose',
    placeholder: 'Nome do medicamento ou suplemento',
    color: 'text-purple-500',
    theme: {
      bgLight: 'bg-purple-50/50 dark:bg-purple-950/20',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      borderAccent: 'border-purple-200 dark:border-purple-900',
      buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
      buttonHover: 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40',
      gradientHeader: 'from-purple-600 to-indigo-600',
    },
    subtitle: 'Adesão medicamentosa e suplementação',
    isNumericOnly: false,
    quickPresets: [
      {
        label: 'Dipirona 1g',
        sublabel: 'Analgésico',
        textValue: 'Dipirona 1g',
        notes: 'pontual • 1g para dor',
      },
      {
        label: 'Paracetamol 750mg',
        sublabel: 'Analgésico',
        textValue: 'Paracetamol 750mg',
        notes: 'pontual • 750mg',
      },
      {
        label: 'Whey Protein',
        sublabel: '30g proteína',
        textValue: 'Whey Protein',
        notes: 'Dose pós-treino',
      },
      {
        label: 'Creatina 5g',
        sublabel: 'Suplemento diário',
        textValue: 'Creatina 5g',
        notes: 'Suplementação diária',
      },
      {
        label: 'Ômega 3',
        sublabel: '1000mg EPA/DHA',
        textValue: 'Ômega 3',
        notes: 'Com a refeição',
      },
      {
        label: 'Magnésio',
        sublabel: 'Quelato / Treonato',
        textValue: 'Magnésio',
        notes: 'Antes de dormir',
      },
    ],
  },
  {
    id: 'alcool',
    name: 'Álcool',
    icon: Wine,
    defaultUnit: 'doses',
    placeholder: 'Ex: 1 taça de vinho, 1 cerveja',
    quickAmounts: [1, 2, 3],
    color: 'text-red-700',
    theme: {
      bgLight: 'bg-red-50/50 dark:bg-red-950/20',
      badgeBg: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
      borderAccent: 'border-red-200 dark:border-red-900',
      buttonBg: 'bg-red-700 hover:bg-red-800 text-white',
      buttonHover: 'hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/40',
      gradientHeader: 'from-red-700 to-rose-800',
    },
    subtitle: 'Monitoramento de consumo alcoólico',
    isNumericOnly: false,
    quickPresets: [
      {
        label: '1 Taça Vinho',
        sublabel: '~1 dose',
        numericValue: 1,
        textValue: '1 taça de vinho tinto',
        notes: 'Vinho tinto seco no jantar',
      },
      {
        label: '2 Taças Vinho',
        sublabel: '~2 doses',
        numericValue: 2,
        textValue: '2 taças de vinho',
        notes: '2 taças de vinho no jantar',
      },
      {
        label: '1 Cerveja (Long Neck)',
        sublabel: '~1 dose',
        numericValue: 1,
        textValue: '1 cerveja (330ml)',
        notes: '1 long neck',
      },
      {
        label: '2 Cervejas',
        sublabel: '~2 doses',
        numericValue: 2,
        textValue: '2 cervejas',
        notes: '2 cervejas artesanais/pilsen',
      },
      {
        label: '1 Drink / Coquetel',
        sublabel: '~1.5 doses',
        numericValue: 1.5,
        textValue: '1 drink (gin tônica / whisky)',
        notes: '1 coquetel',
      },
    ],
  },
  {
    id: 'sauna',
    name: 'Sauna / Banho Gelado',
    icon: Flame,
    defaultUnit: 'min',
    placeholder: 'Ex: 20 min sauna seca',
    quickAmounts: [15, 20, 30],
    color: 'text-amber-600',
    theme: {
      bgLight: 'bg-orange-50/50 dark:bg-orange-950/20',
      badgeBg: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      borderAccent: 'border-orange-200 dark:border-orange-900',
      buttonBg: 'bg-orange-600 hover:bg-orange-700 text-white',
      buttonHover: 'hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40',
      gradientHeader: 'from-orange-600 to-red-600',
    },
    subtitle: 'Estresse térmico adaptativo e longevidade',
    isNumericOnly: true,
    quickPresets: [
      { label: 'Sauna 15 min', sublabel: 'Seca / Úmida', numericValue: 15, notes: 'Sauna 80°C' },
      {
        label: 'Sauna 20 min',
        sublabel: 'Pós treino',
        numericValue: 20,
        notes: 'Sauna seca 80°C + ducha fria',
      },
      {
        label: 'Banho Frio 3 min',
        sublabel: 'Crioterapia',
        numericValue: 3,
        notes: 'Ducha fria após treino',
      },
      {
        label: 'Contraste Térmico',
        sublabel: 'Sauna + Ducha',
        numericValue: 25,
        notes: 'Protocolo de contraste',
      },
    ],
  },
  {
    id: 'meditacao',
    name: 'Meditação / Respiração',
    icon: Wind,
    defaultUnit: 'min',
    placeholder: 'Ex: 15 min mindfulness',
    quickAmounts: [10, 15, 20],
    color: 'text-emerald-700',
    theme: {
      bgLight: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300',
      borderAccent: 'border-emerald-200 dark:border-emerald-900',
      buttonBg: 'bg-emerald-700 hover:bg-emerald-800 text-white',
      buttonHover: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
      gradientHeader: 'from-emerald-700 to-teal-700',
    },
    subtitle: 'Mindfulness, coerência cardíaca e foco',
    isNumericOnly: true,
    quickPresets: [
      {
        label: 'Respiração 4-7-8',
        sublabel: '10 min • Sono',
        numericValue: 10,
        notes: 'Respiração diafragmática 4-7-8',
      },
      {
        label: 'Mindfulness',
        sublabel: '15 min • Foco',
        numericValue: 15,
        notes: 'Atenção plena matinal',
      },
      {
        label: 'Meditação Guiada',
        sublabel: '20 min • Redução estresse',
        numericValue: 20,
        notes: 'Meditação guiada profunda',
      },
    ],
  },
  {
    id: 'sintoma',
    name: 'Sintomas & Desconfortos',
    icon: ClipboardList,
    defaultUnit: '/10',
    placeholder: 'Ex: Cefaleia tensional, Enjoo, Cansaço',
    color: 'text-amber-600',
    theme: {
      bgLight: 'bg-amber-50/50 dark:bg-amber-950/20',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
      borderAccent: 'border-amber-200 dark:border-amber-900',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
      buttonHover: 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40',
      gradientHeader: 'from-amber-600 to-rose-600',
    },
    subtitle: 'Registro de sinais corporais e severidade',
    isNumericOnly: false,
    quickPresets: [
      {
        label: 'Dor de cabeça leve',
        sublabel: 'Severidade 3/10',
        textValue: 'Dor de cabeça tensional leve',
        numericValue: 3,
        notes: 'Final de tarde',
      },
      {
        label: 'Refluxo / Azia',
        sublabel: 'Severidade 4/10',
        textValue: 'Refluxo pós-almoço',
        numericValue: 4,
        notes: 'Após refeição',
      },
      {
        label: 'Cansaço muscular',
        sublabel: 'Severidade 5/10',
        textValue: 'Cansaço muscular acentuado',
        numericValue: 5,
        notes: 'Pós-treino intenso',
      },
      {
        label: 'Ansiedade leve',
        sublabel: 'Severidade 4/10',
        textValue: 'Tensão / Ansiedade leve',
        numericValue: 4,
        notes: 'Sobrecarga de tarefas',
      },
    ],
  },
]

export default function RegisterMetricPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const categoryParam = searchParams.get('category') as HealthCategory
  const validCategory = CATEGORY_DEFINITIONS.find((c) => c.id === categoryParam)
  const [selectedCategory, setSelectedCategory] = useState<HealthCategory>(
    validCategory ? validCategory.id : 'agua',
  )

  // Separar Data e Hora conforme especificação obrigatória
  const now = new Date()
  const [datePart, setDatePart] = useState<string>(() => todayStr())
  const [timePart, setTimePart] = useState<string>(() => {
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })

  // Campos de valor e detalhes
  const [numericValue, setNumericValue] = useState<string>('')
  const [bodyFat, setBodyFat] = useState<string>('')
  const [leanMass, setLeanMass] = useState<string>('')
  // Fases do sono
  const [sleepDeep, setSleepDeep] = useState<string>('')
  const [sleepRem, setSleepRem] = useState<string>('')
  const [sleepAwake, setSleepAwake] = useState<string>('')
  const [bedtime, setBedtime] = useState<string>('')
  const [wakeup, setWakeup] = useState<string>('')
  const [textValue, setTextValue] = useState<string>('')
  const [severity, setSeverity] = useState<string>('5')
  const [notes, setNotes] = useState<string>('')
  const [fileAttachment, setFileAttachment] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Histórico da métrica
  const [history, setHistory] = useState<HealthMetric[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const currentDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategory) || CATEGORY_DEFINITIONS[0]

  useEffect(() => {
    if (categoryParam && categoryParam !== selectedCategory) {
      const found = CATEGORY_DEFINITIONS.find((c) => c.id === categoryParam)
      if (found) setSelectedCategory(found.id)
    }
  }, [categoryParam])

  useEffect(() => {
    loadHistory(selectedCategory)
    // Limpar campos de entrada ao trocar de categoria para evitar contaminação
    setNumericValue('')
    setBodyFat('')
    setLeanMass('')
    setSleepDeep('')
    setSleepRem('')
    setSleepAwake('')
    setBedtime('')
    setWakeup('')
    setTextValue('')
    setNotes('')
  }, [selectedCategory])

  const loadHistory = async (cat: HealthCategory) => {
    try {
      setLoadingHistory(true)
      const res = await healthService.listUserMetrics(undefined, 20, cat)
      setHistory(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSelectCategory = (catId: HealthCategory) => {
    setSelectedCategory(catId)
    setSearchParams({ category: catId })
  }

  const handleApplyPreset = (preset: QuickOption) => {
    if (preset.numericValue !== undefined) {
      setNumericValue(String(preset.numericValue))
    }
    if (preset.textValue !== undefined) {
      setTextValue(preset.textValue)
    }
    if (preset.notes) {
      setNotes((prev) => (prev ? `${prev} • ${preset.notes}` : (preset.notes ?? '')))
    }
    if (selectedCategory === 'sintoma' && preset.numericValue !== undefined) {
      setSeverity(String(preset.numericValue))
    }
    toast.info(`Opção "${preset.label}" selecionada`, { duration: 1800 })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numericValue && !textValue) {
      toast.error('Informe o valor a ser registrado')
      return
    }

    const cleanDate = (datePart || todayStr()).trim()
    const cleanTime = (timePart || '12:00').trim()
    const finalDateTime = `${cleanDate} ${cleanTime}`

    setIsSubmitting(true)
    try {
      await healthService.createMetric({
        category: selectedCategory,
        date_time: finalDateTime,
        numeric_value:
          selectedCategory === 'sintoma'
            ? parseFloat(severity)
            : numericValue
              ? parseFloat(numericValue.replace(',', '.'))
              : undefined,
        text_value: textValue || undefined,
        unit: currentDef.defaultUnit,
        notes: notes || undefined,
        attachment: fileAttachment || undefined,
        body_fat_pct:
          selectedCategory === 'peso' && bodyFat
            ? parseFloat(bodyFat.replace(',', '.'))
            : undefined,
        lean_mass_kg:
          selectedCategory === 'peso' && leanMass
            ? parseFloat(leanMass.replace(',', '.'))
            : undefined,
        sleep_deep_hours:
          selectedCategory === 'sono' && sleepDeep
            ? parseFloat(sleepDeep.replace(',', '.'))
            : undefined,
        sleep_rem_hours:
          selectedCategory === 'sono' && sleepRem
            ? parseFloat(sleepRem.replace(',', '.'))
            : undefined,
        sleep_awake_hours:
          selectedCategory === 'sono' && sleepAwake
            ? parseFloat(sleepAwake.replace(',', '.'))
            : undefined,
        bedtime: selectedCategory === 'sono' && bedtime ? bedtime.trim() : undefined,
        wakeup: selectedCategory === 'sono' && wakeup ? wakeup.trim() : undefined,
      })

      toast.success(`${currentDef.name} registrado com sucesso!`)
      setNumericValue('')
      setBodyFat('')
      setLeanMass('')
      setSleepDeep('')
      setSleepRem('')
      setSleepAwake('')
      setBedtime('')
      setWakeup('')
      setTextValue('')
      setSeverity('5')
      setNotes('')
      setFileAttachment(null)
      await loadHistory(selectedCategory)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar o registro')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await healthService.deleteMetric(id)
      toast.success('Registro removido')
      setHistory((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      toast.error('Erro ao excluir registro')
    }
  }

  const IconComponent = currentDef.icon

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Header Elegante */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2 border-b">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                Registrar Sinais & Hábitos
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Registro personalizado com presets rápidos, data, hora e observações clínicas
            </p>
          </div>

          <Link
            to={`/metrics/${selectedCategory}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border bg-card hover:bg-muted/50 transition-colors self-start md:self-auto"
          >
            Ver painel de {currentDef.name}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Barra de Métricas estilo carrossel com ícones e temas */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Selecione a Métrica
          </Label>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORY_DEFINITIONS.map((cat) => {
              const CatIcon = cat.icon
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border shadow-xs ${
                    isSelected
                      ? `${cat.theme.buttonBg} border-transparent shadow-sm scale-102`
                      : `bg-card text-muted-foreground border-border/80 ${cat.theme.buttonHover}`
                  }`}
                >
                  <CatIcon className={`h-4 w-4 ${isSelected ? 'text-white' : cat.color}`} />
                  <span>{cat.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário Principal com visual customizado da métrica */}
          <Card
            className={`lg:col-span-7 border ${currentDef.theme.borderAccent} overflow-hidden shadow-xs`}
          >
            {/* Header da Métrica Selecionada com Gradiente Exclusivo */}
            <div className={`p-5 bg-gradient-to-r ${currentDef.theme.gradientHeader} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold tracking-tight">
                      {currentDef.name}
                    </h2>
                    <p className="text-xs text-white/80">{currentDef.subtitle}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-sm">
                  Unidade: {currentDef.defaultUnit}
                </span>
              </div>
            </div>

            <CardContent className="p-5 sm:p-6 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. DATA E HORA OBRIGATÓRIAS (separadas conforme padrão) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="metric-date"
                      className="text-xs font-semibold flex items-center gap-1.5 text-foreground"
                    >
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      Data do Registro
                    </Label>
                    <Input
                      id="metric-date"
                      type="date"
                      value={datePart}
                      onChange={(e) => setDatePart(e.target.value)}
                      className="text-xs bg-card"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="metric-time"
                      className="text-xs font-semibold flex items-center gap-1.5 text-foreground"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Hora do Registro
                    </Label>
                    <Input
                      id="metric-time"
                      type="time"
                      value={timePart}
                      onChange={(e) => setTimePart(e.target.value)}
                      className="text-xs bg-card"
                      required
                    />
                  </div>
                </div>

                {/* 2. PRESETS RÁPIDOS (opções pré-prontas além do input livre) */}
                {currentDef.quickPresets && currentDef.quickPresets.length > 0 && (
                  <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Opções Pré-Prontas (Preenchimento Rápido)
                      </Label>
                      <span className="text-[10px] text-muted-foreground">Clique para aplicar</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {currentDef.quickPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="flex flex-col items-start p-2.5 rounded-lg border bg-card hover:bg-muted/60 text-left transition-all hover:scale-101 border-border/80"
                        >
                          <span className="text-xs font-semibold text-foreground leading-tight">
                            {preset.label}
                          </span>
                          {preset.sublabel && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {preset.sublabel}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. CAMPO DE VALOR OBRIGATÓRIO (com formatação por tipo de métrica) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="metric-value" className="text-xs font-semibold text-foreground">
                      Valor ({currentDef.defaultUnit}) *
                    </Label>
                    {currentDef.quickAmounts && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground mr-1">Incremento:</span>
                        {currentDef.quickAmounts.map((amt) => (
                          <button
                            type="button"
                            key={amt}
                            onClick={() => setNumericValue(String(amt))}
                            className="text-[10px] font-medium bg-muted hover:bg-primary/10 hover:text-primary px-2 py-0.5 rounded-md transition-colors"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {currentDef.id === 'sintoma' ? (
                    <div className="space-y-3 p-3.5 rounded-xl border bg-card">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Nome do sintoma ou desconforto:
                        </Label>
                        <Input
                          id="metric-value"
                          placeholder={currentDef.placeholder}
                          value={textValue}
                          onChange={(e) => setTextValue(e.target.value)}
                          className="text-sm font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            Escala de Severidade / Intensidade
                          </Label>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                            {severity || '5'}/10
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={severity}
                          onChange={(e) => setSeverity(e.target.value)}
                          className="w-full accent-amber-600 h-2 bg-muted rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0 - Imperceptível</span>
                          <span>5 - Moderado</span>
                          <span>10 - Intenso / Intolerável</span>
                        </div>
                      </div>
                    </div>
                  ) : currentDef.id === 'pressao' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Leitura completa:
                          </Label>
                          <Input
                            placeholder="Ex: 120/80"
                            value={textValue}
                            onChange={(e) => {
                              const val = e.target.value
                              setTextValue(val)
                              const match = val.match(/^(\d+)/)
                              if (match) setNumericValue(match[1])
                            }}
                            className="text-sm font-semibold"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">
                            Sistólica (máxima):
                          </Label>
                          <Input
                            type="number"
                            placeholder="Ex: 120"
                            value={numericValue}
                            onChange={(e) => setNumericValue(e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Dica: use o formato 120/80 para que os gráficos de pressão sistólica e
                        diastólica fiquem completos.
                      </p>
                    </div>
                  ) : currentDef.isNumericOnly ? (
                    <div className="relative">
                      <Input
                        id="metric-value"
                        type="number"
                        step="any"
                        placeholder={currentDef.placeholder}
                        value={numericValue}
                        onChange={(e) => setNumericValue(e.target.value)}
                        className="text-base font-semibold pr-20 h-11"
                        required
                      />
                      <span className="absolute right-3.5 top-3 text-xs text-muted-foreground font-semibold pointer-events-none">
                        {currentDef.defaultUnit}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        id="metric-value"
                        placeholder={currentDef.placeholder}
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        className="text-sm font-medium"
                        required
                      />
                      {numericValue && (
                        <p className="text-[11px] text-muted-foreground">
                          Valor computado para série: {numericValue} {currentDef.defaultUnit}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Campos adicionais para Peso: bioimpedância (gordura % e massa magra kg) */}
                {currentDef.id === 'peso' && (
                  <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                    <Label className="text-xs font-semibold text-foreground">
                      Bioimpedância (Opcional — alimenta as abas de Gordura e Massa Magra)
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="body-fat" className="text-[11px] text-muted-foreground">
                          Gordura corporal (%)
                        </Label>
                        <Input
                          id="body-fat"
                          type="number"
                          step="any"
                          min="0"
                          max="100"
                          placeholder="Ex: 22.5"
                          value={bodyFat}
                          onChange={(e) => setBodyFat(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="lean-mass" className="text-[11px] text-muted-foreground">
                          Massa magra (kg)
                        </Label>
                        <Input
                          id="lean-mass"
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Ex: 64.2"
                          value={leanMass}
                          onChange={(e) => setLeanMass(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Campos adicionais para Sono: Fases (Deep, REM, Awake, Bedtime, Wakeup) */}
                {currentDef.id === 'sono' && (
                  <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Fases do Sono & Horários (Opcional — estilo Guava)
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Alimenta o painel com barras por fase
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="sleep-deep" className="text-[11px] text-muted-foreground">
                          Profundo / Deep (h)
                        </Label>
                        <Input
                          id="sleep-deep"
                          type="number"
                          step="0.1"
                          min="0"
                          max="12"
                          placeholder="Ex: 1.5"
                          value={sleepDeep}
                          onChange={(e) => setSleepDeep(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sleep-rem" className="text-[11px] text-muted-foreground">
                          REM (h)
                        </Label>
                        <Input
                          id="sleep-rem"
                          type="number"
                          step="0.1"
                          min="0"
                          max="12"
                          placeholder="Ex: 1.8"
                          value={sleepRem}
                          onChange={(e) => setSleepRem(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="sleep-awake" className="text-[11px] text-muted-foreground">
                          Acordado / Awake (h)
                        </Label>
                        <Input
                          id="sleep-awake"
                          type="number"
                          step="0.1"
                          min="0"
                          max="12"
                          placeholder="Ex: 0.5"
                          value={sleepAwake}
                          onChange={(e) => setSleepAwake(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-indigo-200/60 dark:border-indigo-900/40">
                      <div className="space-y-1">
                        <Label htmlFor="bedtime" className="text-[11px] text-muted-foreground">
                          Hora de deitar (Bedtime)
                        </Label>
                        <Input
                          id="bedtime"
                          type="time"
                          placeholder="23:00"
                          value={bedtime}
                          onChange={(e) => setBedtime(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="wakeup" className="text-[11px] text-muted-foreground">
                          Hora de acordar (Wakeup)
                        </Label>
                        <Input
                          id="wakeup"
                          type="time"
                          placeholder="07:00"
                          value={wakeup}
                          onChange={(e) => setWakeup(e.target.value)}
                          className="text-xs bg-card"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CAMPO OBSERVAÇÕES OBRIGATÓRIO NA ESTRUTURA (preenchimento opcional pelo usuário) */}
                <div className="space-y-1.5">
                  <Label htmlFor="metric-notes" className="text-xs font-semibold text-foreground">
                    Observações Clínicas & Contexto
                  </Label>
                  <Input
                    id="metric-notes"
                    placeholder="Ex: em repouso matinal, antes do treino, após refeição, sono reparador..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-xs"
                  />
                </div>

                {/* Upload foto do relógio / arquivo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between text-foreground">
                    <span>Anexo (Foto do Smartwatch ou Arquivo)</span>
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  </Label>
                  <div className="border border-dashed rounded-xl p-3 text-center bg-muted/20 hover:bg-muted/40 transition-colors">
                    <input
                      type="file"
                      id="metric-file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileAttachment(e.target.files[0])
                        }
                      }}
                    />
                    <label
                      htmlFor="metric-file"
                      className="cursor-pointer text-xs text-primary hover:underline flex flex-col items-center justify-center gap-1"
                    >
                      {fileAttachment ? (
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {fileAttachment.name}
                        </span>
                      ) : (
                        <>
                          <span className="font-medium">
                            Anexar print do smartwatch, HRV ou comprovante
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Formatos aceitos: PNG, JPG, PDF (até 10MB)
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Botão de envio estilizado com a cor da métrica */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full ${currentDef.theme.buttonBg} font-semibold py-2.5 h-11 text-sm shadow-sm transition-all`}
                >
                  {isSubmitting ? 'Salvando registro...' : `Salvar Registro de ${currentDef.name}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Histórico Recente e Contexto da Métrica */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <IconComponent className={`h-4 w-4 ${currentDef.color}`} />
                    Histórico Recente
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Lançamentos mais recentes de {currentDef.name}
                  </CardDescription>
                </div>
                <Link
                  to={`/metrics/${selectedCategory}`}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Gráficos →
                </Link>
              </CardHeader>

              <CardContent className="pt-4">
                {loadingHistory ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    Carregando histórico...
                  </div>
                ) : history.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors text-xs"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground">
                              {item.numeric_value !== undefined && item.numeric_value !== null
                                ? item.numeric_value
                                : item.text_value}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {item.unit}
                            </span>
                            {item.text_value && item.numeric_value !== undefined && (
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                • {item.text_value}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>{item.date_time}</span>
                          </div>

                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {item.notes}
                            </p>
                          )}

                          {item.attachment && (
                            <a
                              href={item.attachment}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary underline mt-0.5"
                            >
                              Ver anexo
                            </a>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          title="Remover registro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    <IconComponent className={`h-8 w-8 mx-auto opacity-40 ${currentDef.color}`} />
                    <p className="font-medium">Nenhum registro de {currentDef.name} ainda.</p>
                    <p className="text-[11px]">
                      Preencha os campos ao lado para registrar o primeiro valor.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cartão de Dica Clínica */}
            <div
              className={`p-4 rounded-xl border ${currentDef.theme.borderAccent} ${currentDef.theme.bgLight} flex items-start gap-3`}
            >
              <Info className={`h-4 w-4 shrink-0 mt-0.5 ${currentDef.color}`} />
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-foreground">Integração do Painel:</span>
                <p className="text-muted-foreground">
                  Registros salvos aqui alimentam instantaneamente a linha do tempo do dia no Painel
                  Principal (Home) e os gráficos históricos no Painel Detalhado de {currentDef.name}
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
