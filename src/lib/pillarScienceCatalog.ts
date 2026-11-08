/**
 * Catálogo científico e mapeamento de dados para cada item dos três pilares
 * do Preventive Health Score da Clínica Soul.
 *
 * Cada entrada define:
 * - O que é o marcador e por que ele importa cientificamente para a saúde geral, o coração e a longevidade
 * - Qual a fonte no app (coleção Biomarkers, exames laboratoriais, métricas de saúde, vacinas, perfil de estilo de vida)
 * - Faixas de referência clínicas usuais (ex.: LDL, glicemia de jejum, pressão, horas de sono, etc.)
 * - Ações recomendadas e atalhos de navegação no app
 */

export interface PillarItemScienceMeta {
  id: string
  pillar: 'prevention' | 'monitoring' | 'action'
  pillarTitle: string
  title: string
  shortSummary: string
  // Fonte no app
  sourceName: string
  sourceCollection: string
  sourceDescription: string
  // Explicação científica dividida em pilares
  scienceWhy: {
    generalHealth: string
    cardiovascular: string
    longevity: string
  }
  // Faixas e referências clínicas
  referenceRanges?: {
    optimal: string
    borderline?: string
    alert?: string
    note?: string
  }
  // Relação clínica / evidência
  clinicalImpact: string
  // Como atualizar no app
  actionLabel: string
  actionTarget: {
    type: 'profile-tab' | 'route' | 'scroll'
    tab?: string // se profile-tab
    path?: string // se route (ex: /registrar?category=pressao ou /exames)
  }
  secondaryAction?: {
    label: string
    type: 'profile-tab' | 'route'
    tab?: string
    path?: string
  }
}

export const PILLAR_SCIENCE_CATALOG: Record<string, PillarItemScienceMeta> = {
  // -------------------------------------------------------------
  // PILAR 1: PREVENÇÃO (Checkups, Exames, Vacinas)
  // -------------------------------------------------------------
  'prev-lipid': {
    id: 'prev-lipid',
    pillar: 'prevention',
    pillarTitle: 'Prevenção (Checkups & Exames)',
    title: 'Painel Lipídico & Colesterol',
    shortSummary: 'Avaliação de HDL, LDL, Não-HDL e Triglicerídeos nos últimos 12 meses',
    sourceName: 'Biomarcadores do Perfil ou Exames de Sangue',
    sourceCollection: 'profile_biomarkers ou exams',
    sourceDescription:
      'Lido a partir dos Biomarcadores cadastrados no Perfil (com nomes como Colesterol Total, LDL, HDL, Triglicerídeos) ou de Exames laboratoriais anexados em Exames & Dietas nos últimos 12 meses.',
    scienceWhy: {
      generalHealth:
        'O colesterol é uma molécula esteroide essencial para membranas celulares, síntese de hormônios esteroides (como cortisol, testosterona e estrogênio) e ácidos biliares. O desbalanço crônico, contudo, é silencioso e subclínico por décadas.',
      cardiovascular:
        'Partículas ricas em apoB (como o LDL oxidado e remanescentes de VLDL) penetram a camada íntima endotelial das artérias coronárias e carótidas, iniciando a formação de placas ateroscleróticas e calcificações vasculares que causam infarto agudo e AVC.',
      longevity:
        'O controle precoce das partículas aterogênicas reduz a carga cumulativa de exposição endotelial ("cholesterol years"), sendo um dos pilares mais consistentes para compressão da morbidade e extensão da vida livre de eventos isquêmicos.',
    },
    referenceRanges: {
      optimal: 'LDL < 100 mg/dL (ou < 70/50 em alto/muito alto risco); Não-HDL < 130 mg/dL',
      borderline: 'LDL entre 100 e 129 mg/dL; Triglicerídeos 150-199 mg/dL',
      alert: 'LDL ≥ 130 mg/dL; Triglicerídeos ≥ 200 mg/dL; HDL < 40 mg/dL (H) ou < 50 mg/dL (M)',
      note: 'Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose (SBC).',
    },
    clinicalImpact:
      'A cada redução de 39 mg/dL no LDL-C mantida a longo prazo, observa-se uma redução relativa de ~22% no risco de eventos vasculares maiores.',
    actionLabel: 'Adicionar nos Biomarcadores',
    actionTarget: {
      type: 'profile-tab',
      tab: 'biomarkers',
    },
    secondaryAction: {
      label: 'Anexar Laudo em Exames',
      type: 'route',
      path: '/exames',
    },
  },

  'prev-diabetes': {
    id: 'prev-diabetes',
    pillar: 'prevention',
    pillarTitle: 'Prevenção (Checkups & Exames)',
    title: 'Rastreamento de Diabetes & Glicemia',
    shortSummary: 'Glicemia de jejum ou Hemoglobina Glicada (HbA1c) anual',
    sourceName: 'Exames, Biomarcadores ou Métricas de Glicemia',
    sourceCollection: 'exams, profile_biomarkers ou health_metrics (categoria: glicemia)',
    sourceDescription:
      'Lido de exames laboratoriais anexados (glicemia/HbA1c), biomarcadores sanguíneos no perfil ou de registros de glicemia nos últimos 12 meses.',
    scienceWhy: {
      generalHealth:
        'A glicose é a fonte primária de energia para cérebro e hemácias. Níveis cronicamente elevados geram estresse oxidativo, glicação avançada de proteínas (AGEs) e disfunção mitocondrial em tecidos periféricos.',
      cardiovascular:
        'A hiperglicemia e a resistência à insulina lesam o glicocálix endotelial, acelerando o endurecimento arterial, a microangiopatia e duplicando o risco de cardiopatia isquêmica e nefropatia diabética.',
      longevity:
        'A sensibilidade à insulina é o marcador mais conservado filogeneticamente em modelos de longevidade saudável (vias AMPK e sirtuínas). Níveis ideais de HbA1c previnem declínio cognitivo e fragilidade metabólica.',
    },
    referenceRanges: {
      optimal: 'Glicemia de jejum: 70 a 99 mg/dL; HbA1c: < 5.6%',
      borderline: 'Pré-diabetes: Glicemia 100-125 mg/dL; HbA1c: 5.7% a 6.4%',
      alert: 'Diabetes estabelecido: Glicemia ≥ 126 mg/dL; HbA1c ≥ 6.5%',
      note: 'Diretrizes da Sociedade Brasileira de Diabetes (SBD) e ADA.',
    },
    clinicalImpact:
      'A resistência insulínica precede o diabetes em até 10 a 15 anos. Detectar alterações precoces permite reversão com alimentação, treino e otimização do sono.',
    actionLabel: 'Registrar Glicemia Atual',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=glicemia',
    },
    secondaryAction: {
      label: 'Adicionar nos Biomarcadores',
      type: 'profile-tab',
      tab: 'biomarkers',
    },
  },

  'prev-cardio': {
    id: 'prev-cardio',
    pillar: 'prevention',
    pillarTitle: 'Prevenção (Checkups & Exames)',
    title: 'Avaliação Cardiovascular (ECG)',
    shortSummary: 'Eletrocardiograma ou avaliação cardiológica nos últimos 24 meses',
    sourceName: 'Exames Cardiológicos',
    sourceCollection: 'exams',
    sourceDescription:
      'Lido a partir dos Exames anexados na aba Exames & Dietas com tipos como Eletrocardiograma, ECG, Teste Ergométrico, Ecocardiograma ou Holter nos últimos 24 meses.',
    scienceWhy: {
      generalHealth:
        'O eletrocardiograma (ECG) registra a atividade elétrica sincronizada do miocárdio, revelando a integridade das vias de condução, frequência basal e o equilíbrio iônico celular do coração.',
      cardiovascular:
        'Detecta arritmias silenciosas (como fibrilação atrial — causa comum de AVC embólico), sobrecargas ventriculares secundárias à hipertensão de longa data, isquemias silenciosas e alterações de repolarização (intervalo QT).',
      longevity:
        'Permite atuar antes do remodelamento miocárdico e da insuficiência cardíaca clínica, além de estratificar a segurança para treinos de alta intensidade em protocolos de longevidade.',
    },
    referenceRanges: {
      optimal:
        'Ritmo sinusal regular, frequência 50-90 bpm em repouso, sem bloqueios de ramo ou sinais de isquemia',
      borderline:
        'Extrassístoles ventriculares/supraventriculares raras, bradicardia sinusal de atleta',
      alert:
        'Fibrilação atrial, sobrecarga ventricular esquerda importante, bloqueio AV de alto grau ou infradesnivelamento de ST',
      note: 'Avaliação recomendada a cada 1 a 2 anos dependendo da idade e fatores de risco.',
    },
    clinicalImpact:
      'A fibrilação atrial assintomática é responsável por cerca de 20% dos acidentes vasculares encefálicos isquêmicos. Rastrear o ritmo protege a função cerebral e miocárdica.',
    actionLabel: 'Anexar Laudo de ECG',
    actionTarget: {
      type: 'route',
      path: '/exames',
    },
  },

  'prev-blood': {
    id: 'prev-blood',
    pillar: 'prevention',
    pillarTitle: 'Prevenção (Checkups & Exames)',
    title: 'Painel Metabólico & Biomarcadores',
    shortSummary: 'Hemograma completo, marcadores hepáticos e inflamatórios',
    sourceName: 'Exames de Sangue ou Biomarcadores Cadastrados',
    sourceCollection: 'exams ou profile_biomarkers (≥ 3 marcadores)',
    sourceDescription:
      'Verifica se há laudo de exame de sangue anexado nos últimos 12 meses ou se o usuário mantém pelo menos 3 biomarcadores cadastrados no perfil (ex.: Ferritina, TSH, PCR ultrassensível, Creatinina, TGO/TGP, Vitamina D).',
    scienceWhy: {
      generalHealth:
        'Avalia a capacidade hematopoiética (série vermelha e branca), o transporte de oxigênio celular, os estoques de ferro, a função renal (filtração glomerular) e a homeostase hepatobiliar.',
      cardiovascular:
        'Marcadores inflamatórios como a Proteína C-Reativa ultrassensível (PCR-us) e a ferritina refletem a inflamação vascular de baixo grau, que fragiliza o capeamento fibroso de placas arteriais.',
      longevity:
        'A inflamação crônica silenciosa ("inflammaging") e a perda precoce de taxa de filtração renal são marcadores centrais do envelhecimento biológico acelerado.',
    },
    referenceRanges: {
      optimal:
        'PCR-us < 1.0 mg/L; Creatinina < 1.1 mg/dL; TSH 1.0-2.5 mUI/L; Vitamina D > 30-40 ng/mL',
      borderline: 'PCR-us entre 1.0 e 3.0 mg/L (risco moderado); TSH 2.5-4.5 mUI/L',
      alert:
        'PCR-us > 3.0 mg/L sem infecção aguda; Elevação persistente de transaminases hepáticas',
      note: 'Valores integrativos para medicina preventiva de precisão.',
    },
    clinicalImpact:
      'Detectar precocemente esteatose hepática metabólica, sobrecarga de ferro ou inflamação subclínica evita fibrose tecidual e insuficiência de órgãos vitais.',
    actionLabel: 'Gerenciar Biomarcadores',
    actionTarget: {
      type: 'profile-tab',
      tab: 'biomarkers',
    },
    secondaryAction: {
      label: 'Anexar Laudo Laboratorial',
      type: 'route',
      path: '/exames',
    },
  },

  'prev-vaccine': {
    id: 'prev-vaccine',
    pillar: 'prevention',
    pillarTitle: 'Prevenção (Checkups & Exames)',
    title: 'Carteira de Vacinação Preventiva',
    shortSummary: 'Vacinas em dia (Influenza anual, Tétano, Hepatite B, Herpes Zóster)',
    sourceName: 'Aba de Vacinações do Perfil',
    sourceCollection: 'profile_vaccinations',
    sourceDescription:
      'Lido diretamente dos registros da aba "Vaccinations" no Perfil, registrando doses recebidas, lotes e datas de reforço.',
    scienceWhy: {
      generalHealth:
        'A imunização treina o sistema imune adaptativo com antígenos específicos, reduzindo infecções graves que descompensam o organismo e causam hospitalizações evitáveis.',
      cardiovascular:
        'Infecções respiratórias graves (como gripe por Influenza ou COVID-19) desencadeiam tempestades inflamatórias e hipercoagulabilidade, multiplicando por até 6 vezes o risco de infarto agudo nas semanas pós-infecção.',
      longevity:
        'Prevenir a imunossenescência e infecções pulmonares preserva a reserva fisiológica e a massa magra, cruciais para autonomia na maturidade.',
    },
    referenceRanges: {
      optimal:
        'Influenza anual; dT (Difteria e Tétano) a cada 10 anos; Hepatite B esquema completo; Zóster após 50 anos',
      note: 'Calendário de Vacinação do Adulto e Idoso (SBIm / Ministério da Saúde).',
    },
    clinicalImpact:
      'A vacinação contra influenza em pacientes com perfil cardiovascular reduz a mortalidade por todas as causas em aproximadamente 18% durante os períodos de circulação viral.',
    actionLabel: 'Cadastrar Vacinas no Perfil',
    actionTarget: {
      type: 'profile-tab',
      tab: 'vaccinations',
    },
  },

  'prev-bp': {
    id: 'prev-bp',
    pillar: 'prevention',
    pillarTitle: 'Prevenção (Checkups & Exames)',
    title: 'Aferição de Pressão de Base',
    shortSummary: 'Pressão arterial conferida e documentada nos últimos 6 meses',
    sourceName: 'Registros de Pressão Arterial',
    sourceCollection: 'health_metrics (categoria: pressao)',
    sourceDescription:
      'Lido dos registros de pressão arterial no app realizados nos últimos 180 dias, servindo como rastreamento clínico de base.',
    scienceWhy: {
      generalHealth:
        'A pressão arterial é a força hidrodinâmica que o sangue exerce contra a parede elástica das artérias. O aumento assintomático é o principal fator de risco modificável no mundo.',
      cardiovascular:
        'A hipertensão crônica causa hipertrofia ventricular esquerda, rigidez aórtica, insuficiência cardíaca diastólica e aneurismas. A nível microvascular, destrói os capilares renais e cerebrais.',
      longevity:
        'Manter pressão arterial ideal previne demência vascular e microinfartos cerebrais silenciosos, além de ser o maior protetor contra insuficiência renal crônica dialítica.',
    },
    referenceRanges: {
      optimal: 'Sistólica < 120 mmHg e Diastólica < 80 mmHg',
      borderline: 'Pressão elevada / pré-hipertensão: Sistólica 120-129 e Diastólica < 80 mmHg',
      alert:
        'Hipertensão estágio 1: Sistólica 130-139 ou Diastólica 80-89 mmHg; Estágio 2: ≥ 140/90 mmHg',
      note: 'Diretrizes Brasileiras de Hipertensão Arterial (SBC/SBH).',
    },
    clinicalImpact:
      'Reduzir a pressão arterial sistólica em apenas 5 mmHg reduz o risco de eventos cardiovasculares maiores em 10%, independentemente do nível inicial.',
    actionLabel: 'Aferir e Registrar Pressão',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=pressao',
    },
  },

  // -------------------------------------------------------------
  // PILAR 2: MONITORING (Monitoramento Ativo 30 dias)
  // -------------------------------------------------------------
  'mon-bp': {
    id: 'mon-bp',
    pillar: 'monitoring',
    pillarTitle: 'Monitoramento (Controle 30d)',
    title: 'Pressão Arterial Frequente',
    shortSummary: 'Pelo menos 2 medições nos últimos 30 dias para rastrear variações',
    sourceName: 'Métricas de Pressão Arterial (últimos 30 dias)',
    sourceCollection: 'health_metrics (categoria: pressao, >= 2 registros)',
    sourceDescription:
      'Calculado a partir de aferições regulares registradas pelo usuário na tela Registrar com a categoria "Pressão". O app contabiliza registros nos últimos 30 dias.',
    scienceWhy: {
      generalHealth:
        'A pressão varia circadianamente: o acompanhamento contínuo em ambiente domiciliar elimina o efeito do "jaleco branco" e detecta a hipertensão mascarada.',
      cardiovascular:
        'Identifica picos pressóricos relacionados a estresse agudo, má qualidade de sono, ingestão de sódio ou desidratação antes que causem lesão em órgãos-alvo.',
      longevity:
        'A variabilidade pressórica excessiva entre as semanas está correlacionada com maior rigidez arterial e risco aumentado de eventos isquêmicos cerebrais.',
    },
    referenceRanges: {
      optimal: 'Média residencial (MRPA) < 130/80 mmHg; idealmente ~115/75 mmHg',
      alert: 'Médias residenciais ≥ 130/80 mmHg sugerem hipertensão não controlada',
    },
    clinicalImpact:
      'O monitoramento residencial da pressão arterial (MRPA) tem maior valor prognóstico de eventos vasculares do que a aferição isolada em consultório médico.',
    actionLabel: 'Lançar Nova Medição de Pressão',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=pressao',
    },
  },

  'mon-weight': {
    id: 'mon-weight',
    pillar: 'monitoring',
    pillarTitle: 'Monitoramento (Controle 30d)',
    title: 'Acompanhamento do Peso',
    shortSummary: 'Ao menos 1 registro de peso/bioimpedância no último mês',
    sourceName: 'Métricas de Peso (últimos 30 dias)',
    sourceCollection: 'health_metrics (categoria: peso, >= 1 registro)',
    sourceDescription:
      'Lido a partir das pesagens lançadas no app na categoria "Peso" nos últimos 30 dias.',
    scienceWhy: {
      generalHealth:
        'O peso corporal é uma medida composta de massa muscular, osso, água corporal e tecido adiposo. O acompanhamento longitudinal sinaliza retenção de líquidos ou perda inadvertida de massa magra.',
      cardiovascular:
        'A oscilação súbita para cima (+2 kg em 48h) pode indicar retenção hídrica por sobrecarga cardíaca ou renal; o acúmulo gradual de gordura visceral sobrecarrega o trabalho ventricular.',
      longevity:
        'A estabilidade ponderal com preservação do índice de massa magra é um dos maiores preditores contra sarcopenia, quedas e declínio metabólico na maturidade.',
    },
    referenceRanges: {
      optimal: 'IMC 18.5 - 24.9 kg/m² com percentual de gordura adequado (M: 10-20%, F: 18-28%)',
      alert:
        'Aumento rápido de peso desproporcional à ingestão calórica ou perda de peso involuntária',
    },
    clinicalImpact:
      'A gordura visceral profunda secreta citocinas pró-inflamatórias (IL-6, TNF-alfa) que sabotam a sensibilidade à insulina e elevam a pressão arterial.',
    actionLabel: 'Registrar Peso Atual',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=peso',
    },
  },

  'mon-sleep': {
    id: 'mon-sleep',
    pillar: 'monitoring',
    pillarTitle: 'Monitoramento (Controle 30d)',
    title: 'Rastreamento do Sono',
    shortSummary: 'Pelo menos 5 noites monitoradas nos últimos 30 dias',
    sourceName: 'Métricas de Sono (últimos 30 dias)',
    sourceCollection: 'health_metrics (categoria: sono, >= 5 registros)',
    sourceDescription:
      'Contabiliza as noites de sono registradas no app nos últimos 30 dias (horas dormidas, horário de deitar e fases de sono se disponíveis).',
    scienceWhy: {
      generalHealth:
        'O sono é o momento em que o sistema glinfático cerebral realiza a depuração de toxinas metabólicas (como placas beta-amiloides), ocorre a consolidação da memória e síntese de hormônio do crescimento (GH).',
      cardiovascular:
        'Durante o sono não-REM profundo ocorre o "dipping" noturno da pressão arterial (queda fisiológica de 10 a 20%), aliviando o estresse hemodinâmico das artérias coronárias.',
      longevity:
        'A privação crônica encurta telômeros, eleva cortisol e ativa o sistema nervoso simpático, acelerando a resistência insulínica e a inflamação sistêmica.',
    },
    referenceRanges: {
      optimal:
        '7 a 9 horas por noite em adultos, com queda noturna da frequência cardíaca e do estresse',
      borderline: '6 a 6.9 horas por noite',
      alert: '< 6 horas ou > 9.5 horas crônicas (curva em U de mortalidade)',
    },
    clinicalImpact:
      'Dormir menos de 6 horas por noite de forma crônica aumenta em 48% o risco de desenvolver doença coronariana e em 15% o risco de AVC.',
    actionLabel: 'Registrar Sono da Noite',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=sono',
    },
  },

  'mon-glic': {
    id: 'mon-glic',
    pillar: 'monitoring',
    pillarTitle: 'Monitoramento (Controle 30d)',
    title: 'Monitoramento Glicêmico',
    shortSummary: 'Pelo menos 2 aferições de glicemia capilar ou sensor em 30 dias',
    sourceName: 'Métricas de Glicemia (últimos 30 dias)',
    sourceCollection: 'health_metrics (categoria: glicemia, >= 2 registros)',
    sourceDescription:
      'Lido a partir de medições de glicemia pontual de jejum ou pós-prandial registradas na tela Registrar.',
    scienceWhy: {
      generalHealth:
        'Mede em tempo real o impacto das refeições, do estresse emocional e do sono sobre o metabolismo de carboidratos, expondo picos hiperglicêmicos pós-prandiais que a glicemia de jejum isolada não revela.',
      cardiovascular:
        'A alta variabilidade glicêmica (picos seguidos de vales) induz estresse oxidativo endotelial mais deletério do que uma glicemia estável discretamente acima do ideal.',
      longevity:
        'Evitar montanhas-russas glicêmicas previne crises de fadiga vespertina, fissura por doces, inflamação hepática e glicação de colágeno vascular.',
    },
    referenceRanges: {
      optimal: 'Jejum: 70-90 mg/dL; Pós-prandial (2h após refeição): < 120 mg/dL',
      borderline: 'Jejum: 100-125 mg/dL; Pós-prandial: 140-199 mg/dL',
      alert: 'Jejum ≥ 126 mg/dL ou Pós-prandial ≥ 200 mg/dL',
    },
    clinicalImpact:
      'Picos pós-prandiais repetidos acima de 140 mg/dL paralisam temporariamente a vasodilatação dependente do óxido nítrico nas artérias.',
    actionLabel: 'Registrar Glicemia Pontual',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=glicemia',
    },
  },

  'mon-hrv': {
    id: 'mon-hrv',
    pillar: 'monitoring',
    pillarTitle: 'Monitoramento (Controle 30d)',
    title: 'VFC / HRV Matinal',
    shortSummary: 'Variabilidade da frequência cardíaca para monitorar estresse e recuperação',
    sourceName: 'Métricas de VFC / HRV (últimos 30 dias)',
    sourceCollection: 'health_metrics (categoria: hrv, >= 3 registros)',
    sourceDescription:
      'Registros de VFC (em milissegundos, RMSSD ou SDNN) coletados via relógios inteligentes (Apple Watch, Garmin, Whoop, Oura) ou faixas peitorais e registrados na categoria "VFC / HRV".',
    scienceWhy: {
      generalHealth:
        'A Variabilidade da Frequência Cardíaca mede a variação milissegundo a milissegundo entre batimentos cardíacos consecutivos, sendo o indicador não-invasivo padrão-ouro do tônus parassimpático (nervo vago).',
      cardiovascular:
        'Uma VFC alta reflete um coração resiliente, flexível e pronto para responder a estímulos; uma VFC cronicamente baixa é sinal de sobrecarga simpática e exaustão autonômica.',
      longevity:
        'O tônus vagal robusto exerce freio anti-inflamatório sistêmico (via colinérgica anti-inflamatória do baço), protegendo o sistema imune contra hiperativação inflamatória.',
    },
    referenceRanges: {
      optimal:
        'Acompanhar a linha de base individual (RMSSD usualmente entre 35 e 80+ ms para adultos)',
      note: 'Mais importante que o número absoluto é a tendência em relação à sua média móvel de 7 dias.',
    },
    clinicalImpact:
      'Quedas acentuadas de VFC precedem infecções virais em até 48h e apontam sobretreinamento muscular ou privação severa de sono.',
    actionLabel: 'Registrar Valor de VFC / HRV',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=hrv',
    },
  },

  // -------------------------------------------------------------
  // PILAR 3: ACTION (Hábitos Saudáveis & Ações Ativas)
  // -------------------------------------------------------------
  'act-sleep': {
    id: 'act-sleep',
    pillar: 'action',
    pillarTitle: 'Ação (Hábitos & Metas)',
    title: 'Meta de Sono (7h+ por noite)',
    shortSummary: 'Média de descanso reparador para longevidade e regeneração celular',
    sourceName: 'Média dos Registros de Sono ou Perfil de Estilo de Vida',
    sourceCollection: 'health_metrics (categoria: sono) ou profile_lifestyle (sleep_hours_typical)',
    sourceDescription:
      'Calculado a partir da média aritmética das horas registradas na métrica "Sono" nos últimos 30 dias. Caso não haja métricas registradas, o app utiliza a quantidade típica informada na aba "Lifestyle" do Perfil.',
    scienceWhy: {
      generalHealth:
        'Dormir 7 a 8 horas completas garante ciclos suficientes de sono REM (reparação neural e equilíbrio emocional) e sono profundo de ondas lentas (liberação de GH, reparo tecidual e homeostase hormonal).',
      cardiovascular:
        'Reduz os níveis de catecolaminas circulantes, estabiliza o tônus vascular coronariano e previne a ativação do eixo renina-angiotensina-aldosterona que eleva a pressão.',
      longevity:
        'Estudos de coorte com mais de 1 milhão de indivíduos confirmam que médias consistentes entre 7h e 8h apresentam as menores taxas de mortalidade por todas as causas.',
    },
    referenceRanges: {
      optimal: 'Média de 7.0 a 8.5 horas por noite com boa regularidade de horário de deitar',
      alert: '< 6.5h de média crônica correlaciona-se com disfunção metabólica e imunodepressão',
    },
    clinicalImpact:
      'Uma única semana de sono restrito a 5h por noite reduz a sensibilidade à insulina periférica no mesmo nível de um envelhecimento metabólico de 10 anos.',
    actionLabel: 'Registrar Noite de Sono',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=sono',
    },
    secondaryAction: {
      label: 'Ajustar Horas Típicas no Perfil',
      type: 'profile-tab',
      tab: 'lifestyle',
    },
  },

  'act-exercise': {
    id: 'act-exercise',
    pillar: 'action',
    pillarTitle: 'Ação (Hábitos & Metas)',
    title: 'Atividade Física Consistente',
    shortSummary: 'Pelo menos 120-150 min/semana de treinos resistidos e aeróbicos',
    sourceName: 'Registros de Atividade ou Perfil de Estilo de Vida',
    sourceCollection: 'health_metrics (categoria: atividade) ou profile_lifestyle',
    sourceDescription:
      'Calculado pelo somatório de minutos de treino registrados nos últimos 30 dias (meta: ≥ 480 min/mês ou ≥ 8 treinos) ou pelos dias e minutos declarados na aba "Lifestyle" do Perfil (≥ 3 dias/semana).',
    scienceWhy: {
      generalHealth:
        'O músculo esquelético é o maior órgão endócrino e metabólico do corpo. A contração muscular libera mioquinas (como IL-6 e irisina) que promovem biogênese mitocondrial e protegem o cérebro (BDNF).',
      cardiovascular:
        'Eleva a aptidão cardiorrespiratória (VO2 máx), reduz a frequência cardíaca de repouso, expande a rede capilar miocárdica e aumenta a síntese endotelial de óxido nítrico.',
      longevity:
        'O VO2 máx e a força muscular de preensão (força funcional) são os dois biomarcadores de maior correlação inversa com mortalidade prematura conhecidos pela medicina.',
    },
    referenceRanges: {
      optimal:
        'Pelo menos 150 min de atividade aeróbica moderada + 2 a 3 sessões de força (musculação/funcional) por semana',
      borderline: '60 a 119 minutos por semana',
      alert: 'Sedentarismo (< 60 minutos por semana)',
      note: 'Diretrizes da Organização Mundial da Saúde (OMS) e ACSM.',
    },
    clinicalImpact:
      'Sair do quartil mais baixo de condicionamento cardiorrespiratório para o quartil imediatamente superior reduz a mortalidade em quase 50%.',
    actionLabel: 'Registrar Treino ou Exercício',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=atividade',
    },
    secondaryAction: {
      label: 'Atualizar Rotina no Perfil',
      type: 'profile-tab',
      tab: 'lifestyle',
    },
  },

  'act-alcohol': {
    id: 'act-alcohol',
    pillar: 'action',
    pillarTitle: 'Ação (Hábitos & Metas)',
    title: 'Moderação de Álcool',
    shortSummary: 'Consumo reduzido (<= 4 doses por semana) para proteger fígado e sono REM',
    sourceName: 'Registros de Álcool ou Perfil de Estilo de Vida',
    sourceCollection:
      'health_metrics (categoria: alcool) ou profile_lifestyle (alcohol_drinks_per_week)',
    sourceDescription:
      'Lido a partir das doses registradas na categoria "Álcool" nos últimos 30 dias (meta: ≤ 16 doses no mês) ou do consumo semanal médio informado na aba "Lifestyle" do Perfil.',
    scienceWhy: {
      generalHealth:
        'O etanol é metabolizado no fígado pela álcool desidrogenase em acetaldeído — um composto citotóxico e carcinogênico classe 1 da IARC que consome reservas de glutationa e NAD+.',
      cardiovascular:
        'O álcool eleva agudamente a pressão arterial, ativa o sistema simpático e é potente indutor de taquiarritmias supraventriculares (síndrome do "holiday heart").',
      longevity:
        'Mesmo em doses moderadas antes de dormir, o álcool fragmenta o sono REM, inibe a autofagia celular e reduz o volume cerebral em ressonâncias magnéticas quantitativas.',
    },
    referenceRanges: {
      optimal: '0 a 2 doses por semana (ou abstinência)',
      borderline: '3 a 4 doses por semana com dias consecutivos sem ingestão',
      alert: '> 4 doses por semana ou episódios de consumo excessivo ("binge drinking")',
      note: '1 dose = ~14g de álcool puro (1 taça de vinho 150ml ou 1 lata de cerveja 350ml).',
    },
    clinicalImpact:
      'Reduzir o consumo semanal de álcool melhora a recuperação do sistema nervoso autônomo (VFC) e a qualidade do sono profundo em poucos dias.',
    actionLabel: 'Registrar Consumo de Bebida',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=alcool',
    },
    secondaryAction: {
      label: 'Configurar Hábito no Perfil',
      type: 'profile-tab',
      tab: 'lifestyle',
    },
  },

  'act-water': {
    id: 'act-water',
    pillar: 'action',
    pillarTitle: 'Ação (Hábitos & Metas)',
    title: 'Hidratação Consistente',
    shortSummary: 'Consumo regular de água registrado ao longo dos dias',
    sourceName: 'Métricas de Hidratação / Água',
    sourceCollection: 'health_metrics (categoria: agua, >= 10 registros em 30d)',
    sourceDescription:
      'Contabiliza os registros de consumo hídrico lançados na categoria "Água" nos últimos 30 dias (meta: pelo menos 10 registros ativos de hidratação).',
    scienceWhy: {
      generalHealth:
        'O corpo humano é ~60% água. A volemia adequada mantém a viscosidade plasmática correta, a taxa de filtração glomerular renal, a termorregulação e a lubrificação articular.',
      cardiovascular:
        'A desidratação subclínica eleva o hematócrito e a viscosidade do sangue, obrigando o ventrículo esquerdo a gerar mais tensão e aumentando o risco trombótico.',
      longevity:
        'Estudo recente do NIH (National Institutes of Health) correlacionou sódio sérico acima de 142 mmol/L (marcador de subidratação crônica) com risco 39% maior de doenças crônicas e envelhecimento biológico acelerado.',
    },
    referenceRanges: {
      optimal:
        'Aproximadamente 35 a 45 mL de água por kg de peso corporal ao dia (ex.: ~2.5L a 3.2L para 75 kg)',
      alert: 'Urina escura e concentrada de forma constante ao longo do dia',
    },
    clinicalImpact:
      'Uma hidratação ideal reduz a carga osmótica sobre os rins, melhora a sensibilidade barorreflexa e previne quedas cognitivas agudas.',
    actionLabel: 'Registrar Copo de Água',
    actionTarget: {
      type: 'route',
      path: '/registrar?category=agua',
    },
  },

  'act-lifestyle': {
    id: 'act-lifestyle',
    pillar: 'action',
    pillarTitle: 'Ação (Hábitos & Metas)',
    title: 'Estilo de Vida Anti-inflamatório',
    shortSummary: 'Dieta equilibrada, não-tabagismo e práticas regenerativas (sauna/respiração)',
    sourceName: 'Perfil de Estilo de Vida e Registros de Bem-estar',
    sourceCollection: 'profile_lifestyle e health_metrics (categoria: sauna, meditacao)',
    sourceDescription:
      'Avalia se o usuário é não-fumante e tem padrão alimentar saudável configurado no perfil (Mediterrânea, Anti-inflamatória, etc.) ou se pratica sessões de sauna/respiração registradas.',
    scienceWhy: {
      generalHealth:
        'A alimentação densa em polifenóis, fibras prebióticas e ácidos graxos ômega-3 nutre a microbiota intestinal, mantendo a integridade da barreira epitelial e suprimindo a endotoxemia metabólica.',
      cardiovascular:
        'O tabagismo causa disfunção endotelial quase instantânea por liberação de monóxido de carbono e estresse oxidativo. Já a dieta do Mediterrâneo reduz eventos cardiovasculares maiores em ~30% (estudo PREDIMED).',
      longevity:
        'Práticas como termoterapia (sauna finlandesa frequente) ativam proteínas de choque térmico (Hsp70) e reduzem mortalidade cardiovascular em mais de 40% em estudos longitudinais de Kuopio.',
    },
    referenceRanges: {
      optimal:
        'Não fumante + Padrão alimentar rico em alimentos integrais/in natura + Práticas de recuperação',
      alert:
        'Tabagismo ativo ou padrão alimentar ultraprocessado rico em gordura trans e xarope de milho',
    },
    clinicalImpact:
      'Cessar o tabagismo normaliza a função plaquetária em semanas e reduz o risco cardiovascular em 50% após apenas 1 ano.',
    actionLabel: 'Configurar Estilo de Vida',
    actionTarget: {
      type: 'profile-tab',
      tab: 'lifestyle',
    },
    secondaryAction: {
      label: 'Registrar Sauna ou Meditação',
      type: 'route',
      path: '/registrar?category=sauna',
    },
  },
}
