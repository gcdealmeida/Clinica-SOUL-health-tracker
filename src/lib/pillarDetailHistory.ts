import { HealthMetric, Exam, ProfileBiomarker, ProfileVaccination, ProfileLifestyle } from '@/types'

export interface PillarHistoryPoint {
  date: string
  formattedDate: string
  displayValue: string
  numericValue?: number
  sys?: number
  dia?: number
  badgeStatus?: 'optimal' | 'borderline' | 'alert' | 'neutral'
  badgeLabel?: string
  context?: string
}

export interface PillarChartPoint {
  label: string
  date: string
  value?: number | null
  sys?: number | null
  dia?: number | null
}

export interface PillarGuideline {
  authority: string
  badgeText: string
  optimalRange: string
  borderlineRange?: string
  alertRange?: string
  recommendations: string[]
  evidenceNote: string
}

export interface PillarDetailData {
  latest: {
    value: string
    date?: string
    formattedDate?: string
    subValues?: { label: string; value: string; unit?: string }[]
    status?: 'optimal' | 'borderline' | 'alert' | 'neutral'
  }
  history: PillarHistoryPoint[]
  chartData: PillarChartPoint[]
  chartType: 'line' | 'dualLine' | 'bars' | 'none'
  unit?: string
  guideline: PillarGuideline
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Data não informada'
  const clean = dateStr.slice(0, 10)
  const parts = clean.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return clean
}

function parseBp(text?: string, num?: number): { sys?: number; dia?: number } {
  if (text) {
    const match = text.match(/(\d{2,3})\s*[/x×-]\s*(\d{2,3})/)
    if (match) {
      return { sys: Number(match[1]), dia: Number(match[2]) }
    }
  }
  if (num && num > 40 && num < 250) {
    return { sys: num }
  }
  return {}
}

export function extractPillarDetailData(
  itemId: string,
  data: {
    metrics: HealthMetric[]
    biomarkers: ProfileBiomarker[]
    exams: Exam[]
    vaccinations: ProfileVaccination[]
    lifestyle?: ProfileLifestyle | null
  },
): PillarDetailData {
  const { metrics, biomarkers, exams, vaccinations, lifestyle } = data

  switch (itemId) {
    // -------------------------------------------------------------------------
    // 1. LIPÍDICO & COLESTEROL
    // -------------------------------------------------------------------------
    case 'prev-lipid': {
      const lipidKeywords = [
        'colesterol total',
        'colesterol',
        'ldl',
        'hdl',
        'triglic',
        'vldl',
        'não-hdl',
        'nao-hdl',
      ]
      const relevantBio = biomarkers.filter((b) => {
        const n = b.name.toLowerCase()
        return (
          lipidKeywords.some((k) => n.includes(k)) || b.category?.toLowerCase().includes('lipid')
        )
      })

      // Agrupar por data para montar histórico
      const byDate: Record<string, ProfileBiomarker[]> = {}
      for (const b of relevantBio) {
        const d = (b.date || b.created || '').slice(0, 10) || 'recente'
        if (!byDate[d]) byDate[d] = []
        byDate[d].push(b)
      }

      const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

      // Histórico de medições
      const history: PillarHistoryPoint[] = []
      for (const d of sortedDates) {
        const items = byDate[d]
        const ldl = items.find((i) => i.name.toLowerCase().includes('ldl'))
        const total = items.find(
          (i) => i.name.toLowerCase().includes('total') || i.name.toLowerCase() === 'colesterol',
        )
        const hdl = items.find(
          (i) => i.name.toLowerCase().includes('hdl') && !i.name.toLowerCase().includes('não'),
        )
        const tri = items.find((i) => i.name.toLowerCase().includes('triglic'))

        const parts: string[] = []
        if (ldl) parts.push(`LDL: ${ldl.value} ${ldl.unit || 'mg/dL'}`)
        if (total) parts.push(`Total: ${total.value} ${total.unit || 'mg/dL'}`)
        if (hdl) parts.push(`HDL: ${hdl.value} ${hdl.unit || 'mg/dL'}`)
        if (tri) parts.push(`Triglic: ${tri.value} ${tri.unit || 'mg/dL'}`)

        const mainNum = ldl
          ? parseFloat(ldl.value.replace(',', '.'))
          : total
            ? parseFloat(total.value.replace(',', '.'))
            : undefined

        history.push({
          date: d,
          formattedDate: formatDate(d),
          displayValue: parts.join(' · ') || items.map((i) => `${i.name}: ${i.value}`).join(' · '),
          numericValue: isNaN(mainNum || NaN) ? undefined : mainNum,
          context: ldl ? 'Colesterol LDL' : 'Colesterol Total',
          badgeStatus: ldl && Number(ldl.value) > 130 ? 'alert' : 'optimal',
          badgeLabel: ldl && Number(ldl.value) > 130 ? 'Atenção' : 'Normal',
        })
      }

      // Adicionar exames laboratoriais anexados no histórico se houver
      const lipidExams = exams.filter(
        (e) =>
          e.title.toLowerCase().includes('lipid') ||
          e.title.toLowerCase().includes('sangue') ||
          e.summary_results?.toLowerCase().includes('colesterol') ||
          e.summary_results?.toLowerCase().includes('ldl'),
      )
      for (const ex of lipidExams) {
        if (!sortedDates.includes(ex.date)) {
          history.push({
            date: ex.date,
            formattedDate: formatDate(ex.date),
            displayValue: ex.summary_results || ex.title,
            context: `Laudo Laboratorial (${ex.laboratory || 'Laboratório'})`,
            badgeStatus: 'neutral',
            badgeLabel: 'Laudo',
          })
        }
      }
      history.sort((a, b) => b.date.localeCompare(a.date))

      // Último valor
      const latestDate = sortedDates[0]
      const latestItems = latestDate ? byDate[latestDate] : []
      const latestLdl = latestItems.find((i) => i.name.toLowerCase().includes('ldl'))
      const latestTotal = latestItems.find(
        (i) => i.name.toLowerCase().includes('total') || i.name.toLowerCase() === 'colesterol',
      )
      const latestHdl = latestItems.find(
        (i) => i.name.toLowerCase().includes('hdl') && !i.name.toLowerCase().includes('não'),
      )
      const latestTri = latestItems.find((i) => i.name.toLowerCase().includes('triglic'))

      const subValues: { label: string; value: string; unit?: string }[] = []
      if (latestLdl)
        subValues.push({ label: 'LDL', value: latestLdl.value, unit: latestLdl.unit || 'mg/dL' })
      if (latestTotal)
        subValues.push({
          label: 'Colesterol Total',
          value: latestTotal.value,
          unit: latestTotal.unit || 'mg/dL',
        })
      if (latestHdl)
        subValues.push({ label: 'HDL', value: latestHdl.value, unit: latestHdl.unit || 'mg/dL' })
      if (latestTri)
        subValues.push({
          label: 'Triglicerídeos',
          value: latestTri.value,
          unit: latestTri.unit || 'mg/dL',
        })

      const primaryValue = latestLdl
        ? `LDL: ${latestLdl.value} ${latestLdl.unit || 'mg/dL'}`
        : latestTotal
          ? `Total: ${latestTotal.value} ${latestTotal.unit || 'mg/dL'}`
          : history[0]?.displayValue || 'Nenhum exame cadastrado'

      // Gráfico de evolução do LDL ou Colesterol Total
      const chartPoints: PillarChartPoint[] = []
      const chronological = [...history].filter((h) => h.numericValue !== undefined).reverse()
      for (const h of chronological) {
        chartPoints.push({
          label: formatDate(h.date).slice(0, 5),
          date: h.date,
          value: h.numericValue,
        })
      }

      return {
        latest: {
          value: primaryValue,
          date: latestDate || history[0]?.date,
          formattedDate: formatDate(latestDate || history[0]?.date),
          subValues: subValues.length ? subValues : undefined,
          status: latestLdl && Number(latestLdl.value) > 130 ? 'alert' : 'optimal',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'line' : 'none',
        unit: 'mg/dL',
        guideline: {
          authority:
            'American Heart Association (AHA), NCEP/ATP III e Sociedade Brasileira de Cardiologia (SBC)',
          badgeText: 'Diretriz Cardiovascular AHA / SBC',
          optimalRange:
            'LDL < 100 mg/dL (ou < 70 mg/dL em alto risco cardiovascular); Não-HDL < 130 mg/dL; HDL > 40 mg/dL (H) e > 50 mg/dL (M); Triglicerídeos < 150 mg/dL em jejum.',
          borderlineRange: 'LDL 100-129 mg/dL (limítrofe); Triglicerídeos 150-199 mg/dL.',
          alertRange:
            'LDL ≥ 130 mg/dL (elevado) ou ≥ 190 mg/dL (muito elevado); Triglicerídeos ≥ 200 mg/dL.',
          recommendations: [
            'Segundo a American Heart Association (AHA), cada redução sustentada de ~39 mg/dL no LDL-C reduz em cerca de 22% o risco de infarto e AVC.',
            'A Organização Mundial da Saúde (OMS) recomenda dieta com substituição de gorduras saturadas por ácidos graxos mono e poli-insaturados (azeite de oliva extravirgem, oleaginosas e ômega-3).',
            'Manter ao menos 150 minutos semanais de atividade física aeróbica combinada com treinos de força para elevar os níveis protetores de HDL e acelerar a depuração de triglicerídeos.',
          ],
          evidenceNote:
            'Diretriz de Prevenção Cardiovascular da AHA/ACC e Diretriz Brasileira de Dislipidemias (SBC/EAS).',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 2. PRESSÃO ARTERIAL (Base & Frequente)
    // -------------------------------------------------------------------------
    case 'prev-bp':
    case 'mon-bp': {
      const bpMetrics = metrics
        .filter((m) => m.category === 'pressao')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))

      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of bpMetrics) {
        const parsed = parseBp(m.text_value, m.numeric_value)
        const dateStr = m.date_time.slice(0, 10)
        let status: 'optimal' | 'borderline' | 'alert' | 'neutral' = 'optimal'
        let badgeLabel = 'Ótima'

        if (parsed.sys && parsed.dia) {
          if (parsed.sys >= 140 || parsed.dia >= 90) {
            status = 'alert'
            badgeLabel = 'Hipertensão'
          } else if (parsed.sys >= 130 || parsed.dia >= 80) {
            status = 'borderline'
            badgeLabel = 'Limítrofe'
          } else if (parsed.sys >= 120) {
            status = 'borderline'
            badgeLabel = 'Elevada'
          }
        }

        const display =
          m.text_value ||
          (parsed.sys
            ? `${parsed.sys}${parsed.dia ? `/${parsed.dia}` : ''} mmHg`
            : 'Aferição registrada')

        history.push({
          date: dateStr,
          formattedDate: formatDate(dateStr),
          displayValue: display,
          sys: parsed.sys,
          dia: parsed.dia,
          badgeStatus: status,
          badgeLabel,
          context: m.notes || 'Medição domiciliar',
        })
      }

      // Chronological for chart
      const rev = [...bpMetrics].reverse()
      for (const m of rev) {
        const p = parseBp(m.text_value, m.numeric_value)
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          sys: p.sys || null,
          dia: p.dia || null,
        })
      }

      const latestItem = bpMetrics[0]
      const latestParsed = latestItem
        ? parseBp(latestItem.text_value, latestItem.numeric_value)
        : {}
      const latestVal =
        latestItem?.text_value ||
        (latestParsed.sys ? `${latestParsed.sys}/${latestParsed.dia || 80} mmHg` : 'Sem registros')

      return {
        latest: {
          value: latestVal,
          date: latestItem?.date_time.slice(0, 10),
          formattedDate: formatDate(latestItem?.date_time),
          subValues: latestParsed.sys
            ? [
                { label: 'Sistólica', value: `${latestParsed.sys}`, unit: 'mmHg' },
                { label: 'Diastólica', value: `${latestParsed.dia || '--'}`, unit: 'mmHg' },
              ]
            : undefined,
          status: latestParsed.sys && latestParsed.sys >= 130 ? 'alert' : 'optimal',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.some((c) => c.sys && c.dia)
          ? 'dualLine'
          : chartPoints.length >= 2
            ? 'line'
            : 'none',
        unit: 'mmHg',
        guideline: {
          authority:
            'Organização Mundial da Saúde (OMS), American Heart Association (AHA) e Sociedade Brasileira de Hipertensão (SBH)',
          badgeText: 'Padrão Ouro OMS / AHA',
          optimalRange:
            'Sistólica < 120 mmHg e Diastólica < 80 mmHg (ideal residencial: ~115/75 mmHg).',
          borderlineRange:
            'Pressão Arterial Elevada: Sistólica 120-129 mmHg e Diastólica < 80 mmHg.',
          alertRange:
            'Hipertensão Estágio 1: Sistólica 130-139 mmHg ou Diastólica 80-89 mmHg; Estágio 2: ≥ 140/90 mmHg.',
          recommendations: [
            'A American Heart Association (AHA) indica que a redução de apenas 5 mmHg na sistólica reduz em 10% o risco de AVC e eventos cardiovasculares.',
            'A OMS recomenda consumo de sódio inferior a 2.000 mg/dia (< 5g de sal) e ingestão adequada de potássio na dieta (vegetais verde-escuros, leguminosas e frutas).',
            'Fazer aferições no braço esquerdo em repouso de 5 minutos, sentado e sem ingestão prévia de cafeína ou tabaco.',
          ],
          evidenceNote:
            'Aferições residenciais (MRPA) têm valor prognóstico superior ao consultório por eliminar a hipertensão do jaleco branco.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 3. DIABETES & GLICEMIA (Prevenção & Monitoramento)
    // -------------------------------------------------------------------------
    case 'prev-diabetes':
    case 'mon-glic': {
      const glicMetrics = metrics
        .filter((m) => m.category === 'glicemia')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const glicBios = biomarkers.filter((b) => {
        const n = b.name.toLowerCase()
        return (
          n.includes('glicose') ||
          n.includes('glicemia') ||
          n.includes('hba1c') ||
          n.includes('insulina')
        )
      })

      const history: PillarHistoryPoint[] = []

      for (const m of glicMetrics) {
        const v = m.numeric_value
        let status: 'optimal' | 'borderline' | 'alert' | 'neutral' = 'optimal'
        let badgeLabel = 'Normal'
        if (v && v >= 126) {
          status = 'alert'
          badgeLabel = 'Diabetes'
        } else if (v && v >= 100) {
          status = 'borderline'
          badgeLabel = 'Pré-diabetes'
        }

        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${m.numeric_value ?? m.text_value} ${m.unit || 'mg/dL'}`,
          numericValue: m.numeric_value,
          badgeStatus: status,
          badgeLabel,
          context: m.notes || 'Glicemia Capilar / Sensor',
        })
      }

      for (const b of glicBios) {
        const num = parseFloat(b.value.replace(',', '.'))
        history.push({
          date: (b.date || b.created || '').slice(0, 10),
          formattedDate: formatDate(b.date || b.created),
          displayValue: `${b.name}: ${b.value} ${b.unit || ''}`,
          numericValue: isNaN(num) ? undefined : num,
          badgeStatus: 'neutral',
          badgeLabel: 'Laboratorial',
          context: 'Exame de Sangue',
        })
      }

      history.sort((a, b) => b.date.localeCompare(a.date))

      // Chronological chart
      const chartPoints: PillarChartPoint[] = []
      const rev = [...history].filter((h) => h.numericValue !== undefined).reverse()
      for (const h of rev) {
        chartPoints.push({
          label: formatDate(h.date).slice(0, 5),
          date: h.date,
          value: h.numericValue,
        })
      }

      const latestItem = history[0]

      return {
        latest: {
          value: latestItem?.displayValue || 'Nenhum registro encontrado',
          date: latestItem?.date,
          formattedDate: latestItem?.formattedDate,
          status: latestItem?.badgeStatus,
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'line' : 'none',
        unit: 'mg/dL',
        guideline: {
          authority: 'American Diabetes Association (ADA) e Sociedade Brasileira de Diabetes (SBD)',
          badgeText: 'Padrão Clínico ADA / SBD',
          optimalRange:
            'Glicemia de jejum: 70 a 99 mg/dL; Hemoglobina Glicada (HbA1c): < 5.6%; Pós-prandial (2h): < 120 mg/dL.',
          borderlineRange:
            'Pré-diabetes: Glicemia 100-125 mg/dL; HbA1c: 5.7% a 6.4%; Pós-prandial: 140-199 mg/dL.',
          alertRange:
            'Diabetes estabelecido: Glicemia em jejum ≥ 126 mg/dL; HbA1c ≥ 6.5%; Glicemia aleatória ≥ 200 mg/dL.',
          recommendations: [
            'Segundo a ADA, identificar alterações glicêmicas no estágio pré-diabético permite reversão completa através de hábitos alimentares e musculação.',
            'A OMS recomenda priorizar carboidratos complexos ricos em fibras e evitar bebidas açucaradas de alto índice glicêmico.',
            'Caminhadas leves de 10 a 15 minutos logo após as principais refeições reduzem os picos glicêmicos em até 30% por contração muscular não-dependente de insulina.',
          ],
          evidenceNote:
            'A variabilidade glicêmica acentuada (picos e quedas bruscas) gera estresse oxidativo no endotélio vascular.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 4. PESO CORPORAL (Monitoramento)
    // -------------------------------------------------------------------------
    case 'mon-weight': {
      const weightMetrics = metrics
        .filter((m) => m.category === 'peso')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of weightMetrics) {
        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${m.numeric_value} kg`,
          numericValue: m.numeric_value,
          badgeStatus: 'neutral',
          badgeLabel: 'Bioimpedância/Balança',
          context: m.notes || (m.body_fat_pct ? `Gordura: ${m.body_fat_pct}%` : undefined),
        })
      }

      const rev = [...weightMetrics].reverse()
      for (const m of rev) {
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          value: m.numeric_value,
        })
      }

      const latest = weightMetrics[0]

      return {
        latest: {
          value: latest ? `${latest.numeric_value} kg` : 'Sem registros',
          date: latest?.date_time.slice(0, 10),
          formattedDate: formatDate(latest?.date_time),
          subValues: latest?.body_fat_pct
            ? [
                { label: 'Peso', value: `${latest.numeric_value}`, unit: 'kg' },
                { label: 'Gordura', value: `${latest.body_fat_pct}`, unit: '%' },
                ...(latest.lean_mass_kg
                  ? [{ label: 'Massa Magra', value: `${latest.lean_mass_kg}`, unit: 'kg' }]
                  : []),
              ]
            : undefined,
          status: 'optimal',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'line' : 'none',
        unit: 'kg',
        guideline: {
          authority: 'Organização Mundial da Saúde (OMS) e The Obesity Society',
          badgeText: 'Diretriz Ponderal OMS',
          optimalRange:
            'IMC 18.5 - 24.9 kg/m² com composição corporal equilibrada (Gordura Homens: 12-20%, Mulheres: 18-28%).',
          borderlineRange: 'Sobrepeso: IMC 25.0 - 29.9 kg/m².',
          alertRange: 'Obesidade Grau I (IMC 30-34.9) ou perda involuntária rápida de massa magra.',
          recommendations: [
            'A OMS preconiza a preservação de massa muscular esquelética como preditor central de longevidade e prevenção de sarcopenia.',
            'Pesar-se preferencialmente pela manhã em jejum e após urinar para calibrar as variações fisiológicas de retenção hídrica.',
            'A circunferência abdominal ideal recomendada pela AHA é < 94 cm para homens e < 80 cm para mulheres para proteger contra gordura visceral.',
          ],
          evidenceNote:
            'A gordura visceral profunda secreta adipocinas inflamatórias (IL-6 e TNF-alfa) que aceleram a aterosclerose.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 5. SONO (Monitoramento & Ação)
    // -------------------------------------------------------------------------
    case 'mon-sleep':
    case 'act-sleep': {
      const sleepMetrics = metrics
        .filter((m) => m.category === 'sono')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of sleepMetrics) {
        const val = m.numeric_value || 0
        let status: 'optimal' | 'borderline' | 'alert' | 'neutral' = 'optimal'
        let badgeLabel = 'Ótimo'
        if (val < 6.0) {
          status = 'alert'
          badgeLabel = 'Insuficiente'
        } else if (val < 7.0) {
          status = 'borderline'
          badgeLabel = 'Regular'
        }

        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${val} horas`,
          numericValue: val,
          badgeStatus: status,
          badgeLabel,
          context: m.notes || (m.bedtime ? `Dormiu às ${m.bedtime}` : undefined),
        })
      }

      const rev = [...sleepMetrics].reverse()
      for (const m of rev) {
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          value: m.numeric_value,
        })
      }

      const latest = sleepMetrics[0]
      const avgSleep = sleepMetrics.length
        ? (
            sleepMetrics.reduce((s, m) => s + (m.numeric_value || 0), 0) / sleepMetrics.length
          ).toFixed(1)
        : lifestyle?.sleep_hours_typical
          ? `${lifestyle.sleep_hours_typical}`
          : undefined

      return {
        latest: {
          value: latest
            ? `${latest.numeric_value} horas de sono`
            : avgSleep
              ? `${avgSleep}h (típico)`
              : 'Sem registros',
          date: latest?.date_time.slice(0, 10),
          formattedDate: formatDate(latest?.date_time),
          subValues: avgSleep
            ? [
                { label: 'Última Noite', value: `${latest?.numeric_value ?? '--'}`, unit: 'h' },
                { label: 'Média Recente', value: `${avgSleep}`, unit: 'h' },
              ]
            : undefined,
          status: latest && (latest.numeric_value || 0) >= 7.0 ? 'optimal' : 'borderline',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'bars' : 'none',
        unit: 'horas',
        guideline: {
          authority:
            'National Sleep Foundation (NSF), American Academy of Sleep Medicine (AASM) e OMS',
          badgeText: 'Diretriz de Sono NSF / OMS',
          optimalRange: '7 a 9 horas de sono contínuo de qualidade por noite para adultos.',
          borderlineRange: '6 a 6.9 horas por noite (privação leve cumulativa).',
          alertRange:
            '< 6 horas crônicas ou > 9.5 horas de sono fragmentado (risco cardiovascular elevado).',
          recommendations: [
            'Segundo a American Heart Association (Life’s Essential 8), o sono de 7 a 9 horas é um dos pilares determinantes para a saúde cardiovascular e controle pressórico.',
            'A OMS destaca que durante o sono profundo ocorre a depuração glinfática de proteínas beta-amiloides cerebrais e a restauração imune.',
            'Manter horários consistentes de dormir e acordar, evitando telas luminosas 60 minutos antes de se deitar para preservar a produção fisiológica de melatonina.',
          ],
          evidenceNote:
            'Dormir cronicamente menos de 6 horas aumenta em 48% a probabilidade de desenvolver cardiopatia coronariana.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 6. VFC / HRV (Monitoramento)
    // -------------------------------------------------------------------------
    case 'mon-hrv': {
      const hrvMetrics = metrics
        .filter((m) => m.category === 'hrv')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of hrvMetrics) {
        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${m.numeric_value} ms (RMSSD)`,
          numericValue: m.numeric_value,
          badgeStatus: 'optimal',
          badgeLabel: 'Tônus Vagal',
          context: m.notes || 'Smartwatch / Monitor Cardíaco',
        })
      }

      const rev = [...hrvMetrics].reverse()
      for (const m of rev) {
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          value: m.numeric_value,
        })
      }

      const latest = hrvMetrics[0]

      return {
        latest: {
          value: latest ? `${latest.numeric_value} ms` : 'Sem registros',
          date: latest?.date_time.slice(0, 10),
          formattedDate: formatDate(latest?.date_time),
          status: 'optimal',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'line' : 'none',
        unit: 'ms',
        guideline: {
          authority:
            'Task Force of The European Society of Cardiology e North American Society of Pacing and Electrophysiology',
          badgeText: 'Padrão Eletrofisiológico ESC / NASPE',
          optimalRange:
            'Acompanhamento da linha de base individual (RMSSD habitual entre 35 e 80+ ms em adultos saudáveis).',
          borderlineRange: 'Queda transitória de 15-20% em relação à sua média móvel de 7 dias.',
          alertRange:
            'Supressão acentuada sustentada da VFC indicando estresse simpático crônico ou sobretreinamento.',
          recommendations: [
            'A VFC mede a resiliência do sistema nervoso autônomo e o tônus do nervo vago (resposta parassimpática anti-inflamatória).',
            'O valor da VFC deve ser comparado consigo mesmo ao longo das semanas, observando se sobe após descanso e treinos adequados.',
            'Práticas de respiração com coerência cardíaca (6 ciclos por minuto) elevam de forma imediata a variabilidade cardíaca.',
          ],
          evidenceNote:
            'A VFC elevada correlaciona-se com menor morbidade cardiovascular e maior flexibilidade autonômica.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 7. ATIVIDADE FÍSICA (Ação)
    // -------------------------------------------------------------------------
    case 'act-exercise': {
      const actMetrics = metrics
        .filter((m) => m.category === 'atividade')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of actMetrics) {
        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${m.numeric_value || 0} min`,
          numericValue: m.numeric_value,
          badgeStatus: 'optimal',
          badgeLabel: 'Treino',
          context: m.notes || m.text_value || 'Exercício Registrado',
        })
      }

      const rev = [...actMetrics].reverse()
      for (const m of rev) {
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          value: m.numeric_value,
        })
      }

      const totalMins = actMetrics.reduce((s, m) => s + (m.numeric_value || 0), 0)
      const weeklyEstimate = Math.round(totalMins / 4) || lifestyle?.exercise_minutes_per_week || 0

      return {
        latest: {
          value: actMetrics[0]
            ? `${actMetrics[0].numeric_value} min de treino`
            : `${weeklyEstimate} min/sem (declarado)`,
          date: actMetrics[0]?.date_time.slice(0, 10),
          formattedDate: formatDate(actMetrics[0]?.date_time),
          subValues: [
            { label: 'Minutos no Mês', value: `${totalMins}`, unit: 'min' },
            { label: 'Média Semanal', value: `${weeklyEstimate}`, unit: 'min/sem' },
            { label: 'Sessões Registradas', value: `${actMetrics.length}`, unit: 'treinos' },
          ],
          status: weeklyEstimate >= 150 ? 'optimal' : 'borderline',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'bars' : 'none',
        unit: 'minutos',
        guideline: {
          authority:
            'Organização Mundial da Saúde (OMS) e American College of Sports Medicine (ACSM)',
          badgeText: 'Diretriz de Atividade Física OMS / ACSM',
          optimalRange:
            'Pelo menos 150 a 300 minutos de atividade aeróbica moderada (ou 75-150 min intensa) + 2 a 3 sessões de força semanais.',
          borderlineRange: '60 a 149 minutos por semana.',
          alertRange: 'Sedentarismo (< 60 minutos por semana).',
          recommendations: [
            'Segundo a OMS, cumprir as metas mínimas de exercícios físicos reduz o risco de mortalidade prematura em até 30%.',
            'O treinamento de força preserva a densidade óssea, combate a resistência à insulina periférica e previne declínios metabólicos.',
            'A American Heart Association ressalta que fracionar o exercício ao longo dos dias melhora os perfis de pressão e colesterol.',
          ],
          evidenceNote:
            'A aptidão cardiorrespiratória (VO2 máx) é o biomarcador de maior correlação com extensão da longevidade com autonomia.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 8. ÁLCOOL & HIDRATAÇÃO & ESTILO DE VIDA (Ação)
    // -------------------------------------------------------------------------
    case 'act-alcohol': {
      const alcMetrics = metrics
        .filter((m) => m.category === 'alcool')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of alcMetrics) {
        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${m.numeric_value || 0} dose(s)`,
          numericValue: m.numeric_value,
          badgeStatus: (m.numeric_value || 0) <= 2 ? 'optimal' : 'alert',
          badgeLabel: (m.numeric_value || 0) <= 2 ? 'Moderado' : 'Elevado',
          context: m.notes || 'Consumo Registrado',
        })
      }

      const rev = [...alcMetrics].reverse()
      for (const m of rev) {
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          value: m.numeric_value,
        })
      }

      const totalDoses = alcMetrics.reduce((s, m) => s + (m.numeric_value || 0), 0)
      const weeklyDoses = Math.round(totalDoses / 4) || lifestyle?.alcohol_drinks_per_week || 0

      return {
        latest: {
          value: `${weeklyDoses} doses por semana`,
          date: alcMetrics[0]?.date_time.slice(0, 10),
          formattedDate: formatDate(alcMetrics[0]?.date_time),
          status: weeklyDoses <= 4 ? 'optimal' : 'alert',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'bars' : 'none',
        unit: 'doses',
        guideline: {
          authority: 'Organização Mundial da Saúde (OMS) e Dietary Guidelines for Americans',
          badgeText: 'Padrão Toxicológico OMS',
          optimalRange: '0 a 2 doses por semana (ou abstinência completa).',
          borderlineRange: '3 a 4 doses semanais com dias de descanso hepático.',
          alertRange:
            '> 4 doses por semana ou episódios de consumo excessivo concentrado (> 3 doses no mesmo dia).',
          recommendations: [
            'A OMS enfatiza que não existe dose totalmente segura de álcool para a saúde biológica; o acetaldeído gerado é citotóxico.',
            'O álcool fragmenta o sono REM, inibe a síntese de proteínas musculares e eleva transitoriamente a pressão arterial.',
            'Intercalar cada dose com copos generosos de água mineral e evitar consumo próximo ao horário de deitar.',
          ],
          evidenceNote:
            '1 dose padrão equivale a 14g de etanol puro (uma taça de vinho de 150ml ou 350ml de cerveja).',
        },
      }
    }

    case 'act-water': {
      const waterMetrics = metrics
        .filter((m) => m.category === 'agua')
        .sort((a, b) => b.date_time.localeCompare(a.date_time))
      const history: PillarHistoryPoint[] = []
      const chartPoints: PillarChartPoint[] = []

      for (const m of waterMetrics) {
        history.push({
          date: m.date_time.slice(0, 10),
          formattedDate: formatDate(m.date_time),
          displayValue: `${m.numeric_value || 0} ${m.unit || 'ml'}`,
          numericValue: m.numeric_value,
          badgeStatus: 'optimal',
          badgeLabel: 'Água',
          context: m.notes || 'Hidratação',
        })
      }

      const rev = [...waterMetrics].reverse()
      for (const m of rev) {
        chartPoints.push({
          label: formatDate(m.date_time).slice(0, 5),
          date: m.date_time.slice(0, 10),
          value: m.numeric_value,
        })
      }

      const latest = waterMetrics[0]

      return {
        latest: {
          value: latest
            ? `${latest.numeric_value} ${latest.unit || 'ml'}`
            : `${waterMetrics.length} registros no mês`,
          date: latest?.date_time.slice(0, 10),
          formattedDate: formatDate(latest?.date_time),
          status: 'optimal',
        },
        history,
        chartData: chartPoints,
        chartType: chartPoints.length >= 2 ? 'bars' : 'none',
        unit: 'ml',
        guideline: {
          authority: 'National Academies of Sciences, Engineering, and Medicine & OMS',
          badgeText: 'Padrão de Hidratação OMS',
          optimalRange:
            'Aproximadamente 35 a 45 mL de água por kg de peso corporal ao dia (ex.: ~2.5L a 3.2L para 75 kg).',
          borderlineRange: 'Ingestão irregular gerando episódios de urina concentrada.',
          alertRange: 'Subidratação crônica com ingestão inferior a 1.5 L/dia em adultos ativos.',
          recommendations: [
            'O National Institutes of Health (NIH) constatou que níveis ideais de hidratação reduzem em 39% o risco de doenças crônicas e envelhecimento precoce.',
            'A água mantém a viscosidade plasmática saudável, otimizando o fluxo microcirculatório e a filtração glomerular renal.',
            'Distribuir o consumo uniformemente ao longo do dia, reduzindo o volume nas duas horas antecedentes ao sono.',
          ],
          evidenceNote:
            'A desidratação subclínica eleva o hematócrito e impõe maior sobrecarga de trabalho mecânico ao miocárdio.',
        },
      }
    }

    // -------------------------------------------------------------------------
    // 9. CARDIOLÓGICO, METABÓLICO, VACINAS & OUTROS
    // -------------------------------------------------------------------------
    case 'prev-cardio': {
      const cardioExams = exams.filter(
        (e) =>
          e.type.toLowerCase().includes('eletro') ||
          e.title.toLowerCase().includes('eletro') ||
          e.title.toLowerCase().includes('ecg') ||
          e.title.toLowerCase().includes('cardio') ||
          e.title.toLowerCase().includes('eco') ||
          e.title.toLowerCase().includes('ergométrico'),
      )

      const history: PillarHistoryPoint[] = cardioExams.map((e) => ({
        date: e.date,
        formattedDate: formatDate(e.date),
        displayValue: e.title,
        context: e.summary_results || e.laboratory || 'Laudo Cardiológico',
        badgeStatus: 'optimal',
        badgeLabel: 'Laudo Válido',
      }))

      const latest = cardioExams[0]

      return {
        latest: {
          value: latest ? latest.title : 'Nenhum eletrocardiograma anexado',
          date: latest?.date,
          formattedDate: formatDate(latest?.date),
          subValues: latest?.summary_results
            ? [{ label: 'Conclusão', value: latest.summary_results }]
            : undefined,
          status: latest ? 'optimal' : 'alert',
        },
        history,
        chartData: [],
        chartType: 'none',
        guideline: {
          authority: 'American Heart Association (AHA) e Sociedade Brasileira de Cardiologia (SBC)',
          badgeText: 'Diretriz Cardiológica AHA / SBC',
          optimalRange:
            'Ritmo sinusal regular, frequência cardíaca 50-90 bpm em repouso, condução atrioventricular e repolarização ventricular normais.',
          borderlineRange:
            'Bradicardia sinusal assintomática de condicionamento físico ou extrassístoles isoladas raras.',
          alertRange:
            'Fibrilação atrial silenciosa, sobrecarga ventricular esquerda importante ou alterações isquêmicas de ST.',
          recommendations: [
            'A American Heart Association recomenda eletrocardiograma de repouso periódico para triagem preventiva e antes do início de protocolos desportivos de alta intensidade.',
            'A detecção precoce de arritmias assintomáticas como a fibrilação atrial previne acidentes vasculares encefálicos (AVC embólico).',
            'Manter acompanhamento bienal em indivíduos assintomáticos sem histórico familiar e anual em portadores de fatores de risco.',
          ],
          evidenceNote:
            'O ECG convencional de 12 derivações avalia a morfologia elétrica sincronizada das cavidades miocárdicas.',
        },
      }
    }

    case 'prev-blood': {
      const bloodBio = biomarkers.filter((b) => {
        const n = b.name.toLowerCase()
        return (
          n.includes('pcr') ||
          n.includes('creatinina') ||
          n.includes('tsh') ||
          n.includes('ferritina') ||
          n.includes('tgo') ||
          n.includes('tgp') ||
          n.includes('vitamina d') ||
          n.includes('hemograma')
        )
      })

      const history: PillarHistoryPoint[] = bloodBio.map((b) => ({
        date: (b.date || b.created || '').slice(0, 10),
        formattedDate: formatDate(b.date || b.created),
        displayValue: `${b.name}: ${b.value} ${b.unit || ''}`,
        context: b.category || 'Biomarcador Sanguíneo',
        badgeStatus: 'optimal',
        badgeLabel: 'Registrado',
      }))

      const bloodExams = exams.filter(
        (e) =>
          e.title.toLowerCase().includes('sangue') ||
          e.title.toLowerCase().includes('hemograma') ||
          e.title.toLowerCase().includes('metabólico') ||
          e.title.toLowerCase().includes('painel'),
      )
      for (const ex of bloodExams) {
        history.push({
          date: ex.date,
          formattedDate: formatDate(ex.date),
          displayValue: ex.title,
          context: ex.summary_results || 'Exame Laboratorial',
          badgeStatus: 'neutral',
          badgeLabel: 'Laudo',
        })
      }
      history.sort((a, b) => b.date.localeCompare(a.date))

      return {
        latest: {
          value: history[0]?.displayValue || `${biomarkers.length} biomarcadores cadastrados`,
          date: history[0]?.date,
          formattedDate: history[0]?.formattedDate,
          status: biomarkers.length >= 3 ? 'optimal' : 'alert',
        },
        history,
        chartData: [],
        chartType: 'none',
        guideline: {
          authority:
            'Organização Mundial da Saúde (OMS) e Sociedade Brasileira de Patologia Clínica (SBPC)',
          badgeText: 'Painel Clínico Geral',
          optimalRange:
            'PCR ultrassensível < 1.0 mg/L (inflamação baixa); Creatinina < 1.1 mg/dL; TSH 1.0 a 2.5 mUI/L; Vitamina D 30 a 50 ng/mL.',
          borderlineRange: 'PCR-us 1.0 a 3.0 mg/L (risco cardiovascular intermediário).',
          alertRange:
            'PCR-us > 3.0 mg/L persistente ou transaminases hepáticas elevadas indicando inflamação ou esteatose.',
          recommendations: [
            'Avaliação anual abrangente da hematopoiese, função renal, metabolismo hepático e status inflamatório sistêmico.',
            'A inflamação crônica subclínica acelera o envelhecimento biológico tecidual e fragiliza a integridade das artérias.',
            'Repetir exames em caso de valores limítrofes para confirmação prévia a intervenções terapêuticas.',
          ],
          evidenceNote:
            'Biomarcadores laboratoriais de rotina monitoram a integridade e homeostase de órgãos-alvo essenciais.',
        },
      }
    }

    case 'prev-vaccine': {
      const history: PillarHistoryPoint[] = vaccinations.map((v) => ({
        date: v.date,
        formattedDate: formatDate(v.date),
        displayValue: v.vaccine,
        context: v.dose ? `Dose: ${v.dose}` : v.batch_or_clinic || 'Carteira Vacinal',
        badgeStatus: 'optimal',
        badgeLabel: 'Imunizado',
      }))
      history.sort((a, b) => b.date.localeCompare(a.date))

      const latest = history[0]

      return {
        latest: {
          value: latest
            ? `${latest.displayValue} (${latest.formattedDate})`
            : 'Nenhuma vacina cadastrada',
          date: latest?.date,
          formattedDate: latest?.formattedDate,
          status: vaccinations.length > 0 ? 'optimal' : 'alert',
        },
        history,
        chartData: [],
        chartType: 'none',
        guideline: {
          authority:
            'Organização Mundial da Saúde (OMS) e Sociedade Brasileira de Imunizações (SBIm)',
          badgeText: 'Calendário de Imunização OMS / SBIm',
          optimalRange:
            'Esquema vacinal completo do adulto e idoso (Influenza anual, reforço de tétano a cada 10 anos, Hepatite B e Herpes Zóster).',
          borderlineRange: 'Vacinas pendentes de reforço decenal.',
          alertRange: 'Ausência total de imunizações preventivas documentadas.',
          recommendations: [
            'A vacinação protege contra patologias preveníveis que descompensam doenças crônicas cardiovasculares e pulmonares.',
            'A SBIm recomenda a vacina anual contra influenza para prevenir infartos e eventos isquêmicos desencadeados por infecções respiratórias.',
            'Manter sua caderneta atualizada e digitalizada no perfil do app para consultas médicas rápidas.',
          ],
          evidenceNote:
            'A imunossenescência na maturidade exige reforços vacinais regulares para manter a imunidade humoral competente.',
        },
      }
    }

    case 'act-lifestyle':
    default: {
      const habits = metrics.filter((m) => m.category === 'sauna' || m.category === 'meditacao')
      const history: PillarHistoryPoint[] = habits.map((h) => ({
        date: h.date_time.slice(0, 10),
        formattedDate: formatDate(h.date_time),
        displayValue: `${h.category === 'sauna' ? 'Sauna' : 'Meditação'}: ${h.numeric_value || 0} min`,
        context: h.notes || 'Hábito Regenerativo',
        badgeStatus: 'optimal',
        badgeLabel: 'Prática Ativa',
      }))

      if (lifestyle?.diet_pattern) {
        history.unshift({
          date: 'atual',
          formattedDate: 'Perfil Ativo',
          displayValue: `Dieta: ${lifestyle.diet_pattern}`,
          context: lifestyle.smoking_status || 'Não-fumante',
          badgeStatus: 'optimal',
          badgeLabel: 'Padrão Nutricional',
        })
      }

      return {
        latest: {
          value: lifestyle?.diet_pattern
            ? `Dieta ${lifestyle.diet_pattern} · ${lifestyle.smoking_status || 'Não-fumante'}`
            : 'Estilo de vida ativo',
          formattedDate: 'Em acompanhamento',
          status: 'optimal',
        },
        history,
        chartData: [],
        chartType: 'none',
        guideline: {
          authority: 'Organização Mundial da Saúde (OMS) e American Heart Association (AHA)',
          badgeText: 'Padrão de Longevidade OMS / AHA',
          optimalRange:
            'Não-fumante + Padrão alimentar rico em fitoquímicos, fibras e gorduras boas (Mediterrânea ou Plant-Based) + Práticas regenerativas.',
          borderlineRange: 'Sedentarismo associado a estresse crônico desregulado.',
          alertRange: 'Tabagismo ativo ou consumo predominante de alimentos ultraprocessados.',
          recommendations: [
            'Segundo a AHA, a dieta do tipo Mediterrânea rica em azeite extravirgem, peixes e oleaginosas reduz em cerca de 30% eventos cardiovasculares.',
            'A OMS lista a cessação total do tabaco como a medida isolada de maior impacto na extensão da expectativa de vida saudável.',
            'Práticas como banhos termais ou sauna promovem vasodilatação periférica por aumento de proteínas de choque térmico (Hsp70).',
          ],
          evidenceNote:
            'A sinergia entre alimentação anti-inflamatória, não-fumo e descanso constitui a base da medicina do estilo de vida.',
        },
      }
    }
  }
}
