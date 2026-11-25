//
// 0054_test_accounts_acesso.js
//
// Contas de teste para o dono da clínica:
//  - guivemax@hotmail.com (já existe, role cliente): reseta a senha para "Acesso@1234"
//  - guivemax.clinica@hotmail.com (cria se não existir): role profissional,
//    nome "Clínica Soul", verified=true, mesma senha
//
// Idempotente: em banco vazio (replay em cópia do projeto) apenas cria a conta
// de clínica; o reset de senha do cliente só roda quando o usuário existe.
// A senha nunca é gravada em texto puro — setPassword() hashea via bcrypt.
//
migrate(
  (app) => {
    const TEST_PASSWORD = 'Acesso@1234'

    // --- 1. Reset de senha da conta CLIENTE existente (se existir) ---
    try {
      const cliente = app.findAuthRecordByEmail('users', 'guivemax@hotmail.com')
      cliente.setPassword(TEST_PASSWORD)
      // nada mais é alterado — nome, role, telefone, avatar ficam como estão
      app.save(cliente)
      console.log('0054: senha de guivemax@hotmail.com redefinida')
    } catch (_) {
      console.log('0054: guivemax@hotmail.com não existe nesta cópia — reset ignorado')
    }

    // --- 2. Conta de PROFISSIONAL (clínica) — cria apenas se não existir ---
    let clinica = null
    try {
      clinica = app.findAuthRecordByEmail('users', 'guivemax.clinica@hotmail.com')
    } catch (_) {
      clinica = null
    }

    if (clinica === null) {
      const users = app.findCollectionByNameOrId('users')
      const nova = new Record(users)
      nova.setEmail('guivemax.clinica@hotmail.com')
      nova.setPassword(TEST_PASSWORD)
      nova.setVerified(true)
      nova.set('name', 'Clínica Soul')
      nova.set('role', 'profissional')
      nova.set('phone', '')
      nova.set('emailVisibility', true)
      app.save(nova)
      console.log(
        '0054: usuário guivemax.clinica@hotmail.com criado (role=profissional, verified=true)',
      )
    } else {
      // conta já existe nesta cópia: garante apenas papel/verificação/nome
      clinica.set('role', 'profissional')
      clinica.setVerified(true)
      clinica.set('name', 'Clínica Soul')
      app.save(clinica)
      console.log(
        '0054: usuário guivemax.clinica@hotmail.com já existia — papel/verificação garantidos',
      )
    }
  },
  (app) => {
    // down: remove a conta de clínica criada (o reset de senha não é reversível)
    try {
      const clinica = app.findAuthRecordByEmail('users', 'guivemax.clinica@hotmail.com')
      app.delete(clinica)
    } catch (_) {
      // nada a reverter
    }
  },
)
