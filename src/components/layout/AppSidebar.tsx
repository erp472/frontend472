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
  Vault,
  UserRound,
  Tag,
  ReceiptText,
  ShoppingCart,
  BarChart2,
  Bell,
  MailOpen,
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
import { type RolUsuario, useSessionStore } from '@/stores/useSessionStore'
import { useAcceso } from '@/hooks/useAcceso'
import { ProfileSheet } from './ProfileSheet'
import { cn } from '@/lib/utils'

interface NavChild {
  title:       string
  url:         string
  icon:        React.ElementType
  permiso?:    string
  flag?:       string
  plataforma?: 'tauri' | 'web'
  roles?:      RolUsuario[]
}

interface NavItem {
  title:         string
  url?:          string
  icon:          React.ElementType
  permiso?:      string
  flag?:         string
  activePrefix?: string
  plataforma?:   'tauri' | 'web'
  roles?:        RolUsuario[]
  children?:     NavChild[]
}

interface NavGroup {
  label:      string
  plataforma?: 'web'
  items:      NavItem[]
}

const navMain: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    ],
  },
  {
    label:      'Administración',
    plataforma: 'web',
    items: [
      { title: 'Usuarios',        url: '/admin/users',        icon: Users,       permiso: 'admin:usuarios', roles: ['ADMIN_SISTEMA'],                   flag: 'modulo_usuarios'   },
      { title: 'Comercios',       url: '/admin/comercios',    icon: Building,    roles: ['ADMIN_SISTEMA'],                                                     flag: 'modulo_comercios'  },
      { title: 'Regionales',      url: '/admin/regionales',   icon: MapPin,      roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'],                                   flag: 'modulo_regionales' },
      { title: 'Sucursales',      url: '/admin/branches',     icon: Store,       roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'],                                   flag: 'modulo_sucursales' },
      { title: 'Cajas auxiliares', url: '/admin/puntos-venta', icon: ReceiptText, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'],                                   flag: 'modulo_cajas'      },
      { title: 'Equipos',         url: '/admin/devices',      icon: Monitor,     roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'],                                   flag: 'modulo_equipos'    },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { title: 'Inventario', url: '/inventario', icon: Package, roles: ['INVENTARIOS', 'SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA', 'ADMIN_NACIONAL'] },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      {
        title:        'Cajas',
        icon:         Vault,
        activePrefix: '/cajas',
        permiso:      'caja:consultar',
        flag:         'modulo:caja',
        roles:        ['SUPERVISOR_REGIONAL', 'TESORERIA'],
        children: [
          { title: 'Panel principal',   url: '/cajas',        icon: LayoutDashboard, permiso: 'caja:consultar' },
          { title: 'Alertas de cierre', url: '/cajas/cierre', icon: Bell,            permiso: 'caja:consultar' },
        ],
      },
      { title: 'Ventas', url: '/ventas', icon: ShoppingCart, activePrefix: '/ventas', permiso: 'ventas:consultar', flag: 'modulo:ventas', plataforma: 'tauri', roles: ['CAJERO'] },
      {
        title:         'Clientes',
        icon:          UserRound,
        activePrefix:  '/clientes',
        permiso:       'clientes:consultar',
        flag:          'modulo:clientes',
        plataforma:    'web',
        roles:         ['CAJERO', 'SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA', 'ADMINISTRATIVO'],
        children: [
          { title: 'Directorio',         url: '/clientes',       icon: UserRound, permiso: 'clientes:consultar' },
          { title: 'Tipos / Beneficios', url: '/clientes/tipos', icon: Tag,       permiso: 'clientes:crear'     },
        ],
      },
    ],
  },
  {
    label:      'Catálogo',
    plataforma: 'web',
    items: [
      { title: 'Productos',  url: '/admin/productos',  icon: Package,  roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'], flag: 'modulo_productos' },
      { title: 'Servicios',  url: '/admin/servicios',  icon: Truck,    roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'], flag: 'modulo_servicios' },
      { title: 'Apartados',  url: '/admin/apartados',  icon: MailOpen, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'] },
    ],
  },
  {
    label: 'Reportes',
    items: [
      { title: 'Reportes', url: '/reportes', icon: BarChart2, activePrefix: '/reportes' },
    ],
  },
  {
    label:      'Sistema',
    plataforma: 'web',
    items: [
      { title: 'Permisos', url: '/admin/permisos', icon: ShieldCheck, roles: ['ADMIN_SISTEMA'], permiso: 'admin:usuarios', flag: 'sistema_permisos' },
      {
        title:    'Configuración',
        icon:     Settings2,
        roles:    ['ADMIN_SISTEMA'],
        children: [
          { title: 'Aperturas', url: '/admin/feature-flags', icon: ToggleLeft, roles: ['ADMIN_SISTEMA'], permiso: 'admin:feature_flags', flag: 'sistema_aperturas' },
          { title: 'Auditoría', url: '/admin/audit',         icon: ScrollText, roles: ['ADMIN_SISTEMA'], permiso: 'admin:auditoria',     flag: 'sistema_auditoria' },
        ],
      },
    ],
  },
]

const rolLabels: Record<string, string> = {
  USUARIO_POST:        'Usuario Post',
  CAJERO:              'Cajero',
  ADMINISTRATIVO:      'Administrativo',
  TESORERIA:           'Tesorería',
  INVENTARIOS:         'Inventarios',
  SUPERVISOR_REGIONAL: 'Supervisor',
  ADMIN_NACIONAL:      'Admin Nacional',
  ADMIN_SISTEMA:       'Admin Sistema',
}

export { navMain, rolLabels }

export function AppSidebar({ side = 'left' }: { side?: 'left' | 'right' }) {
  const { pathname } = useLocation()
  const { state }   = useSidebar()
  const collapsed   = state === 'collapsed'
  const user        = useSessionStore((s) => s.user)
  const { puede, flagActivo, isAdmin, esTauri } = useAcceso()

  const [openItems,   setOpenItems]   = useState<Record<string, boolean>>({ 'Configuración': true })
  const [profileOpen, setProfileOpen] = useState(false)

  const toggleItem = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }))

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
          if (group.plataforma === 'web' && esTauri) return null

          const visibleItems = group.items
            .filter((item) => {
              if (item.plataforma === 'tauri' && !esTauri) return false
              if (item.plataforma === 'web'   &&  esTauri) return false
              if (item.roles && !isAdmin && !item.roles.includes(user?.rol as RolUsuario)) return false
              if (item.permiso && !puede(item.permiso, item.flag)) return false
              if (!item.permiso && item.flag && !isAdmin && !flagActivo(item.flag)) return false
              return true
            })
            .map((item) => ({
              ...item,
              url:     item.url === '/cajas' ? `/cajas/principales/${user?.sucursal_id ?? 1}` : item.url,
              flagOff: isAdmin && !!item.flag && !flagActivo(item.flag),
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
                        if (c.plataforma === 'tauri' && !esTauri) return false
                        if (c.plataforma === 'web'   &&  esTauri) return false
                        if (c.roles && !isAdmin && !c.roles.includes(user?.rol as RolUsuario)) return false
                        if (c.permiso && !puede(c.permiso, c.flag)) return false
                        if (!c.permiso && c.flag && !isAdmin && !flagActivo(c.flag)) return false
                        return true
                      })
                      if (visibleChildren.length === 0) return null
                      const childActive = visibleChildren.some((c) => pathname === c.url)
                      const isOpen      = openItems[item.title] ?? childActive

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
                        <SidebarMenuButton
                          asChild
                          isActive={item.activePrefix ? pathname.startsWith(item.activePrefix) : pathname === item.url}
                          tooltip={item.title}
                        >
                          <Link
                            to={item.url!}
                            className={cn((item.activePrefix ? pathname.startsWith(item.activePrefix) : pathname === item.url) && 'font-medium')}
                          >
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
