import { create } from 'zustand'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'
import { z } from 'zod'

export const RolUsuario = z.enum([
  'USUARIO_POST',
  'CAJERO',
  'ADMINISTRATIVO',
  'TESORERIA',
  'INVENTARIOS',
  'SUPERVISOR_REGIONAL',
  'ADMIN_NACIONAL',
  'ADMIN_SISTEMA',
])
export type RolUsuario = z.infer<typeof RolUsuario>

// Coincide con GET /auth/me del backend
export const userSchema = z.object({
  id: z.string().min(1),
  nombre: z.string(),
  email: z.string().email(),
  rol: RolUsuario,
  sucursal_id: z.number().int().nullable(),
  activo: z.boolean(),
  ultimoLogin: z.string().nullable(),
  permisos: z.array(z.string()).default([]),
})
export type User = z.infer<typeof userSchema>

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

// Vence la sesión tras 20 minutos de inactividad
export const INACTIVITY_MS = 20 * 60 * 1000

interface SessionState {
  token: string | null
  user: User | null
  status: SessionStatus
  lastActivity: number | null
  setToken: (token: string) => void
  setUser: (user: User) => void
  setStatus: (status: SessionStatus) => void
  clearSession: () => void
  touchActivity: () => void
}

export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        user: null,
        status: 'loading',
        lastActivity: null,
        setToken: (token) => set({ token, lastActivity: Date.now() }),
        setUser: (user) => set({ user, status: 'authenticated', lastActivity: Date.now() }),
        setStatus: (status) => set({ status }),
        clearSession: () =>
          set({ token: null, user: null, status: 'unauthenticated', lastActivity: null }),
        touchActivity: () => set({ lastActivity: Date.now() }),
      }),
      {
        name: 'session',
        storage: createJSONStorage(() => sessionStorage),
        // Solo persistir token y lastActivity — user y status se rehidratan vía /auth/me
        partialize: (s) => ({ token: s.token, lastActivity: s.lastActivity }),
      },
    ),
    { name: 'SessionStore' },
  ),
)

export function readTokenFromUrl(): string | null {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('token')
  if (token) {
    url.searchParams.delete('token')
    window.history.replaceState({}, '', url.toString())
  }
  return token
}
