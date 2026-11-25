// Garante as regras de acesso da coleção `exams` na visão do profissional.
// A coleção foi apagada e recriada manualmente no painel (migrations 0031/0032
// e ajustes posteriores); em algum ponto as regras de list/view/update/delete
// terminaram sem a permissão do papel 'profissional', o que fazia a query do
// painel profissional (filter=user='<paciente>') devolver 200 com lista VAZIA —
// o Paciente tem exames no banco, mas a Clínica não vê nada.
// Idempotente: só atualiza quando alguma regra estiver diferente do esperado.
// JSVM: Collection não expõe get/set de campo por nome aqui — atribuir as
// propriedades listRule/viewRule/etc. diretamente (padrão da migration 0001).
migrate(
  (app) => {
    const WANTED =
      "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'profissional')"
    const col = app.findCollectionByNameOrId('exams')
    let changed = false
    if (col.listRule !== WANTED) {
      col.listRule = WANTED
      changed = true
    }
    if (col.viewRule !== WANTED) {
      col.viewRule = WANTED
      changed = true
    }
    if (col.updateRule !== WANTED) {
      col.updateRule = WANTED
      changed = true
    }
    if (col.deleteRule !== WANTED) {
      col.deleteRule = WANTED
      changed = true
    }
    if (changed) {
      app.save(col)
      console.log('0055_exams_professional_rules: regras da coleção exams atualizadas')
    } else {
      console.log('0055_exams_professional_rules: regras já corretas — nada a fazer')
    }
  },
  (app) => {
    // down: não restaura as regras antigas (estavam erradas); no-op seguro.
  },
)
