import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { navMain, rolLabels } from '@/components/layout/AppSidebar'
import { ProfileSheet } from '@/components/layout/ProfileSheet'
import { type RolUsuario, useSessionStore } from '@/stores/useSessionStore'
import { useAcceso } from '@/hooks/useAcceso'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, X, User } from 'lucide-react'
import { isTauri } from '@/lib/tauri'

export function TopNavBar() {
  const { pathname } = useLocation()
  const user          = useSessionStore((s) => s.user)
  const clearSession  = useSessionStore((s) => s.clearSession)
  const [profileOpen, setProfileOpen] = useState(false)
  const { puede, flagActivo, isAdmin } = useAcceso()

  const initials = user?.nombre
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  // Reescribe URLs que dependen del sucursal_id del usuario
  const rewriteUrl = (url: string): string => {
    const sid = user?.sucursal_id ?? 1
    if (url === '/cajas')        return `/cajas/principales/${sid}`
    if (url === '/cajas/cierre') return `/cajas/cierre/${sid}`
    return url
  }

  // Espeja la lógica de AppSidebar pero para contexto Tauri (solo plataforma tauri + sin restricción)
  const navItems = navMain
    .filter((g) => g.plataforma !== 'web')
    .flatMap((g) => g.items)
    .filter((item) => {
      if (item.plataforma === 'web') return false
      if (item.roles && !isAdmin && !item.roles.includes(user?.rol as RolUsuario)) return false
      if (item.permiso && !puede(item.permiso, item.flag)) return false
      if (!item.permiso && item.flag && !isAdmin && !flagActivo(item.flag)) return false
      return true
    })
    .map((item) => ({
      ...item,
      url:      item.url ? rewriteUrl(item.url) : undefined,
      children: item.children
        ?.filter((c) => {
          if (c.plataforma === 'web') return false
          if (c.roles && !isAdmin && !c.roles.includes(user?.rol as RolUsuario)) return false
          if (c.permiso && !puede(c.permiso, c.flag)) return false
          return true
        })
        .map((c) => ({ ...c, url: rewriteUrl(c.url) })),
    }))

  return (
    <header className="flex h-10 shrink-0 items-center border-b bg-sidebar px-3 gap-0">
      {/* Logo */}
      <Link to="/" className="flex items-center shrink-0 pr-3">
        <img src="/logo.png" alt="4-72" className="h-6 w-auto" />
      </Link>

      <Separator orientation="vertical" className="h-5 mx-1 bg-sidebar-border" />

      {/* Ítems de navegación — filtrados por plataforma y rol */}
      <nav className="flex items-center flex-1 gap-0.5 px-1">
        {navItems.map((item) => {
          // Item con hijos → dropdown
          if (item.children && item.children.length > 0) {
            const active = item.activePrefix
              ? pathname.startsWith(item.activePrefix)
              : item.children.some((c) => pathname === c.url)

            return (
              <DropdownMenu key={item.title}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors whitespace-nowrap outline-none',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon className="size-3.5 shrink-0" />
                    {item.title}
                    <ChevronDown className="size-3 opacity-60 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-44">
                  {item.children.map((child) => (
                    <DropdownMenuItem key={child.url} asChild>
                      <Link
                        to={child.url}
                        className={cn(
                          'flex items-center gap-2 cursor-pointer',
                          pathname.startsWith(child.url) && 'font-medium',
                        )}
                      >
                        <child.icon className="size-3.5 shrink-0" />
                        {child.title}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }

          // Item simple → enlace directo
          if (!item.url) return null
          const active = item.activePrefix
            ? pathname.startsWith(item.activePrefix)
            : pathname === item.url

          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors whitespace-nowrap',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="size-3.5 shrink-0" />
              {item.title}
            </Link>
          )
        })}
      </nav>

      {/* Cerrar ventana — solo Tauri */}
      {isTauri() && (
        <button
          onClick={() => import('@tauri-apps/api/window').then((m) => m.getCurrentWindow().close())}
          className="ml-1 flex size-7 items-center justify-center rounded text-sidebar-foreground/70 hover:bg-destructive hover:text-white transition-colors"
          title="Cerrar"
        >
          <X className="size-4" />
        </button>
      )}

      {/* Usuario */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent transition-colors outline-none ml-1">
            <Avatar className="size-5 rounded">
              <AvatarFallback className="rounded text-[9px] bg-sidebar-primary text-sidebar-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-24 truncate">{user?.nombre ?? '—'}</span>
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 h-4 shrink-0 border-sidebar-border text-sidebar-foreground/70"
            >
              {user ? rolLabels[user.rol] : ''}
            </Badge>
            <ChevronDown className="size-3 opacity-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <User className="size-3.5 mr-2" />
            Mi perfil
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

      <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
    </header>
  )
}
