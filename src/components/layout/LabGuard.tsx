import { LogOut, FlaskConical } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSessionStore } from '@/stores/useSessionStore'

export function LabGuard({ children }: { children: React.ReactNode }) {
  const status  = useSessionStore((s) => s.status)
  const userRol = useSessionStore((s) => s.user?.rol)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (userRol !== 'ADMIN_SISTEMA') {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="max-w-sm space-y-3">
          <div className="text-5xl font-bold text-muted-foreground/40">403</div>
          <h1 className="text-xl font-semibold">Sin permisos</h1>
          <p className="text-muted-foreground text-sm">
            El lab solo está disponible para administradores del sistema.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}

      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => useSessionStore.getState().clearSession()}
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
