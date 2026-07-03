import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Monitor } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LabGuard } from '@/components/layout/LabGuard'
import { isTauri } from '@/lib/tauri'
import { type RolUsuario, useSessionStore } from '@/stores/useSessionStore'

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Login = lazy(() => import('@/pages/Login'))
const Lab = lazy(() => import('@/pages/Lab'))
const Lab2 = lazy(() => import('@/pages/Lab2'))
const UsersPage = lazy(() => import('@/pages/admin/Users'))
const PermisosPage = lazy(() => import('@/pages/admin/Permisos'))

// Páginas placeholder — se implementan en fases siguientes
const Placeholder = lazy(() =>
  Promise.resolve({
    default: () => (
      <div className="p-8 text-muted-foreground">Esta sección está en construcción.</div>
    ),
  }),
)

// ── Loaders ───────────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

// ── Pantalla 401 ──────────────────────────────────────────────────────────────
function Unauthorized() {
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

// ── Pantalla 403 ──────────────────────────────────────────────────────────────
function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-3">
        <div className="text-5xl font-bold text-muted-foreground/40">403</div>
        <h1 className="text-xl font-semibold">Sin permisos</h1>
        <p className="text-muted-foreground text-sm">Tu rol no tiene acceso a esta sección.</p>
      </div>
    </div>
  )
}

// ── Pantalla solo-escritorio ──────────────────────────────────────────────────
function DesktopOnly() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-4">
        <div className="flex justify-center">
          <Monitor className="h-16 w-16 text-muted-foreground/40" />
        </div>
        <h1 className="text-xl font-semibold">Solo disponible en escritorio</h1>
        <p className="text-muted-foreground text-sm">
          Tu cuenta requiere la aplicación de escritorio 4-72 para acceder. Descárgala y vuelve a
          intentarlo.
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
    return <Navigate to="/login" state={{ from: location }} replace />
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

const DESKTOP_ONLY_ROLES: RolUsuario[] = ['CAJERO', 'USUARIO_POST']

function PlatformGuard() {
  const userRol = useSessionStore((s) => s.user?.rol)

  if (userRol && DESKTOP_ONLY_ROLES.includes(userRol) && !isTauri()) {
    return <DesktopOnly />
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
export const router = createBrowserRouter(
  [
    // Rutas protegidas por autenticación
    {
      element: <AuthGuard />,
      children: [
        {
          element: <AdminLayout />,
          children: [
            {
              element: <PlatformGuard />,
              children: [
                { path: '/', element: lazySuspense(Dashboard) },

                // Gestión de usuarios
                {
                  element: (
                    <RoleGuard
                      roles={[
                        'ADMIN_SISTEMA',
                        'ADMIN_NACIONAL',
                        'SUPERVISOR_REGIONAL',
                        'ADMINISTRATIVO',
                      ]}
                    />
                  ),
                  children: [{ path: '/admin/users', element: lazySuspense(UsersPage) }],
                },

                // Equipos — ADMIN_SISTEMA, ADMIN_NACIONAL
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />,
                  children: [
                    { path: '/admin/devices', element: lazySuspense(Placeholder) },
                    { path: '/admin/branches', element: lazySuspense(Placeholder) },
                  ],
                },

                // Sistema — solo ADMIN_SISTEMA
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA']} />,
                  children: [
                    { path: '/admin/audit', element: lazySuspense(Placeholder) },
                    { path: '/admin/settings', element: lazySuspense(Placeholder) },
                    { path: '/admin/permisos', element: lazySuspense(PermisosPage) },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // Rutas públicas
    { path: '/login', element: lazySuspense(Login) },
    { path: '/unauthorized', element: <Unauthorized /> },
    // Workbench — solo en desarrollo
    ...(import.meta.env.DEV
      ? [
          {
            path: '/lab',
            element: (
              <LabGuard>
                <Suspense fallback={<PageLoader />}>
                  <Lab />
                </Suspense>
              </LabGuard>
            ),
          },
          {
            path: '/lab2',
            element: (
              <LabGuard>
                <Suspense fallback={<PageLoader />}>
                  <Lab2 />
                </Suspense>
              </LabGuard>
            ),
          },
        ]
      : []),
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
)
