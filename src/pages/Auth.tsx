import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authService } from '@/services/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { toast } from 'sonner'
import { Stethoscope, UserCircle } from 'lucide-react'
import { SoulLogo } from '@/components/brand/SoulLogo'
import { UserRole } from '@/types'

type AccessType = 'cliente' | 'profissional'

export default function AuthPage() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [accessType, setAccessType] = useState<AccessType>('cliente')
  const [loading, setLoading] = useState(false)

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [role, setRole] = useState<UserRole>('cliente')
  const [phone, setPhone] = useState('')

  // Password recovery
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  const navigateByRole = (userRole: string) => {
    if (userRole === 'profissional') {
      navigate('/profissional')
    } else {
      navigate('/')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha e-mail e senha')
      return
    }

    setLoading(true)
    try {
      const u = await login(email, password)
      toast.success(`Bem-vindo(a) de volta, ${u.name || u.email}!`)
      // O acesso é sempre direcionado pelo papel real da conta, para não
      // bloquear nenhum dos dois tipos de login — a aba escolhida apenas
      // indica o tipo de acesso esperado.
      if (
        (accessType === 'profissional' && u.role !== 'profissional') ||
        (accessType === 'cliente' && u.role === 'profissional')
      ) {
        toast.info(
          accessType === 'profissional'
            ? 'Esta conta é de Cliente. Use a aba CLIENTE para acessar a área do paciente.'
            : 'Esta conta é da Clínica. Use a aba CLÍNICA para acessar a área profissional.',
        )
      }
      navigateByRole(u.role)
    } catch (err: any) {
      console.error(err)
      toast.error('Credenciais inválidas. Verifique e-mail e senha.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !name) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    if (password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres')
      return
    }
    if (password !== passwordConfirm) {
      toast.error('As senhas não conferem')
      return
    }

    setLoading(true)
    try {
      const u = await signup({
        email,
        password,
        passwordConfirm,
        name,
        role,
        phone,
      })
      toast.success('Conta criada com sucesso na Clínica Soul!')
      navigateByRole(u.role)
    } catch (err: any) {
      console.error(err)
      toast.error('Não foi possível criar a conta. Este e-mail já pode estar em uso.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast.error('Informe seu e-mail')
      return
    }
    setForgotLoading(true)
    try {
      await authService.requestPasswordReset(forgotEmail)
      toast.success('Link de recuperação enviado para seu e-mail!')
      setShowForgot(false)
    } catch (err) {
      toast.error('Erro ao solicitar recuperação de senha.')
    } finally {
      setForgotLoading(false)
    }
  }

  const changeAccessType = (val: AccessType) => {
    setAccessType(val)
    // Mantém o perfil do cadastro sincronizado com o tipo de acesso escolhido
    setRole(val)
  }

  const accessToggle = (
    <div role="radiogroup" aria-label="Tipo de acesso" className="grid grid-cols-2 gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={accessType === 'cliente'}
        onClick={() => changeAccessType('cliente')}
        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soul-gold-deep ${
          accessType === 'cliente'
            ? 'border-soul-gold-deep bg-soul-gold/15 text-soul-brown dark:bg-soul-gold/10'
            : 'border-muted bg-transparent text-muted-foreground hover:bg-muted/50'
        }`}
      >
        <UserCircle className="h-4 w-4" aria-hidden="true" />
        Cliente
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={accessType === 'profissional'}
        onClick={() => changeAccessType('profissional')}
        className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-soul-gold-deep ${
          accessType === 'profissional'
            ? 'border-soul-gold-deep bg-soul-gold/15 text-soul-brown dark:bg-soul-gold/10'
            : 'border-muted bg-transparent text-muted-foreground hover:bg-muted/50'
        }`}
      >
        <Stethoscope className="h-4 w-4" aria-hidden="true" />
        Clínica
      </button>
    </div>
  )

  return (
    <div className="min-h-dvh soul-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Logo centralizado acima da caixa de entrada */}
        <div className="flex justify-center mb-6">
          <SoulLogo />
        </div>

        <Card className="border-border/60 shadow-md">
          {!showForgot ? (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
              <CardHeader className="pb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Criar Conta</TabsTrigger>
                </TabsList>
              </CardHeader>

              {/* Login tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Tipo de Acesso</Label>
                      {accessToggle}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Senha</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email)
                            setShowForgot(true)
                          }}
                          className="text-xs text-soul-gold-deep hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      disabled={loading}
                    >
                      {loading
                        ? 'Entrando...'
                        : accessType === 'profissional'
                          ? 'Acessar como Clínica'
                          : 'Acessar como Cliente'}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              {/* Signup tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-3.5 pt-2">
                    <div className="space-y-1">
                      <Label htmlFor="signup-name">Nome Completo</Label>
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        placeholder="Ex: Ana Clara Santos"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="signup-email">E-mail</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Perfil de Acesso</Label>
                      <RadioGroup
                        value={role}
                        onValueChange={(val: any) => setRole(val)}
                        className="grid grid-cols-2 gap-2"
                      >
                        <Label
                          htmlFor="role-cliente"
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            role === 'cliente'
                              ? 'border-soul-gold-deep bg-soul-gold/15 text-soul-brown dark:bg-soul-gold/10'
                              : 'border-muted hover:bg-muted/50'
                          }`}
                        >
                          <RadioGroupItem value="cliente" id="role-cliente" />
                          <span className="text-xs font-medium">Cliente / Paciente</span>
                        </Label>
                        <Label
                          htmlFor="role-prof"
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            role === 'profissional'
                              ? 'border-soul-gold-deep bg-soul-gold/15 text-soul-brown dark:bg-soul-gold/10'
                              : 'border-muted hover:bg-muted/50'
                          }`}
                        >
                          <RadioGroupItem value="profissional" id="role-prof" />
                          <span className="text-xs font-medium">Profissional Clínica</span>
                        </Label>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="signup-pass">Senha</Label>
                        <Input
                          id="signup-pass"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Mín. 8 dígitos"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                        <Input
                          id="signup-confirm"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Repita a senha"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      disabled={loading}
                    >
                      {loading ? 'Criando Conta...' : 'Cadastrar na Clínica Soul'}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          ) : (
            // Password recovery form
            <form onSubmit={handleForgot}>
              <CardHeader>
                <CardTitle className="text-lg">Recuperar Senha</CardTitle>
                <CardDescription>
                  Informe seu e-mail cadastrado para receber o link de redefinição.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowForgot(false)}
                >
                  Voltar para o Login
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-muted-foreground flex items-center justify-center gap-2">
          <span>Clínica Soul • Medicina do Estilo de Vida & Longevidade</span>
        </div>
      </div>
    </div>
  )
}
