import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { z } from 'zod'

export const RolUsuario = z.enum([
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
  id: z.string().uuid(),
  nombre: z.string(),
  email: z.string().email(),
  rol: RolUsuario,
  sucursal_id: z.string().uuid().nullable(),
  activo: z.boolean(),
  ultimoLogin: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface SessionState {
  token: string | null
  user: User | null
  status: SessionStatus
  setToken: (token: string) => void
  setUser: (user: User) => void
  setStatus: (status: SessionStatus) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  devtools(
    persist(
      (set) => ({
        token: null,
        user: null,
        status: 'loading',
        setToken: (token) => set({ token }),
        setUser: (user) => set({ user, status: 'authenticated' }),
        setStatus: (status) => set({ status }),
        clearSession: () =>
          set({ token: null, user: null, status: 'unauthenticated' }),
      }),
      {
        name: 'session-472',
        partialize: (s: SessionState) => ({ token: s.token, user: s.user }),
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
