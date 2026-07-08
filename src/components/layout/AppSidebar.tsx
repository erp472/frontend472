import {
  LayoutDashboard,
  Users,
  Monitor,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  MapPin,
  Building,
  Store,
  Package,
  Truck,
  ToggleLeft,
  ScrollText,
  Settings2,
} from 'lucide-react'
import { useState } from 'react'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useSessionStore } from '@/stores/useSessionStore'
import { useFeatureFlagsActivos } from '@/queries/feature-flags.queries'
import { ProfileSheet } from './ProfileSheet'
import { cn } from '@/lib/utils'

interface NavChild {
  title:  string
  url:    string
  icon:   React.ElementType
  roles?: string[]
  flag?:  string
}

interface NavItem {
  title:       string
  url?:        string
  icon:        React.ElementType
  roles?:      string[]
  flag?:       string
  children?:   NavChild[]
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
      { title: 'Permisos', url: '/admin/permisos', icon: ShieldCheck, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'], flag: 'sistema_permisos' },
      {
        title:    'Configuración',
        icon:     Settings2,
        roles:    ['ADMIN_SISTEMA'],
        children: [
          { title: 'Aperturas', url: '/admin/feature-flags', icon: ToggleLeft, roles: ['ADMIN_SISTEMA'], flag: 'sistema_aperturas' },
          { title: 'Auditoría', url: '/admin/audit',         icon: ScrollText, roles: ['ADMIN_SISTEMA'], flag: 'sistema_auditoria' },
        ],
      },
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
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({ 'Configuración': true })
  const [profileOpen, setProfileOpen] = useState(false)

  const toggleItem = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }))

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
          const isAdmin = user?.rol === 'ADMIN_SISTEMA'

          const visibleItems = group.items
            .filter((item) => {
              const rolOk = !item.roles || (user && item.roles.includes(user.rol))
              // ADMIN_SISTEMA ve todos los módulos aunque el flag esté inactivo
              const flagOk = !item.flag || isAdmin || activeFlags?.some((f) => f.codigo === item.flag)
              return rolOk && flagOk
            })
            .map((item) => ({
              ...item,
              flagOff: isAdmin && !!item.flag && !activeFlags?.some((f) => f.codigo === item.flag),
            }))
          if (visibleItems.length === 0) return null

          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    if (item.children) {
                      const visibleChildren = item.children.filter((c) => {
                        const rolOk  = !c.roles || (user && c.roles.includes(user.rol))
                        const flagOk = !c.flag  || isAdmin || activeFlags?.some((f) => f.codigo === c.flag)
                        return rolOk && flagOk
                      })
                      if (visibleChildren.length === 0) return null
                      const childActive = visibleChildren.some((c) => pathname === c.url)
                      const isOpen = openItems[item.title] ?? childActive

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            tooltip={item.title}
                            isActive={childActive}
                            onClick={() => toggleItem(item.title)}
                            className="cursor-pointer"
                          >
                            <item.icon />
                            <span>{item.title}</span>
                            {!collapsed && (
                              isOpen
                                ? <ChevronDown  className="ml-auto size-4" />
                                : <ChevronRight className="ml-auto size-4" />
                            )}
                          </SidebarMenuButton>
                          {isOpen && !collapsed && (
                            <SidebarMenuSub>
                              {visibleChildren.map((child) => (
                                <SidebarMenuSubItem key={child.url}>
                                  <SidebarMenuSubButton asChild isActive={pathname === child.url}>
                                    <Link to={child.url} className={cn(pathname === child.url && 'font-medium')}>
                                      <child.icon />
                                      <span>{child.title}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      )
                    }

                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                          <Link to={item.url!} className={cn(pathname === item.url && 'font-medium')}>
                            <item.icon />
                            <span>{item.title}</span>
                            {item.flagOff && !collapsed && (
                              <ToggleLeft className="ml-auto size-3.5 text-muted-foreground/50" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
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
            <SidebarMenuButton
              size="lg"
              onClick={() => setProfileOpen(true)}
              tooltip="Mi perfil"
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
              <ChevronDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </Sidebar>
  )
}
