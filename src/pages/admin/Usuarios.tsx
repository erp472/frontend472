import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser,
  CreateUserSchema, UpdateUserSchema,
  type CreateUserDto, type UpdateUserDto, type UserRow,
} from '@/queries/users.queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ── Constantes ────────────────────────────────────────────────────────────────

const ROLES = [
  'CAJERO', 'ADMINISTRATIVO', 'TESORERIA', 'INVENTARIOS',
  'SUPERVISOR_REGIONAL', 'ADMIN_NACIONAL', 'ADMIN_SISTEMA',
] as const

const ROL_COLOR: Record<string, string> = {
  CAJERO:               'bg-slate-100 text-slate-700',
  ADMINISTRATIVO:       'bg-blue-100 text-blue-700',
  TESORERIA:            'bg-amber-100 text-amber-700',
  INVENTARIOS:          'bg-green-100 text-green-700',
  SUPERVISOR_REGIONAL:  'bg-purple-100 text-purple-700',
  ADMIN_NACIONAL:       'bg-orange-100 text-orange-700',
  ADMIN_SISTEMA:        'bg-red-100 text-red-700',
}

// ── Formulario crear/editar ───────────────────────────────────────────────────

interface UserFormProps {
  open: boolean
  onClose: () => void
  editing?: UserRow | null
}

function UserForm({ open, onClose, editing }: UserFormProps) {
  const create = useCreateUser()
  const update = useUpdateUser()
  const isPending = create.isPending || update.isPending

  const form = useForm<CreateUserDto>({
    resolver: zodResolver(editing ? UpdateUserSchema : CreateUserSchema),
    defaultValues: {
      nombre:      editing?.nombre      ?? '',
      email:       editing?.email       ?? '',
      password:    '',
      rol:         editing?.rol         ?? 'CAJERO',
      sucursal_id: editing?.sucursal?.id ?? null,
    },
  })

  // Reset form when dialog opens
  useState(() => {
    if (open) form.reset({
      nombre:      editing?.nombre      ?? '',
      email:       editing?.email       ?? '',
      password:    '',
      rol:         editing?.rol         ?? 'CAJERO',
      sucursal_id: editing?.sucursal?.id ?? null,
    })
  })

  async function onSubmit(data: CreateUserDto) {
    try {
      if (editing) {
        const dto: UpdateUserDto = { ...data }
        if (!dto.password) delete dto.password
        await update.mutateAsync({ id: editing.id, dto })
        toast.success('Usuario actualizado')
      } else {
        await create.mutateAsync(data)
        toast.success('Usuario creado')
      }
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Ana García" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Correo</FormLabel>
                <FormControl><Input type="email" placeholder="ana@4-72.com.co" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>{editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}</FormLabel>
                <FormControl><Input type="password" placeholder="Mínimo 8 caracteres" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="rol" render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Usuarios() {
  const [buscar,      setBuscar]      = useState('')
  const [rolFiltro,   setRolFiltro]   = useState<string>('todos')
  const [activoFiltro, setActivoFiltro] = useState<string>('todos')
  const [pagina,      setPagina]      = useState(1)
  const [formOpen,    setFormOpen]    = useState(false)
  const [editing,     setEditing]     = useState<UserRow | null>(null)
  const [confirmId,   setConfirmId]   = useState<string | null>(null)

  const deleteUser = useDeleteUser()
  const updateUser = useUpdateUser()

  const filters = {
    buscar:  buscar  || undefined,
    rol:     rolFiltro   !== 'todos' ? rolFiltro   : undefined,
    activo:  activoFiltro !== 'todos' ? activoFiltro === 'activos' : undefined,
    pagina,
    limite:  20,
  }

  const { data, isLoading } = useUsers(filters)

  function openCreate() { setEditing(null); setFormOpen(true) }
  function openEdit(u: UserRow) { setEditing(u); setFormOpen(true) }

  async function handleToggleActivo(u: UserRow) {
    try {
      await updateUser.mutateAsync({ id: u.id, dto: { activo: !u.activo } })
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteUser.mutateAsync(id)
      toast.success('Usuario eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error')
    } finally {
      setConfirmId(null)
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data ? `${data.meta.total} usuario${data.meta.total !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4 mr-1.5" />
          Nuevo usuario
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar nombre o correo…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPagina(1) }}
          />
        </div>

        <Select value={rolFiltro} onValueChange={(v) => { setRolFiltro(v); setPagina(1) }}>
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={activoFiltro} onValueChange={(v) => { setActivoFiltro(v); setPagina(1) }}>
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="inactivos">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.datos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              data?.datos.map((u) => (
                <TableRow key={u.id} className={cn(!u.activo && 'opacity-50')}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', ROL_COLOR[u.rol])}>
                      {u.rol}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.sucursal ? (
                      <span title={u.sucursal.nombre}>{u.sucursal.codigo}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? 'default' : 'outline'} className="text-xs">
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.ultimoLogin
                      ? new Date(u.ultimoLogin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        title={u.activo ? 'Desactivar' : 'Activar'}
                        onClick={() => handleToggleActivo(u)}
                      >
                        {u.activo
                          ? <UserX className="size-3.5 text-muted-foreground" />
                          : <UserCheck className="size-3.5 text-green-600" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        title="Editar"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="size-7"
                        title="Eliminar"
                        onClick={() => setConfirmId(u.id)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {data && data.meta.paginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {data.meta.pagina} de {data.meta.paginas}</span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={pagina >= data.meta.paginas} onClick={() => setPagina(p => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Dialogo crear/editar */}
      <UserForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        editing={editing}
      />

      {/* Confirmación eliminar */}
      <Dialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción desactivará permanentemente al usuario. ¿Confirmas?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteUser.isPending}
              onClick={() => confirmId && handleDelete(confirmId)}
            >
              {deleteUser.isPending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
