import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck, Trash2, AlertTriangle, Plus, Search, X, Pencil } from 'lucide-react'
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
      <DialogContent className="sm:max-w-[538px]">
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
      <DialogContent className="sm:max-w-[538px]">
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
  onSelect: (rol: RolItem) => void
  onEdit: (rol: RolItem) => void
}

function RolCarousel({ roles, selectedId, onSelect, onEdit }: RolCarouselProps) {
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
            onClick={() => onSelect(rol)}
            className={cn(
              'group relative flex-shrink-0 rounded-xl border p-4 text-left w-44 transition-all duration-150',
              'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedId === rol.id
                ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                : 'border-border hover:border-muted-foreground/40 bg-card',
            )}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(rol) }}
              className="absolute top-2 right-2 flex items-center justify-center size-5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity"
              title="Editar rol"
              tabIndex={-1}
            >
              <Pencil className="size-3" />
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck
                className={cn(
                  'size-4 shrink-0',
                  selectedId === rol.id ? 'text-primary' : 'text-muted-foreground',
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium leading-tight pr-4',
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Panel de Roles ────────────────────────────────────────────────────────────

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

function RolePanel({ selectedRolId, onSelect }: RolePanelProps) {
  const { data: roles, isLoading } = useRoles()
  const createMut = useCreateRol()
  const updateMut = useUpdateRol()
  const deleteMut = useDeleteRol()

  const [creating, setCreating]         = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null)
  const [formError, setFormError]       = useState<string | null>(null)

  async function handleCreate(nombre: string) {
    setFormError(null)
    try {
      const rol = await createMut.mutateAsync({ nombre })
      setCreating(false)
      onSelect(rol.id)
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Error al crear') }
  }

  async function handleUpdate(id: string, nombre: string) {
    setFormError(null)
    try {
      await updateMut.mutateAsync({ id, nombre })
      setEditingId(null)
    } catch (e) { setFormError(e instanceof ApiError ? e.message : 'Error al actualizar') }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      if (selectedRolId === deleteTarget.id) onSelect(null)
      setDeleteTarget(null)
    } catch { setDeleteTarget(null) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="size-4 text-primary" />
          <span className="text-sm font-semibold">Roles</span>
          {roles && <Badge variant="secondary" className="text-[10px] h-4">{roles.length}</Badge>}
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setCreating(true); setFormError(null) }}>
          <Plus className="size-3 mr-1" />Nuevo
        </Button>
      </div>

      {creating && (
        <div className="mb-3 rounded-lg border p-3 bg-muted/40">
          <InlineForm
            label="Nombre del rol"
            placeholder="ej. Cajero Bogotá"
            isPending={createMut.isPending}
            error={formError}
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setFormError(null) }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11 w-full rounded-lg mb-1" />)
        ) : !roles?.length ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
            <Shield className="size-8 opacity-20" />
            <p className="text-xs">Sin roles definidos</p>
          </div>
        ) : roles.map((rol) => (
          <div key={rol.id}>
            {editingId === rol.id ? (
              <div className="rounded-lg border p-2.5 bg-muted/40">
                <InlineForm
                  placeholder="Nombre del rol"
                  initialValue={rol.nombre}
                  isPending={updateMut.isPending}
                  error={formError}
                  onSubmit={(v) => handleUpdate(rol.id, v)}
                  onCancel={() => { setEditingId(null); setFormError(null) }}
                />
              </div>
            ) : (
              <div className={[
                'group flex items-center gap-2 rounded-lg px-2.5 py-2 cursor-pointer select-none transition-colors',
                selectedRolId === rol.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
              ].join(' ')}
                onClick={() => onSelect(rol.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(rol.id)}
              >
                <ShieldCheck className={['size-4 shrink-0', selectedRolId === rol.id ? 'text-primary-foreground/80' : 'text-muted-foreground'].join(' ')} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{rol.nombre}</p>
                  <p className={['text-[10px]', selectedRolId === rol.id ? 'text-primary-foreground/60' : 'text-muted-foreground'].join(' ')}>
                    {rol.permisos.length} perm.
                  </p>
                </div>
                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost" size="icon"
                    className={['size-6', selectedRolId === rol.id ? 'hover:bg-primary-foreground/20 text-primary-foreground' : ''].join(' ')}
                    onClick={(e) => { e.stopPropagation(); setEditingId(rol.id); setFormError(null) }}
                    aria-label="Editar rol"
                  ><Pencil className="size-3" /></Button>
                  <Button
                    variant="ghost" size="icon"
                    className={['size-6', selectedRolId === rol.id ? 'hover:bg-primary-foreground/20 text-primary-foreground' : 'text-destructive hover:text-destructive'].join(' ')}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: rol.id, nombre: rol.nombre }) }}
                    aria-label="Eliminar rol"
                  ><Trash2 className="size-3" /></Button>
                </div>
                <ChevronRight className={['size-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity', selectedRolId === rol.id ? 'opacity-60' : ''].join(' ')} />
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>
              ¿Eliminar <strong>{deleteTarget?.nombre}</strong>? Se revocarán todos sus permisos y no podrá deshacerse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Matriz Rol × Módulo × Permiso ─────────────────────────────────────────────

interface MatrixProps {
  rol: MatrixRole
}

function MatrixPanel({ rol }: MatrixProps) {
  const { data, isLoading } = useMatrix()
  const asignarMut  = useAsignarPermiso()
  const revocarMut  = useRevocarPermiso()

  const assigned = new Set(rol.permisoIds)
  const isPending = asignarMut.isPending || revocarMut.isPending

  async function toggle(permisoId: string) {
    if (assigned.has(permisoId)) {
      await revocarMut.mutateAsync({ rolId: rol.id, permisoId })
    } else {
      await asignarMut.mutateAsync({ rolId: rol.id, permisoId })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Permisos de <span className="text-primary">{rol.nombre}</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {rol.permisoIds.length} permisos activos
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20 mb-2" />
              <div className="space-y-1.5">
                {Array.from({ length: 3 }, (_, j) => <Skeleton key={j} className="h-10 w-full rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      ) : !data?.modulos.length ? (
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-2 py-12">
          <Layers className="size-8 opacity-20" />
          <p className="text-sm">Sin módulos definidos</p>
          <p className="text-xs">Ve a la pestaña «Módulos» para crear módulos y permisos.</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 space-y-5 pr-1">
          {data.modulos.map((mod) => (
            <div key={mod.id}>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="size-3.5 text-muted-foreground" />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {mod.nombre}
                </p>
                {mod.descripcion && (
                  <span className="text-[10px] text-muted-foreground/60">— {mod.descripcion}</span>
                )}
              </div>
              {!mod.permisos.length ? (
                <p className="text-xs text-muted-foreground pl-5 italic">Sin permisos definidos</p>
              ) : (
                <div className="space-y-1 pl-1">
                  {mod.permisos.map((p) => {
                    const isOn = assigned.has(p.id)
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border px-3.5 py-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{p.nombre}</p>
                          {p.descripcion && <p className="text-[11px] text-muted-foreground">{p.descripcion}</p>}
                        </div>
                        <Switch
                          checked={isOn}
                          onCheckedChange={() => toggle(p.id)}
                          disabled={isPending}
                          aria-label={`${isOn ? 'Revocar' : 'Asignar'} ${p.nombre} en ${mod.nombre}`}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ── Catálogo de Módulos ───────────────────────────────────────────────────────

function ModulosCatalog() {
  const { data: modulos, isLoading } = useModulos()
  const createModMut  = useCreateModulo()
  const updateModMut  = useUpdateModulo()
  const deleteModMut  = useDeleteModulo()
  const createPermMut = useCreatePermiso()
  const deletePermMut = useDeletePermiso()

  const [creatingMod, setCreatingMod]     = useState(false)
  const [editingMod, setEditingMod]       = useState<string | null>(null)
  const [deletingMod, setDeletingMod]     = useState<{ id: string; nombre: string } | null>(null)
  const [addingPermTo, setAddingPermTo]   = useState<string | null>(null)
  const [modError, setModError]           = useState<string | null>(null)
  const [permError, setPermError]         = useState<string | null>(null)

  async function handleCreateMod(nombre: string) {
    setModError(null)
    try { await createModMut.mutateAsync({ nombre }); setCreatingMod(false) }
    catch (e) { setModError(e instanceof ApiError ? e.message : 'Error al crear') }
  }

  async function handleUpdateMod(id: string, nombre: string) {
    setModError(null)
    try { await updateModMut.mutateAsync({ id, nombre }); setEditingMod(null) }
    catch (e) { setModError(e instanceof ApiError ? e.message : 'Error al actualizar') }
  }

  async function handleDeleteMod() {
    if (!deletingMod) return
    try { await deleteModMut.mutateAsync(deletingMod.id); setDeletingMod(null) }
    catch { setDeletingMod(null) }
  }

  async function handleCreatePerm(moduloId: string, nombre: string) {
    setPermError(null)
    try { await createPermMut.mutateAsync({ nombre, moduloId }); setAddingPermTo(null) }
    catch (e) { setPermError(e instanceof ApiError ? e.message : 'Error al crear') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Layers className="size-4 text-primary" />Módulos del sistema
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define los módulos y sus acciones disponibles (permisos).
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setCreatingMod(true); setModError(null) }}>
          <Plus className="size-3 mr-1" />Nuevo módulo
        </Button>
      </div>

      {creatingMod && (
        <div className="mb-4 rounded-xl border p-3 bg-muted/40">
          <InlineForm
            label="Nombre del módulo"
            placeholder="ej. POS, Reportes, Inventarios"
            isPending={createModMut.isPending}
            error={modError}
            onSubmit={handleCreateMod}
            onCancel={() => { setCreatingMod(false); setModError(null) }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !modulos?.length ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
          <Layers className="size-10 opacity-20" />
          <p className="text-sm">Sin módulos. Crea el primero.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {modulos.map((mod) => (
            <div key={mod.id} className="border rounded-xl p-4 space-y-3">
              {/* Header del módulo */}
              <div className="flex items-start justify-between">
                {editingMod === mod.id ? (
                  <div className="flex-1 mr-2">
                    <InlineForm
                      placeholder="Nombre del módulo"
                      initialValue={mod.nombre}
                      isPending={updateModMut.isPending}
                      error={modError}
                      onSubmit={(v) => handleUpdateMod(mod.id, v)}
                      onCancel={() => { setEditingMod(null); setModError(null) }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Layers className="size-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm truncate">{mod.nombre}</span>
                  </div>
                )}
                {editingMod !== mod.id && (
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="size-7"
                      onClick={() => { setEditingMod(mod.id); setModError(null) }}
                      aria-label="Editar módulo"
                    ><Pencil className="size-3" /></Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingMod({ id: mod.id, nombre: mod.nombre })}
                      aria-label="Eliminar módulo"
                    ><Trash2 className="size-3" /></Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Permisos del módulo */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Acciones ({mod.permisos.length})
                </p>
                {mod.permisos.map((p) => (
                  <div key={p.id} className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors">
                    <span className="text-sm font-medium">{p.nombre}</span>
                    <Button
                      variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                      onClick={() => deletePermMut.mutate(p.id)}
                      disabled={deletePermMut.isPending}
                      aria-label={`Eliminar ${p.nombre}`}
                    ><Trash2 className="size-3" /></Button>
                  </div>
                ))}

                {addingPermTo === mod.id ? (
                  <div className="pt-1">
                    <InlineForm
                      placeholder="Nueva acción (ej. acceso, crear, exportar)"
                      isPending={createPermMut.isPending}
                      error={permError}
                      onSubmit={(v) => handleCreatePerm(mod.id, v)}
                      onCancel={() => { setAddingPermTo(null); setPermError(null) }}
                    />
                  </div>
                ) : (
                  <Button
                    variant="ghost" size="sm"
                    className="w-full h-7 mt-1 text-xs text-muted-foreground hover:text-foreground border border-dashed"
                    onClick={() => { setAddingPermTo(mod.id); setPermError(null) }}
                  >
                    <Plus className="size-3 mr-1" />Agregar acción
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deletingMod} onOpenChange={(v) => !v && setDeletingMod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar módulo</DialogTitle>
            <DialogDescription>
              ¿Eliminar el módulo <strong>{deletingMod?.nombre}</strong>? Se eliminarán también todos sus permisos y se revocarán de todos los roles.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMod(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteMod} disabled={deleteModMut.isPending}>
              {deleteModMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PermisosPage() {
  const [selectedRolId, setSelectedRolId] = useState<string | null>(null)
  const { data: matrix } = useMatrix()
  const selectedRol = matrix?.roles.find((r) => r.id === selectedRolId) ?? null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permisos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Roles · Módulos · Permisos — gestiona el control de acceso del sistema
        </p>
      </div>

      <Separator />

      <Tabs defaultValue="roles">
        <TabsList className="mb-4">
          <TabsTrigger value="roles" className="gap-1.5">
            <ShieldCheck className="size-3.5" />Roles y permisos
          </TabsTrigger>
          <TabsTrigger value="modulos" className="gap-1.5">
            <Layers className="size-3.5" />Módulos
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Roles ──────────────────────────────────────────────────── */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 min-h-[520px]">
            {/* Panel izquierdo: lista de roles */}
            <div className="border rounded-xl p-4">
              <RolePanel
                selectedRolId={selectedRolId}
                onSelect={(id) => setSelectedRolId(id)}
              />
            </div>

            {/* Panel derecho: matriz permisos del rol */}
            <div className="border rounded-xl p-4">
              {selectedRol ? (
                <MatrixPanel rol={selectedRol} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-16">
                  <ShieldCheck className="size-12 opacity-15" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Selecciona un rol</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      Elige un rol de la izquierda para ver y configurar sus permisos por módulo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Tab: Módulos ─────────────────────────────────────────────────── */}
        <TabsContent value="modulos">
          <ModulosCatalog />
        </TabsContent>
      </Tabs>
    </div>
  )
}
