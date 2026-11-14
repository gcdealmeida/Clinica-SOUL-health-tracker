//
// ai_features_import.js — Importação inteligente de arquivos com IA (/sources).
//
// Reusa a fila persistente do pipeline assíncrono existente
// (ai_features_exam_async.js: exams.analysis_pages + analysis_progress json,
// cron examAnalysisRunner, saveProgressSafely) em vez de criar uma segunda fila.
// $app.store() NÃO persiste entre pools de VM — a fila viva é sempre o banco.
//
// Rotas:
// 1. POST /backend/v1/ai/import-assist  — dedupe por hash de conteúdo; cria
//    exams + exam_imports; retomada sem duplicar quando a tentativa anterior
//    falhou. As páginas/textos chegam DEPOIS, em pedaços, pelo endpoint
//    analyze-exam-async (que agora aceita origin='import' e texts).
// 2. POST /backend/v1/ai/import-kickoff — marca 'extracting' e dispara o cron
//    examAnalysisRunner imediatamente.
// 3. POST /backend/v1/ai/import-review  — gravação definitiva dos itens
//    aprovados na revisão em profile_biomarkers, com rastreabilidade completa
//    (source_exam, source_page, evidence, processing_date,
//    validation_status). Conflito de valor NÃO sobrescreve — devolve ao app.
//    "Salvo" só depois que o app confirmar a leitura dos registros gravados.
//
// O runner (ai_features_exam_async.js) faz a extração em lotes e, quando
// progress.origin === 'import', NÃO grava em profile_biomarkers: prepara o
// staging de revisão (exam.analysis_status='awaiting_review',
// supplementary_info, coverage, exam_imports.status='awaiting_review').
//
// JSVM: helpers INLINE nos callbacks; campos TEXT de exams recebem SEMPRE
// JSON.stringify; getString de date já vem com Z.
//

// ---------------------------------------------------------------
// import-assist: dedupe por hash + criação do exame + registro do import.
// ---------------------------------------------------------------
routerAdd(
  'POST /backend/v1/ai/import-assist',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Autenticação obrigatória.' })

    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {}

    const hash = String(body.content_hash || '').trim()
    const filename = String(body.filename || '').trim()
    const filetype = String(body.file_type || '').trim()
    const filesize = Number(body.file_size || 0)

    if (!hash || !filename) {
      return e.json(400, { error: 'content_hash e filename são obrigatórios.' })
    }

    // ---------- dedupe: mesmo conteúdo já importado por este usuário ----------
    let previous = null
    try {
      const recs = $app.findRecordsByFilter(
        'exam_imports',
        'user = {:u} && content_hash = {:h}',
        '-created',
        1,
        0,
        { u: auth.id, h: hash },
      )
      if (recs.length > 0) previous = recs[0]
    } catch (_) {}

    if (previous) {
      let prevExamId = ''
      try {
        const prevExam = previous.get('exam')
        if (prevExam && prevExam.id) prevExamId = prevExam.id
      } catch (_) {}
      const prevStatus = String(previous.get('status') || '')

      // Falha anterior: retomada SEM duplicar — reusa o mesmo exame/import.
      if (prevStatus === 'error' && prevExamId) {
        try {
          const exam = $app.findRecordById('exams', prevExamId)
          exam.set('analysis_status', 'running')
          exam.set('analysis_error', '')
          exam.set('analysis_stats', '')
          exam.set('analysis_pages', '')
          exam.set('analysis_progress', '')
          exam.set('analysis_started_at', new Date().toISOString())
          $app.save(exam)
          previous.set('status', 'received')
          previous.set('error_message', '')
          previous.set('pages_total', 0)
          previous.set('pages_done', 0)
          previous.set('items_extracted', 0)
          previous.set('coverage', {})
          $app.save(previous)
          console.log('import-assist: retomada do exame ' + prevExamId + ' após erro anterior')
          return e.json(200, {
            duplicate: false,
            retry: true,
            exam_id: prevExamId,
            import_id: previous.get('id'),
          })
        } catch (err) {
          return e.json(500, { error: 'Falha ao preparar a retomada: ' + err.message })
        }
      }

      // Importação já concluída/em curso: NADA é gravado de novo — o app mostra
      // o conflito e oferece revisar o original.
      return e.json(200, {
        duplicate: true,
        exam_id: prevExamId,
        import_id: previous.get('id'),
        filename: previous.get('filename'),
        created: previous.get('created'),
        status: prevStatus,
        message:
          'Este arquivo já foi importado anteriormente (mesmo conteúdo). ' +
          'Nada foi gravado de novo — revise o exame original ou envie uma versão atualizada do arquivo.',
      })
    }

    // ---------- criar o exam ----------
    const today = new Date().toISOString().slice(0, 10)
    const title = String(body.title || filename.replace(/\.[^.]+$/, '')).slice(0, 200)
    const rec = new Record($app.findCollectionByNameOrId('exams'))
    rec.set('user', auth.id)
    rec.set('title', title)
    rec.set('type', String(body.exam_type || 'importacao'))
    rec.set('date', String(body.exam_date || today))
    rec.set('laboratory', String(body.laboratory || ''))
    rec.set('status', 'pendente')
    rec.set('analysis_status', 'received')
    rec.set('analysis_started_at', new Date().toISOString())
    rec.set('content_hash', hash)
    rec.set('file_type', filetype)
    rec.set('file_size', isNaN(filesize) ? 0 : Math.floor(filesize))
    rec.set('supplementary_info', [])
    $app.save(rec)

    // ---------- registrar o import ----------
    const imp = new Record($app.findCollectionByNameOrId('exam_imports'))
    imp.set('user', auth.id)
    imp.set('exam', rec.get('id'))
    imp.set('filename', filename)
    imp.set('file_type', filetype)
    imp.set('file_size', isNaN(filesize) ? 0 : Math.floor(filesize))
    imp.set('content_hash', hash)
    imp.set('status', 'received')
    imp.set('review_state', 'not_started')
    imp.set('coverage', {})
    $app.save(imp)

    console.log('import-assist: exame ' + rec.get('id') + ' criado (' + filetype + ')')
    return e.json(200, {
      duplicate: false,
      retry: false,
      exam_id: rec.get('id'),
      import_id: imp.get('id'),
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------
// import-kickoff: marca 'extracting' e dispara o runner imediatamente.
// ---------------------------------------------------------------
routerAdd(
  'POST /backend/v1/ai/import-kickoff',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Autenticação obrigatória.' })
    const body = e.requestInfo().body || {}
    const examId = String(body.exam_id || '')
    const importId = String(body.import_id || '')
    if (!examId) return e.json(400, { error: 'exam_id é obrigatório.' })

    const rec = $app.findRecordById('exams', examId)
    if (rec.getString('user') !== auth.id && auth.getString('role') !== 'profissional') {
      return e.json(403, { error: 'Sem permissão.' })
    }
    if (rec.getString('analysis_status') !== 'running') {
      rec.set('analysis_status', 'running')
      rec.set('analysis_started_at', new Date().toISOString())
      $app.save(rec)
    }
    if (importId) {
      try {
        const imp = $app.findRecordById('exam_imports', importId)
        imp.set('status', 'extracting')
        $app.save(imp)
      } catch (_) {}
    }

    // Dispara o cron existente imediatamente; se o trigger manual não existir
    // nesta versão do JSVM, o tick de 1 min do examAnalysisRunner pega a fila.
    let kicked = false
    try {
      $app.cron().run('examAnalysisRunner')
      kicked = true
    } catch (err) {
      console.log(
        'import-kickoff: cron não disparado manualmente (' +
          err.message +
          '); aguardando tick de 1 min',
      )
    }

    return e.json(202, { queued: true, exam_id: examId, kicked: kicked })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------
// import-review: gravação definitiva dos itens revisados.
// ---------------------------------------------------------------
routerAdd(
  'POST /backend/v1/ai/import-review',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Autenticação obrigatória.' })
    const body = e.requestInfo().body || {}
    const examId = String(body.exam_id || '')
    const importId = String(body.import_id || '')
    const decisions = Array.isArray(body.decisions) ? body.decisions : []
    if (!examId || decisions.length === 0) {
      return e.json(400, { error: 'exam_id e decisions são obrigatórios.' })
    }

    const examRec = $app.findRecordById('exams', examId)
    if (examRec.getString('user') !== auth.id && auth.getString('role') !== 'profissional') {
      return e.json(403, { error: 'Sem permissão.' })
    }

    let bioCol = null
    try {
      bioCol = $app.findCollectionByNameOrId('profile_biomarkers')
    } catch (err) {
      return e.json(500, { error: 'Coleção profile_biomarkers indisponível: ' + err.message })
    }

    const nowIso = new Date().toISOString()
    let created = 0
    let updated = 0
    let rejected = 0
    const conflicts = []

    for (let i = 0; i < decisions.length; i++) {
      const d = decisions[i]
      if (!d || typeof d !== 'object') continue
      const action = String(d.action || '')
      if (action === 'reject') {
        rejected++
        continue
      }
      const name = String(d.name || '').trim()
      if (!name) continue
      const value = String(d.value != null ? d.value : '').trim()
      if (!value) continue

      const trace = {
        source_exam: examId,
        source_page: String(d.source_page || ''),
        evidence: String(d.evidence || '').slice(0, 1900),
        processing_date: nowIso,
        validation_status: d.validation_status === 'uncertain' ? 'uncertain' : 'approved',
        uncertainty_reason: String(d.uncertainty_reason || '').slice(0, 490),
        raw_content: String(d.raw_content || value).slice(0, 1900),
      }

      // Decisão explícita de sobrescrever um registro existente (o usuário viu o
      // conflito e escolheu substituir).
      if (d.existing_id) {
        try {
          const target = $app.findRecordById('profile_biomarkers', String(d.existing_id))
          target.set('value', value)
          if (d.unit) target.set('unit', String(d.unit))
          if (d.reference_range) target.set('reference_range', String(d.reference_range))
          if (d.date) target.set('date', String(d.date))
          target.set('source_exam', trace.source_exam)
          target.set('source_page', trace.source_page)
          target.set('evidence', trace.evidence)
          target.set('processing_date', trace.processing_date)
          target.set('validation_status', trace.validation_status)
          if (trace.uncertainty_reason) target.set('uncertainty_reason', trace.uncertainty_reason)
          $app.save(target)
          updated++
        } catch (err) {
          conflicts.push({
            name: name,
            existing_value: '',
            new_value: value,
            existing_id: String(d.existing_id),
            date: String(d.date || ''),
            error: 'Registro existente não encontrado: ' + err.message,
          })
        }
        continue
      }

      // Conflito: mesmo usuário + mesmo nome + mesma data com valor DIFERENTE —
      // NÃO sobrescreve: devolve ao app para o usuário decidir.
      let existing = []
      try {
        existing = $app.findRecordsByFilter(
          'profile_biomarkers',
          'user = {:u} && name = {:n} && date = {:dt}',
          '-created',
          1,
          0,
          { u: auth.id, n: name, dt: String(d.date || '') },
        )
      } catch (_) {}

      if (existing.length > 0) {
        const prev = existing[0]
        const prevVal = String(prev.getString('value') || '')
        if (prevVal !== value) {
          conflicts.push({
            name: name,
            existing_value: prevVal,
            new_value: value,
            existing_id: prev.get('id'),
            date: String(d.date || ''),
          })
          continue
        }
        // Mesmo valor: idempotente — só atualiza a rastreabilidade.
        prev.set('source_exam', trace.source_exam)
        prev.set('source_page', trace.source_page)
        prev.set('evidence', trace.evidence)
        prev.set('processing_date', trace.processing_date)
        prev.set('validation_status', trace.validation_status)
        if (trace.uncertainty_reason) prev.set('uncertainty_reason', trace.uncertainty_reason)
        $app.save(prev)
        updated++
        continue
      }

      const recNew = new Record(bioCol)
      recNew.set('user', auth.id)
      recNew.set('name', name)
      recNew.set('value', value)
      recNew.set('unit', String(d.unit || ''))
      recNew.set('reference_range', String(d.reference_range || ''))
      recNew.set('date', String(d.date || ''))
      recNew.set('status', d.status === 'alterado' ? 'alterado' : 'otimo')
      recNew.set('notes', String(d.notes || 'Extraído por IA e aprovado na revisão'))
      recNew.set('source_exam', trace.source_exam)
      recNew.set('source_page', trace.source_page)
      recNew.set('evidence', trace.evidence)
      recNew.set('processing_date', trace.processing_date)
      recNew.set('validation_status', trace.validation_status)
      recNew.set('uncertainty_reason', trace.uncertainty_reason)
      recNew.set('raw_content', trace.raw_content)
      $app.save(recNew)
      created++
    }

    if (importId) {
      try {
        const imp = $app.findRecordById('exam_imports', importId)
        imp.set('items_approved', created + updated)
        imp.set('items_rejected', rejected)
        imp.set('duplicates_found', conflicts.length)
        imp.set('review_state', 'approved')
        imp.set('status', 'saved')
        $app.save(imp)
      } catch (err) {
        console.log('import-review: exam_imports não atualizado (' + importId + '): ' + err.message)
      }
    }
    try {
      examRec.set('analysis_status', 'done')
      $app.save(examRec)
    } catch (_) {}

    return e.json(200, {
      created: created,
      updated: updated,
      rejected: rejected,
      conflicts: conflicts,
    })
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------
// import-export: devolve os dados estruturados de um arquivo
// importado (biomarcadores gravados + informações complementares)
// como JSON (?format=json, padrão) ou CSV (?format=csv).
// ---------------------------------------------------------------
routerAdd(
  'GET /backend/v1/ai/import-export',
  (e) => {
    const auth = e.auth
    if (!auth) return e.json(401, { error: 'Autenticação obrigatória.' })

    const q = e.requestInfo().query || {}
    const importId = String(q.file || q.import_id || '').trim()
    const format = String(q.format || 'json').toLowerCase()
    if (!importId) return e.json(400, { error: 'file (id do import) é obrigatório.' })
    if (format !== 'json' && format !== 'csv') {
      return e.json(400, { error: 'Formato não suportado: use format=json ou format=csv.' })
    }

    let imp = null
    try {
      imp = $app.findRecordById('exam_imports', importId)
    } catch (_) {
      return e.json(404, { error: 'Importação não encontrada.' })
    }
    if (imp.getString('user') !== auth.id && auth.getString('role') !== 'profissional') {
      return e.json(403, { error: 'Sem permissão.' })
    }

    let examId = ''
    try {
      const examRef = imp.get('exam')
      if (examRef && examRef.id) examId = examRef.id
    } catch (_) {}
    const filename = String(imp.get('filename') || 'importacao')
    const safeBase =
      filename.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_\-]/g, '_') || 'importacao'

    // Biomarcadores gravados a partir deste arquivo.
    let bios = []
    try {
      bios = $app.findRecordsByFilter(
        'profile_biomarkers',
        'user = {:u} && source_exam = {:e} && validation_status != "rejected"',
        'name,-created',
        500,
        0,
        { u: auth.id, e: examId },
      )
    } catch (_) {}

    // Informações complementares (campo JSON/texto do exame).
    let supplementary = []
    try {
      const exam = $app.findRecordById('exams', examId)
      const raw = exam.getString('supplementary_info') || ''
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) supplementary = parsed
      }
    } catch (_) {}

    const rows = []
    for (let i = 0; i < bios.length; i++) {
      const r = bios[i]
      rows.push({
        name: String(r.getString('name') || ''),
        value: String(r.getString('value') || ''),
        unit: String(r.getString('unit') || ''),
        reference_range: String(r.getString('reference_range') || ''),
        date: String(r.getString('date') || ''),
        status: String(r.getString('status') || ''),
        validation_status: String(r.getString('validation_status') || ''),
        source_page: String(r.getString('source_page') || ''),
        evidence: String(r.getString('evidence') || ''),
        uncertainty_reason: String(r.getString('uncertainty_reason') || ''),
      })
    }

    if (format === 'csv') {
      const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
      const header =
        'name,value,unit,reference_range,date,status,validation_status,source_page,evidence,uncertainty_reason'
      const lines = [header]
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        lines.push(
          esc(r.name) +
            ',' +
            esc(r.value) +
            ',' +
            esc(r.unit) +
            ',' +
            esc(r.reference_range) +
            ',' +
            esc(r.date) +
            ',' +
            esc(r.status) +
            ',' +
            esc(r.validation_status) +
            ',' +
            esc(r.source_page) +
            ',' +
            esc(r.evidence) +
            ',' +
            esc(r.uncertainty_reason),
        )
      }
      if (supplementary.length > 0) {
        lines.push('')
        lines.push('section,page,content')
        for (let i = 0; i < supplementary.length; i++) {
          const s = supplementary[i] || {}
          lines.push(
            esc('informacao_complementar') + ',' + esc(s.page || '') + ',' + esc(s.text || ''),
          )
        }
      }
      e.response()
        .header()
        .set('Content-Disposition', 'attachment; filename="' + safeBase + '_dados.csv"')
      return new ByteString(lines.join('\n'), 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + safeBase + '_dados.csv"',
      })
    }

    return e.json(200, {
      import_id: importId,
      filename: filename,
      exam_id: examId,
      exported_at: new Date().toISOString(),
      biomarkers: rows,
      supplementary_info: supplementary,
    })
  },
  $apis.requireAuth(),
)
