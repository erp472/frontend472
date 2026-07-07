import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Monitor, ToggleLeft } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LabGuard } from '@/components/layout/LabGuard'
import { isTauri } from '@/lib/tauri'
import { type RolUsuario, useSessionStore } from '@/stores/useSessionStore'
import { useFeatureFlagsActivos } from '@/queries/feature-flags.queries'

// ── Lazy pages ────────────────────────────────────────────────────────────────
const Dashboard    = lazy(() => import('@/pages/Dashboard'))
const Login        = lazy(() => import('@/pages/Login'))
const Lab          = lazy(() => import('@/pages/Lab'))
const Lab2         = lazy(() => import('@/pages/Lab2'))
const Lab3         = lazy(() => import('@/pages/Lab3'))
const UsersPage    = lazy(() => import('@/pages/admin/Users'))
const PermisosPage = lazy(() => import('@/pages/admin/Permisos'))
const FeatureFlagsPage = lazy(() => import('@/pages/admin/FeatureFlags'))
const ComerciosPage  = lazy(() => import('@/pages/admin/Comercios'))
const RegionalesPage = lazy(() => import('@/pages/admin/Regionales'))
const SucursalesPage = lazy(() => import('@/pages/admin/Sucursales'))
const EquiposPage    = lazy(() => import('@/pages/admin/Equipos'))
const ProductosPage  = lazy(() => import('@/pages/admin/Productos'))
const ServiciosPage  = lazy(() => import('@/pages/admin/Servicios'))

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

// ── Pantalla módulo desactivado ───────────────────────────────────────────────
function ModuleUnavailable() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-4">
        <div className="flex justify-center">
          <ToggleLeft className="h-16 w-16 text-muted-foreground/40" />
        </div>
        <h1 className="text-xl font-semibold">Módulo no disponible</h1>
        <p className="text-muted-foreground text-sm">
          Este módulo está desactivado en el entorno actual. Contacta al administrador del sistema.
        </p>
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

function FlagGuard({ flag }: { flag: string }) {
  const userRol = useSessionStore((s) => s.user?.rol)
  const entorno = import.meta.env.DEV ? 'dev' : (import.meta.env.VITE_ENTORNO ?? 'prod')
  const { data: activeFlags, isLoading } = useFeatureFlagsActivos({ entorno, plataforma: 'web' })

  if (userRol === 'ADMIN_SISTEMA') return <Outlet />
  if (isLoading) return <PageLoader />
  if (!activeFlags?.some((f) => f.codigo === flag)) return <ModuleUnavailable />
  return <Outlet />
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lazySuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
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
                  children: [
                    {
                      element: <FlagGuard flag="modulo_usuarios" />,
                      children: [{ path: '/admin/users', element: lazySuspense(UsersPage) }],
                    },
                  ],
                },

                // Catálogo — ADMIN_SISTEMA, ADMIN_NACIONAL + lectura para otros roles
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'SUPERVISOR_REGIONAL', 'CAJERO', 'TESORERIA', 'ADMINISTRATIVO']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_productos" />,
                      children: [{ path: '/admin/productos', element: lazySuspense(ProductosPage) }],
                    },
                    {
                      element: <FlagGuard flag="modulo_servicios" />,
                      children: [{ path: '/admin/servicios', element: lazySuspense(ServiciosPage) }],
                    },
                  ],
                },

                // Gestión operativa — ADMIN_SISTEMA, ADMIN_NACIONAL
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_equipos" />,
                      children: [{ path: '/admin/devices', element: lazySuspense(EquiposPage) }],
                    },
                    {
                      element: <FlagGuard flag="modulo_sucursales" />,
                      children: [{ path: '/admin/branches', element: lazySuspense(SucursalesPage) }],
                    },
                    {
                      element: <FlagGuard flag="modulo_regionales" />,
                      children: [{ path: '/admin/regionales', element: lazySuspense(RegionalesPage) }],
                    },
                  ],
                },

                // Solo ADMIN_SISTEMA
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_comercios" />,
                      children: [{ path: '/admin/comercios', element: lazySuspense(ComerciosPage) }],
                    },
                    { path: '/admin/audit',         element: lazySuspense(FeatureFlagsPage) },
                    { path: '/admin/settings',      element: lazySuspense(FeatureFlagsPage) },
                    { path: '/admin/feature-flags', element: lazySuspense(FeatureFlagsPage) },
                    { path: '/admin/permisos',      element: lazySuspense(PermisosPage) },
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
          {
            path: '/lab3',
            element: (
              <Suspense fallback={<PageLoader />}>
                <Lab3 />
              </Suspense>
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
