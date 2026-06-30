import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  usePermisosMatrix,
  useAsignarPermiso,
  useRevocarPermiso,
} from '@/queries/permisos.queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ── Carousel de roles ─────────────────────────────────────────────────────────

interface RolCarouselProps {
  roles: { id: string; nombre: string; descripcion: string | null }[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function RolCarousel({ roles, selectedId, onSelect }: RolCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-sm"
        onClick={() => scroll('left')}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth px-10 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {roles.map((rol) => (
          <button
            key={rol.id}
            onClick={() => onSelect(rol.id)}
            className={cn(
              'flex-shrink-0 rounded-xl border p-4 text-left w-44 transition-all duration-150',
              'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedId === rol.id
                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                : 'border-border hover:border-muted-foreground/40 bg-card',
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck
                className={cn(
                  'size-4 shrink-0',
                  selectedId === rol.id ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium leading-tight',
                  selectedId === rol.id && 'text-primary',
                )}
              >
                {rol.nombre}
              </span>
            </div>
            {rol.descripcion && (
              <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                {rol.descripcion}
              </p>
            )}
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm shadow-sm"
        onClick={() => scroll('right')}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

// ── Card de módulo con checkboxes ─────────────────────────────────────────────

interface ModuloCardProps {
  modulo: {
    id: string
    nombre: string
    descripcion: string | null
    permisos: { id: string; nombre: string; descripcion: string | null }[]
  }
  selectedPermisoIds: Set<string>
  disabled: boolean
  onToggle: (permisoId: string, tienePermiso: boolean) => void
}

function ModuloCard({ modulo, selectedPermisoIds, disabled, onToggle }: ModuloCardProps) {
  const total    = modulo.permisos.length
  const asignados = modulo.permisos.filter((p) => selectedPermisoIds.has(p.id)).length

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">{modulo.nombre}</CardTitle>
          <Badge variant={asignados === 0 ? 'outline' : asignados === total ? 'default' : 'secondary'}>
            {asignados}/{total}
          </Badge>
        </div>
        {modulo.descripcion && (
          <p className="text-xs text-muted-foreground">{modulo.descripcion}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {modulo.permisos.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Sin permisos definidos.</p>
        ) : (
          modulo.permisos.map((permiso) => {
            const checked = selectedPermisoIds.has(permiso.id)
            const checkId = `perm-${permiso.id}`
            return (
              <div key={permiso.id} className="flex items-start gap-2.5">
                <Checkbox
                  id={checkId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => onToggle(permiso.id, checked)}
                  className="mt-0.5 shrink-0"
                />
                <label
                  htmlFor={checkId}
                  className={cn(
                    'text-sm leading-snug cursor-pointer select-none',
                    disabled && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {permiso.nombre}
                  {permiso.descripcion && (
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      {permiso.descripcion}
                    </span>
                  )}
                </label>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Permisos() {
  const { data: matrix, isLoading } = usePermisosMatrix()
  const asignar = useAsignarPermiso()
  const revocar = useRevocarPermiso()

  const [selectedRolId, setSelectedRolId] = useState<string | null>(null)

  // Auto-selecciona el primer rol al cargar
  useEffect(() => {
    if (matrix?.roles.length && !selectedRolId) {
      setSelectedRolId(matrix.roles[0].id)
    }
  }, [matrix, selectedRolId])

  const selectedRol = matrix?.roles.find((r) => r.id === selectedRolId)
  const selectedPermisoIds = new Set(selectedRol?.permisoIds ?? [])
  const isMutating = asignar.isPending || revocar.isPending

  function handleToggle(permisoId: string, tienePermiso: boolean) {
    if (!selectedRolId) return
    const fn = tienePermiso ? revocar : asignar
    fn.mutate(
      { rolId: selectedRolId, permisoId },
      { onError: (e) => toast.error(e.message) },
    )
  }

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-44 rounded-xl shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!matrix) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Permisos por Rol</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecciona un rol para ver y editar sus permisos. Los cambios aplican en el próximo login.
        </p>
      </div>

      {/* Carousel de roles */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
          Roles ({matrix.roles.length})
        </p>
        <RolCarousel
          roles={matrix.roles}
          selectedId={selectedRolId}
          onSelect={setSelectedRolId}
        />
      </div>

      {/* Módulos y permisos */}
      {selectedRol ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Permisos de{' '}
            </p>
            <Badge variant="outline" className="text-xs font-semibold">
              {selectedRol.nombre}
            </Badge>
            {isMutating && (
              <span className="text-xs text-muted-foreground animate-pulse">Guardando…</span>
            )}
          </div>

          {matrix.modulos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No hay módulos definidos. Crea módulos desde la API.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matrix.modulos.map((modulo) => (
                <ModuloCard
                  key={modulo.id}
                  modulo={modulo}
                  selectedPermisoIds={selectedPermisoIds}
                  disabled={isMutating}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Selecciona un rol del carrusel para comenzar.
        </div>
      )}
    </div>
  )
}
