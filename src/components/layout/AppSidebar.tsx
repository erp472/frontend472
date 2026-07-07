import {
  LayoutDashboard,
  Users,
  Monitor,
  Settings,
  ShieldCheck,
  ChevronDown,
  MapPin,
  Building,
  Store,
  Package,
  Truck,
  ToggleLeft,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useSessionStore } from '@/stores/useSessionStore'
import { useFeatureFlagsActivos } from '@/queries/feature-flags.queries'
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles?: string[]
  flag?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navMain: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Administración',
    items: [
      { title: 'Usuarios',    url: '/admin/users',      icon: Users,     roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'SUPERVISOR_REGIONAL', 'ADMINISTRATIVO'], flag: 'modulo_usuarios' },
      { title: 'Comercios',   url: '/admin/comercios',  icon: Building,  roles: ['ADMIN_SISTEMA'], flag: 'modulo_comercios' },
      { title: 'Regionales',  url: '/admin/regionales', icon: MapPin,    roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'], flag: 'modulo_regionales' },
      { title: 'Sucursales',  url: '/admin/branches',   icon: Store,     roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'], flag: 'modulo_sucursales' },
      { title: 'Equipos',     url: '/admin/devices',    icon: Monitor,   roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'], flag: 'modulo_equipos' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { title: 'Productos', url: '/admin/productos', icon: Package, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'SUPERVISOR_REGIONAL', 'CAJERO', 'TESORERIA', 'ADMINISTRATIVO'], flag: 'modulo_productos' },
      { title: 'Servicios', url: '/admin/servicios', icon: Truck,   roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'SUPERVISOR_REGIONAL', 'CAJERO', 'TESORERIA', 'ADMINISTRATIVO'], flag: 'modulo_servicios' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Permisos',       url: '/admin/permisos',       icon: ShieldCheck, roles: ['ADMIN_SISTEMA'] },
      { title: 'Feature Flags',  url: '/admin/feature-flags',  icon: ToggleLeft,  roles: ['ADMIN_SISTEMA'] },
      { title: 'Configuración',  url: '/admin/settings',       icon: Settings,    roles: ['ADMIN_SISTEMA'] },
    ],
  },
]

const rolLabels: Record<string, string> = {
  USUARIO_POST: 'Usuario Post',
  CAJERO: 'Cajero',
  ADMINISTRATIVO: 'Administrativo',
  TESORERIA: 'Tesorería',
  INVENTARIOS: 'Inventarios',
  SUPERVISOR_REGIONAL: 'Supervisor',
  ADMIN_NACIONAL: 'Admin Nacional',
  ADMIN_SISTEMA: 'Admin Sistema',
}

export { navMain, rolLabels }

export function AppSidebar({ side = 'left' }: { side?: 'left' | 'right' }) {
  const { pathname } = useLocation()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)

  const entorno = import.meta.env.DEV ? 'dev' : import.meta.env.VITE_ENTORNO ?? 'prod'
  const { data: activeFlags } = useFeatureFlagsActivos({ entorno, plataforma: 'web' })

  const initials = user?.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <Sidebar collapsible="icon" side={side}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="justify-center bg-white/95 hover:bg-white active:bg-white data-active:bg-white"
            >
              <Link to="/">
                {collapsed ? (
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold shrink-0 leading-none">
                    <span style={{ color: '#FDC52F' }}>«</span>
                    <span style={{ color: '#E51937' }}>»</span>
                  </div>
                ) : (
                  <img src="/logo.png" alt="4-72" className="h-7 w-auto" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navMain.map((group) => {
          const visibleItems = group.items.filter((item) => {
            const rolOk = !item.roles || (user && item.roles.includes(user.rol))
            const isAdmin = user?.rol === 'ADMIN_SISTEMA'
            const flagOk = !item.flag || isAdmin || activeFlags?.some((f) => f.codigo === item.flag)
            return rolOk && flagOk
          })
          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                      >
                        <Link
                          to={item.url}
                          className={cn(
                            pathname === item.url && 'font-medium',
                          )}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col leading-tight text-left">
                    <span className="truncate text-sm font-medium">
                      {user?.nombre ?? '—'}
                    </span>
                    <Badge variant="outline" className="w-fit text-[10px] px-1 py-0 mt-0.5">
                      {user ? rolLabels[user.rol] : ''}
                    </Badge>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-56"
              >
                <DropdownMenuItem disabled>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={clearSession}
                >
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
