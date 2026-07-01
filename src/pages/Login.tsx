import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useApiForm } from '@/lib/useApiForm'
import { apiFetch } from '@/lib/api'
import { useSessionStore, userSchema, type User } from '@/stores/useSessionStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})
type LoginData = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const setToken = useSessionStore((s) => s.setToken)
  const setUser = useSessionStore((s) => s.setUser)

  const { form, handleSubmit, isPending, serverError } = useApiForm<typeof loginSchema, void>({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: async (data: LoginData) => {
      const res = await apiFetch<{ access_token: string; user?: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      setToken(res.access_token)
      if (res.user) {
        setUser(res.user)
      } else {
        const user = await apiFetch('/auth/me', {}, userSchema)
        setUser(user)
      }
    },
    onSuccess: () => navigate('/', { replace: true }),
  })

  const { register, formState: { errors } } = form

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: 'white' }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <img src="/logo.png" alt="4-72 Servicios Postales" className="h-14 w-auto" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Panel de Administración</h1>
            <p className="text-sm text-muted-foreground mt-0.5">4-72 Servicios Postales Nacionales</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-white p-8 shadow-2xl space-y-5">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@4-72.com.co"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Ingresar
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} 4-72 Servicios Postales Nacionales
        </p>
      </div>
    </div>
  )
}
