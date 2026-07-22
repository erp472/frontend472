/**
 * LabGuard — protección por contraseña para /lab y /lab2 (solo DEV).
 *
 * • Valida credenciales contra VITE_LAB_EMAIL / VITE_LAB_PASSWORD (gate local).
 * • Tras validación local hace login real contra el backend para obtener JWT.
 * • Si el backend no responde, cae a usuario mock (sin acceso a API).
 * • La sesión vive mientras dure la pestaña del navegador (sessionStorage).
 */

import { useState } from 'react'
import { LogOut, FlaskConical, Eye, EyeOff, Mail } from 'lucide-react'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Label }        from '@/components/ui/label'
import { useSessionStore, userSchema } from '@/stores/useSessionStore'
import { env } from '@/lib/env'

const LAB_EMAIL    = import.meta.env.VITE_LAB_EMAIL    ?? 'admin@4-72.com.co'
const LAB_PASSWORD = import.meta.env.VITE_LAB_PASSWORD ?? 'Admin@4-72!'
const SESSION_KEY  = 'lab:access'

const LAB_DEV_USER = {
  id:          '00000000-0000-0000-0000-000000000099',
  nombre:      'Dev Admin (Lab)',
  email:       'lab@4-72.test',
  rol:         'ADMIN_SISTEMA' as const,
  sucursal_id: null,
  activo:      true,
  ultimoLogin: new Date().toISOString(),
}

// ── Login form ─────────────────────────────────────────────────────────────────

function LabLogin({ onGranted }: { onGranted: () => void }) {
  const [email,   setEmail]   = useState('')
  const [pwd,     setPwd]     = useState('')
  const [visible, setVisible] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const clearError = () => setError(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Gate local — valida contra variables de entorno
    if (email !== LAB_EMAIL || pwd !== LAB_PASSWORD) {
      await new Promise(r => setTimeout(r, 350))
      setError('Credenciales incorrectas.')
      setLoading(false)
      setPwd('')
      return
    }

    // Login real contra el backend para obtener JWT
    try {
      const res = await fetch(`${env.VITE_API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password: pwd }),
      })

      if (res.ok) {
        const data = await res.json() as { access_token: string }
        useSessionStore.getState().setToken(data.access_token)

        // Obtener perfil real del usuario
        const meRes = await fetch(`${env.VITE_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        })
        if (meRes.ok) {
          const raw = await meRes.json()
          const parsed = userSchema.safeParse(raw)
          if (parsed.success) {
            useSessionStore.getState().setUser(parsed.data)
          } else {
            useSessionStore.getState().setUser(LAB_DEV_USER)
          }
        } else {
          useSessionStore.getState().setUser(LAB_DEV_USER)
        }
      } else {
        // Backend rechazó — usar mock sin API
        useSessionStore.getState().setUser(LAB_DEV_USER)
      }
    } catch {
      // Backend no disponible — usar mock sin API
      useSessionStore.getState().setUser(LAB_DEV_USER)
    }

    sessionStorage.setItem(SESSION_KEY, '1')
    setLoading(false)
    onGranted()
  }

  const valid = email.trim().length > 0 && pwd.length > 0

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex h-1.5 w-32 mx-auto rounded overflow-hidden">
            <div className="flex-1" style={{ background: '#FDC52F' }} />
            <div className="flex-1" style={{ background: '#1E4093' }} />
            <div className="flex-1" style={{ background: '#E51937' }} />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Acceso requiere permisos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-email" className="text-xs">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                id="lab-email"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); clearError() }}
                placeholder="Correo electrónico"
                autoFocus
                autoComplete="email"
                aria-invalid={!!error}
                className={`pl-9 ${error ? 'border-destructive focus-visible:ring-destructive/30' : ''}`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="lab-pwd" className="text-xs">Contraseña</Label>
            <div className="relative">
              <Input
                id="lab-pwd"
                type={visible ? 'text' : 'password'}
                value={pwd}
                onChange={e => { setPwd(e.target.value); clearError() }}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={!!error}
                className={error ? 'border-destructive focus-visible:ring-destructive/30' : ''}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !valid}>
            {loading ? 'Verificando…' : 'Acceder'}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ── Guard ──────────────────────────────────────────────────────────────────────

export function LabGuard({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  )

  const exit = () => {
    sessionStorage.removeItem(SESSION_KEY)
    useSessionStore.getState().clearSession()
    setGranted(false)
  }

  if (!granted) {
    return <LabLogin onGranted={() => setGranted(true)} />
  }

  return (
    <>
      {children}

      {/* Badge flotante — salir del lab */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={exit}
          className="flex items-center gap-1.5 rounded-full border bg-background/90 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm hover:text-destructive hover:border-destructive/40 transition-colors"
          aria-label="Salir del Lab"
        >
          <FlaskConical className="size-3" />
          Lab · Admin
          <span className="w-px h-3 bg-border mx-0.5" />
          <LogOut className="size-3" />
        </button>
      </div>
    </>
  )
}
