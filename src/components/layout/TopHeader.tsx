import { Link } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSessionStore } from '@/stores/useSessionStore'

const rolLabels: Record<string, string> = {
  CAJERO: 'Cajero',
  ADMINISTRATIVO: 'Administrativo',
  TESORERIA: 'Tesorería',
  INVENTARIOS: 'Inventarios',
  SUPERVISOR_REGIONAL: 'Supervisor',
  ADMIN_NACIONAL: 'Admin Nacional',
  ADMIN_SISTEMA: 'Admin Sistema',
}

export function TopHeader() {
  const user = useSessionStore((s) => s.user)
  const clearSession = useSessionStore((s) => s.clearSession)

  const initials =
    user?.nombre
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?'

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Link to="/" className="flex items-center gap-2">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          472
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-sm">4-72 Admin</span>
          <span className="hidden text-xs text-muted-foreground sm:block">
            Servicios Postales
          </span>
        </div>
      </Link>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-9 items-center gap-2 px-2">
            <Avatar className="size-7 rounded-lg">
              <AvatarFallback className="rounded-lg text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start leading-tight sm:flex">
              <span className="max-w-[140px] truncate text-sm font-medium">
                {user?.nombre ?? '—'}
              </span>
              <Badge variant="outline" className="mt-0.5 w-fit px-1 py-0 text-[10px]">
                {user ? rolLabels[user.rol] : ''}
              </Badge>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem disabled>
            <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
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
