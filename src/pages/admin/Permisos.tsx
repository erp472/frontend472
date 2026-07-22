import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, Shield,
  ShieldCheck, AlertCircle, ChevronRight, Layers,
  Settings2,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Switch }    from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useMatrix,
  useRoles, useCreateRol, useUpdateRol, useDeleteRol,
  useModulos, useCreateModulo, useUpdateModulo, useDeleteModulo,
  useCreatePermiso, useDeletePermiso,
  useAsignarPermiso, useRevocarPermiso,
} from '@/queries/permisos.queries'
import { ApiError } from '@/lib/api'
import type { MatrixRole } from '@/types/api'

// ── Inline input form ─────────────────────────────────────────────────────────

interface InlineFormProps {
  label?: string
  placeholder: string
  initialValue?: string
  isPending: boolean
  error?: string | null
  onSubmit: (value: string) => void
  onCancel: () => void
}

function InlineForm({ label, placeholder, initialValue = '', isPending, error, onSubmit, onCancel }: InlineFormProps) {
  const [value, setValue] = useState(initialValue)
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (value.trim()) onSubmit(value.trim()) }
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          aria-invalid={!!error}
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8" onClick={() => value.trim() && onSubmit(value.trim())} disabled={isPending || !value.trim()}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Guardar'}
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>Cancelar</Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Panel de Roles ────────────────────────────────────────────────────────────

interface RolePanelProps {
  selectedRolId: string | null
  onSelect: (id: string | null) => void
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
