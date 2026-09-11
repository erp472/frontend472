import { useEffect, useRef } from 'react'
import { useSessionStore, INACTIVITY_MS } from '@/stores/useSessionStore'

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const

export function useInactivityWatcher() {
  const token = useSessionStore((s) => s.token)
  const touchActivity = useSessionStore((s) => s.touchActivity)
  const clearSession = useSessionStore((s) => s.clearSession)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) return

    function scheduleExpiry() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(clearSession, INACTIVITY_MS)
    }

    function onActivity() {
      touchActivity()
      scheduleExpiry()
    }

    // Si al montar la sesión ya venció (p. ej. F5 después de 25 min), limpiar de inmediato
    const lastActivity = useSessionStore.getState().lastActivity
    if (lastActivity !== null && Date.now() - lastActivity > INACTIVITY_MS) {
      clearSession()
      return
    }

    scheduleExpiry()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity))
    }
  }, [token, touchActivity, clearSession])
}
