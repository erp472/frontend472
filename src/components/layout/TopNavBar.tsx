import { Link, useLocation } from 'react-router-dom'
import { navMain, rolLabels } from '@/components/layout/AppSidebar'
import { useSessionStore } from '@/stores/useSessionStore'
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
import { ChevronDown, X } from 'lucide-react'
import { isTauri } from '@/lib/tauri'

export function TopNavBar() {
  const { pathname } = useLocation()
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)

  const initials =
    user?.nombre
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?'

  // Todos los ítems visibles en una sola lista plana
  const visibleItems = navMain
    .flatMap((g) => g.items)
    .filter((item) => !item.roles || (user && item.roles.includes(user.rol)))

  return (
    <header className="flex h-10 shrink-0 items-center border-b bg-sidebar px-3 gap-0">
      {/* Logo */}
      <Link to="/" className="flex items-center shrink-0 pr-3">
        <img src="/logo.png" alt="4-72" className="h-6 w-auto" />
      </Link>

      <Separator orientation="vertical" className="h-5 mx-1 bg-sidebar-border" />

      {/* Ítems de navegación — todos unidos en una fila */}
      <nav className="flex items-center flex-1 overflow-x-auto gap-0.5 px-1">
        {visibleItems.map((item) => {
          const active = pathname === item.url
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

      {/* Cerrar ventana — solo Tauri fullscreen */}
      {isTauri() && (
        <button
          onClick={() => import('@tauri-apps/api/window').then((m) => m.getCurrentWindow().close())}
          className="ml-1 flex size-7 items-center justify-center rounded text-sidebar-foreground/70 hover:bg-[#da001c] hover:text-white transition-colors"
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
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={clearSession}
          >
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
