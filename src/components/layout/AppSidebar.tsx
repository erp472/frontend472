import {
  LayoutDashboard,
  Users,
  Monitor,
  Building2,
  ScrollText,
  Settings,
  ChevronDown,
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
import { cn } from '@/lib/utils'

interface NavItem {
  title: string
  url: string
  icon: React.ElementType
  roles?: string[]
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
    label: 'Gestión',
    items: [
      { title: 'Usuarios', url: '/admin/users', icon: Users, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL', 'SUPERVISOR_REGIONAL', 'ADMINISTRATIVO'] },
      { title: 'Equipos', url: '/admin/devices', icon: Monitor, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'] },
      { title: 'Sucursales', url: '/admin/branches', icon: Building2, roles: ['ADMIN_SISTEMA', 'ADMIN_NACIONAL'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Auditoría', url: '/admin/audit', icon: ScrollText, roles: ['ADMIN_SISTEMA'] },
      { title: 'Configuración', url: '/admin/settings', icon: Settings, roles: ['ADMIN_SISTEMA'] },
    ],
  },
]

const rolLabels: Record<string, string> = {
  CAJERO: 'Cajero',
  ADMINISTRATIVO: 'Administrativo',
  TESORERIA: 'Tesorería',
  INVENTARIOS: 'Inventarios',
  SUPERVISOR_REGIONAL: 'Supervisor',
  ADMIN_NACIONAL: 'Admin Nacional',
  ADMIN_SISTEMA: 'Admin Sistema',
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)

  const initials = user?.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                  472
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-sm">4-72 Admin</span>
                  <span className="text-xs text-muted-foreground">Servicios Postales</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navMain.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              !item.roles ||
              (user && item.roles.includes(user.rol)),
          )
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
