// Conteúdo de referência da integração com o app institucional da clínica.
// Exibido em Configurações → aba "Integração". NÃO contém o valor do secret:
// ele vive na env var INSTITUTIONAL_TRUST_SECRET da plataforma (Skip Cloud).

import pb from '@/lib/pocketbase/client'

// O cliente PocketBase já nasce apontando para o backend da plataforma:
// o mesmo origin resolve as rotas /backend/v1/... da integração.
export const BACKEND_URL = pb.baseUrl.replace(/\/$/, '')

export interface EndpointDoc {
  method: string
  path: string
  description: string
  bodyExample?: string
  responseExample: string
}

export const TRUST_ENDPOINTS: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/backend/v1/trust/token',
    description:
      'Troca de token (login único): valida a assinatura HMAC e devolve um token de autenticação PocketBase do usuário (cria o usuário se não existir, tipo cliente).',
    bodyExample: JSON.stringify(
      {
        email: 'paciente@exemplo.com',
        ts: '1739400000000',
        sig: 'HMAC-SHA256(email|ts) em hexadecimal',
      },
      null,
      2,
    ),
    responseExample: JSON.stringify(
      {
        token: 'TOKEN_POCKETBASE_DO_USUARIO',
        user: {
          id: 'r3c0rd1d',
          email: 'paciente@exemplo.com',
          name: 'paciente',
          role: 'cliente',
        },
      },
      null,
      2,
    ),
  },
  {
    method: 'GET',
    path: '/backend/v1/trust/patients/{email}/summary',
    description:
      'Leitura completa: devolve TODOS os dados do cliente (perfil, preferências, medições, biomarcadores, exames, refeições, dietas, diário emocional, cirurgias/alergias, medicamentos, lembretes…).',
    responseExample: JSON.stringify(
      {
        patient: { id: '…', email: 'paciente@exemplo.com', name: 'Maria', role: 'cliente' },
        collections: {
          user_preferences: ['…'],
          health_metrics: ['…'],
          profile_biomarkers: ['…'],
          exams: ['…'],
          meals: ['…'],
          emotional_logs: ['…'],
          medical_records: ['…'],
        },
        counts: { health_metrics: 42, meals: 120 },
        generated_at: '2026-11-23T15:00:00.000Z',
      },
      null,
      2,
    ),
  },
  {
    method: 'POST',
    path: '/backend/v1/trust/patients/{email}/records',
    description:
      'Escrita: cria um NOVO registro no cliente (nunca sobrescreve silenciosamente o que já existe — ou grava registro novo, ou só preenche campos vazios de um target_id). Toda gravação sai identificada como vinda do app institucional, com o nome do profissional se enviado.',
    bodyExample: JSON.stringify(
      {
        collection: 'health_metrics',
        professional_name: 'Dra. Ana Souza',
        data: {
          category: 'peso',
          numeric_value: 71.5,
          unit: 'kg',
          date_time: '2026-11-23 10:30',
          notes: 'Peso aferido na consulta',
        },
      },
      null,
      2,
    ),
    responseExample: JSON.stringify(
      {
        ok: true,
        mode: 'created',
        collection: 'health_metrics',
        record_id: 'n0v01d',
        origin: 'app_institucional',
        professional: 'Dra. Ana Souza',
      },
      null,
      2,
    ),
  },
]

export const WRITEABLE_COLLECTIONS = [
  'health_metrics',
  'medical_records',
  'emotional_logs',
  'diets',
  'reminders',
  'profile_conditions',
  'profile_allergies',
  'profile_vaccinations',
  'profile_events',
  'profile_genetics',
  'profile_care_providers',
  'profile_lifestyle',
  'medications',
  'profile_biomarkers',
]

// Campos REQUIRED reais do schema PocketBase de cada coleção gravável e os
// que a API preenche automaticamente quando ausentes no payload.
// ATENÇÃO: manter em sincronia com pocketbase/hooks/trust_api.js (auto-fill)
// e com o schema real — se uma migration adicionar/tornar obrigatório um
// campo, atualizar aqui.
export interface WriteableCollectionDoc {
  name: string
  required: string[] // campos REQUIRED no schema
  auto: string[] // campos que a API preenche sozinha se ausentes
  note?: string
}

export const WRITEABLE_COLLECTIONS_DOC: WriteableCollectionDoc[] = [
  {
    name: 'health_metrics',
    required: ['category', 'date_time'],
    auto: ['category', 'date_time'],
    note: 'category deriva do que foi enviado: texto → "sintoma", número → "outro".',
  },
  {
    name: 'medical_records',
    required: ['type', 'title'],
    auto: ['title', 'date'],
    note: 'type é classificação clínica (cirurgia|alergia|doenca_previa|medicamento_continuo) — a API NÃO inventa esse valor: envie-o.',
  },
  {
    name: 'emotional_logs',
    required: ['date', 'mood_score', 'mood_label'],
    auto: ['date', 'mood_score', 'mood_label'],
    note: 'mood_score 5/mood_label neutro é o preenchimento automático (sem valor clínico).',
  },
  {
    name: 'diets',
    required: ['title'],
    auto: ['title', 'start_date'],
  },
  {
    name: 'reminders',
    required: ['type', 'title', 'date'],
    auto: ['title', 'date', 'type'],
    note: 'type usa "outro" quando ausente (remedio|exame|consulta|habito|outro).',
  },
  {
    name: 'profile_conditions',
    required: ['title', 'type'],
    auto: ['title', 'type'],
  },
  { name: 'profile_allergies', required: ['allergen'], auto: ['allergen'] },
  { name: 'profile_vaccinations', required: ['vaccine', 'date'], auto: ['vaccine', 'date'] },
  { name: 'profile_events', required: ['title', 'date'], auto: ['title', 'date'] },
  { name: 'profile_genetics', required: ['trait'], auto: ['trait'] },
  {
    name: 'profile_care_providers',
    required: ['name', 'specialty'],
    auto: ['name', 'specialty'],
    note: 'specialty usa "Não informado" quando ausente.',
  },
  { name: 'profile_lifestyle', required: [], auto: [] },
  {
    name: 'medications',
    required: ['name', 'routine'],
    auto: ['name', 'routine'],
    note: 'routine usa "once" quando ausente (daily|weekly|once).',
  },
  { name: 'profile_biomarkers', required: ['name', 'value'], auto: ['name'] },
]

export const HMAC_SNIPPET = `// Node.js (lado do app institucional)
import crypto from 'node:crypto'

const SECRET = process.env.INSTITUTIONAL_TRUST_SECRET // mesma env var da plataforma
const email = 'paciente@exemplo.com'
const ts = String(Date.now()) // epoch em MILISSEGUNDOS, tolerância de 5 min

// A mensagem assinada é SEMPRE "email|ts" (com a barra vertical)
const sig = crypto
  .createHmac('sha256', SECRET)
  .update(\`\${email}|\${ts}\`)
  .digest('hex')

const res = await fetch(
  '${BACKEND_URL}/backend/v1/trust/token',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ts, sig }),
  },
)
const { token } = await res.json()

// Nas chamadas seguintes, envie o token assim:
//   Authorization: <token>`

export const CURL_SNIPPET = `# 1) Troca de token (login único)
EMAIL="paciente@exemplo.com"
TS=$(date +%s000)
SECRET="$INSTITUTIONAL_TRUST_SECRET"   # env var compartilhada — não embutir no código

SIG=$(printf '%s' "$EMAIL|$TS" | openssl dgst -sha256 -hmac "$SECRET" -hex | sed 's/^.*= //')

curl -s -X POST \\
  '${BACKEND_URL}/backend/v1/trust/token' \\
  -H 'Content-Type: application/json' \\
  -d "{ \\"email\\": \\"$EMAIL\\", \\"ts\\": \\"$TS\\", \\"sig\\": \\"$SIG\\" }"
# → { "token": "TOKEN_POCKETBASE_DO_USUARIO", "user": { … } }

# 2) Leitura completa (use o token devolvido)
curl -s \\
  '${BACKEND_URL}/backend/v1/trust/patients/'"$EMAIL"'/summary' \\
  -H "Authorization: $TOKEN"

# 3) Escrita com origem identificada
curl -s -X POST \\
  '${BACKEND_URL}/backend/v1/trust/patients/'"$EMAIL"'/records' \\
  -H "Authorization: $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "collection": "health_metrics",
    "professional_name": "Dra. Ana Souza",
    "data": { "category": "peso", "numeric_value": 71.5, "unit": "kg",
              "date_time": "2026-11-23 10:30", "notes": "Aferido na consulta" }
  }'`

export const TIMESTAMP_RULE =
  'O campo ts é epoch em MILISSEGUNDOS (Date.now() ou date +%s000). A janela de tolerância é de 5 minutos: assinaturas com mais de 5 min de idade (ou no futuro) são recusadas com 401 STALE_TIMESTAMP. Gere uma nova assinatura a cada troca de token — não reutilize.'

export const AUTH_RULE =
  'O token devolvido é um token PocketBase válido: envie-o no header Authorization (sem "Bearer"). Ele vale para as rotas /trust/* e também para as APIs normais deste app, com as permissões do usuário. Tokens de profissionais também são aceitos — um profissional pode ler/gravar qualquer paciente; uma sessão de cliente só acessa os próprios dados.'

export const REJECT_RULES = [
  'Secret errado ou assinatura que não bate → 401 INVALID_SIGNATURE (recusa imediata).',
  'Timestamp com mais de 5 min → 401 STALE_TIMESTAMP.',
  'Corpo sem email/ts/sig, e-mail inválido ou timestamp inválido → 400.',
  'Rota de pacientes sem sessão válida no header Authorization → 401.',
  'Sessão de cliente tentando ler/gravar outro paciente → 403.',
  'Para REVOCAR a integração inteira: troque a env var INSTITUTIONAL_TRUST_SECRET no painel Skip Cloud (as duas pontas precisam combinar o novo valor) — todas as assinaturas antigas passam a falhar na hora.',
]
