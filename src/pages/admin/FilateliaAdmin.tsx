import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, Trash2, PowerOff, Loader2, AlertCircle, BookOpen,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Textarea }  from '@/components/ui/textarea'
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
  useFilatelias, useCreateFilatelia, useUpdateFilatelia, useDeleteFilatelia,
} from '@/queries/productos.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { ProductoResponse } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15
const PRECIO_MAX = 10_000_000

const SERIES_FILATELIA = [
  'Carpeta de Marqués',
  'Carpeta de Gabriel',
  'Sobre de Primer Día',
  'Carpeta de Primer Día',
  'Colección Especial',
] as const
type SerieFilatelia = (typeof SERIES_FILATELIA)[number]

const createSchema = z.object({
  codigo:      z.string().min(1, 'Requerido').max(50),
  nombre:      z.string().min(2, 'Mínimo 2 caracteres').max(200),
  precio:      z.preprocess(Number, z.number().positive('Mayor a 0').max(PRECIO_MAX, 'Máximo $10.000.000')),
  serie:       z.string().max(100).optional(),
  descripcion: z.string().optional(),
})

const updateSchema = z.object({
  nombre:      z.string().min(2).max(200).optional(),
  precio:      z.preprocess(Number, z.number().positive().max(PRECIO_MAX)).optional(),
  serie:       z.string().max(100).optional(),
  descripcion: z.string().optional(),
  activo:      z.boolean().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function TableSkeleton() {
  return Array.from({ length: 6 }, (_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }, (_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

function FilateliaForm({
  item, open, onClose,
}: { item: ProductoResponse | null; open: boolean; onClose: () => void }) {
  const isEdit    = !!item
  const createMut = useCreateFilatelia()
  const updateMut = useUpdateFilatelia()

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver((isEdit ? updateSchema : createSchema) as never),
  })

  const serieValue = watch('serie') as string | undefined

  useEffect(() => {
    if (!open) return
    reset(isEdit
      ? { nombre: item.nombre, precio: item.precio, serie: item.serie ?? undefined, descripcion: item.descripcion ?? undefined }
      : {})
  }, [open, item, isEdit, reset])

  async function onSubmit(data: CreateForm | UpdateForm) {
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: item.id, data: data as UpdateForm })
        toast.success('Ítem de filatelia actualizado')
      } else {
        await createMut.mutateAsync(data as CreateForm)
        toast.success('Ítem de filatelia registrado')
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
          <SheetTitle>{isEdit ? 'Editar ítem de filatelia' : 'Nuevo ítem de filatelia'}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editando ${item?.nombre}` : 'Agrega un ítem coleccionable al catálogo.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input {...register('codigo' as keyof CreateForm)} placeholder="FIL-001" />
              {'codigo' in errors && errors.codigo && (
                <p className="text-xs text-destructive">{errors.codigo.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input {...register('nombre')} placeholder="Carpeta de Marqués…" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Precio (COP) *</Label>
            <Input {...register('precio')} type="number" step="1" min="1" max={PRECIO_MAX} placeholder="35000" />
            {errors.precio && <p className="text-xs text-destructive">{errors.precio.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Serie / Colección</Label>
            <Select
              value={serieValue ?? ''}
              onValueChange={(v) => setValue('serie', v)}
            >
              <SelectTrigger><SelectValue placeholder="Seleccionar serie…" /></SelectTrigger>
              <SelectContent>
                {SERIES_FILATELIA.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O escribe directamente el nombre de la serie:
            </p>
            <Input
              placeholder="Serie personalizada…"
              value={serieValue ?? ''}
              onChange={(e) => setValue('serie', e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea {...register('descripcion')} placeholder="Descripción del ítem coleccionable…" rows={3} />
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

export default function FilateliaAdminPage() {
  const rol       = useSessionStore((s) => s.user?.rol)
  const canWrite  = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL' || rol === 'INVENTARIOS'
  const canDelete = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,       setBuscar]       = useState('')
  const [filterActivo, setFilterActivo] = useState('_all')
  const [filterSerie,  setFilterSerie]  = useState('_all')
  const [page,         setPage]         = useState(1)
  const [formOpen,     setFormOpen]     = useState(false)
  const [selected,     setSelected]     = useState<ProductoResponse | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ProductoResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductoResponse | null>(null)

  const params = {
    buscar:  buscar || undefined,
    activo:  filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    serie:   filterSerie !== '_all' ? filterSerie : undefined,
    pagina:  page,
    limite:  ROWS,
  }

  const { data, isLoading, isError } = useFilatelias(params)
  const toggleMut = useUpdateFilatelia()
  const deleteMut = useDeleteFilatelia()

  const items    = data?.datos ?? []
  const meta     = data?.meta
  const totalPages = meta?.paginas ?? 1

  function openEdit(e: ProductoResponse) { setSelected(e); setFormOpen(true) }
  function openNew()  { setSelected(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setSelected(null) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMut.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Ítem desactivado' : 'Ítem activado')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success('Ítem de filatelia eliminado')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Filatelia</h1>
          <p className="text-sm text-muted-foreground">Catálogo de ítems coleccionables postales</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Nuevo ítem
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
        <Select value={filterSerie} onValueChange={(v) => { setFilterSerie(v); setPage(1) }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Serie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas las series</SelectItem>
            {SERIES_FILATELIA.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActivo} onValueChange={(v) => { setFilterActivo(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        {(buscar || filterActivo !== '_all' || filterSerie !== '_all') && (
          <Button variant="ghost" size="sm" onClick={() => { setBuscar(''); setFilterActivo('_all'); setFilterSerie('_all'); setPage(1) }}>
            Limpiar
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Serie / Colección</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="size-8 opacity-30" />
                    <p className="text-sm">No hay ítems de filatelia en el catálogo.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((e) => (
                <TableRow key={e.id} className="group">
                  <TableCell className="font-mono text-sm">{e.codigo}</TableCell>
                  <TableCell className="font-medium">{e.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.serie ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCOP(e.precio)}</TableCell>
                  <TableCell>
                    <Badge variant={e.activo ? 'default' : 'secondary'}>
                      {e.activo ? 'Activo' : 'Inactivo'}
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
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setToggleTarget(e)}>
                            <PowerOff className="mr-2 size-3.5" />
                            {e.activo ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(e)}
                              >
                                <Trash2 className="mr-2 size-3.5" />Eliminar
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

      <FilateliaForm item={selected} open={formOpen} onClose={closeForm} />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desactivar ítem' : 'Activar ítem'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.activo
                ? `¿Desactivar "${toggleTarget?.nombre}" del catálogo?`
                : `¿Activar "${toggleTarget?.nombre}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancelar</Button>
            <Button
              variant={toggleTarget?.activo ? 'destructive' : 'default'}
              onClick={confirmToggle}
              disabled={toggleMut.isPending}
            >
              {toggleMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {toggleTarget?.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar ítem de filatelia</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. ¿Eliminar definitivamente "{deleteTarget?.nombre}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
