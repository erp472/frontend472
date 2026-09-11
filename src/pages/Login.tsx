import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useApiForm } from '@/lib/useApiForm'
import { apiFetch, ApiError } from '@/lib/api'
import { useSessionStore, userSchema, type User } from '@/stores/useSessionStore'
import { isTauri, getMacAddress } from '@/lib/tauri'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
})
type LoginData = z.infer<typeof loginSchema>

const WEB_ONLY_ROLES:     User['rol'][] = ['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'USUARIO_POST', 'ADMINISTRATIVO', 'INVENTARIOS']
const DESKTOP_ONLY_ROLES: User['rol'][] = ['CAJERO', 'SUPERVISOR_REGIONAL']

export default function Login() {
  const navigate = useNavigate()
  const setToken = useSessionStore((s) => s.setToken)
  const setUser  = useSessionStore((s) => s.setUser)
  const [verPassword, setVerPassword] = useState(false)

  const { form, handleSubmit, isPending, serverError } = useApiForm<typeof loginSchema, void>({
    schema: loginSchema,
    defaultValues: { email: '', password: '' },
    onSubmit: async (data: LoginData) => {
      const extraHeaders: Record<string, string> = {}
      if (isTauri()) {
        try {
          const mac = await getMacAddress()
          extraHeaders['x-mac-address'] = mac
        } catch { /* sin adaptador de red */ }
        extraHeaders['x-plataforma'] = 'tauri'
      }
      const res = await apiFetch<{ access_token: string; user?: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: extraHeaders,
      })

      // Resuelve el usuario pasando el token explícitamente — aún no está en el store
      const resolvedUser = res.user ?? await apiFetch('/auth/me', {
        headers: { Authorization: `Bearer ${res.access_token}` },
      }, userSchema)

      if (isTauri() && !import.meta.env.DEV && WEB_ONLY_ROLES.includes(resolvedUser.rol)) {
        throw new ApiError(403, 'No esta permitido el acceso a la app de escritorio')
      }

      if (!isTauri() && DESKTOP_ONLY_ROLES.includes(resolvedUser.rol)) {
        throw new ApiError(403, 'Esta cuenta solo puede acceder desde la app de escritorio')
      }

      setToken(res.access_token)
      setUser(resolvedUser)
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
        <div className="shadow-2xl rounded-xl overflow-hidden">
          <div className="flex h-1.5">
            <div className="flex-[2] bg-[#FCD116]" />
            <div className="flex-1 bg-[#003893]" />
            <div className="flex-1 bg-[#CE1126]" />
          </div>
        <div className="bg-white p-8 space-y-5">
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
              placeholder="Email"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-10"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={verPassword}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-lg"
              >
                {verPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
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
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} 4-72 Servicios Postales Nacionales
        </p>
      </div>
    </div>
  )
}
