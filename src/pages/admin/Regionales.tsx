import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  Search, Plus, MoreHorizontal, Pencil, PowerOff, Loader2, AlertCircle, MapPin, Settings2,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
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
  useRegionales, useCreateRegional, useUpdateRegional,
} from '@/queries/regionales.queries'
import { useComercios } from '@/queries/comercios.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { RegionalResponse } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15

const createSchema = z.object({
  comercio_id: z.preprocess(Number, z.number().int().positive('Requerido')),
  codigo:      z.string().min(1, 'Requerido').max(50),
  nombre:      z.string().min(2, 'Mínimo 2 caracteres').max(200),
})

const updateSchema = z.object({
  nombre: z.string().min(2).max(200).optional(),
  activo: z.boolean().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 5 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

function RegionalForm({
  regional, open, onClose,
}: { regional: RegionalResponse | null; open: boolean; onClose: () => void }) {
  const isEdit = !!regional
  const createMutation = useCreateRegional()
  const updateMutation = useUpdateRegional()
  const { data: comerciosData } = useComercios({ activo: true, limite: 100 })
  const comercios = comerciosData?.datos ?? []

  const schema = isEdit ? updateSchema : createSchema
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm & UpdateForm>({
    resolver: zodResolver(schema as any),
  })

  useEffect(() => {
    if (!open) return
    reset(regional ? { nombre: regional.nombre } as any : {})
  }, [open, regional])

  async function onSubmit(data: CreateForm & UpdateForm) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: regional.id, data: { nombre: data.nombre } })
        toast.success('Regional actualizada')
      } else {
        await createMutation.mutateAsync(data as unknown as CreateForm)
        toast.success('Regional registrada')
      }
      reset()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar regional' : 'Nueva regional'}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editando ${regional?.nombre}` : 'Completa los datos de la regional.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Comercio *</Label>
              <Select onValueChange={(v) => setValue('comercio_id', Number(v) as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar comercio" />
                </SelectTrigger>
                <SelectContent>
                  {comercios.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre} ({c.codigo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.comercio_id && <p className="text-xs text-destructive">{errors.comercio_id.message}</p>}
            </div>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input {...register('codigo')} placeholder="REG-XXX" />
              {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input {...register('nombre')} placeholder="Nombre de la regional" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function RegionalesPage() {
  const rol = useSessionStore((s) => s.user?.rol)
  const canWrite = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,         setBuscar]         = useState('')
  const [filterActivo,   setFilterActivo]   = useState('_all')
  const [filterComercio, setFilterComercio] = useState('_all')
  const [page,           setPage]           = useState(1)
  const [formOpen,       setFormOpen]       = useState(false)
  const [editRegional,   setEditRegional]   = useState<RegionalResponse | null>(null)
  const [toggleTarget,   setToggleTarget]   = useState<RegionalResponse | null>(null)

  const { data: comerciosData } = useComercios({ activo: true, limite: 100 })
  const comercios = comerciosData?.datos ?? []

  const params = {
    buscar:      buscar || undefined,
    activo:      filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    comercio_id: filterComercio !== '_all' ? Number(filterComercio) : undefined,
    pagina:      page,
    limite:      ROWS,
  }

  const { data, isLoading, isError } = useRegionales(params)
  const toggleMutation = useUpdateRegional()
  const regionales  = data?.datos ?? []
  const meta        = data?.meta
  const totalPages  = meta?.paginas ?? 1

  function openEdit(r: RegionalResponse) { setEditRegional(r); setFormOpen(true) }
  function openNew()  { setEditRegional(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditRegional(null) }
  function resetFilters() { setBuscar(''); setFilterActivo('_all'); setFilterComercio('_all'); setPage(1) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMutation.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Regional desactivada' : 'Regional activada')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Regionales</h1>
          <p className="text-sm text-muted-foreground">Regionales agrupadas por comercio</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Nueva regional
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por código o nombre…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterComercio} onValueChange={(v) => { setFilterComercio(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los comercios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los comercios</SelectItem>
            {comercios.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
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
        {(buscar || filterActivo !== '_all' || filterComercio !== '_all') && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar</Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Comercio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : regionales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="size-8 opacity-30" />
                    <p className="text-sm">No hay regionales registradas.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              regionales.map((r) => (
                <TableRow key={r.id} className="group">
                  <TableCell className="font-mono text-sm">{r.codigo}</TableCell>
                  <TableCell className="font-medium">
                    <Link to={`/admin/regionales/${r.id}`} className="hover:underline">{r.nombre}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.comercio ? r.comercio.nombre : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.activo ? 'default' : 'secondary'}>
                      {r.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/regionales/${r.id}`}>
                              <Settings2 className="mr-2 size-3.5" />Gestionar sucursales y usuarios
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(r)}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToggleTarget(r)}
                          >
                            <PowerOff className="mr-2 size-3.5" />{r.activo ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {(page - 1) * ROWS + 1}–{Math.min(page * ROWS, meta.total)} de {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <span className="text-sm px-3 tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <RegionalForm regional={editRegional} open={formOpen} onClose={closeForm} />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desactivar regional' : 'Activar regional'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.activo
                ? `¿Desactivar la regional "${toggleTarget?.nombre}"?`
                : `¿Activar la regional "${toggleTarget?.nombre}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancelar</Button>
            <Button
              variant={toggleTarget?.activo ? 'destructive' : 'default'}
              onClick={confirmToggle}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {toggleTarget?.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
