import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BACKEND_URL,
  TRUST_ENDPOINTS,
  WRITEABLE_COLLECTIONS,
  WRITEABLE_COLLECTIONS_DOC,
  HMAC_SNIPPET,
  CURL_SNIPPET,
  TIMESTAMP_RULE,
  AUTH_RULE,
  REJECT_RULES,
} from '@/services/trustIntegrationDoc'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800',
  POST: 'bg-green-100 text-green-800',
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 h-6 px-2 text-xs"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? 'Copiado!' : 'Copiar'}
      </Button>
      <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export default function TrustIntegrationSection() {
  const [tab, setTab] = useState('endpoints')

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Integração com o app institucional</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Coordernadas para o app institucional da clínica consumir este Health Tracker por HTTP:
          login único por assinatura HMAC, leitura completa e escrita identificada. As rotas também
          aceitam um token PocketBase normal no header{' '}
          <code className="rounded bg-muted px-1 text-xs">Authorization</code>.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="assinatura">Assinatura HMAC</TabsTrigger>
          <TabsTrigger value="curl">Exemplo curl</TabsTrigger>
          <TabsTrigger value="regras">Regras e recusas</TabsTrigger>
          <TabsTrigger value="campos">Campos obrigatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Método</TableHead>
                <TableHead>Caminho</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TRUST_ENDPOINTS.map((ep) => (
                <TableRow key={ep.path}>
                  <TableCell>
                    <Badge className={METHOD_COLORS[ep.method]}>{ep.method}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs break-all">
                    {BACKEND_URL}
                    {ep.path}
                  </TableCell>
                  <TableCell className="text-sm">{ep.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {TRUST_ENDPOINTS.map((ep) => (
            <div key={ep.path + '-examples'} className="rounded-lg border p-4">
              <p className="mb-2 text-sm font-medium">
                {ep.method} <span className="font-mono text-xs">{ep.path}</span>
              </p>
              {ep.bodyExample && (
                <>
                  <p className="mb-1 text-xs text-muted-foreground">Corpo de exemplo:</p>
                  <CodeBlock code={ep.bodyExample} />
                </>
              )}
              <p className="mb-1 mt-3 text-xs text-muted-foreground">Resposta:</p>
              <CodeBlock code={ep.responseExample} />
            </div>
          ))}

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Coleções aceitas na escrita</p>
            <div className="flex flex-wrap gap-1.5">
              {WRITEABLE_COLLECTIONS.map((c) => (
                <Badge key={c} variant="secondary" className="font-mono text-xs">
                  {c}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              A escrita sempre cria registro novo (ou só preenche campos vazios de um target_id
              informado) — nunca sobrescreve dados existentes. O campo{' '}
              <code className="font-mono">collection</code> escolhe o destino e{' '}
              <code className="font-mono">data</code> carrega os campos do registro.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="assinatura" className="space-y-4">
          <p className="text-sm text-muted-foreground">{TIMESTAMP_RULE}</p>
          <p className="text-sm text-muted-foreground">{AUTH_RULE}</p>
          <CodeBlock code={HMAC_SNIPPET} />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium">Onde o secret é configurado</p>
            <p className="mt-1 text-muted-foreground">
              O valor do secret NÃO é exibido aqui. Ele vive na env var da plataforma{' '}
              <code className="font-mono">INSTITUTIONAL_TRUST_SECRET</code>, configurada no painel
              Skip Cloud deste projeto e compartilhada com o app institucional por esse mesmo canal
              (mesmo valor nas duas pontas). Nunca embuta o valor no código do app institucional.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="curl" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Exemplo pronto com a URL real do backend deste app. Substitua o e-mail do paciente e
            exporte a env var do secret antes de rodar.
          </p>
          <CodeBlock code={CURL_SNIPPET} />
        </TabsContent>

        <TabsContent value="regras" className="space-y-2">
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {REJECT_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="campos" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Campos obrigatórios reais de cada coleção gravável no schema do PocketBase. A API
            preenche automaticamente (com valor neutro de forma/data, nunca conteúdo clínico) os
            campos marcados como "auto": data/hora do registro recebe{' '}
            <code className="font-mono text-xs">agora</code>, e rótulos genéricos recebem "Registro
            do app institucional". Se faltar um campo obrigatório que a API não pode preencher, a
            resposta vem com status 400 e a lista exata do que enviar.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coleção</TableHead>
                <TableHead>Obrigatórios no schema</TableHead>
                <TableHead>Auto-preenchidos pela API</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {WRITEABLE_COLLECTIONS_DOC.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-mono text-xs">{c.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.required.length === 0 ? (
                        <span className="text-xs text-muted-foreground">nenhum</span>
                      ) : (
                        c.required.map((f) => (
                          <Badge
                            key={f}
                            variant="outline"
                            className={
                              c.auto.indexOf(f) !== -1
                                ? 'border-green-300 bg-green-50 font-mono text-xs'
                                : 'border-red-200 bg-red-50 font-mono text-xs'
                            }
                          >
                            {f}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.auto.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <span className="font-mono text-xs">{c.auto.join(', ')}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{c.note || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="rounded-lg border p-4 text-sm">
            <p className="font-medium">Como ler esta tabela</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-muted-foreground">
              <li>
                Badge <span className="font-medium text-green-700">verde</span>: obrigatório no
                schema, mas preenchido automaticamente pela API se ausente.
              </li>
              <li>
                Badge <span className="font-medium text-red-700">vermelho</span>: obrigatório e a
                API não inventa o valor — o app institucional precisa enviá-lo em{' '}
                <code className="font-mono text-xs">data</code>.
              </li>
              <li>
                Em erro de campo faltante, a resposta 400 traz{' '}
                <code className="font-mono text-xs">missing_fields</code> e{' '}
                <code className="font-mono text-xs">auto_filled_fields</code> além da mensagem em
                português.
              </li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
