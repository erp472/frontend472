import { useEffect } from 'react'
import { apiFetch } from '@/lib/api'
import { useSessionStore, userSchema } from '@/stores/useSessionStore'

// Refresca /auth/me al recuperar el foco de la ventana, para que cambios de
// rol, permisos o feature flags asignados desde el panel de administración
// apliquen sin que el usuario tenga que recargar la página o reloguear.
export function useSessionRefresh() {
  const token = useSessionStore((s) => s.token)
  const status = useSessionStore((s) => s.status)
  const setUser = useSessionStore((s) => s.setUser)

  useEffect(() => {
    if (!token || status !== 'authenticated') return

    async function onFocus() {
      try {
        const user = await apiFetch('/auth/me', {}, userSchema)
        setUser(user)
      } catch {
        // Un 401 ya dispara clearSession vía registerOn401Handler; otros
        // errores (blips de red) se ignoran, el usuario conserva su sesión.
      }
    }

    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [token, status, setUser])
}
