import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { queryClient } from '@/lib/query-client'
import { registerTokenProvider } from '@/lib/api'
import {
  useSessionStore,
  readTokenFromUrl,
  userSchema,
} from '@/stores/useSessionStore'
import { apiFetch } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { router } from '@/router'
import './index.css'

registerTokenProvider(() => useSessionStore.getState().token)

async function bootstrap() {
  const token = readTokenFromUrl() ?? useSessionStore.getState().token

  if (!token) {
    useSessionStore.getState().setStatus('unauthenticated')
    return
  }

  useSessionStore.getState().setToken(token)

  try {
    const user = await apiFetch('/auth/me', {}, userSchema)
    useSessionStore.getState().setUser(user)
  } catch {
    useSessionStore.getState().clearSession()
  }
}

bootstrap().catch(() => useSessionStore.getState().clearSession())

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró #root en index.html')

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
