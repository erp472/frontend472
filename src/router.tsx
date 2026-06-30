import { lazy, Suspense } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { useSessionStore, type RolUsuario } from '@/stores/useSessionStore'

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const Permisos     = lazy(() => import('@/pages/admin/Permisos'))
const FeatureFlags = lazy(() => import('@/pages/admin/FeatureFlags'))
const Usuarios     = lazy(() => import('@/pages/admin/Usuarios'))
const Login        = lazy(() => import('@/pages/Login'))

// Páginas placeholder — se implementan en fases 4-7
const Placeholder  = lazy(() => Promise.resolve({
  default: () => (
    <div className="p-8 text-muted-foreground">
      Esta sección está en construcción.
    </div>
  ),
}))

// ── Loaders ───────────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

// ── Pantalla 403 ──────────────────────────────────────────────────────────────
function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="text-5xl font-bold text-muted-foreground/40">403</div>
        <h1 className="text-xl font-semibold">Sin permisos</h1>
        <p className="text-muted-foreground text-sm">
          Tu rol no tiene acceso a esta sección.
        </p>
      </div>
    </div>
  )
}

// ── Guards ────────────────────────────────────────────────────────────────────
function AuthGuard() {
  const status = useSessionStore((s) => s.status)
  const location = useLocation()

  if (status === 'loading') return <PageLoader />
  if (status === 'unauthenticated') {
    const target = import.meta.env.DEV ? '/login' : '/unauthorized'
    return <Navigate to={target} state={{ from: location }} replace />
  }
  return <Outlet />
}

function RoleGuard({ roles }: { roles: RolUsuario[] }) {
  const userRol = useSessionStore((s) => s.user?.rol)

  if (!userRol || !roles.includes(userRol)) {
    return <Forbidden />
  }
  return <Outlet />
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lazySuspense(Component: React.LazyExoticComponent<() => React.ReactElement>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
}

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  // Rutas protegidas por autenticación
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/',                element: lazySuspense(Dashboard) },

          // Gestión de usuarios — ADMIN_NACIONAL, ADMIN_SISTEMA, SUPERVISOR_REGIONAL, ADMINISTRATIVO
          {
            element: (
              <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'SUPERVISOR_REGIONAL', 'ADMINISTRATIVO']} />
            ),
            children: [
              { path: '/admin/users', element: lazySuspense(Usuarios) },
            ],
          },

          // Equipos — ADMIN_SISTEMA, ADMIN_NACIONAL
          {
            element: (
              <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />
            ),
            children: [
              { path: '/admin/devices',   element: lazySuspense(Placeholder) },
              { path: '/admin/branches',  element: lazySuspense(Placeholder) },
            ],
          },

          // Permisos — ADMIN_NACIONAL, ADMIN_SISTEMA
          {
            element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />,
            children: [
              { path: '/admin/permisos', element: lazySuspense(Permisos) },
            ],
          },

          // Sistema — solo ADMIN_SISTEMA
          {
            element: <RoleGuard roles={['ADMIN_SISTEMA']} />,
            children: [
              { path: '/admin/audit',    element: lazySuspense(Placeholder) },
              { path: '/admin/settings', element: lazySuspense(Placeholder) },
            ],
          },
        ],
      },
    ],
  },

  // Rutas públicas
  { path: '/login',        element: lazySuspense(Login) },
  { path: '/unauthorized', element: lazySuspense(Login) },
  { path: '*',             element: <Navigate to="/" replace /> },
])
