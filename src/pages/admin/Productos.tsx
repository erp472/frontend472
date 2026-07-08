import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, PowerOff, Loader2, AlertCircle, Package,
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
import { useProductos, useCreateProducto, useUpdateProducto } from '@/queries/productos.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { ProductoResponse, TipoProducto } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15

const TIPO_LABELS: Record<TipoProducto, string> = {
  estampilla:      'Estampilla',
  filatelia:       'Filatelia',
  empaque:         'Empaque',
  material_oficina: 'Material oficina',
  otro:            'Otro',
}

const createSchema = z.object({
  codigo:             z.string().min(1, 'Requerido').max(50),
  nombre:             z.string().min(2).max(200),
  descripcion:        z.string().nullable().optional(),
  tipo:               z.enum(['estampilla', 'filatelia', 'empaque', 'material_oficina', 'otro'] as const),
  precio:             z.preprocess(Number, z.number().positive('Debe ser mayor a 0')),
  porcentaje_tax:     z.preprocess((v) => v === '' ? 0 : Number(v), z.number().min(0).max(100)).default(0),
  peso:               z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
})

const updateSchema = z.object({
  nombre:         z.string().min(2).max(200).optional(),
  descripcion:    z.string().nullable().optional(),
  precio:         z.preprocess(Number, z.number().positive()).optional(),
  porcentaje_tax: z.preprocess((v) => v === '' ? undefined : Number(v), z.number().min(0).max(100)).optional(),
  activo:         z.boolean().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function ProductoForm({
  producto, open, onClose,
}: { producto: ProductoResponse | null; open: boolean; onClose: () => void }) {
  const isEdit = !!producto
  const createMutation = useCreateProducto()
  const updateMutation = useUpdateProducto()

  const schema = isEdit ? updateSchema : createSchema
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateForm & UpdateForm>({
    resolver: zodResolver(schema as any),
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? {
      nombre:         producto.nombre,
      descripcion:    producto.descripcion ?? '',
      precio:         producto.precio,
      porcentaje_tax: producto.porcentajeTax,
    } as any : { tipo: 'estampilla', porcentaje_tax: 0 } as any)
  }, [open, producto])

  const tipoValue = watch('tipo')

  async function onSubmit(data: CreateForm & UpdateForm) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: producto.id, data })
        toast.success('Producto actualizado')
      } else {
        await createMutation.mutateAsync(data as unknown as CreateForm)
        toast.success('Producto registrado')
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
          <SheetTitle>{isEdit ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editando ${producto?.nombre}` : 'Agrega un producto al catálogo.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input {...register('codigo')} placeholder="COD-001" />
                {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select
                  value={tipoValue}
                  onValueChange={(v) => setValue('tipo', v as TipoProducto)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_LABELS) as [TipoProducto, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input {...register('nombre')} placeholder="Nombre del producto" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input {...register('descripcion')} placeholder="Descripción opcional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Precio (COP) *</Label>
              <Input {...register('precio')} type="number" step="1" min="1" placeholder="0" />
              {errors.precio && <p className="text-xs text-destructive">{errors.precio.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>IVA (%)</Label>
              <Input {...register('porcentaje_tax')} type="number" step="0.01" min="0" max="100" placeholder="0" />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Peso (kg)</Label>
              <Input {...register('peso')} type="number" step="0.001" min="0.001" placeholder="0.05" />
            </div>
          )}

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

export default function ProductosPage() {
  const rol = useSessionStore((s) => s.user?.rol)
  const canWrite = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,       setBuscar]       = useState('')
  const [filterTipo,   setFilterTipo]   = useState('_all')
  const [filterActivo, setFilterActivo] = useState('_all')
  const [page,         setPage]         = useState(1)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editProducto, setEditProducto] = useState<ProductoResponse | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ProductoResponse | null>(null)

  const params = {
    buscar:  buscar || undefined,
    tipo:    filterTipo !== '_all' ? filterTipo as TipoProducto : undefined,
    activo:  filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    pagina:  page,
    limite:  ROWS,
  }

  const { data, isLoading, isError } = useProductos(params)
  const toggleMutation = useUpdateProducto()
  const productos  = data?.datos ?? []
  const meta       = data?.meta
  const totalPages = meta?.paginas ?? 1

  function openEdit(p: ProductoResponse) { setEditProducto(p); setFormOpen(true) }
  function openNew()  { setEditProducto(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditProducto(null) }
  function resetFilters() { setBuscar(''); setFilterTipo('_all'); setFilterActivo('_all'); setPage(1) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMutation.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Producto desactivado' : 'Producto activado')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Productos</h1>
          <p className="text-sm text-muted-foreground">Catálogo de productos vendibles en sucursales</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Nuevo producto
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
        <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {(Object.entries(TIPO_LABELS) as [TipoProducto, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
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
        {(buscar || filterTipo !== '_all' || filterActivo !== '_all') && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar</Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead>IVA</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="size-8 opacity-30" />
                    <p className="text-sm">No hay productos en el catálogo.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIPO_LABELS[p.tipo]}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCOP(p.precio)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.porcentajeTax}%</TableCell>
                  <TableCell>
                    <Badge variant={p.activo ? 'default' : 'secondary'}>
                      {p.activo ? 'Activo' : 'Inactivo'}
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
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToggleTarget(p)}
                          >
                            <PowerOff className="mr-2 size-3.5" />
                            {p.activo ? 'Desactivar' : 'Activar'}
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

      <ProductoForm producto={editProducto} open={formOpen} onClose={closeForm} />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desactivar producto' : 'Activar producto'}</DialogTitle>
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
