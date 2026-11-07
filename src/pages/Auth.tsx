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
import { Activity, ShieldCheck, Stethoscope, UserCircle, CheckCircle2 } from 'lucide-react'
import { UserRole } from '@/types'

export default function AuthPage() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<'login' | 'signup'>('login')
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
      if (u.role === 'profissional') {
        navigate('/profissional')
      } else {
        navigate('/')
      }
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
      if (u.role === 'profissional') {
        navigate('/profissional')
      } else {
        navigate('/')
      }
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

  const fillQuickDemo = (type: 'cliente' | 'profissional') => {
    if (type === 'cliente') {
      setEmail('guivemax@hotmail.com')
      setPassword('Skip@Pass')
    } else {
      setEmail('dra.carolina@clinicasoul.com.br')
      setPassword('Skip@Pass')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/50 via-background to-teal-50/30 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg mb-3">
            <Activity className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clínica Soul</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seu portal integrado de saúde, longevidade e bem-estar
          </p>
        </div>

        {/* Demo Fast Fill Buttons */}
        <div className="mb-4 bg-white/70 dark:bg-card/70 border rounded-xl p-3 shadow-sm text-xs space-y-2">
          <div className="font-medium text-foreground flex items-center justify-between">
            <span>Acesso Rápido de Demonstração:</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillQuickDemo('cliente')}
              className="text-xs h-8 justify-start border-emerald-200 hover:bg-emerald-50"
            >
              <UserCircle className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Entrar como Cliente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fillQuickDemo('profissional')}
              className="text-xs h-8 justify-start border-amber-200 hover:bg-amber-50"
            >
              <Stethoscope className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Entrar como Dra. (Prof.)
            </Button>
          </div>
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
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input
                        id="login-email"
                        type="email"
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
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <Input
                        id="login-password"
                        type="password"
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      disabled={loading}
                    >
                      {loading ? 'Entrando...' : 'Acessar Conta'}
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
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
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
                              ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:bg-emerald-950/20'
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
                              ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 dark:bg-emerald-950/20'
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
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
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
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
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
