/**
 * Catálogo do painel Biomarcadores (estilo Guava "Biomarkers II").
 * Define os 16 grupos do painel, os marcadores de cada grupo, suas faixas
 * de referência e os apelidos usados para cruzar com os registros de
 * profile_biomarkers (leitura inteligente de exames + lançamentos manuais).
 */

export type PanelGroupId =
  | 'heart'
  | 'kidney'
  | 'liver_pancreas'
  | 'metabolic'
  | 'blood'
  | 'immune'
  | 'electrolytes'
  | 'thyroid'
  | 'reproductive'
  | 'body_composition'
  | 'bones'
  | 'nutrients'
  | 'autoimmune'
  | 'infectious'
  | 'substances'
  | 'other'

export interface PanelGroup {
  id: PanelGroupId
  title: string
  subtitle?: string
}

export const PANEL_GROUPS: PanelGroup[] = [
  { id: 'heart', title: 'Saúde do Coração' },
  { id: 'kidney', title: 'Função Renal' },
  { id: 'liver_pancreas', title: 'Fígado & Pâncreas' },
  { id: 'metabolic', title: 'Saúde Metabólica' },
  { id: 'blood', title: 'Função Sanguínea' },
  { id: 'immune', title: 'Regulação Imune' },
  { id: 'electrolytes', title: 'Eletrólitos' },
  { id: 'thyroid', title: 'Função Tireoidiana', subtitle: 'metabolismo, humor e fertilidade' },
  { id: 'reproductive', title: 'Saúde Reprodutiva' },
  { id: 'body_composition', title: 'Composição Corporal' },
  { id: 'bones', title: 'Ossos' },
  { id: 'nutrients', title: 'Nutrientes' },
  { id: 'autoimmune', title: 'Autoimune' },
  { id: 'infectious', title: 'Doenças Infecciosas' },
  { id: 'substances', title: 'Níveis de Substâncias' },
  { id: 'other', title: 'Outros Resultados' },
]

export type MarkerSpecial = 'bp' | 'weight' | 'body_fat' | 'lean_mass'

export interface MarkerSpec {
  id: string
  name: string
  group: PanelGroupId
  unit?: string
  /** Faixa ótima: dentro dela o status é "optimal" (com optimalLabel). */
  ideal?: [number, number]
  /** Zona limítrofe (borderline), verificada antes da faixa normal. */
  borderline?: [number, number]
  /** Faixa normal de referência. */
  range?: [number, number]
  optimalLabel?: string
  inRangeLabel?: string
  highLabel?: string
  lowLabel?: string
  /** Marcadores sem status colorido (ex.: Peso). */
  noStatus?: boolean
  /** Valor textual esperado (Negativo/Normal) — sem classificação numérica. */
  textOnly?: boolean
  /** Origem especial fora de profile_biomarkers (métricas de saúde). */
  special?: MarkerSpecial
  /** Apelidos extras (além do nome) já normalizados via normalizeName. */
  aliases?: string[]
  /** Fatores de conversão por unidade (chave normalizada) para a unidade-base das faixas. */
  scales?: Record<string, number>
}

export const PANEL_MARKERS: MarkerSpec[] = [
  // -------------------------------------------------- SAÚDE DO CORAÇÃO
  {
    id: 'chol_total',
    name: 'Colesterol Total',
    group: 'heart',
    unit: 'mg/dL',
    ideal: [0, 200],
    optimalLabel: 'Normal',
    borderline: [200, 239],
    aliases: ['colesterol total', 'total cholesterol', 'ct'],
  },
  {
    id: 'hdl',
    name: 'Colesterol HDL',
    group: 'heart',
    unit: 'mg/dL',
    range: [40, 250],
    inRangeLabel: 'Normal',
    aliases: ['hdl', 'hdl cholesterol', 'colesterol hdl', 'hdl colesterol'],
  },
  {
    id: 'ldl',
    name: 'Colesterol LDL',
    group: 'heart',
    unit: 'mg/dL',
    ideal: [0, 100],
    optimalLabel: 'Optimal',
    borderline: [100, 159],
    aliases: ['ldl', 'ldl cholesterol', 'colesterol ldl', 'ldl colesterol'],
  },
  {
    id: 'tg',
    name: 'Triglicerídeos',
    group: 'heart',
    unit: 'mg/dL',
    ideal: [0, 150],
    optimalLabel: 'Optimal',
    borderline: [150, 199],
    aliases: ['triglicerideos', 'triglycerides', 'tg'],
  },
  {
    id: 'bp',
    name: 'Pressão Arterial',
    group: 'heart',
    special: 'bp',
    noStatus: false,
    aliases: ['pressao arterial', 'pressao', 'blood pressure', 'pressao arterial sistemica'],
  },
  {
    id: 'lpa',
    name: 'Lp(a)',
    group: 'heart',
    unit: 'nmol/L',
    range: [0, 75],
    borderline: [75, 125],
    aliases: ['lp a', 'lpa', 'lipoproteina a', 'lp a particle number'],
  },
  {
    id: 'hscrp',
    name: 'hs-CRP',
    group: 'heart',
    unit: 'mg/L',
    ideal: [0, 1],
    optimalLabel: 'Low CV Risk',
    range: [0, 3],
    highLabel: 'High CV Risk',
    aliases: [
      'hs crp',
      'pcr us',
      'proteina c reativa ultrassensivel pcr us',
      'proteina c reativa ultrassensivel',
      'crp ultrassensivel',
    ],
  },
  {
    id: 'vldl',
    name: 'Colesterol VLDL',
    group: 'heart',
    unit: 'mg/dL',
    range: [0, 30],
    aliases: ['vldl', 'vldl colesterol', 'colesterol vldl'],
  },
  {
    id: 'nonhdl',
    name: 'Colesterol Não-HDL',
    group: 'heart',
    unit: 'mg/dL',
    ideal: [0, 130],
    optimalLabel: 'Normal',
    borderline: [130, 159],
    aliases: ['colesterol nao hdl', 'nao hdl', 'non hdl', 'colesterol nao hdl calculated'],
  },
  {
    id: 'apob',
    name: 'ApoB',
    group: 'heart',
    unit: 'mg/dL',
    ideal: [0, 90],
    optimalLabel: 'Optimal',
    borderline: [90, 119],
    aliases: ['apob', 'apo b', 'apolipoproteina b'],
  },

  // -------------------------------------------------- FUNÇÃO RENAL
  {
    id: 'egfr',
    name: 'TFG (eGFR)',
    group: 'kidney',
    unit: 'mL/min/1.73m²',
    ideal: [90, 200],
    optimalLabel: 'Optimal',
    range: [60, 89],
    aliases: ['egfr', 'tfg', 'taxa de filtracao glomerular', 'filtracao glomerular'],
  },
  {
    id: 'creat',
    name: 'Creatinina',
    group: 'kidney',
    unit: 'mg/dL',
    range: [0.7, 1.3],
    aliases: ['creatinina', 'creatinine', 'creatinina serica'],
  },
  {
    id: 'ureia',
    name: 'Ureia (BUN)',
    group: 'kidney',
    unit: 'mg/dL',
    range: [15, 45],
    aliases: ['ureia', 'bun', 'ureia bun', 'ureia serica'],
  },
  {
    id: 'uacr',
    name: 'Albumina/Creatinina, Urina',
    group: 'kidney',
    unit: 'mg/g',
    ideal: [0, 30],
    optimalLabel: 'Normal',
    borderline: [30, 300],
    aliases: [
      'albumina creatinina urina',
      'albumin creatinine urine',
      'relacao albumina creatinina urina',
    ],
  },
  {
    id: 'uprot',
    name: 'Proteína, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['proteina urina', 'protein urine', 'proteina na urina', 'proteinuria'],
  },
  {
    id: 'ualb',
    name: 'Albumina, Urina',
    group: 'kidney',
    unit: 'mg/L',
    range: [0, 30],
    aliases: ['albumina urina', 'albumin urine', 'albumina na urina'],
  },
  {
    id: 'uric',
    name: 'Ácido Úrico',
    group: 'kidney',
    unit: 'mg/dL',
    range: [3.4, 7.2],
    aliases: ['acido urico', 'uric acid'],
  },
  {
    id: 'cysc',
    name: 'Cistatina C',
    group: 'kidney',
    unit: 'mg/L',
    range: [0.56, 1.0],
    aliases: ['cistatina c', 'cystatin c'],
  },
  {
    id: 'usg',
    name: 'Densidade, Urina',
    group: 'kidney',
    range: [1.005, 1.03],
    aliases: ['densidade urina', 'densidade da urina', 'specific gravity urine'],
  },
  {
    id: 'uph',
    name: 'pH, Urina',
    group: 'kidney',
    range: [5, 8],
    aliases: ['ph urina', 'ph da urina', 'ph urine'],
  },
  {
    id: 'uleuk',
    name: 'Esterase Leucocitária, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['esterase leucocitaria urina', 'leukocyte esterase', 'esterase leucocitaria'],
  },
  {
    id: 'unit',
    name: 'Nitritos, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['nitritos urina', 'nitritos na urina', 'nitrites urine', 'nitritos'],
  },
  {
    id: 'uglu',
    name: 'Glicose, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['glicose urina', 'glicose na urina', 'glucose urine'],
  },
  {
    id: 'uket',
    name: 'Corpos Cetônicos, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['corpos cetonicos urina', 'cetonas urina', 'ketones urine', 'corpos cetonicos'],
  },
  {
    id: 'ucreat',
    name: 'Creatinina, Urina',
    group: 'kidney',
    unit: 'mg/dL',
    range: [20, 320],
    aliases: ['creatinina urina', 'creatinina na urina', 'creatinine urine'],
  },
  {
    id: 'urbc',
    name: 'Hemácias, Urina',
    group: 'kidney',
    unit: '/µL',
    range: [0, 4],
    aliases: ['hemacias urina', 'hemacias na urina', 'rbc urine'],
  },
  {
    id: 'uepi',
    name: 'Células Epiteliais, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: [
      'celulas epiteliais urina',
      'celulas epiteliais',
      'squamous epithelial cells urine sediment',
    ],
  },
  {
    id: 'ucast',
    name: 'Cilindros Hialinos, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['cilindros hialinos urina', 'cilindros hialinos', 'hyaline casts urine sediment'],
  },
  {
    id: 'ucrys',
    name: 'Cristais, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['cristais urina', 'cristais na urina', 'crystals urine'],
  },
  {
    id: 'umuc',
    name: 'Muco, Urina',
    group: 'kidney',
    textOnly: true,
    aliases: ['muco urina', 'muco na urina', 'mucus urine'],
  },

  // -------------------------------------------------- FÍGADO & PÂNCREAS
  {
    id: 'ast',
    name: 'AST (TGO)',
    group: 'liver_pancreas',
    unit: 'U/L',
    range: [5, 42],
    aliases: ['ast', 'tgo', 'ast tgo', 'transaminase oxalacetica'],
  },
  {
    id: 'alt',
    name: 'ALT (TGP)',
    group: 'liver_pancreas',
    unit: 'U/L',
    range: [5, 49],
    aliases: ['alt', 'tgp', 'alt tgp', 'transaminase piruvica'],
  },
  {
    id: 'alp',
    name: 'Fosfatase Alcalina (ALP)',
    group: 'liver_pancreas',
    unit: 'U/L',
    range: [40, 130],
    aliases: ['alp', 'fosfatase alcalina', 'alkaline phosphatase'],
  },
  {
    id: 'bili',
    name: 'Bilirrubina Total',
    group: 'liver_pancreas',
    unit: 'mg/dL',
    range: [0.2, 1.2],
    aliases: ['bilirrubina total', 'bilirrubinas totais', 'bilirubin'],
  },
  {
    id: 'alb',
    name: 'Albumina',
    group: 'liver_pancreas',
    unit: 'g/dL',
    range: [3.5, 5.2],
    aliases: ['albumina', 'albumin', 'albumina serica'],
  },
  {
    id: 'amyl',
    name: 'Amilase',
    group: 'liver_pancreas',
    unit: 'U/L',
    range: [28, 100],
    aliases: ['amilase', 'amylase', 'amilase sangue'],
  },
  {
    id: 'lip',
    name: 'Lipase',
    group: 'liver_pancreas',
    unit: 'U/L',
    range: [13, 60],
    aliases: ['lipase'],
  },
  {
    id: 'urob',
    name: 'Urobilinogênio, Urina',
    group: 'liver_pancreas',
    textOnly: true,
    aliases: ['urobilinogenio urina', 'urobilinogenio', 'urobilinogen urine'],
  },
  {
    id: 'ggt',
    name: 'Gama-GT (GGT)',
    group: 'liver_pancreas',
    unit: 'U/L',
    range: [8, 61],
    aliases: ['ggt', 'gama gt', 'gama glutamil transferase'],
  },

  // -------------------------------------------------- SAÚDE METABÓLICA
  {
    id: 'fglu',
    name: 'Glicose de Jejum',
    group: 'metabolic',
    unit: 'mg/dL',
    ideal: [70, 99],
    optimalLabel: 'Normal',
    borderline: [100, 125],
    aliases: [
      'glicose de jejum',
      'glicemia de jejum',
      'fasting glucose',
      'glicemia',
      'glicose jejum',
    ],
  },
  {
    id: 'eag',
    name: 'Glicose Média Estimada',
    group: 'metabolic',
    unit: 'mg/dL',
    range: [70, 120],
    aliases: ['glicose media estimada', 'estimated average glucose', 'glicemia media estimada'],
  },
  {
    id: 'hba1c',
    name: 'HbA1c',
    group: 'metabolic',
    unit: '%',
    ideal: [4, 5.6],
    optimalLabel: 'Normal',
    borderline: [5.7, 6.4],
    aliases: ['hba1c', 'hemoglobina glicada', 'hemoglobina glicada hba1c'],
  },
  {
    id: 'ins',
    name: 'Insulina de Jejum',
    group: 'metabolic',
    unit: 'uIU/mL',
    range: [2.6, 24.9],
    aliases: ['insulina', 'fasting insulin', 'insulina de jejum', 'insulina basal'],
  },
  {
    id: 'homa',
    name: 'HOMA-IR',
    group: 'metabolic',
    range: [0, 2.5],
    aliases: ['homa ir', 'homa', 'indice homa ir'],
  },
  {
    id: 'hcy',
    name: 'Homocisteína',
    group: 'metabolic',
    unit: 'umol/L',
    range: [4, 15],
    aliases: ['homocisteina', 'homocysteine'],
  },

  // -------------------------------------------------- FUNÇÃO SANGUÍNEA
  {
    id: 'wbc',
    name: 'Leucócitos Totais',
    group: 'blood',
    unit: '10³/µL',
    range: [4, 10.8],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['leucocitos totais', 'leucocitos', 'wbc', 'white blood cell count blood'],
  },
  {
    id: 'hgb',
    name: 'Hemoglobina',
    group: 'blood',
    unit: 'g/dL',
    range: [13.5, 17.5],
    aliases: ['hemoglobina', 'hemoglobin'],
  },
  {
    id: 'hct',
    name: 'Hematócrito',
    group: 'blood',
    unit: '%',
    range: [41, 53],
    aliases: ['hematocrito', 'hematocrit'],
  },
  {
    id: 'plt',
    name: 'Plaquetas',
    group: 'blood',
    unit: '10³/µL',
    range: [150, 450],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['plaquetas', 'platelet count', 'contagem de plaquetas'],
  },
  {
    id: 'mpv',
    name: 'VPM',
    group: 'blood',
    unit: 'fL',
    range: [7, 11.5],
    aliases: ['vpm', 'mpv', 'volume plaquetario medio'],
  },
  {
    id: 'rbc',
    name: 'Hemácias',
    group: 'blood',
    unit: '10⁶/µL',
    range: [4.3, 5.8],
    scales: { 'milhoes ul': 1, '106ul': 1 },
    aliases: ['hemacias', 'eritrocitos', 'hemacias eritrocitos', 'rbc count'],
  },
  {
    id: 'mcv',
    name: 'VCM',
    group: 'blood',
    unit: 'fL',
    range: [80, 100],
    aliases: ['vcm', 'mcv', 'volume corpuscular medio'],
  },
  {
    id: 'rdw',
    name: 'RDW (CV)',
    group: 'blood',
    unit: '%',
    range: [11.5, 14.5],
    aliases: ['rdw', 'rdw cv', 'rdw variacao do tamanho das hemacias'],
  },
  {
    id: 'mch',
    name: 'HCM',
    group: 'blood',
    unit: 'pg',
    range: [27, 33],
    aliases: ['hcm', 'mch', 'hemoglobina corpuscular media'],
  },
  {
    id: 'mchc',
    name: 'CHCM',
    group: 'blood',
    unit: 'g/dL',
    range: [31.5, 36],
    aliases: ['chcm', 'mchc', 'concentracao de hemoglobina corpuscular media'],
  },
  {
    id: 'neut',
    name: 'Neutrófilos',
    group: 'blood',
    unit: '10³/µL',
    range: [1.8, 7.7],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['neutrofilos', 'neutrophil count', 'neutrofilos segmentados'],
  },
  {
    id: 'neutpct',
    name: 'Neutrófilos %',
    group: 'blood',
    unit: '%',
    range: [40, 75],
    aliases: ['neutrofilos %', 'neutrofilos percentual', 'neutrophils %'],
  },
  {
    id: 'bands',
    name: 'Bastonetes',
    group: 'blood',
    unit: '%',
    range: [0, 3],
    aliases: ['bastonetes', 'band form neutrophils'],
  },
  {
    id: 'lymph',
    name: 'Linfócitos',
    group: 'blood',
    unit: '10³/µL',
    range: [1.0, 4.8],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['linfocitos', 'lymphocyte count'],
  },
  {
    id: 'lymphpct',
    name: 'Linfócitos %',
    group: 'blood',
    unit: '%',
    range: [20, 45],
    aliases: ['linfocitos %', 'linfocitos percentual', 'lymphocytes %'],
  },
  {
    id: 'mono',
    name: 'Monócitos',
    group: 'blood',
    unit: '10³/µL',
    range: [0.2, 1.0],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['monocitos', 'monocyte count'],
  },
  {
    id: 'monopct',
    name: 'Monócitos %',
    group: 'blood',
    unit: '%',
    range: [3, 10],
    aliases: ['monocitos %', 'monocitos percentual', 'monocytes %'],
  },
  {
    id: 'eos',
    name: 'Eosinófilos',
    group: 'blood',
    unit: '10³/µL',
    range: [0.02, 0.5],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['eosinofilos', 'eosinophil count'],
  },
  {
    id: 'eospct',
    name: 'Eosinófilos %',
    group: 'blood',
    unit: '%',
    range: [1, 6],
    aliases: ['eosinofilos %', 'eosinofilos percentual', 'eosinophils %'],
  },
  {
    id: 'baso',
    name: 'Basófilos',
    group: 'blood',
    unit: '10³/µL',
    range: [0, 0.2],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['basofilos', 'basophil count'],
  },
  {
    id: 'basopct',
    name: 'Basófilos %',
    group: 'blood',
    unit: '%',
    range: [0, 1],
    aliases: ['basofilos %', 'basofilos percentual', 'basophils %'],
  },
  {
    id: 'iron',
    name: 'Ferro',
    group: 'blood',
    unit: 'µg/dL',
    range: [65, 175],
    aliases: ['ferro', 'iron', 'ferro serico'],
  },
  {
    id: 'ferr',
    name: 'Ferritina',
    group: 'blood',
    unit: 'ng/mL',
    range: [30, 400],
    inRangeLabel: 'Normal',
    aliases: ['ferritina', 'ferritin'],
  },

  // -------------------------------------------------- REGULAÇÃO IMUNE
  {
    id: 'wbc_immune',
    name: 'Leucócitos Totais',
    group: 'immune',
    unit: '10³/µL',
    range: [4, 10.8],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['leucocitos totais', 'leucocitos', 'wbc'],
  },
  {
    id: 'crp',
    name: 'Proteína C-Reativa',
    group: 'immune',
    unit: 'mg/L',
    range: [0, 3],
    aliases: ['proteina c reativa', 'crp', 'proteina c reativa pcr'],
  },
  {
    id: 'esr',
    name: 'VHS (ESR)',
    group: 'immune',
    unit: 'mm/h',
    range: [0, 20],
    aliases: ['vhs', 'esr', 'velocidade de hemossedimentacao'],
  },
  {
    id: 'cd56',
    name: 'CD56+ Cell Count',
    group: 'immune',
    aliases: ['cd56', 'cd56 cell count', 'cd56 celulas'],
  },
  {
    id: 'neut_immune',
    name: 'Neutrófilos',
    group: 'immune',
    unit: '10³/µL',
    range: [1.8, 7.7],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['neutrofilos'],
  },
  {
    id: 'neutpct_immune',
    name: 'Neutrófilos %',
    group: 'immune',
    unit: '%',
    range: [40, 75],
    aliases: ['neutrofilos %'],
  },
  {
    id: 'lymph_immune',
    name: 'Linfócitos',
    group: 'immune',
    unit: '10³/µL',
    range: [1.0, 4.8],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['linfocitos'],
  },
  {
    id: 'lymphpct_immune',
    name: 'Linfócitos %',
    group: 'immune',
    unit: '%',
    range: [20, 45],
    aliases: ['linfocitos %'],
  },
  {
    id: 'mono_immune',
    name: 'Monócitos',
    group: 'immune',
    unit: '10³/µL',
    range: [0.2, 1.0],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['monocitos'],
  },
  {
    id: 'monopct_immune',
    name: 'Monócitos %',
    group: 'immune',
    unit: '%',
    range: [3, 10],
    aliases: ['monocitos %'],
  },
  {
    id: 'eos_immune',
    name: 'Eosinófilos',
    group: 'immune',
    unit: '10³/µL',
    range: [0.02, 0.5],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['eosinofilos'],
  },
  {
    id: 'eospct_immune',
    name: 'Eosinófilos %',
    group: 'immune',
    unit: '%',
    range: [1, 6],
    aliases: ['eosinofilos %'],
  },
  {
    id: 'baso_immune',
    name: 'Basófilos',
    group: 'immune',
    unit: '10³/µL',
    range: [0, 0.2],
    scales: { ul: 0.001, '103ul': 1, milul: 1 },
    aliases: ['basofilos'],
  },
  {
    id: 'basopct_immune',
    name: 'Basófilos %',
    group: 'immune',
    unit: '%',
    range: [0, 1],
    aliases: ['basofilos %'],
  },

  // -------------------------------------------------- ELETRÓLITOS
  {
    id: 'na',
    name: 'Sódio',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [135, 145],
    aliases: ['sodio', 'sodium', 'sodio na'],
  },
  {
    id: 'k',
    name: 'Potássio',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [3.5, 5.1],
    aliases: ['potassio', 'potassium'],
  },
  {
    id: 'cl',
    name: 'Cloro',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [98, 107],
    aliases: ['cloro', 'chloride'],
  },
  {
    id: 'hco3',
    name: 'Bicarbonato',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [22, 29],
    aliases: ['bicarbonato', 'bicarbonate'],
  },
  {
    id: 'agap',
    name: 'Ânion Gap',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [8, 16],
    aliases: ['anion gap', 'intervalo anionico', 'brecha anionica'],
  },
  {
    id: 'ca',
    name: 'Cálcio',
    group: 'electrolytes',
    unit: 'mg/dL',
    range: [8.6, 10.3],
    aliases: ['calcio', 'calcium', 'calcio total'],
  },
  {
    id: 'caion',
    name: 'Cálcio Iônico',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [1.12, 1.32],
    aliases: ['calcio ionico', 'free calcium', 'calcio livre'],
  },
  {
    id: 'co2',
    name: 'Dióxido de Carbono (CO2)',
    group: 'electrolytes',
    unit: 'mmol/L',
    range: [20, 29],
    aliases: ['co2', 'dioxido de carbono', 'carbon dioxide'],
  },
  {
    id: 'phos',
    name: 'Fósforo',
    group: 'electrolytes',
    unit: 'mg/dL',
    range: [2.5, 4.5],
    aliases: ['fosforo', 'phosphorus'],
  },
  {
    id: 'mg_el',
    name: 'Magnésio',
    group: 'electrolytes',
    unit: 'mg/dL',
    range: [1.6, 2.6],
    aliases: ['magnesio', 'magnesium'],
  },

  // -------------------------------------------------- TIROIDE / REPRODUTIVA
  {
    id: 'tsh_thy',
    name: 'TSH',
    group: 'thyroid',
    unit: 'mUI/L',
    range: [0.45, 4.5],
    inRangeLabel: 'Normal',
    aliases: ['tsh', 'tsh ultra sensivel', 'tsh ultrasensivel'],
  },
  {
    id: 'ft4_thy',
    name: 'T4 Livre',
    group: 'thyroid',
    unit: 'ng/dL',
    range: [0.8, 1.8],
    inRangeLabel: 'Normal',
    aliases: ['t4 livre', 'free t4', 'tiroxina livre'],
  },
  {
    id: 'tsh_rep',
    name: 'TSH',
    group: 'reproductive',
    unit: 'mUI/L',
    range: [0.45, 4.5],
    inRangeLabel: 'Normal',
    aliases: ['tsh'],
  },
  {
    id: 'ft4_rep',
    name: 'T4 Livre',
    group: 'reproductive',
    unit: 'ng/dL',
    range: [0.8, 1.8],
    inRangeLabel: 'Normal',
    aliases: ['t4 livre', 'free t4'],
  },

  // -------------------------------------------------- COMPOSIÇÃO CORPORAL
  {
    id: 'weight',
    name: 'Peso',
    group: 'body_composition',
    unit: 'kg',
    special: 'weight',
    noStatus: true,
    aliases: ['peso', 'weight', 'peso corporal'],
  },
  {
    id: 'body_fat',
    name: 'Gordura Corporal %',
    group: 'body_composition',
    unit: '%',
    special: 'body_fat',
    noStatus: true,
    aliases: ['gordura corporal', 'body fat', 'percentual de gordura'],
  },
  {
    id: 'lean_mass',
    name: 'Massa Magra',
    group: 'body_composition',
    unit: 'kg',
    special: 'lean_mass',
    noStatus: true,
    aliases: ['massa magra', 'lean mass', 'massa magra corporal'],
  },

  // -------------------------------------------------- OSSOS
  {
    id: 'ca_bone',
    name: 'Cálcio',
    group: 'bones',
    unit: 'mg/dL',
    range: [8.6, 10.3],
    aliases: ['calcio'],
  },
  {
    id: 'vitd_bone',
    name: 'Vitamina D (25-OH)',
    group: 'bones',
    unit: 'ng/mL',
    ideal: [30, 100],
    optimalLabel: 'Normal',
    aliases: ['vitamina d 25 oh', 'vitamina d', '25 hydroxy vitamin d'],
  },
  {
    id: 'alp_bone',
    name: 'Fosfatase Alcalina (ALP)',
    group: 'bones',
    unit: 'U/L',
    range: [40, 130],
    aliases: ['alp', 'fosfatase alcalina'],
  },

  // -------------------------------------------------- NUTRIENTES
  {
    id: 'vitd_nut',
    name: 'Vitamina D (25-OH)',
    group: 'nutrients',
    unit: 'ng/mL',
    ideal: [30, 100],
    optimalLabel: 'Normal',
    aliases: ['vitamina d 25 oh', 'vitamina d'],
  },
  {
    id: 'folate',
    name: 'Folato',
    group: 'nutrients',
    unit: 'ng/mL',
    range: [3.9, 26],
    aliases: ['folato', 'folate', 'acido folico', 'b9'],
  },
  {
    id: 'iron_nut',
    name: 'Ferro',
    group: 'nutrients',
    unit: 'µg/dL',
    range: [65, 175],
    aliases: ['ferro'],
  },
  {
    id: 'ferr_nut',
    name: 'Ferritina',
    group: 'nutrients',
    unit: 'ng/mL',
    range: [30, 400],
    inRangeLabel: 'Normal',
    aliases: ['ferritina'],
  },
  {
    id: 'b12',
    name: 'Vitamina B12',
    group: 'nutrients',
    unit: 'pg/mL',
    range: [200, 900],
    aliases: ['vitamina b12', 'b12', 'cobalamina'],
  },
  {
    id: 'zinc',
    name: 'Zinco',
    group: 'nutrients',
    unit: 'µg/dL',
    range: [70, 120],
    aliases: ['zinco', 'zinc'],
  },
  {
    id: 'vite',
    name: 'Vitamina E (Alfa Tocoferol)',
    group: 'nutrients',
    unit: 'µg/mL',
    range: [5.5, 17],
    aliases: ['vitamina e', 'alfa tocoferol', 'alpha tocopherol'],
  },
  {
    id: 'mg_nut',
    name: 'Magnésio',
    group: 'nutrients',
    unit: 'mg/dL',
    range: [1.6, 2.6],
    aliases: ['magnesio'],
  },

  // -------------------------------------------------- AUTOIMUNE / INFECCIOSAS
  {
    id: 'ana',
    name: 'FAN (ANA)',
    group: 'autoimmune',
    textOnly: true,
    aliases: ['fan ana', 'fan', 'ana', 'fator antinuclear'],
  },
  {
    id: 'hcv',
    name: 'Anticorpo Anti-HCV',
    group: 'infectious',
    textOnly: true,
    aliases: ['anticorpo anti hcv', 'hcv', 'anti hcv', 'hepatite c'],
  },
]

/** Normaliza nomes/unidades para cruzamento: minúsculas, sem acentos, µ→u, ³→3, mantendo %. */
export function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/µ|μ/g, 'u')
    .replace(/³/g, '3')
    .replace(/⁶/g, '6')
    .replace(/²/g, '2')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim()
}

/** Normaliza uma unidade para chave de conversão (ex.: "/µL" → "ul", "10³/µL" → "103ul"). */
export function normalizeUnitKey(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/µ|μ/g, 'u')
    .replace(/³/g, '3')
    .replace(/⁶/g, '6')
    .replace(/²/g, '2')
    .replace(/[^a-z0-9]/g, '')
}

// Apelidos normalizados pré-computados (um por linha, índice alinhado ao PANEL_MARKERS)
const NORMALIZED_MARKERS: (MarkerSpec & { _aliases: string[] })[] = PANEL_MARKERS.map((m) => ({
  ...m,
  _aliases: Array.from(
    new Set([normalizeName(m.name), ...(m.aliases || []).map(normalizeName)]),
  ).filter(Boolean),
}))

export { NORMALIZED_MARKERS }
