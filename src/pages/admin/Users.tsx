import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Search, UserPlus, MoreHorizontal, Pencil,
  UserX, UserCheck, Loader2, AlertCircle,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Switch }    from '@/components/ui/switch'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser,
} from '@/queries/users.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import { rolLabels } from '@/components/layout/AppSidebar'
import type { UserResponse } from '@/types/api'
import type { RolUsuario } from '@/stores/useSessionStore'
import { ApiError } from '@/lib/api'

// ── Constantes ────────────────────────────────────────────────────────────────

const ROL_VALUES = [
  'CAJERO', 'ADMINISTRATIVO', 'TESORERIA', 'INVENTARIOS',
  'SUPERVISOR_REGIONAL', 'ADMIN_NACIONAL', 'ADMIN_SISTEMA',
] as const

const ROL_BADGE: Record<string, string> = {
  CAJERO:               'secondary',
  ADMINISTRATIVO:       'secondary',
  TESORERIA:            'secondary',
  INVENTARIOS:          'secondary',
  SUPERVISOR_REGIONAL:  'outline',
  ADMIN_NACIONAL:       'outline',
  ADMIN_SISTEMA:        'default',
}

const ROWS_PER_PAGE = 15

// ── Schemas ───────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  nombre:      z.string().min(2, 'Mínimo 2 caracteres').max(200),
  email:       z.string().email('Correo inválido'),
  rol:         z.enum(ROL_VALUES),
  sucursal_id: z.string().uuid('UUID inválido').nullable().optional(),
})

const createSchema = baseSchema.extend({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
})

const updateSchema = baseSchema.partial().extend({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100).optional().or(z.literal('')),
  activo:   z.boolean().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(iso))
}

function RolBadge({ rol }: { rol: string }) {
  return (
    <Badge variant={(ROL_BADGE[rol] ?? 'outline') as 'default' | 'secondary' | 'outline'}>
      {rolLabels[rol] ?? rol}
    </Badge>
  )
}

// ── Form de usuario ───────────────────────────────────────────────────────────

interface UserFormProps {
  user?: UserResponse | null
  open: boolean
  onClose: () => void
}

function UserForm({ user, open, onClose }: UserFormProps) {
  const isEdit = !!user
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema) as never,
    defaultValues: {
      nombre:      user?.nombre ?? '',
      email:       user?.email  ?? '',
      password:    '',
      rol:         user?.rol    ?? 'CAJERO',
      sucursal_id: user?.sucursal?.id ?? null,
      ...(isEdit && { activo: user?.activo }),
    },
  })

  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setServerError(null)
    form.reset({
      nombre:      user?.nombre ?? '',
      email:       user?.email  ?? '',
      password:    '',
      rol:         user?.rol    ?? 'CAJERO',
      sucursal_id: user?.sucursal?.id ?? null,
      ...(isEdit && { activo: user?.activo }),
    })
  }, [open, user])

  async function onSubmit(values: CreateForm | UpdateForm) {
    setServerError(null)
    try {
      if (isEdit && user) {
        const patch = { ...values } as UpdateForm
        if (!patch.password) delete patch.password
        if (patch.sucursal_id === '') patch.sucursal_id = null
        await updateMutation.mutateAsync({ id: user.id, data: patch })
      } else {
        const body = { ...values } as CreateForm
        if (body.sucursal_id === '') body.sucursal_id = null
        await createMutation.mutateAsync(body)
      }
      onClose()
    } catch (e) {
      if (e instanceof ApiError) setServerError(e.message)
      else setServerError('Error inesperado. Intente de nuevo.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Modifica los datos del usuario. Deja la contraseña en blanco para no cambiarla.'
              : 'Completa el formulario para crear un nuevo usuario en el sistema.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="px-4 pb-6 space-y-5">
          {serverError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="u-nombre">Nombre completo <span className="text-destructive">*</span></Label>
            <Input id="u-nombre" {...form.register('nombre')} aria-invalid={!!form.formState.errors.nombre} />
            {form.formState.errors.nombre && (
              <p className="text-xs text-destructive">{form.formState.errors.nombre.message as string}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Correo electrónico <span className="text-destructive">*</span></Label>
            <Input id="u-email" type="email" {...form.register('email')} aria-invalid={!!form.formState.errors.email} />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message as string}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="u-pass">
              Contraseña {!isEdit && <span className="text-destructive">*</span>}
              {isEdit && <span className="text-muted-foreground text-xs ml-1">(opcional)</span>}
            </Label>
            <Input id="u-pass" type="password" {...form.register('password')} aria-invalid={!!form.formState.errors.password} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message as string}</p>
            )}
          </div>

          {/* Rol */}
          <div className="space-y-1.5">
            <Label htmlFor="u-rol">Rol <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="rol"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="u-rol" aria-invalid={!!form.formState.errors.rol}>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROL_VALUES.map((r) => (
                      <SelectItem key={r} value={r}>{rolLabels[r] ?? r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.rol && (
              <p className="text-xs text-destructive">{form.formState.errors.rol.message as string}</p>
            )}
          </div>

          {/* Sucursal ID */}
          <div className="space-y-1.5">
            <Label htmlFor="u-suc">UUID de sucursal <span className="text-muted-foreground text-xs ml-1">(opcional)</span></Label>
            <Input
              id="u-suc"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              {...form.register('sucursal_id')}
              aria-invalid={!!form.formState.errors.sucursal_id}
            />
            {form.formState.errors.sucursal_id && (
              <p className="text-xs text-destructive">{form.formState.errors.sucursal_id.message as string}</p>
            )}
          </div>

          {/* Activo (solo edición) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <Label htmlFor="u-activo" className="font-medium">Usuario activo</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Los usuarios inactivos no pueden iniciar sesión.
                </p>
              </div>
              <Controller
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <Switch
                    id="u-activo"
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t mt-8">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Skeleton de tabla ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-44" /></TableCell>
          <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell />
        </TableRow>
      ))}
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function UsersPage() {
  const userRol = useSessionStore((s) => s.user?.rol)
  const canWrite = userRol === 'ADMIN_SISTEMA' || userRol === 'ADMIN_NACIONAL'
  const canEdit  = canWrite || userRol === 'SUPERVISOR_REGIONAL'

  const [buscar,     setBuscar]     = useState('')
  const [filterRol,  setFilterRol]  = useState<string>('_all')
  const [filterActivo, setFilterActivo] = useState<string>('_all')
  const [page,       setPage]       = useState(1)
  const [formOpen,   setFormOpen]   = useState(false)
  const [editUser,   setEditUser]   = useState<UserResponse | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserResponse | null>(null)

  const queryParams = {
    buscar:  buscar || undefined,
    rol:     filterRol  === '_all' ? undefined : filterRol,
    activo:  filterActivo === '_all' ? undefined : filterActivo === 'activo',
    pagina:  page,
    limite:  ROWS_PER_PAGE,
  }

  const { data, isLoading, isError } = useUsers(queryParams)
  const deleteMutation = useDeleteUser()

  const usuarios  = data?.datos ?? []
  const meta      = data?.meta
  const totalPages = meta ? meta.paginas : 1

  function openCreate() {
    setEditUser(null)
    setFormOpen(true)
  }

  function openEdit(u: UserResponse) {
    setEditUser(u)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditUser(null)
  }

  async function confirmDelete() {
    if (!deleteUser) return
    await deleteMutation.mutateAsync(deleteUser.id)
    setDeleteUser(null)
  }

  function resetFilters() {
    setBuscar('')
    setFilterRol('_all')
    setFilterActivo('_all')
    setPage(1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {meta ? `${meta.total} usuario${meta.total !== 1 ? 's' : ''} en total` : 'Gestión de usuarios del sistema'}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <UserPlus className="mr-2 size-4" />
            Nuevo usuario
          </Button>
        )}
      </div>

      <Separator />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o correo…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPage(1) }}
          />
        </div>

        <Select value={filterRol} onValueChange={(v) => { setFilterRol(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los roles</SelectItem>
            {ROL_VALUES.map((r) => (
              <SelectItem key={r} value={r}>{rolLabels[r] ?? r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterActivo} onValueChange={(v) => { setFilterActivo(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>

        {(buscar || filterRol !== '_all' || filterActivo !== '_all') && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Limpiar
          </Button>
        )}
      </div>

      {/* Tabla */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último ingreso</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista de usuarios.</p>
                    <Button variant="outline" size="sm" onClick={() => setPage(1)}>Reintentar</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <p className="text-sm">No se encontraron usuarios con los filtros actuales.</p>
                  {(buscar || filterRol !== '_all' || filterActivo !== '_all') && (
                    <Button variant="ghost" size="sm" className="mt-2" onClick={resetFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id} className="group">
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                  <TableCell><RolBadge rol={u.rol} /></TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.sucursal ? `${u.sucursal.nombre} (${u.sucursal.codigo})` : '—'}
                  </TableCell>
                  <TableCell>
                    {u.activo ? (
                      <Badge variant="default" className="gap-1">
                        <UserCheck className="size-3" />Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <UserX className="size-3" />Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {formatDate(u.ultimoLogin)}
                  </TableCell>
                  <TableCell>
                    {(canEdit) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 group-hover:opacity-100"
                            aria-label="Acciones"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          {canWrite && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteUser(u)}
                              >
                                <UserX className="mr-2 size-3.5" />
                                {u.activo ? 'Desactivar' : 'Reactivar'}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginación */}
        {meta && meta.paginas > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              Mostrando {(page - 1) * ROWS_PER_PAGE + 1}–{Math.min(page * ROWS_PER_PAGE, meta.total)} de {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm px-3 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sheet de formulario */}
      <UserForm
        user={editUser}
        open={formOpen}
        onClose={closeForm}
      />

      {/* Dialog de confirmación de desactivación */}
      <Dialog open={!!deleteUser} onOpenChange={(v) => !v && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteUser?.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
            </DialogTitle>
            <DialogDescription>
              {deleteUser?.activo
                ? `¿Deseas desactivar a ${deleteUser?.nombre}? El usuario no podrá iniciar sesión hasta que sea reactivado.`
                : `¿Deseas reactivar a ${deleteUser?.nombre}? El usuario podrá volver a iniciar sesión.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancelar</Button>
            <Button
              variant={deleteUser?.activo ? 'destructive' : 'default'}
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {deleteUser?.activo ? 'Desactivar' : 'Reactivar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
