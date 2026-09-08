import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, Trash2, PowerOff,
  Loader2, AlertCircle, Layers, X, History, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  useProductosEspeciales, useCreateProductoEspecial, useUpdateProductoEspecial,
  useDeleteProductoEspecial, useSetTarifasEspeciales,
} from '@/queries/productos.queries'
import { useInventarioSucursales, useMovimientos, type MovimientoItem } from '@/queries/inventario.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { ProductoEspecialResponse, TarifaEscalonada } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS      = 15
const PRECIO_MAX = 1_000_000

// ── Schemas ───────────────────────────────────────────────────────────────────

const tarifaRowSchema = z.object({
  minCantidad: z.preprocess(Number, z.number().int().positive('Requerido')),
  maxCantidad: z.preprocess((v) => v === '' || v == null ? null : Number(v), z.number().int().positive().nullable()),
  precio:      z.preprocess(Number, z.number().positive('Requerido').max(PRECIO_MAX, 'Máx $1.000.000')),
})

const createSchema = z.object({
  codigo:         z.string().min(1, 'Requerido').max(50),
  nombre:         z.string().min(2, 'Mínimo 2 caracteres').max(200),
  precio:         z.preprocess(Number, z.number().positive('Mayor a 0').max(PRECIO_MAX, 'Máx $1.000.000')),
  cantidadMinima: z.preprocess((v) => v === '' || v == null ? null : Number(v), z.number().int().positive().nullable()).optional(),
  cantidadMaxima: z.preprocess((v) => v === '' || v == null ? null : Number(v), z.number().int().positive().nullable()).optional(),
  tarifas:        z.array(tarifaRowSchema).optional(),
})

const updateSchema = z.object({
  nombre:         z.string().min(2).max(200).optional(),
  precio:         z.preprocess(Number, z.number().positive().max(PRECIO_MAX, 'Máx $1.000.000')).optional(),
  cantidadMinima: z.preprocess((v) => v === '' || v == null ? null : Number(v), z.number().int().positive().nullable()).optional(),
  cantidadMaxima: z.preprocess((v) => v === '' || v == null ? null : Number(v), z.number().int().positive().nullable()).optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 7 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

// ── Tiered tarifa editor ──────────────────────────────────────────────────────

function TarifasEditor({
  control, register, errors,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form generics make strict typing impractical here
  control: any
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form generics make strict typing impractical here
  register: any
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form generics make strict typing impractical here
  errors: any
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'tarifas' })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Tarifas escalonadas por cantidad</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ minCantidad: 1, maxCantidad: null, precio: 0 })}
        >
          <Plus className="mr-1 size-3.5" />Agregar tramo
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Sin tarifas escalonadas — se usa el precio base para cualquier cantidad.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1">
            <span className="text-xs text-muted-foreground">Cant. mín.</span>
            <span className="text-xs text-muted-foreground">Cant. máx.</span>
            <span className="text-xs text-muted-foreground">Precio (COP)</span>
            <span />
          </div>
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
              <div>
                <Input
                  {...register(`tarifas.${idx}.minCantidad`)}
                  type="number" step="1" min="1" placeholder="1"
                  className="h-8 text-sm"
                />
                {errors.tarifas?.[idx]?.minCantidad && (
                  <p className="text-[10px] text-destructive mt-0.5">{errors.tarifas[idx].minCantidad.message}</p>
                )}
              </div>
              <div>
                <Input
                  {...register(`tarifas.${idx}.maxCantidad`)}
                  type="number" step="1" min="1" placeholder="sin límite"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Input
                  {...register(`tarifas.${idx}.precio`)}
                  type="number" step="1" min="1" max={PRECIO_MAX} placeholder="0"
                  className="h-8 text-sm"
                />
                {errors.tarifas?.[idx]?.precio && (
                  <p className="text-[10px] text-destructive mt-0.5">{errors.tarifas[idx].precio.message}</p>
                )}
              </div>
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => remove(idx)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tarifa-only editor (for existing producto) ────────────────────────────────

function TarifasDialog({
  producto, open, onClose,
}: { producto: ProductoEspecialResponse | null; open: boolean; onClose: () => void }) {
  const setTarifas = useSetTarifasEspeciales(producto?.id ?? 0)
  const [rows, setRows] = useState<Partial<TarifaEscalonada>[]>([])

  useEffect(() => {
    if (!open || !producto) return
    setRows(producto.tarifas.length > 0 ? [...producto.tarifas] : [])
  }, [open, producto])

  function addRow() {
    setRows(r => [...r, { minCantidad: 1, maxCantidad: null, precio: 0 }])
  }

  function removeRow(idx: number) {
    setRows(r => r.filter((_, i) => i !== idx))
  }

  function updateRow(idx: number, field: keyof TarifaEscalonada, value: string) {
    setRows(r => r.map((row, i) => {
      if (i !== idx) return row
      if (field === 'maxCantidad') return { ...row, maxCantidad: value === '' ? null : Number(value) }
      return { ...row, [field]: value === '' ? 0 : Number(value) }
    }))
  }

  async function save() {
    const tarifas = rows.map(r => ({
      minCantidad: Number(r.minCantidad ?? 0),
      maxCantidad: r.maxCantidad ?? null,
      precio:      Number(r.precio ?? 0),
    }))

    const invalid = tarifas.some(t => t.minCantidad <= 0 || t.precio <= 0 || t.precio > PRECIO_MAX)
    if (invalid) {
      toast.error('Revisa que todas las cantidades mínimas y precios sean válidos')
      return
    }

    try {
      await setTarifas.mutateAsync(tarifas)
      toast.success('Tarifas guardadas')
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[614px]">
        <DialogHeader>
          <DialogTitle>Tarifas escalonadas — {producto?.nombre}</DialogTitle>
          <DialogDescription>
            Define precios por rango de cantidad. Si no hay tarifas, se usa el precio base.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Cant. mín.</span>
            <span className="text-xs font-medium text-muted-foreground">Cant. máx.</span>
            <span className="text-xs font-medium text-muted-foreground">Precio (COP)</span>
            <span />
          </div>

          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-2 text-center">Sin tramos definidos.</p>
          )}

          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
              <Input
                type="number" step="1" min="1"
                value={row.minCantidad ?? ''}
                onChange={(e) => updateRow(idx, 'minCantidad', e.target.value)}
                className="h-8 text-sm" placeholder="1"
              />
              <Input
                type="number" step="1" min="1"
                value={row.maxCantidad ?? ''}
                onChange={(e) => updateRow(idx, 'maxCantidad', e.target.value)}
                className="h-8 text-sm" placeholder="sin límite"
              />
              <Input
                type="number" step="1" min="1" max={PRECIO_MAX}
                value={row.precio ?? ''}
                onChange={(e) => updateRow(idx, 'precio', e.target.value)}
                className="h-8 text-sm" placeholder="0"
              />
              <Button
                type="button" variant="ghost" size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(idx)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full">
            <Plus className="mr-1.5 size-3.5" />Agregar tramo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={setTarifas.isPending}>
            {setTarifas.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Guardar tarifas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Form sheet (create / edit base data) ─────────────────────────────────────

function ProductoEspecialForm({
  producto, open, onClose,
}: { producto: ProductoEspecialResponse | null; open: boolean; onClose: () => void }) {
  const isEdit    = !!producto
  const createMut = useCreateProductoEspecial()
  const updateMut = useUpdateProductoEspecial()
  const schema    = isEdit ? updateSchema : createSchema

  // biome-ignore lint/suspicious/noExplicitAny: union schema; zodResolver inference is impractical
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<any>({
    // biome-ignore lint/suspicious/noExplicitAny: union of create/update schemas
    resolver: zodResolver(schema as any),
    defaultValues: { tarifas: [] },
  })

  useEffect(() => {
    if (!open) return
    if (isEdit) {
      reset({
        nombre:         producto.nombre,
        precio:         producto.precio,
        cantidadMinima: producto.cantidadMinima ?? undefined,
        cantidadMaxima: producto.cantidadMaxima ?? undefined,
      })
    } else {
      reset({ tarifas: [] })
    }
  }, [open, producto, isEdit, reset])

  async function onSubmit(data: CreateForm | UpdateForm) {
    try {
      if (isEdit) {
        await updateMut.mutateAsync({ id: producto.id, data: data as UpdateForm })
        toast.success('Producto actualizado')
      } else {
        await createMut.mutateAsync(data as CreateForm)
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
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar producto especial' : 'Nuevo producto especial'}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editando ${producto?.nombre}` : 'Registra un producto con tarificación especial.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input {...register('codigo')} placeholder="SVC-XXX" />
              {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input {...register('nombre')} placeholder="Nombre del servicio…" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Precio base (COP) *</Label>
            <Input {...register('precio')} type="number" step="1" min="1" max={PRECIO_MAX} placeholder="0" />
            {errors.precio && <p className="text-xs text-destructive">{errors.precio.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cantidad mínima de venta</Label>
              <Input {...register('cantidadMinima')} type="number" step="1" min="1" placeholder="—" />
            </div>
            <div className="space-y-1.5">
              <Label>Cantidad máxima de venta</Label>
              <Input {...register('cantidadMaxima')} type="number" step="1" min="1" placeholder="—" />
            </div>
          </div>

          {!isEdit && (
            <>
              <Separator />
              <TarifasEditor control={control} register={register} errors={errors} />
            </>
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

// ── Tab: Catálogo ─────────────────────────────────────────────────────────────

function TabCatalogo() {
  const rol       = useSessionStore((s) => s.user?.rol)
  const canWrite  = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL' || rol === 'INVENTARIOS'
  const canDelete = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,        setBuscar]        = useState('')
  const [filterActivo,  setFilterActivo]  = useState('_all')
  const [page,          setPage]          = useState(1)
  const [formOpen,      setFormOpen]      = useState(false)
  const [selected,      setSelected]      = useState<ProductoEspecialResponse | null>(null)
  const [tarifasTarget, setTarifasTarget] = useState<ProductoEspecialResponse | null>(null)
  const [toggleTarget,  setToggleTarget]  = useState<ProductoEspecialResponse | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<ProductoEspecialResponse | null>(null)

  const params = {
    buscar:  buscar || undefined,
    activo:  filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    pagina:  page,
    limite:  ROWS,
  }

  const { data, isLoading, isError } = useProductosEspeciales(params)
  const toggleMut = useUpdateProductoEspecial()
  const deleteMut = useDeleteProductoEspecial()

  const productos  = data?.datos ?? []
  const meta       = data?.meta
  const totalPages = meta?.paginas ?? 1

  function openEdit(p: ProductoEspecialResponse) { setSelected(p); setFormOpen(true) }
  function openNew()  { setSelected(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setSelected(null) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMut.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Producto desactivado' : 'Producto activado')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMut.mutateAsync(deleteTarget.id)
      toast.success('Producto eliminado')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="space-y-4">
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
        <Select value={filterActivo} onValueChange={(v) => { setFilterActivo(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        {(buscar || filterActivo !== '_all') && (
          <Button variant="ghost" size="sm" onClick={() => { setBuscar(''); setFilterActivo('_all'); setPage(1) }}>
            Limpiar
          </Button>
        )}
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Nuevo producto
          </Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Precio base</TableHead>
              <TableHead className="text-center">Cant. mín.</TableHead>
              <TableHead className="text-center">Cant. máx.</TableHead>
              <TableHead className="text-center">Tarifas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="size-8 opacity-30" />
                    <p className="text-sm">No hay productos especiales registrados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell className="font-mono text-sm">{p.codigo}</TableCell>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCOP(p.precio)}</TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {p.cantidadMinima ?? '—'}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground text-sm">
                    {p.cantidadMaxima ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.tarifas.length > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        {p.tarifas.length} {p.tarifas.length === 1 ? 'tramo' : 'tramos'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Precio base</span>
                    )}
                  </TableCell>
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
                            <Pencil className="mr-2 size-3.5" />Editar datos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTarifasTarget(p)}>
                            <Layers className="mr-2 size-3.5" />Editar tarifas
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setToggleTarget(p)}>
                            <PowerOff className="mr-2 size-3.5" />
                            {p.activo ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(p)}
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

      <ProductoEspecialForm producto={selected} open={formOpen} onClose={closeForm} />

      <TarifasDialog
        producto={tarifasTarget}
        open={!!tarifasTarget}
        onClose={() => setTarifasTarget(null)}
      />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desactivar producto' : 'Activar producto'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.activo
                ? `¿Desactivar "${toggleTarget?.nombre}"?`
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
            <DialogTitle>Eliminar producto especial</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. ¿Eliminar definitivamente "{deleteTarget?.nombre}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Tab: Movimientos ──────────────────────────────────────────────────────────

function TipoMovBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    entrada:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    salida:     'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    ajuste:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    devolucion: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  }
  return (
    <Badge className={`${map[tipo] ?? 'bg-muted text-muted-foreground'} capitalize text-[10px]`}>
      {tipo}
    </Badge>
  )
}

function TabMovimientos() {
  const [sucursalId, setSucursalId] = useState(0)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [pagina,     setPagina]     = useState(1)
  const limite = 30

  const { data: sucursalesData, isLoading: loadingSucs } = useInventarioSucursales()
  const sucursales = sucursalesData ?? []

  const { data, isLoading } = useMovimientos(
    sucursalId,
    { tipo: tipoFiltro as 'ajuste' | undefined, pagina, limite },
    sucursalId > 0,
  )

  const totalPaginas = data ? Math.ceil(data.total / limite) : 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {loadingSucs ? (
          <Skeleton className="h-9 w-56" />
        ) : (
          <Select
            value={sucursalId > 0 ? String(sucursalId) : ''}
            onValueChange={(v) => { setSucursalId(Number(v)); setPagina(1) }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Seleccionar sucursal…" />
            </SelectTrigger>
            <SelectContent>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={tipoFiltro || 'todos'} onValueChange={(v) => { setTipoFiltro(v === 'todos' ? '' : v); setPagina(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="salida">Salida</SelectItem>
            <SelectItem value="ajuste">Ajuste</SelectItem>
            <SelectItem value="devolucion">Devolución</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sucursalId === 0 ? (
        <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
          Selecciona una sucursal para ver los movimientos.
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Fecha</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Producto</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tipo</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Cantidad</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Anterior</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Posterior</th>
                  <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Observación</th>
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  : data?.datos.map((mov: MovimientoItem) => (
                      <tr key={mov.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(mov.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-4 py-3 max-w-48 truncate">
                          <span className="font-medium">{mov.producto.nombre}</span>
                          <span className="block text-xs text-muted-foreground font-mono">{mov.producto.codigo}</span>
                        </td>
                        <td className="px-4 py-3"><TipoMovBadge tipo={mov.tipo} /></td>
                        <td className="px-4 py-3 text-right font-semibold">{mov.cantidad}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{mov.cantidadAnterior}</td>
                        <td className="px-4 py-3 text-right">{mov.cantidadPosterior}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-40 truncate">
                          {mov.observacion ?? '—'}
                        </td>
                      </tr>
                    ))
                }
                {!isLoading && data?.datos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Sin movimientos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{data?.total ?? 0} movimientos</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-2">{pagina} / {totalPaginas}</span>
                <Button size="icon" variant="ghost" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductosEspecialesPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Productos Especiales</h1>
        <p className="text-sm text-muted-foreground">Servicios con tarificación escalonada por cantidad</p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">
            <Layers className="mr-1.5 size-4" />Catálogo
          </TabsTrigger>
          <TabsTrigger value="movimientos">
            <History className="mr-1.5 size-4" />Movimientos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <TabCatalogo />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <TabMovimientos />
        </TabsContent>
      </Tabs>
    </div>
  )
}
