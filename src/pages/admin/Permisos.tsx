import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2, AlertTriangle, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  usePermisosMatrix,
  useAsignarPermiso,
  useRevocarPermiso,
  useUpdateRol,
  useDeleteRol,
  useCreateRol,
} from '@/queries/permisos.queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type RolItem = { id: number; nombre: string; descripcion: string | null }

// ── Modal crear rol ───────────────────────────────────────────────────────────

interface CrearRolModalProps {
  open: boolean
  onClose: () => void
  onCreated: (id: number) => void
}

function CrearRolModal({ open, onClose, onCreated }: CrearRolModalProps) {
  const [codigo, setCodigo] = useState('')
  const [nombre, setNombre] = useState('')
  const createRol = useCreateRol()

  useEffect(() => {
    if (!open) return
    setCodigo('')
    setNombre('')
  }, [open])

  async function handleCreate() {
    if (!codigo.trim() || !nombre.trim()) return
    try {
      const result = await createRol.mutateAsync({
        codigoroles: codigo.trim().toUpperCase().replace(/\s+/g, '_'),
        nombreroles: nombre.trim(),
      })
      toast.success(`Rol "${nombre}" creado`)
      onCreated(result.id)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear rol')
    }
  }

  const codigoPreview = codigo.trim().toUpperCase().replace(/\s+/g, '_')
  const canSubmit = codigo.trim().length >= 2 && nombre.trim().length >= 2

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Crear nuevo rol
          </DialogTitle>
          <DialogDescription>
            El rol estará disponible de inmediato en el carrusel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="create-rol-codigo">Código del rol</Label>
            <Input
              id="create-rol-codigo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: SUPERVISOR_ZONAL"
              className="font-mono uppercase"
              maxLength={40}
              autoFocus
            />
            {codigoPreview && codigoPreview !== codigo.toUpperCase() && (
              <p className="text-xs text-muted-foreground">
                Se guardará como: <code className="font-mono font-semibold">{codigoPreview}</code>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-rol-nombre">Nombre visible</Label>
            <Input
              id="create-rol-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Supervisor Zonal"
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canSubmit || createRol.isPending}
          >
            {createRol.isPending ? 'Creando…' : 'Crear rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Modal editar / eliminar rol ───────────────────────────────────────────────

interface RolModalProps {
  rol: RolItem | null
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

function RolModal({ rol, open, onClose, onDeleted }: RolModalProps) {
  const [nombre, setNombre] = useState('')
  const [phase, setPhase] = useState<'edit' | 'delete'>('edit')
  const [deleteWord, setDeleteWord] = useState('')

  const updateRol = useUpdateRol()
  const deleteRol = useDeleteRol()

  useEffect(() => {
    if (!open) return
    setNombre(rol?.nombre ?? '')
    setPhase('edit')
    setDeleteWord('')
  }, [open, rol])

  async function handleSave() {
    if (!rol || !nombre.trim()) return
    try {
      await updateRol.mutateAsync({ id: rol.id, nombre: nombre.trim() })
      toast.success('Rol actualizado')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    }
  }

  async function handleDelete() {
    if (!rol || deleteWord !== 'Delete') return
    try {
      await deleteRol.mutateAsync(rol.id)
      toast.success(`Rol "${rol.nombre}" eliminado`)
      onDeleted()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        {phase === 'edit' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Editar rol
              </DialogTitle>
              <DialogDescription>
                Los cambios aplican al próximo inicio de sesión de los usuarios.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 py-1">
              <Label htmlFor="modal-rol-nombre">Nombre</Label>
              <Input
                id="modal-rol-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del rol"
              />
              {rol?.descripcion && (
                <p className="text-xs text-muted-foreground pt-0.5">{rol.descripcion}</p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!nombre.trim() || nombre.trim() === rol?.nombre || updateRol.isPending}
              >
                {updateRol.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>

            <Separator />

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Zona de peligro</p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setPhase('delete')}
              >
                <Trash2 className="size-4 mr-2" />
                Eliminar rol
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" />
                ¿Está seguro de eliminar el rol?
              </DialogTitle>
              <DialogDescription>
                Esta acción eliminará permanentemente el rol{' '}
                <strong className="text-foreground">{rol?.nombre}</strong> y todos sus permisos
                asignados. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 py-1">
              <p className="text-sm text-muted-foreground">
                Escribe{' '}
                <code className="font-mono font-semibold bg-muted text-foreground px-1.5 py-0.5 rounded text-xs">
                  Delete
                </code>{' '}
                para confirmar.
              </p>
              <Input
                value={deleteWord}
                onChange={(e) => setDeleteWord(e.target.value)}
                placeholder="Delete"
                className="font-mono"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('edit')
                  setDeleteWord('')
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteWord !== 'Delete' || deleteRol.isPending}
                onClick={handleDelete}
              >
                {deleteRol.isPending ? 'Eliminando…' : 'Eliminar rol'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Carousel de roles ─────────────────────────────────────────────────────────

interface RolCarouselProps {
  roles: RolItem[]
  selectedId: number | null
  onOpen: (rol: RolItem) => void
}

function RolCarousel({ roles, selectedId, onOpen }: RolCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' })
  }

  if (roles.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
        No hay roles que coincidan con el filtro.
      </div>
    )
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
            onClick={() => onOpen(rol)}
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
    id: string | number
    nombre: string
    descripcion: string | null
    permisos: { id: number; nombre: string; descripcion: string | null }[]
  }
  selectedPermisoIds: Set<number>
  disabled: boolean
  onToggle: (permisoId: number, tienePermiso: boolean) => void
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

  const [selectedRolId, setSelectedRolId] = useState<number | null>(null)
  const [modalRol, setModalRol]           = useState<RolItem | null>(null)
  const [modalOpen, setModalOpen]         = useState(false)
  const [createOpen, setCreateOpen]       = useState(false)
  const [filterText, setFilterText]       = useState('')
  const [filterOpen, setFilterOpen]       = useState(false)
  const filterInputRef                    = useRef<HTMLInputElement>(null)

  // Auto-selecciona el primer rol al cargar
  useEffect(() => {
    if (matrix?.roles.length && !selectedRolId) {
      setSelectedRolId(matrix.roles[0]?.id ?? null)
    }
  }, [matrix, selectedRolId])

  // Foco al abrir el filtro
  useEffect(() => {
    if (filterOpen) {
      setTimeout(() => filterInputRef.current?.focus(), 50)
    } else {
      setFilterText('')
    }
  }, [filterOpen])

  const filteredRoles = matrix?.roles.filter((r) => {
    if (!filterText.trim()) return true
    const q = filterText.trim().toLowerCase()
    return (
      r.nombre.toLowerCase().includes(q) ||
      r.descripcion?.toLowerCase().includes(q)
    )
  }) ?? []

  const selectedRol        = matrix?.roles.find((r) => r.id === selectedRolId)
  const selectedPermisoIds = new Set(selectedRol?.permisoIds ?? [])
  const isMutating         = asignar.isPending || revocar.isPending

  function handleOpenModal(rol: RolItem) {
    setSelectedRolId(rol.id)
    setModalRol(rol)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
  }

  function handleDeleted() {
    setSelectedRolId(null)
  }

  function handleCreated(id: number) {
    setSelectedRolId(id)
  }

  function handleToggle(permisoId: number, tienePermiso: boolean) {
    if (!selectedRolId) return
    const fn = tienePermiso ? revocar : asignar
    fn.mutate(
      { rolId: selectedRolId, permisoId },
      { onError: (e) => toast.error(e.message) },
    )
  }

  function toggleFilter() {
    setFilterOpen((prev) => !prev)
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
        <div className="grid w-full gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))' }}>
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
          Haz clic en un rol para editarlo o gestionar sus permisos. Los cambios aplican en el próximo login.
        </p>
      </div>

      {/* Carousel de roles */}
      <div className="space-y-2">
        {/* Label row con filtro y botón crear */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Roles ({filterText ? `${filteredRoles.length}/` : ''}{matrix.roles.length})
            </p>

            {/* Mini filtro inline */}
            <div
              className={cn(
                'flex items-center overflow-hidden transition-all duration-200',
                filterOpen ? 'w-36 opacity-100' : 'w-0 opacity-0',
              )}
            >
              <div className="relative w-full">
                <Input
                  ref={filterInputRef}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filtrar…"
                  className="h-7 text-xs pr-6 pl-2"
                />
                {filterText && (
                  <button
                    onClick={() => setFilterText('')}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', filterOpen && 'text-primary')}
              onClick={toggleFilter}
              title={filterOpen ? 'Cerrar filtro' : 'Filtrar roles'}
            >
              <Search className="size-3.5" />
            </Button>
          </div>

          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            Crear rol
          </Button>
        </div>

        <RolCarousel
          roles={filteredRoles}
          selectedId={selectedRolId}
          onOpen={handleOpenModal}
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
            <div
              className="grid w-full min-w-0 gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))' }}
            >
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

      {/* Modal editar / eliminar rol */}
      <RolModal
        rol={modalRol}
        open={modalOpen}
        onClose={handleModalClose}
        onDeleted={handleDeleted}
      />

      {/* Modal crear rol */}
      <CrearRolModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
