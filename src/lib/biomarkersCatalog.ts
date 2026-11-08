/**
 * Catálogo clínico e faixas de referência de biomarcadores para o app Clínica Soul.
 *
 * Agrupado por grandes áreas laboratoriais com suporte a variações por sexo (H/M)
 * e conversão/normalização de valores para plotagem na régua de termômetro estilo Guava.
 */

export type BiomarkerArea =
  | 'lipid'
  | 'glycemic'
  | 'cbc'
  | 'renal'
  | 'hepatic'
  | 'thyroid'
  | 'vitamins_minerals'
  | 'inflammation'
  | 'hormones'
  | 'electrolytes'
  | 'other'

export interface BiomarkerAreaMeta {
  id: BiomarkerArea
  title: string
  subtitle: string
  color: string // Tailwind color / hex
  iconName: string
}

export const BIOMARKER_AREAS: BiomarkerAreaMeta[] = [
  {
    id: 'lipid',
    title: 'Perfil Lipídico',
    subtitle: 'Colesterol Total, HDL, LDL, Triglicerídeos e frações aterogênicas',
    color: '#0284c7', // sky-600
    iconName: 'Heart',
  },
  {
    id: 'glycemic',
    title: 'Glicemia & Metabolismo',
    subtitle: 'Glicemia de jejum, HbA1c, Insulina e HOMA-IR',
    color: '#10b981', // emerald-500
    iconName: 'Activity',
  },
  {
    id: 'cbc',
    title: 'Hemograma Completo',
    subtitle: 'Eritrócitos, Hemoglobina, Hematócrito, Leucócitos e Plaquetas',
    color: '#e11d48', // rose-600
    iconName: 'Droplet',
  },
  {
    id: 'renal',
    title: 'Função Renal',
    subtitle: 'Creatinina, Ureia, Taxa de Filtração Glomerular (eGFR) e Ácido Úrico',
    color: '#8b5cf6', // violet-500
    iconName: 'ShieldAlert',
  },
  {
    id: 'hepatic',
    title: 'Função Hepática',
    subtitle: 'TGO (AST), TGP (ALT), Gama-GT, Fosfatase Alcalina e Bilirrubinas',
    color: '#f59e0b', // amber-500
    iconName: 'Flame',
  },
  {
    id: 'thyroid',
    title: 'Tireoide',
    subtitle: 'TSH Ultra-Sensível, T4 Livre e T3 Livre',
    color: '#06b6d4', // cyan-500
    iconName: 'Sparkles',
  },
  {
    id: 'vitamins_minerals',
    title: 'Vitaminas & Minerais',
    subtitle: 'Vitamina D (25-OH), Vitamina B12, Ferritina, Ferro Sérico e Zinco',
    color: '#84cc16', // lime-500
    iconName: 'Sun',
  },
  {
    id: 'inflammation',
    title: 'Marcadores Inflamatórios & Cardiovasculares',
    subtitle: 'PCR-us (ultrassensível), VHS e Homocisteína',
    color: '#f97316', // orange-500
    iconName: 'AlertTriangle',
  },
  {
    id: 'hormones',
    title: 'Hormônios',
    subtitle: 'Testosterona Total, Cortisol Basal, DHEA-S e Estradiol',
    color: '#ec4899', // pink-500
    iconName: 'Dna',
  },
  {
    id: 'electrolytes',
    title: 'Eletrólitos',
    subtitle: 'Sódio, Potássio, Magnésio e Cálcio Iônico',
    color: '#14b8a6', // teal-500
    iconName: 'Layers',
  },
  {
    id: 'other',
    title: 'Outros Marcadores',
    subtitle: 'Biomarcadores adicionais e testes especializados',
    color: '#64748b', // slate-500
    iconName: 'FileText',
  },
]

export type RangeStatus = 'low' | 'optimal' | 'borderline' | 'high'

export interface ReferenceRangeSegment {
  status: RangeStatus
  label: string
  min: number
  max: number
  color: string // Cor da faixa
  textColor?: string
}

export interface BiomarkerDefinition {
  id: string
  name: string
  aliases: string[] // Sinônimos para matching automático (ex: 'LDL', 'Colesterol LDL', 'LDL-C')
  area: BiomarkerArea
  defaultUnit: string
  description: string
  clinicalNote?: string
  // Função que retorna as faixas dependendo do sexo ('masculino' | 'feminino' | undefined)
  getRanges: (gender?: string) => {
    minDisplay: number // Mínimo absoluto para desenhar a régua
    maxDisplay: number // Máximo absoluto para desenhar a régua
    segments: ReferenceRangeSegment[]
    optimalText: string // Ex: "< 100 mg/dL" ou "70 - 99 mg/dL"
  }
}

// Helper para criar faixas padrão
export const BIOMARKER_DEFINITIONS: BiomarkerDefinition[] = [
  // -------------------------------------------------------------
  // PERFIL LIPÍDICO
  // -------------------------------------------------------------
  {
    id: 'ldl',
    name: 'Colesterol LDL',
    aliases: ['ldl', 'colesterol ldl', 'ldl-c', 'colesterol ldl calculado', 'ldl colesterol'],
    area: 'lipid',
    defaultUnit: 'mg/dL',
    description: 'Fração aterogênica do colesterol que transporta lipídios para as artérias.',
    clinicalNote:
      'Meta usual < 100 mg/dL para risco habitual; < 70 ou < 50 mg/dL para alto risco cardiovascular.',
    getRanges: () => ({
      minDisplay: 30,
      maxDisplay: 220,
      optimalText: '< 100 mg/dL (ótimo)',
      segments: [
        { status: 'optimal', label: 'Ótimo', min: 30, max: 100, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 100, max: 130, color: '#eab308' },
        { status: 'high', label: 'Alto', min: 130, max: 190, color: '#f97316' },
        { status: 'high', label: 'Muito Alto', min: 190, max: 220, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'hdl',
    name: 'Colesterol HDL',
    aliases: ['hdl', 'colesterol hdl', 'hdl-c', 'hdl colesterol'],
    area: 'lipid',
    defaultUnit: 'mg/dL',
    description: 'Fração cardioprotetora responsável pelo transporte reverso do colesterol.',
    clinicalNote:
      'Valores > 40 mg/dL (homens) ou > 50 mg/dL (mulheres) protegem a parede vascular.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const cutoff = isFemale ? 50 : 40
      return {
        minDisplay: 20,
        maxDisplay: 100,
        optimalText: isFemale ? '> 50 mg/dL (M)' : '> 40 mg/dL (H)',
        segments: [
          { status: 'low', label: 'Baixo (Risco)', min: 20, max: cutoff, color: '#ef4444' },
          {
            status: 'borderline',
            label: 'Aceitável',
            min: cutoff,
            max: cutoff + 10,
            color: '#eab308',
          },
          { status: 'optimal', label: 'Desejável', min: cutoff + 10, max: 100, color: '#10b981' },
        ],
      }
    },
  },
  {
    id: 'colesterol_total',
    name: 'Colesterol Total',
    aliases: ['colesterol total', 'colesterol', 'total cholesterol'],
    area: 'lipid',
    defaultUnit: 'mg/dL',
    description: 'Somatório de todas as frações circulantes de colesterol no plasma.',
    clinicalNote: 'Desejável < 190 mg/dL em adultos em jejum.',
    getRanges: () => ({
      minDisplay: 100,
      maxDisplay: 300,
      optimalText: '< 190 mg/dL',
      segments: [
        { status: 'optimal', label: 'Desejável', min: 100, max: 190, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 190, max: 240, color: '#eab308' },
        { status: 'high', label: 'Elevado', min: 240, max: 300, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'triglicerideos',
    name: 'Triglicerídeos',
    aliases: ['triglicerideos', 'triglicerides', 'triglicérides', 'triglicérideos'],
    area: 'lipid',
    defaultUnit: 'mg/dL',
    description: 'Forma primária de reserva de gordura e substrato energético nos tecidos.',
    clinicalNote:
      'Desejável < 150 mg/dL em jejum. Níveis > 200 indicam risco metabólico e esteatose.',
    getRanges: () => ({
      minDisplay: 30,
      maxDisplay: 350,
      optimalText: '< 150 mg/dL',
      segments: [
        { status: 'optimal', label: 'Ótimo', min: 30, max: 150, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 150, max: 200, color: '#eab308' },
        { status: 'high', label: 'Elevado', min: 200, max: 350, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'nao_hdl',
    name: 'Colesterol Não-HDL',
    aliases: ['nao-hdl', 'não-hdl', 'colesterol não-hdl', 'non-hdl'],
    area: 'lipid',
    defaultUnit: 'mg/dL',
    description: 'Todas as partículas aterogênicas juntas (VLDL + IDL + LDL).',
    clinicalNote: 'Meta < 130 mg/dL em risco habitual; < 100 em alto risco.',
    getRanges: () => ({
      minDisplay: 50,
      maxDisplay: 240,
      optimalText: '< 130 mg/dL',
      segments: [
        { status: 'optimal', label: 'Ótimo', min: 50, max: 130, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 130, max: 160, color: '#eab308' },
        { status: 'high', label: 'Elevado', min: 160, max: 240, color: '#ef4444' },
      ],
    }),
  },

  // -------------------------------------------------------------
  // GLICEMIA & METABOLISMO
  // -------------------------------------------------------------
  {
    id: 'glicemia_jejum',
    name: 'Glicemia de Jejum',
    aliases: ['glicemia', 'glicemia de jejum', 'glicose', 'glicose de jejum', 'fasting glucose'],
    area: 'glycemic',
    defaultUnit: 'mg/dL',
    description: 'Concentração sérica basal de glicose após 8 a 12 horas de jejum.',
    clinicalNote: 'Normal: 70 a 99 mg/dL. Pré-diabetes: 100 a 125 mg/dL. Diabetes: ≥ 126 mg/dL.',
    getRanges: () => ({
      minDisplay: 50,
      maxDisplay: 160,
      optimalText: '70 - 99 mg/dL',
      segments: [
        { status: 'low', label: 'Hipoglicemia', min: 50, max: 70, color: '#3b82f6' },
        { status: 'optimal', label: 'Normal', min: 70, max: 100, color: '#10b981' },
        { status: 'borderline', label: 'Pré-Diabetes', min: 100, max: 126, color: '#eab308' },
        { status: 'high', label: 'Diabetes', min: 126, max: 160, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'hba1c',
    name: 'Hemoglobina Glicada (HbA1c)',
    aliases: ['hba1c', 'hemoglobina glicada', 'a1c', 'glicohemoglobina'],
    area: 'glycemic',
    defaultUnit: '%',
    description: 'Média ponderada da glicemia nos últimos 90 a 120 dias.',
    clinicalNote: 'Normal: < 5.7%. Pré-diabetes: 5.7% a 6.4%. Diabetes: ≥ 6.5%.',
    getRanges: () => ({
      minDisplay: 4.0,
      maxDisplay: 9.0,
      optimalText: '< 5.7%',
      segments: [
        { status: 'optimal', label: 'Normal', min: 4.0, max: 5.7, color: '#10b981' },
        { status: 'borderline', label: 'Pré-Diabetes', min: 5.7, max: 6.5, color: '#eab308' },
        { status: 'high', label: 'Diabetes', min: 6.5, max: 9.0, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'insulina_jejum',
    name: 'Insulina de Jejum',
    aliases: ['insulina', 'insulina de jejum', 'fasting insulin'],
    area: 'glycemic',
    defaultUnit: 'μUI/mL',
    description: 'Nível basal do hormônio anabólico secretado pelas células beta pancreáticas.',
    clinicalNote: 'Ideal em longevidade preventiva: < 8 μUI/mL (normal de laboratório até ~25).',
    getRanges: () => ({
      minDisplay: 1.0,
      maxDisplay: 30.0,
      optimalText: '2.0 - 8.0 μUI/mL (ótimo)',
      segments: [
        { status: 'optimal', label: 'Ótimo', min: 1.0, max: 8.0, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 8.0, max: 15.0, color: '#eab308' },
        { status: 'high', label: 'Resistência Insulínica', min: 15.0, max: 30.0, color: '#ef4444' },
      ],
    }),
  },

  // -------------------------------------------------------------
  // HEMOGRAMA COMPLETO
  // -------------------------------------------------------------
  {
    id: 'hemoglobina',
    name: 'Hemoglobina',
    aliases: ['hemoglobina', 'hb', 'hemoglobin'],
    area: 'cbc',
    defaultUnit: 'g/dL',
    description: 'Metaloproteína transportadora de oxigênio contida nas hemácias.',
    clinicalNote: 'Homens: 13.5 a 17.5 g/dL. Mulheres: 12.0 a 15.5 g/dL.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const minOpt = isFemale ? 12.0 : 13.5
      const maxOpt = isFemale ? 15.5 : 17.5
      return {
        minDisplay: 9.0,
        maxDisplay: 20.0,
        optimalText: `${minOpt.toFixed(1)} - ${maxOpt.toFixed(1)} g/dL`,
        segments: [
          { status: 'low', label: 'Anemia', min: 9.0, max: minOpt, color: '#3b82f6' },
          { status: 'optimal', label: 'Normal', min: minOpt, max: maxOpt, color: '#10b981' },
          { status: 'high', label: 'Elevado', min: maxOpt, max: 20.0, color: '#ef4444' },
        ],
      }
    },
  },
  {
    id: 'hematocrito',
    name: 'Hematócrito',
    aliases: ['hematocrito', 'hematócrito', 'htc', 'hematocrit'],
    area: 'cbc',
    defaultUnit: '%',
    description: 'Proporção volumétrica ocupada pelos glóbulos vermelhos no sangue total.',
    clinicalNote: 'Homens: 39% a 50%. Mulheres: 36% a 45%.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const minOpt = isFemale ? 36 : 39
      const maxOpt = isFemale ? 45 : 50
      return {
        minDisplay: 25,
        maxDisplay: 60,
        optimalText: `${minOpt}% - ${maxOpt}%`,
        segments: [
          { status: 'low', label: 'Baixo', min: 25, max: minOpt, color: '#3b82f6' },
          { status: 'optimal', label: 'Normal', min: minOpt, max: maxOpt, color: '#10b981' },
          { status: 'high', label: 'Elevado', min: maxOpt, max: 60, color: '#ef4444' },
        ],
      }
    },
  },
  {
    id: 'leucocitos',
    name: 'Leucócitos Totais',
    aliases: ['leucocitos', 'leucócitos', 'leucocitos totais', 'glóbulos brancos', 'wbc'],
    area: 'cbc',
    defaultUnit: '/mm³',
    description: 'Células de defesa imunológica (neutrófilos, linfócitos, monócitos etc.).',
    clinicalNote: 'Referência usual: 4.000 a 10.000 /mm³.',
    getRanges: () => ({
      minDisplay: 2000,
      maxDisplay: 16000,
      optimalText: '4.000 - 10.000 /mm³',
      segments: [
        { status: 'low', label: 'Leucopenia', min: 2000, max: 4000, color: '#3b82f6' },
        { status: 'optimal', label: 'Normal', min: 4000, max: 10000, color: '#10b981' },
        { status: 'high', label: 'Leucocitose', min: 10000, max: 16000, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'plaquetas',
    name: 'Plaquetas',
    aliases: ['plaquetas', 'plaqueta', 'contagem de plaquetas', 'platelets'],
    area: 'cbc',
    defaultUnit: '/mm³',
    description: 'Fragmentos citoplasmáticos responsáveis pela hemostasia e coagulação.',
    clinicalNote: 'Referência usual: 150.000 a 450.000 /mm³.',
    getRanges: () => ({
      minDisplay: 80000,
      maxDisplay: 600000,
      optimalText: '150.000 - 450.000 /mm³',
      segments: [
        { status: 'low', label: 'Trombocitopenia', min: 80000, max: 150000, color: '#3b82f6' },
        { status: 'optimal', label: 'Normal', min: 150000, max: 450000, color: '#10b981' },
        { status: 'high', label: 'Trombocitose', min: 450000, max: 600000, color: '#ef4444' },
      ],
    }),
  },

  // -------------------------------------------------------------
  // FUNÇÃO RENAL
  // -------------------------------------------------------------
  {
    id: 'creatinina',
    name: 'Creatinina Sérica',
    aliases: ['creatinina', 'creatinina serica', 'creatinine'],
    area: 'renal',
    defaultUnit: 'mg/dL',
    description: 'Subproduto do metabolismo muscular filtrado e excretado pelos rins.',
    clinicalNote:
      'Homens: 0.7 a 1.2 mg/dL. Mulheres: 0.5 a 1.0 mg/dL. Elevação sugere queda de filtração.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const minOpt = isFemale ? 0.5 : 0.7
      const maxOpt = isFemale ? 1.0 : 1.2
      return {
        minDisplay: 0.3,
        maxDisplay: 2.5,
        optimalText: `${minOpt.toFixed(1)} - ${maxOpt.toFixed(1)} mg/dL`,
        segments: [
          { status: 'low', label: 'Baixa', min: 0.3, max: minOpt, color: '#3b82f6' },
          { status: 'optimal', label: 'Normal', min: minOpt, max: maxOpt, color: '#10b981' },
          {
            status: 'borderline',
            label: 'Limítrofe',
            min: maxOpt,
            max: maxOpt + 0.3,
            color: '#eab308',
          },
          { status: 'high', label: 'Elevada', min: maxOpt + 0.3, max: 2.5, color: '#ef4444' },
        ],
      }
    },
  },
  {
    id: 'acido_urico',
    name: 'Ácido Úrico',
    aliases: ['acido urico', 'ácido úrico', 'urate', 'uric acid'],
    area: 'renal',
    defaultUnit: 'mg/dL',
    description: 'Produto final do catabolismo de purinas; marcador metabólico e inflamatório.',
    clinicalNote:
      'Homens: 3.5 a 7.2 mg/dL. Mulheres: 2.5 a 6.0 mg/dL. Ideal em longevidade < 5.5 mg/dL.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const maxOpt = isFemale ? 5.5 : 6.0
      return {
        minDisplay: 2.0,
        maxDisplay: 11.0,
        optimalText: isFemale ? '2.5 - 5.5 mg/dL' : '3.5 - 6.0 mg/dL',
        segments: [
          { status: 'low', label: 'Baixo', min: 2.0, max: isFemale ? 2.5 : 3.5, color: '#3b82f6' },
          {
            status: 'optimal',
            label: 'Normal',
            min: isFemale ? 2.5 : 3.5,
            max: maxOpt,
            color: '#10b981',
          },
          {
            status: 'borderline',
            label: 'Limítrofe',
            min: maxOpt,
            max: isFemale ? 6.5 : 7.2,
            color: '#eab308',
          },
          {
            status: 'high',
            label: 'Hiperuricemia',
            min: isFemale ? 6.5 : 7.2,
            max: 11.0,
            color: '#ef4444',
          },
        ],
      }
    },
  },
  {
    id: 'ureia',
    name: 'Ureia',
    aliases: ['ureia', 'uréia', 'urea', 'bun'],
    area: 'renal',
    defaultUnit: 'mg/dL',
    description: 'Resíduo nitrogenado sintetizado no fígado a partir de proteínas alimentares.',
    clinicalNote: 'Referência usual: 15 a 45 mg/dL.',
    getRanges: () => ({
      minDisplay: 10,
      maxDisplay: 80,
      optimalText: '15 - 45 mg/dL',
      segments: [
        { status: 'low', label: 'Baixa', min: 10, max: 15, color: '#3b82f6' },
        { status: 'optimal', label: 'Normal', min: 15, max: 45, color: '#10b981' },
        { status: 'high', label: 'Elevada', min: 45, max: 80, color: '#ef4444' },
      ],
    }),
  },

  // -------------------------------------------------------------
  // FUNÇÃO HEPÁTICA
  // -------------------------------------------------------------
  {
    id: 'tgp_alt',
    name: 'TGP (ALT) - Alanina Aminotransferase',
    aliases: ['tgp', 'alt', 'tgp (alt)', 'alanina aminotransferase'],
    area: 'hepatic',
    defaultUnit: 'U/L',
    description: 'Enzima citoplasmática altamente específica do parênquima hepático.',
    clinicalNote:
      'Homens: até 41 U/L. Mulheres: até 33 U/L. Ideal em medicina preventiva < 25-30 U/L.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const maxOpt = isFemale ? 25 : 30
      const limitLab = isFemale ? 33 : 41
      return {
        minDisplay: 5,
        maxDisplay: 90,
        optimalText: `< ${maxOpt} U/L (ótimo)`,
        segments: [
          { status: 'optimal', label: 'Ótimo', min: 5, max: maxOpt, color: '#10b981' },
          {
            status: 'borderline',
            label: 'Normal Alto',
            min: maxOpt,
            max: limitLab,
            color: '#eab308',
          },
          { status: 'high', label: 'Elevado', min: limitLab, max: 90, color: '#ef4444' },
        ],
      }
    },
  },
  {
    id: 'tgo_ast',
    name: 'TGO (AST) - Aspartato Aminotransferase',
    aliases: ['tgo', 'ast', 'tgo (ast)', 'aspartato aminotransferase'],
    area: 'hepatic',
    defaultUnit: 'U/L',
    description: 'Enzima mitocondrial e citoplasmática presente no fígado, coração e músculos.',
    clinicalNote: 'Referência usual: até 35 U/L.',
    getRanges: () => ({
      minDisplay: 5,
      maxDisplay: 80,
      optimalText: '< 35 U/L',
      segments: [
        { status: 'optimal', label: 'Normal', min: 5, max: 35, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 35, max: 45, color: '#eab308' },
        { status: 'high', label: 'Elevado', min: 45, max: 80, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'gama_gt',
    name: 'Gama-GT (GGT)',
    aliases: ['gama-gt', 'ggt', 'gama gt', 'gamaglutamiltransferase'],
    area: 'hepatic',
    defaultUnit: 'U/L',
    description:
      'Marcador precoce de estresse oxidativo hepático e sobrecarga por álcool ou medicamentos.',
    clinicalNote: 'Desejável < 30 U/L para homens e < 20 U/L para mulheres.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const maxOpt = isFemale ? 20 : 30
      const limitLab = isFemale ? 38 : 55
      return {
        minDisplay: 5,
        maxDisplay: 120,
        optimalText: `< ${maxOpt} U/L`,
        segments: [
          { status: 'optimal', label: 'Ótimo', min: 5, max: maxOpt, color: '#10b981' },
          {
            status: 'borderline',
            label: 'Aceitável',
            min: maxOpt,
            max: limitLab,
            color: '#eab308',
          },
          { status: 'high', label: 'Elevado', min: limitLab, max: 120, color: '#ef4444' },
        ],
      }
    },
  },

  // -------------------------------------------------------------
  // TIREOIDE
  // -------------------------------------------------------------
  {
    id: 'tsh',
    name: 'TSH Ultra-Sensível',
    aliases: ['tsh', 'tsh ultra-sensivel', 'tsh ultra sensivel', 'tireoestimulante'],
    area: 'thyroid',
    defaultUnit: 'mUI/L',
    description: 'Hormônio hipofisário que estimula a síntese e secreção de T3 e T4.',
    clinicalNote: 'Referência: 0.4 a 4.0 mUI/L. Faixa funcional ideal: 1.0 a 2.5 mUI/L.',
    getRanges: () => ({
      minDisplay: 0.1,
      maxDisplay: 8.0,
      optimalText: '1.0 - 2.5 mUI/L (funcional)',
      segments: [
        { status: 'low', label: 'Hipertireoidismo', min: 0.1, max: 0.4, color: '#3b82f6' },
        { status: 'optimal', label: 'Ótimo', min: 0.4, max: 2.5, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe Alto', min: 2.5, max: 4.5, color: '#eab308' },
        { status: 'high', label: 'Hipotireoidismo', min: 4.5, max: 8.0, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 't4_livre',
    name: 'T4 Livre',
    aliases: ['t4 livre', 't4l', 'tiroxina livre', 'free t4'],
    area: 'thyroid',
    defaultUnit: 'ng/dL',
    description: 'Fração biologicamente ativa do hormônio tireoidiano tiroxina.',
    clinicalNote: 'Referência usual: 0.8 a 1.8 ng/dL.',
    getRanges: () => ({
      minDisplay: 0.4,
      maxDisplay: 2.5,
      optimalText: '0.8 - 1.8 ng/dL',
      segments: [
        { status: 'low', label: 'Baixo', min: 0.4, max: 0.8, color: '#3b82f6' },
        { status: 'optimal', label: 'Normal', min: 0.8, max: 1.8, color: '#10b981' },
        { status: 'high', label: 'Elevado', min: 1.8, max: 2.5, color: '#ef4444' },
      ],
    }),
  },

  // -------------------------------------------------------------
  // VITAMINAS & MINERAIS
  // -------------------------------------------------------------
  {
    id: 'vitamina_d',
    name: 'Vitamina D (25-OH)',
    aliases: ['vitamina d', 'vitamina d (25-oh)', '25-hidroxivitamina d', 'vit d'],
    area: 'vitamins_minerals',
    defaultUnit: 'ng/mL',
    description:
      'Secosteroide crucial para metabolismo ósseo, imunomodulação e sinalização celular.',
    clinicalNote:
      'Deficiência: < 20 ng/mL. Aceitável: 20-30 ng/mL. Ideal preventiva: 30 a 60 ng/mL.',
    getRanges: () => ({
      minDisplay: 10,
      maxDisplay: 100,
      optimalText: '30 - 60 ng/mL (ótimo)',
      segments: [
        { status: 'low', label: 'Deficiência', min: 10, max: 20, color: '#ef4444' },
        { status: 'borderline', label: 'Insuficiente', min: 20, max: 30, color: '#eab308' },
        { status: 'optimal', label: 'Suficiente / Ótimo', min: 30, max: 60, color: '#10b981' },
        { status: 'borderline', label: 'Elevado', min: 60, max: 80, color: '#06b6d4' },
        { status: 'high', label: 'Risco Toxicidade', min: 80, max: 100, color: '#dc2626' },
      ],
    }),
  },
  {
    id: 'vitamina_b12',
    name: 'Vitamina B12 (Cobalamina)',
    aliases: ['vitamina b12', 'b12', 'cobalamina', 'vit b12'],
    area: 'vitamins_minerals',
    defaultUnit: 'pg/mL',
    description: 'Coenzima essencial para síntese de DNA, mielinização neural e hematopoiese.',
    clinicalNote: 'Normal > 200 pg/mL. Otimizada para função cognitiva: > 450-500 pg/mL.',
    getRanges: () => ({
      minDisplay: 100,
      maxDisplay: 1200,
      optimalText: '400 - 900 pg/mL (ótimo)',
      segments: [
        { status: 'low', label: 'Deficiência', min: 100, max: 250, color: '#ef4444' },
        { status: 'borderline', label: 'Subótimo', min: 250, max: 400, color: '#eab308' },
        { status: 'optimal', label: 'Ótimo', min: 400, max: 950, color: '#10b981' },
        { status: 'high', label: 'Elevado', min: 950, max: 1200, color: '#3b82f6' },
      ],
    }),
  },
  {
    id: 'ferritina',
    name: 'Ferritina Sérica',
    aliases: ['ferritina', 'ferritina serica', 'ferritin'],
    area: 'vitamins_minerals',
    defaultUnit: 'ng/mL',
    description:
      'Principal proteína de estocagem de ferro; também se eleva como reagente de fase aguda.',
    clinicalNote:
      'Homens: 30 a 300 ng/mL. Mulheres: 15 a 150 ng/mL. Níveis muito altos indicam inflamação.',
    getRanges: (gender) => {
      const isFemale = gender?.toLowerCase().includes('fem') || gender?.toLowerCase() === 'f'
      const minOpt = isFemale ? 30 : 50
      const maxOpt = isFemale ? 150 : 250
      return {
        minDisplay: 10,
        maxDisplay: 500,
        optimalText: `${minOpt} - ${maxOpt} ng/mL`,
        segments: [
          { status: 'low', label: 'Estoque Baixo', min: 10, max: minOpt, color: '#3b82f6' },
          {
            status: 'optimal',
            label: 'Normal / Ótimo',
            min: minOpt,
            max: maxOpt,
            color: '#10b981',
          },
          {
            status: 'borderline',
            label: 'Limítrofe Alto',
            min: maxOpt,
            max: maxOpt + 100,
            color: '#eab308',
          },
          {
            status: 'high',
            label: 'Sobrecarga / Inflamação',
            min: maxOpt + 100,
            max: 500,
            color: '#ef4444',
          },
        ],
      }
    },
  },

  // -------------------------------------------------------------
  // INFLAMAÇÃO & CARDIOVASCULAR
  // -------------------------------------------------------------
  {
    id: 'pcr_us',
    name: 'PCR ultrassensível (PCR-us)',
    aliases: [
      'pcr',
      'pcr-us',
      'pcr ultrassensivel',
      'pcr ultrassensível',
      'proteina c-reativa',
      'crp',
    ],
    area: 'inflammation',
    defaultUnit: 'mg/L',
    description:
      'Marcador de inflamação endotelial de baixo grau e estratificação de risco coronariano.',
    clinicalNote:
      '< 1.0 mg/L: baixo risco cardiovascular. 1.0 a 3.0: risco médio. > 3.0: alto risco ou infecção.',
    getRanges: () => ({
      minDisplay: 0.1,
      maxDisplay: 8.0,
      optimalText: '< 1.0 mg/L (baixo risco)',
      segments: [
        { status: 'optimal', label: 'Baixo Risco', min: 0.1, max: 1.0, color: '#10b981' },
        { status: 'borderline', label: 'Risco Médio', min: 1.0, max: 3.0, color: '#eab308' },
        { status: 'high', label: 'Alto Risco / Inflamação', min: 3.0, max: 8.0, color: '#ef4444' },
      ],
    }),
  },
  {
    id: 'homocisteina',
    name: 'Homocisteína',
    aliases: ['homocisteina', 'homocisteína', 'homocysteine'],
    area: 'inflammation',
    defaultUnit: 'μmol/L',
    description: 'Aminoácido sulfurado intermediário; níveis elevados lesam o endotélio vascular.',
    clinicalNote: 'Desejável < 10.0 μmol/L na prevenção cardiovascular e neurocognitiva.',
    getRanges: () => ({
      minDisplay: 4.0,
      maxDisplay: 25.0,
      optimalText: '< 10.0 μmol/L (ótimo)',
      segments: [
        { status: 'optimal', label: 'Ótimo', min: 4.0, max: 10.0, color: '#10b981' },
        { status: 'borderline', label: 'Limítrofe', min: 10.0, max: 15.0, color: '#eab308' },
        { status: 'high', label: 'Hiper-homocisteinemia', min: 15.0, max: 25.0, color: '#ef4444' },
      ],
    }),
  },
]

// Normaliza strings para matching insensível a acentos e espaços
export function normalizeBiomarkerName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Procura definição pelo nome do biomarcador
export function findBiomarkerDefinition(name: string): BiomarkerDefinition | null {
  const norm = normalizeBiomarkerName(name)
  for (const def of BIOMARKER_DEFINITIONS) {
    if (normalizeBiomarkerName(def.name) === norm) return def
    for (const alias of def.aliases) {
      const aliasNorm = normalizeBiomarkerName(alias)
      if (norm === aliasNorm || norm.includes(aliasNorm) || aliasNorm.includes(norm)) {
        return def
      }
    }
  }
  return null
}

// Extrai número limpo de uma string (ex: "88 mg/dL" -> 88; "5,2%" -> 5.2; "< 1.0" -> 1.0)
export function parseBiomarkerNumericValue(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw === 'number') return isNaN(raw) ? null : raw
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, ' ')
  const match = cleaned.trim().match(/[0-9]+(\.[0-9]+)?/)
  if (!match) return null
  const parsed = parseFloat(match[0])
  return isNaN(parsed) ? null : parsed
}

// Classifica o valor do usuário em 'optimal' | 'borderline' | 'high' | 'low'
export function classifyBiomarkerValue(
  numericValue: number,
  ranges: ReturnType<BiomarkerDefinition['getRanges']>,
): {
  status: RangeStatus
  segmentLabel: string
  color: string
  percentage: number // Posição 0 a 100% na régua
  isOutOfRange: boolean
} {
  const { minDisplay, maxDisplay, segments } = ranges
  const clamped = Math.max(minDisplay, Math.min(maxDisplay, numericValue))
  const percentage = Math.round(((clamped - minDisplay) / (maxDisplay - minDisplay)) * 100)

  // Acha o segmento que engloba o valor
  for (const seg of segments) {
    if (numericValue >= seg.min && numericValue <= seg.max) {
      return {
        status: seg.status,
        segmentLabel: seg.label,
        color: seg.color,
        percentage,
        isOutOfRange: seg.status !== 'optimal',
      }
    }
  }

  // Se for menor que o primeiro segmento
  if (numericValue < segments[0].min) {
    return {
      status: segments[0].status,
      segmentLabel: segments[0].label,
      color: segments[0].color,
      percentage: 0,
      isOutOfRange: segments[0].status !== 'optimal',
    }
  }

  // Se for maior que o último
  const lastSeg = segments[segments.length - 1]
  return {
    status: lastSeg.status,
    segmentLabel: lastSeg.label,
    color: lastSeg.color,
    percentage: 100,
    isOutOfRange: lastSeg.status !== 'optimal',
  }
}
