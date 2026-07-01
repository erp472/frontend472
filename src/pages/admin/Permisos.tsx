import { useState } from 'react'
import {
  Plus, Pencil, Trash2, Loader2, Shield,
  ShieldCheck, AlertCircle, ChevronRight,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Switch }    from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  useRoles, usePermisos, useRolPermisos,
  useCreateRol, useUpdateRol, useDeleteRol,
  useCreatePermiso, useUpdatePermiso, useDeletePermiso,
  useAsignarPermiso, useRevocarPermiso,
} from '@/queries/permisos.queries'
import { ApiError } from '@/lib/api'
import type { PermisoEntry, RolEntry } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractModule(nombre: string): string {
  const sep = nombre.includes(':') ? ':' : nombre.includes('.') ? '.' : null
  if (!sep) return 'General'
  return nombre.split(sep)[0]
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function groupByModule(permisos: PermisoEntry[]): Record<string, PermisoEntry[]> {
  return permisos.reduce<Record<string, PermisoEntry[]>>((acc, p) => {
    const mod = extractModule(p.nombre)
    ;(acc[mod] ??= []).push(p)
    return acc
  }, {})
}

// ── Inline form (para nombre de Rol / Permiso) ────────────────────────────────

interface InlineFormProps {
  label: string
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
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
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
        />
        <Button size="sm" onClick={() => value.trim() && onSubmit(value.trim())} disabled={isPending || !value.trim()}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : 'Guardar'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Panel izquierdo: lista de Roles ──────────────────────────────────────────

interface RolePanelProps {
  selectedRolId: string | null
  onSelect: (id: string) => void
}

function RolePanel({ selectedRolId, onSelect }: RolePanelProps) {
  const { data: roles, isLoading } = useRoles()
  const createMutation = useCreateRol()
  const updateMutation = useUpdateRol()
  const deleteMutation = useDeleteRol()

  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RolEntry | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleCreate(nombre: string) {
    setFormError(null)
    try {
      const rol = await createMutation.mutateAsync(nombre)
      setCreating(false)
      onSelect(rol.id)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error al crear el rol')
    }
  }

  async function handleUpdate(id: string, nombre: string) {
    setFormError(null)
    try {
      await updateMutation.mutateAsync({ id, nombre })
      setEditingId(null)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error al actualizar')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      if (selectedRolId === deleteTarget.id) onSelect('')
      setDeleteTarget(null)
    } catch (e) {
      setDeleteTarget(null)
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Roles personalizados</h2>
        <Button size="sm" variant="outline" onClick={() => { setCreating(true); setFormError(null) }}>
          <Plus className="size-3.5 mr-1" />Nuevo
        </Button>
      </div>

      {creating && (
        <div className="mb-3 rounded-lg border p-3 bg-muted/30">
          <InlineForm
            label="Nombre del nuevo rol"
            placeholder="ej. Acceso POS"
            isPending={createMutation.isPending}
            error={formError}
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setFormError(null) }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1">
        {isLoading ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
        ) : roles?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="size-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No hay roles definidos</p>
          </div>
        ) : (
          roles?.map((rol) => (
            <div key={rol.id}>
              {editingId === rol.id ? (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <InlineForm
                    label="Editar nombre"
                    placeholder="Nombre del rol"
                    initialValue={rol.nombre}
                    isPending={updateMutation.isPending}
                    error={formError}
                    onSubmit={(v) => handleUpdate(rol.id, v)}
                    onCancel={() => { setEditingId(null); setFormError(null) }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(rol.id)}
                  className={[
                    'group w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    selectedRolId === rol.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  ].join(' ')}
                >
                  <ShieldCheck className={[
                    'size-4 shrink-0',
                    selectedRolId === rol.id ? 'text-primary-foreground' : 'text-muted-foreground',
                  ].join(' ')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rol.nombre}</p>
                    <p className={[
                      'text-[11px]',
                      selectedRolId === rol.id ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    ].join(' ')}>
                      {rol.permisos.length} permiso{rol.permisos.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <ChevronRight className={[
                    'size-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity',
                    selectedRolId === rol.id ? 'opacity-70' : '',
                  ].join(' ')} />
                </button>
              )}
              {editingId !== rol.id && (
                <div className="flex gap-1 px-1 pb-1 justify-end opacity-0 hover:opacity-100 focus-within:opacity-100 -mt-1 transition-opacity">
                  <Button
                    variant="ghost" size="icon-xs"
                    aria-label="Editar rol"
                    onClick={() => { setEditingId(rol.id); setFormError(null) }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon-xs"
                    className="text-destructive hover:text-destructive"
                    aria-label="Eliminar rol"
                    onClick={() => setDeleteTarget(rol)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Dialog confirmar eliminar rol */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>
              ¿Eliminar el rol <strong>{deleteTarget?.nombre}</strong>?
              Esto revocará todos los permisos asociados y no podrá deshacerse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Panel derecho: permisos asignados al rol seleccionado ────────────────────

interface PermisosMatrixProps {
  rolId: string
  rolNombre: string
}

function PermisosMatrix({ rolId, rolNombre }: PermisosMatrixProps) {
  const { data: all,      isLoading: loadingAll }      = usePermisos()
  const { data: assigned, isLoading: loadingAssigned } = useRolPermisos(rolId)

  const asignarMutation  = useAsignarPermiso()
  const revocarMutation  = useRevocarPermiso()

  const isLoading = loadingAll || loadingAssigned
  const assignedIds = new Set(assigned?.map((p) => p.id) ?? [])

  async function toggle(permisoId: string, isAssigned: boolean) {
    if (isAssigned) {
      await revocarMutation.mutateAsync({ rolId, permisoId })
    } else {
      await asignarMutation.mutateAsync({ rolId, permisoId })
    }
  }

  const grouped = groupByModule(all ?? [])

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Permisos de <span className="text-primary">{rolNombre}</span></h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Activa o desactiva permisos por módulo para este rol.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, j) => <Skeleton key={j} className="h-10 w-full rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (all?.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="size-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay permisos definidos en el sistema.</p>
          <p className="text-xs mt-1">Crea permisos en el catálogo para asignarlos aquí.</p>
        </div>
      ) : (
        <div className="overflow-y-auto space-y-6 flex-1">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([modulo, permisos]) => (
            <div key={modulo}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
                {modulo}
              </p>
              <div className="space-y-1">
                {permisos.map((p) => {
                  const isAssigned = assignedIds.has(p.id)
                  const isPending  = asignarMutation.isPending || revocarMutation.isPending
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-2.5 hover:bg-muted/40 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-mono font-medium">{p.nombre}</p>
                      </div>
                      <Switch
                        checked={isAssigned}
                        onCheckedChange={() => toggle(p.id, isAssigned)}
                        disabled={isPending}
                        aria-label={`${isAssigned ? 'Revocar' : 'Asignar'} ${p.nombre}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Catálogo de permisos ──────────────────────────────────────────────────────

function PermisoCatalog() {
  const { data: permisos, isLoading } = usePermisos()
  const createMutation = useCreatePermiso()
  const updateMutation = useUpdatePermiso()
  const deleteMutation = useDeletePermiso()

  const [creating,   setCreating]   = useState(false)
  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PermisoEntry | null>(null)
  const [formError,  setFormError]  = useState<string | null>(null)

  async function handleCreate(nombre: string) {
    setFormError(null)
    try {
      await createMutation.mutateAsync(nombre)
      setCreating(false)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error al crear el permiso')
    }
  }

  async function handleUpdate(id: string, nombre: string) {
    setFormError(null)
    try {
      await updateMutation.mutateAsync({ id, nombre })
      setEditingId(null)
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error al actualizar')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch (e) {
      setDeleteTarget(null)
      console.error(e)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold">Catálogo de permisos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define los permisos disponibles. Usa el formato <code className="font-mono text-[11px]">modulo:accion</code> (ej. <code className="font-mono text-[11px]">pos:acceso</code>).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setCreating(true); setFormError(null) }}>
          <Plus className="size-3.5 mr-1" />Nuevo permiso
        </Button>
      </div>

      {creating && (
        <div className="mb-3 rounded-lg border p-3 bg-muted/30">
          <InlineForm
            label="Nombre del permiso"
            placeholder="ej. reportes:exportar"
            isPending={createMutation.isPending}
            error={formError}
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setFormError(null) }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      ) : permisos?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No hay permisos creados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {permisos?.map((p) => (
            <div key={p.id}>
              {editingId === p.id ? (
                <div className="rounded-lg border p-2 bg-muted/30">
                  <InlineForm
                    label=""
                    placeholder="Nombre"
                    initialValue={p.nombre}
                    isPending={updateMutation.isPending}
                    error={formError}
                    onSubmit={(v) => handleUpdate(p.id, v)}
                    onCancel={() => { setEditingId(null); setFormError(null) }}
                  />
                </div>
              ) : (
                <div className="group flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40 transition-colors">
                  <span className="text-sm font-mono truncate flex-1 mr-2">{p.nombre}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost" size="icon-xs"
                      aria-label="Editar"
                      onClick={() => { setEditingId(p.id); setFormError(null) }}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      aria-label="Eliminar"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar permiso</DialogTitle>
            <DialogDescription>
              ¿Eliminar el permiso <strong className="font-mono">{deleteTarget?.nombre}</strong>?
              Se revocará de todos los roles que lo tengan asignado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
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
  const { data: roles } = useRoles()
  const selectedRol = roles?.find((r) => r.id === selectedRolId)

  function handleSelectRol(id: string) {
    setSelectedRolId(id || null)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permisos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gestión de roles personalizados y sus permisos por módulo
        </p>
      </div>

      <Separator />

      {/* Panel de roles + matriz de permisos */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 min-h-[500px]">
        {/* Roles */}
        <div className="border rounded-xl p-4">
          <RolePanel selectedRolId={selectedRolId} onSelect={handleSelectRol} />
        </div>

        {/* Permisos del rol */}
        <div className="border rounded-xl p-4">
          {selectedRolId && selectedRol ? (
            <PermisosMatrix rolId={selectedRolId} rolNombre={selectedRol.nombre} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16 gap-3">
              <ShieldCheck className="size-12 opacity-20" />
              <div className="text-center">
                <p className="text-sm font-medium">Selecciona un rol</p>
                <p className="text-xs mt-0.5">
                  Elige un rol de la lista para ver y gestionar sus permisos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Catálogo de permisos */}
      <div className="border rounded-xl p-4">
        <PermisoCatalog />
      </div>
    </div>
  )
}
