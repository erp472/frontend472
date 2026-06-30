import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'
import { useSessionStore, userSchema } from '@/stores/useSessionStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const loginResponseSchema = z.object({
  access_token: z.string(),
  usuario: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    rol: z.string(),
    sucursal_id: z.string().uuid().nullable(),
  }),
})

function DevLoginForm() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [email, setEmail]       = useState('admin@4-72.com.co')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }, loginResponseSchema)

      useSessionStore.getState().setToken(res.access_token)

      const user = await apiFetch('/auth/me', {}, userSchema)
      useSessionStore.getState().setUser(user)

      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">4-72 Admin</CardTitle>
          <CardDescription className="text-xs">
            Acceso de desarrollo — solo disponible en entorno local
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function ProdUnauthorized() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="text-5xl font-bold text-muted-foreground/40">401</div>
        <h1 className="text-xl font-semibold">Acceso no autorizado</h1>
        <p className="text-muted-foreground text-sm">
          Esta aplicación requiere autenticación previa desde el sistema 4-72.
        </p>
      </div>
    </div>
  )
}

export default import.meta.env.DEV ? DevLoginForm : ProdUnauthorized
