import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Monitor, ToggleLeft, ClipboardList, Vault, Globe } from 'lucide-react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LabGuard } from '@/components/layout/LabGuard'
import { isTauri } from '@/lib/tauri'
import { type RolUsuario, useSessionStore } from '@/stores/useSessionStore'
import { useFeatureFlagsActivos } from '@/queries/feature-flags.queries'
import { useAcceso } from '@/hooks/useAcceso'

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
const ProductosPage           = lazy(() => import('@/pages/admin/Productos'))
const EstampillasAdminPage    = lazy(() => import('@/pages/admin/EstampillasAdmin'))
const FilateliaAdminPage      = lazy(() => import('@/pages/admin/FilateliaAdmin'))
const ProductosEspecialesPage = lazy(() => import('@/pages/admin/ProductosEspeciales'))
const ServiciosPage           = lazy(() => import('@/pages/admin/Servicios'))
const ApartadosPage           = lazy(() => import('@/pages/admin/ApartadosAdmin'))
const AsignacionCajerosPage = lazy(() => import('@/pages/admin/AsignacionCajerosPage'))
const AuditPage          = lazy(() => import('@/pages/admin/Audit'))
const PuntoVentasAdminPage = lazy(() => import('@/pages/admin/PuntoVentasAdmin'))
const PuntoCajasPage           = lazy(() => import('@/pages/cajas/PuntoCajas'))
const DetalleCajaPage          = lazy(() => import('@/pages/cajas/DetalleCaja'))
const AlertasCierrePage        = lazy(() => import('@/pages/cajas/AlertasCierre'))
const RegistroDiferenciasPage  = lazy(() => import('@/pages/cajas/RegistroDiferencias'))
const ConsolidadoComercioPage  = lazy(() => import('@/pages/cajas/ConsolidadoComercio'))
const PuntoVentasPage       = lazy(() => import('@/pages/ventas/PuntoVentas'))
const DashboardVentasPage   = lazy(() => import('@/pages/ventas/DashboardVentas'))
const CarritoVentaPage      = lazy(() => import('@/pages/ventas/CarritoVenta'))
const GirosPage             = lazy(() => import('@/pages/ventas/GirosPage'))
const RecaudosPage          = lazy(() => import('@/pages/ventas/RecaudosPage'))
const ApartadosVentaPage    = lazy(() => import('@/pages/ventas/ApartadosVentaPage'))
const GuiaViewerPage        = lazy(() => import('@/pages/ventas/GuiaViewer'))
const EnviosMasivosPage     = lazy(() => import('@/pages/ventas/EnviosMasivosPage'))
const GuiaDemoPage          = lazy(() => import('@/pages/GuiaDemo'))
const ReportesPage      = lazy(() => import('@/pages/Reportes'))
const ClientesPage      = lazy(() => import('@/pages/clientes/index'))
const TiposClientePage  = lazy(() => import('@/pages/clientes/TiposClientePage'))
const InventarioPage             = lazy(() => import('@/pages/inventario/InventarioPage'))
const SacasPage                  = lazy(() => import('@/pages/cajas/SacasPage'))

// ── Home redirect: cajeros/supervisores van directo a su área ─────────────────

function HomeRedirect() {
  const user = useSessionStore(s => s.user)

  if (user?.rol === 'CAJERO' || user?.rol === 'USUARIO_POST') {
    return <Navigate to="/ventas/estadisticas" replace />
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <Dashboard />
    </Suspense>
  )
}

// ── Ventas index: PuntoVentas maneja internamente el rol (cajero vs supervisor) ─

function VentasIndex() {
  return lazySuspense(PuntoVentasPage)
}

// ── Cajas redirect ────────────────────────────────────────────────────────────

function CajasRedirect() {
  const sucursalId = useSessionStore((s) => s.user?.sucursal_id)

  if (sucursalId) return <Navigate to={`/cajas/principales/${sucursalId}`} replace />

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <Vault className="size-10 text-muted-foreground/30" />
      <p className="font-medium">Sin sucursal asignada</p>
      <p className="text-sm text-muted-foreground">
        Tu cuenta no tiene una sucursal asociada. Contacta al administrador.
      </p>
    </div>
  )
}

// Bloquea acceso a sucursales ajenas. Admins pasan siempre.
function SucursalGuard() {
  const user      = useSessionStore((s) => s.user)
  const { sucursalId } = useParams<{ sucursalId: string }>()
  const isAdmin   = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL'
  const propiaSucursal = user?.sucursal_id

  if (!isAdmin && propiaSucursal != null && Number(sucursalId) !== propiaSucursal) {
    return <Navigate to={`/cajas/principales/${propiaSucursal}`} replace />
  }
  return <Outlet />
}

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

// ── Pantalla auditoría (próximamente) ────────────────────────────────────────
function AuditComingSoon() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-4">
        <div className="flex justify-center">
          <ClipboardList className="h-16 w-16 text-muted-foreground/40" />
        </div>
        <h1 className="text-xl font-semibold">Auditoría</h1>
        <p className="text-muted-foreground text-sm">
          El módulo de auditoría está en desarrollo. Pronto podrás consultar el historial completo de acciones del sistema.
        </p>
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

// ── Pantalla solo-web ─────────────────────────────────────────────────────────
function WebOnly() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-4">
        <div className="flex justify-center">
          <Globe className="h-16 w-16 text-muted-foreground/40" />
        </div>
        <h1 className="text-xl font-semibold">No esta permitido el acceso a la app de escritorio</h1>
        <p className="text-muted-foreground text-sm">
          Tu rol de administrador solo puede acceder desde el portal web 4-72.
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
    if (isTauri() && !import.meta.env.DEV) return <Navigate to="/unauthorized" replace />
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <Outlet />
}

function WebOnlyRoute() {
  if (isTauri() && !import.meta.env.DEV) return <Unauthorized />
  return <Outlet />
}

function RoleGuard({ roles }: { roles: RolUsuario[] }) {
  const userRol = useSessionStore((s) => s.user?.rol)

  if (!userRol || !roles.includes(userRol)) {
    return <Forbidden />
  }
  return <Outlet />
}

// Gatea por permiso dinámico (asignado por rol vía la matriz de Permisos),
// misma fuente de verdad que AppSidebar usa para decidir si mostrar el enlace.
function PermisoGuard({ permiso }: { permiso: string }) {
  const { tiene } = useAcceso()

  if (!tiene(permiso)) return <Forbidden />
  return <Outlet />
}

const DESKTOP_ONLY_ROLES: RolUsuario[] = ['CAJERO', 'SUPERVISOR_REGIONAL']
const WEB_ONLY_ROLES: RolUsuario[]     = ['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'USUARIO_POST', 'ADMINISTRATIVO', 'INVENTARIOS']

function PlatformGuard() {
  const userRol = useSessionStore((s) => s.user?.rol)

  if (userRol && DESKTOP_ONLY_ROLES.includes(userRol) && !isTauri()) {
    return <DesktopOnly />
  }
  if (userRol && WEB_ONLY_ROLES.includes(userRol) && isTauri()) {
    return <WebOnly />
  }
  return <Outlet />
}

function DesktopOnlyRoute() {
  if (!isTauri()) return <DesktopOnly />
  return <Outlet />
}

function FlagGuard({ flag }: { flag: string }) {
  const userRol    = useSessionStore((s) => s.user?.rol)
  const entorno    = import.meta.env.DEV ? 'dev' : (import.meta.env.VITE_ENTORNO ?? 'prod')
  const plataforma = isTauri() ? 'tauri' : 'web'
  const { data: activeFlags, isLoading } = useFeatureFlagsActivos({ entorno, plataforma })

  if (userRol === 'ADMIN_SISTEMA' || userRol === 'ADMIN_NACIONAL') return <Outlet />
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
                { path: '/', element: <HomeRedirect /> },

                // Gestión de usuarios — dinámico por permiso admin:usuarios
                {
                  element: <PermisoGuard permiso="admin:usuarios" />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_usuarios" />,
                      children: [{ path: '/admin/users', element: lazySuspense(UsersPage) }],
                    },
                  ],
                },

                // Catálogo — solo ADMIN_SISTEMA y ADMIN_NACIONAL pueden administrar
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_productos" />,
                      children: [
                        { path: '/admin/productos',           element: lazySuspense(ProductosPage) },
                        { path: '/admin/estampillas',         element: lazySuspense(EstampillasAdminPage) },
                        { path: '/admin/filatelia',           element: lazySuspense(FilateliaAdminPage) },
                        { path: '/admin/productos-especiales', element: lazySuspense(ProductosEspecialesPage) },
                      ],
                    },
                    {
                      element: <FlagGuard flag="modulo_servicios" />,
                      children: [{ path: '/admin/servicios', element: lazySuspense(ServiciosPage) }],
                    },
                    { path: '/admin/apartados', element: lazySuspense(ApartadosPage) },
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
                  ],
                },

                // Regionales y Sucursales — solo ADMIN_SISTEMA (super administrador)
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA']} />,
                  children: [
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

                // Panel Puntos de Venta — ADMIN_SISTEMA, ADMIN_NACIONAL
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_cajas" />,
                      children: [
                        { path: '/admin/puntos-venta', element: lazySuspense(PuntoVentasAdminPage) },
                      ],
                    },
                  ],
                },

                // Dashboard Gerencia — consolidado por comercio
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'TESORERIA']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo:tesoreria" />,
                      children: [
                        { path: '/cajas/consolidado', element: lazySuspense(ConsolidadoComercioPage) },
                      ],
                    },
                  ],
                },

                // Cajas — caja principal: SUPERVISOR_REGIONAL, TESORERIA
                {
                  element: <RoleGuard roles={['SUPERVISOR_REGIONAL', 'TESORERIA']} />,
                  children: [
                    {
                      element: <PermisoGuard permiso="caja:consultar" />,
                      children: [
                        { path: '/cajas',              element: <CajasRedirect /> },
                        { path: '/cajas/punto/:sesionId', element: lazySuspense(DetalleCajaPage) },
                        { path: '/cajas/sacas/:sucursalId', element: lazySuspense(SacasPage) },
                        {
                          element: <SucursalGuard />,
                          children: [
                            { path: '/cajas/principales/:sucursalId',     element: lazySuspense(PuntoCajasPage) },
                            { path: '/cajas/cierre/:sucursalId',          element: lazySuspense(AlertasCierrePage) },
                            { path: '/cajas/diferencias/:sucursalId',     element: lazySuspense(RegistroDiferenciasPage) },
                          ],
                        },
                      ],
                    },
                  ],
                },

                // Ventas — solo Tauri · caja auxiliar: CAJERO
                {
                  element: <DesktopOnlyRoute />,
                  children: [
                    {
                      element: <PermisoGuard permiso="ventas:consultar" />,
                      children: [
                        {
                          element: <FlagGuard flag="modulo:ventas" />,
                          children: [
                            { path: '/ventas',                          element: <VentasIndex /> },
                            { path: '/ventas/estadisticas',             element: lazySuspense(DashboardVentasPage) },
                            { path: '/ventas/apartados',                element: lazySuspense(ApartadosVentaPage) },
                            { path: '/ventas/caja/:cajaId',             element: lazySuspense(CarritoVentaPage) },
                            { path: '/ventas/caja/:cajaId/giros',       element: lazySuspense(GirosPage) },
                            { path: '/ventas/caja/:cajaId/recaudos',    element: lazySuspense(RecaudosPage) },
                            { path: '/ventas/masivos',                  element: lazySuspense(EnviosMasivosPage) },
                          ],
                        },
                      ],
                    },
                  ],
                },

                // Clientes — dinámico por permiso clientes:consultar
                {
                  element: <PermisoGuard permiso="clientes:consultar" />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo:clientes" />,
                      children: [
                        { path: '/clientes',                element: lazySuspense(ClientesPage) },
                        { path: '/clientes/tipos',          element: lazySuspense(TiposClientePage) },
                      ],
                    },
                  ],
                },

                // Inventario — INVENTARIOS + admins
                {
                  element: (
                    <RoleGuard roles={['INVENTARIOS', 'SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />
                  ),
                  children: [
                    {
                      element: <FlagGuard flag="modulo_inventario" />,
                      children: [
                        { path: '/inventario', element: lazySuspense(InventarioPage) },
                      ],
                    },
                  ],
                },

                // Reportes — todos los roles autenticados
                { path: '/reportes', element: lazySuspense(ReportesPage) },

                // Solo ADMIN_SISTEMA
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA']} />,
                  children: [
                    {
                      element: <FlagGuard flag="modulo_comercios" />,
                      children: [{ path: '/admin/comercios', element: lazySuspense(ComerciosPage) }],
                    },
                    { path: '/admin/feature-flags',       element: lazySuspense(FeatureFlagsPage) },
                    { path: '/admin/asignacion-cajeros',  element: lazySuspense(AsignacionCajerosPage) },
                  ],
                },

                // Permisos — dinámico por permiso admin:usuarios
                {
                  element: <PermisoGuard permiso="admin:usuarios" />,
                  children: [
                    {
                      element: <FlagGuard flag="sistema_permisos" />,
                      children: [{ path: '/admin/permisos', element: lazySuspense(PermisosPage) }],
                    },
                  ],
                },

                // Auditoría — ADMIN_SISTEMA, ADMIN_NACIONAL
                {
                  element: <RoleGuard roles={['ADMIN_SISTEMA', 'ADMIN_NACIONAL']} />,
                  children: [
                    { path: '/admin/audit', element: lazySuspense(AuditPage) },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },

    // Rutas públicas — login solo en web, no en Tauri
    {
      element: <WebOnlyRoute />,
      children: [{ path: '/login', element: lazySuspense(Login) }],
    },
    { path: '/unauthorized', element: <Unauthorized /> },
    { path: '/guia-viewer', element: lazySuspense(GuiaViewerPage) },
    { path: '/guia-demo',   element: lazySuspense(GuiaDemoPage) },
    // Workbench — solo ADMIN_SISTEMA
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
    // Mockups de pantallas — acceso directo sin guard
    {
      path: '/lab3',
      element: (
        <Suspense fallback={<PageLoader />}>
          <Lab3 />
        </Suspense>
      ),
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  {
    future: {
      v7_relativeSplatPath:           true,
      v7_fetcherPersist:              true,
      v7_normalizeFormMethod:         true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)
