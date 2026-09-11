import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { registerTokenProvider, registerOn401Handler } from '@/lib/api'
import {
  useSessionStore,
  readTokenFromUrl,
  userSchema,
  INACTIVITY_MS,
} from '@/stores/useSessionStore'
import { apiFetch } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useInactivityWatcher } from '@/hooks/useInactivityWatcher'
import { useSessionRefresh } from '@/hooks/useSessionRefresh'
import { startRealtime, stopRealtime } from '@/realtime/socket'
import { startBridge, stopBridge } from '@/realtime/bridge'
import { router } from '@/router'
import './index.css'

registerTokenProvider(() => useSessionStore.getState().token)
registerOn401Handler(() => {
  stopBridge()
  stopRealtime()
  useSessionStore.getState().clearSession()
})

async function bootstrap() {
  const { token: storedToken, lastActivity } = useSessionStore.getState()

  // Si la sesión guardada ya venció por inactividad, limpiar antes de verificar
  if (storedToken && lastActivity !== null && Date.now() - lastActivity > INACTIVITY_MS) {
    useSessionStore.getState().clearSession()
    return
  }

  const token = readTokenFromUrl() ?? storedToken

  if (!token) {
    useSessionStore.getState().setStatus('unauthenticated')
    return
  }

  if (!storedToken) useSessionStore.getState().setToken(token)

  try {
    const user = await apiFetch('/auth/me', {}, userSchema)
    useSessionStore.getState().setUser(user)
    startBridge()
    startRealtime()
  } catch {
    useSessionStore.getState().clearSession()
  }
}

bootstrap().catch(() => useSessionStore.getState().clearSession())

function App() {
  useInactivityWatcher()
  useSessionRefresh()
  return <RouterProvider router={router} />
}

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró #root en index.html')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <App />
          <Toaster position="top-right" />
        </TooltipProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
