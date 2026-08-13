import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, Pencil, Trash2, Loader2, AlertCircle, MailOpen,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  useAdminApartados, useCreateApartadoAdmin, useUpdateApartadoAdmin, useDeleteApartadoAdmin,
  type ApartadoAdminItem,
} from '@/queries/ventas.queries'
import { useSucursales } from '@/queries/sucursales.queries'
import { ApiError } from '@/lib/api'

type TamanoApartado = 'pequeno' | 'mediano' | 'grande'
type EstadoApartado = 'disponible' | 'ocupado' | 'vencido' | 'mantenimiento'

const TAMANO_LABEL: Record<TamanoApartado, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande:  'Grande',
}

const ESTADO_BADGE: Record<EstadoApartado, { label: string; class: string }> = {
  disponible:   { label: 'Disponible',   class: 'bg-emerald-500/15 text-emerald-700 border-emerald-300' },
  ocupado:      { label: 'Ocupado',      class: 'bg-blue-500/15 text-blue-700 border-blue-300' },
  vencido:      { label: 'Vencido',      class: 'bg-red-500/15 text-red-700 border-red-300' },
  mantenimiento:{ label: 'Mant.',        class: 'bg-amber-500/15 text-amber-700 border-amber-300' },
}

const createSchema = z.object({
  sucursalId:            z.preprocess(Number, z.number().int().positive('Selecciona una sucursal')),
  numero:                z.string().min(1, 'Requerido').max(20),
  tamano:                z.enum(['pequeno', 'mediano', 'grande'] as const).default('pequeno'),
  diasAlertaVencimiento: z.preprocess((v) => v === '' ? 30 : Number(v), z.number().int().min(1).max(365)).default(30),
})

const updateSchema = z.object({
  tamano:                z.enum(['pequeno', 'mediano', 'grande'] as const).optional(),
  estado:                z.enum(['disponible', 'mantenimiento', 'reservado'] as const).optional(),
  diasAlertaVencimiento: z.preprocess((v) => v === '' ? undefined : Number(v), z.number().int().min(1).max(365).optional()),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function TableSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 7 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

// ── Sheet: crear / editar ─────────────────────────────────────────────────────

function ApartadoSheet({
  item, open, onClose,
}: { item: ApartadoAdminItem | null; open: boolean; onClose: () => void }) {
  const isEdit   = !!item
  const crear    = useCreateApartadoAdmin()
  const actualizar = useUpdateApartadoAdmin()
  const { data: sucursalesData } = useSucursales({ limite: 200 })
  const sucursales = sucursalesData?.data ?? []

  const { register: regC, handleSubmit: hsC, reset: resetC, setValue: svC, formState: { errors: errsC } } =
    useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const { register: regU, handleSubmit: hsU, reset: resetU, setValue: svU, formState: { errors: errsU } } =
    useForm<UpdateForm>({ resolver: zodResolver(updateSchema) })

  function handleClose() { resetC(); resetU(); onClose() }

  async function onSubmitCreate(data: CreateForm) {
    try {
      await crear.mutateAsync(data)
      toast.success(`Apartado #${data.numero} creado`)
      handleClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al crear')
    }
  }

  async function onSubmitUpdate(data: UpdateForm) {
    if (!item) return
    try {
      await actualizar.mutateAsync({ id: item.id, ...data })
      toast.success(`Apartado #${item.numero} actualizado`)
      handleClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al actualizar')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Editar apartado #${item?.numero}` : 'Nuevo apartado postal'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? `${item?.sucursalCodigo} · ${item?.sucursalNombre}`
              : 'Se crea en estado "disponible" automáticamente.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {!isEdit ? (
            <form onSubmit={hsC(onSubmitCreate)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ap-suc">Sucursal</Label>
                <Select onValueChange={(v) => svC('sucursalId', Number(v) as any)}>
                  <SelectTrigger id="ap-suc">
                    <SelectValue placeholder="Selecciona sucursal" />
                  </SelectTrigger>
                  <SelectContent>
                    {sucursales.map((s) => (
                      <SelectItem key={s.idsucursales} value={String(s.idsucursales)}>
                        {s.codigosucursales} · {s.nombresucursales}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errsC.sucursalId && <p className="text-xs text-destructive">{errsC.sucursalId.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ap-num">Número de apartado</Label>
                <Input id="ap-num" placeholder="Ej. 001, A-01" {...regC('numero')} />
                {errsC.numero && <p className="text-xs text-destructive">{errsC.numero.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ap-tam">Tamaño</Label>
                <Select defaultValue="pequeno" onValueChange={(v) => svC('tamano', v as TamanoApartado)}>
                  <SelectTrigger id="ap-tam"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno">Pequeño</SelectItem>
                    <SelectItem value="mediano">Mediano</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ap-dias">Días de alerta antes del vencimiento</Label>
                <Input id="ap-dias" type="number" min="1" max="365" defaultValue={30} {...regC('diasAlertaVencimiento')} />
              </div>

              <Button type="submit" className="w-full" disabled={crear.isPending}>
                {crear.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Crear apartado
              </Button>
            </form>
          ) : (
            <form onSubmit={hsU(onSubmitUpdate)} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tamaño</Label>
                <Select defaultValue={item?.tamano} onValueChange={(v) => svU('tamano', v as TamanoApartado)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pequeno">Pequeño</SelectItem>
                    <SelectItem value="mediano">Mediano</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {item?.estado !== 'ocupado' && item?.estado !== 'vencido' && (
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select defaultValue={item?.estado} onValueChange={(v) => svU('estado', v as 'disponible' | 'mantenimiento')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {item?.estado === 'reservado' && (
                        <SelectItem value="reservado" disabled>Reservado (bloqueado)</SelectItem>
                      )}
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                  {item?.estado === 'reservado' && (
                    <p className="text-[11px] text-amber-600">
                      Selecciona "Disponible" para liberar este apartado bloqueado.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="ap-dias-e">Días de alerta</Label>
                <Input
                  id="ap-dias-e"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={item?.diasAlertaVencimiento ?? 30}
                  {...regU('diasAlertaVencimiento')}
                />
                {errsU.diasAlertaVencimiento && <p className="text-xs text-destructive">{errsU.diasAlertaVencimiento.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={actualizar.isPending}>
                {actualizar.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Guardar cambios
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Dialog: confirmar eliminación ─────────────────────────────────────────────

function DeleteDialog({
  item, open, onClose,
}: { item: ApartadoAdminItem | null; open: boolean; onClose: () => void }) {
  const eliminar = useDeleteApartadoAdmin()

  async function handleDelete() {
    if (!item) return
    try {
      await eliminar.mutateAsync(item.id)
      toast.success(`Apartado #${item.numero} eliminado`)
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al eliminar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar apartado</DialogTitle>
          <DialogDescription>
            ¿Eliminar el apartado <strong>#{item?.numero}</strong> de {item?.sucursalNombre}?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={eliminar.isPending}>
            {eliminar.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Página ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

export default function ApartadosAdmin() {
  const [buscar,       setBuscar]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTamano, setFiltroTamano] = useState('')
  const [pagina,       setPagina]       = useState(1)
  const [sheetItem,    setSheetItem]    = useState<ApartadoAdminItem | null>(null)
  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [deleteItem,   setDeleteItem]   = useState<ApartadoAdminItem | null>(null)

  const { data, isLoading, isError } = useAdminApartados({
    estado: filtroEstado || undefined,
    tamano: filtroTamano || undefined,
  })

  const filtered = (data ?? []).filter((a) => {
    if (!buscar) return true
    const q = buscar.toLowerCase()
    return (
      a.numero.toLowerCase().includes(q) ||
      a.sucursalNombre.toLowerCase().includes(q) ||
      a.sucursalCodigo.toLowerCase().includes(q)
    )
  })

  const totalPaginas = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginaActual = Math.min(pagina, totalPaginas)
  const items        = filtered.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE)

  function resetPagina() { setPagina(1) }
  function openCreate() { setSheetItem(null); setSheetOpen(true) }
  function openEdit(a: ApartadoAdminItem) { setSheetItem(a); setSheetOpen(true) }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Apartados Postales</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} apartados registrados` : 'Cargando...'}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="size-4" />Nuevo apartado
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9 w-52"
            placeholder="Buscar número, sucursal…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); resetPagina() }}
          />
        </div>
        <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v); resetPagina() }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los estados</SelectItem>
            <SelectItem value="disponible">Disponible</SelectItem>
            <SelectItem value="ocupado">Ocupado</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
            <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTamano} onValueChange={(v) => { setFiltroTamano(v); resetPagina() }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Todos los tamaños" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los tamaños</SelectItem>
            <SelectItem value="pequeno">Pequeño</SelectItem>
            <SelectItem value="mediano">Mediano</SelectItem>
            <SelectItem value="grande">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">N°</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Días alerta</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar los apartados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <MailOpen className="size-8 opacity-30" />
                    <p className="text-sm">
                      {buscar || filtroEstado || filtroTamano
                        ? 'Sin resultados para los filtros aplicados'
                        : 'No hay apartados postales registrados'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => {
                const estado = ESTADO_BADGE[a.estado as EstadoApartado] ?? { label: a.estado, class: '' }
                return (
                  <TableRow key={a.id} className="group">
                    <TableCell className="font-mono font-semibold">{a.numero}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium text-sm">{a.sucursalNombre}</span>
                        <Badge variant="outline" className="ml-1.5 font-mono text-[10px] px-1">{a.sucursalCodigo}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{TAMANO_LABEL[a.tamano as TamanoApartado] ?? a.tamano}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={estado.class}>{estado.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {a.diasAlertaVencimiento} días
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.fechaFin ? new Date(a.fechaFin).toLocaleDateString('es-CO') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost" size="icon" className="size-7"
                          title="Editar" onClick={() => openEdit(a)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {a.estado !== 'ocupado' && (
                          <Button
                            variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive"
                            title="Eliminar" onClick={() => setDeleteItem(a)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {!isLoading && !isError && data && (
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground tabular-nums flex items-center justify-between gap-4">
            <div className="flex gap-4">
              <span>{filtered.length} de {data.length} apartados</span>
              {data.filter(a => a.estado === 'disponible').length > 0 && (
                <span className="text-emerald-600">
                  {data.filter(a => a.estado === 'disponible').length} disponibles
                </span>
              )}
              {data.filter(a => a.estado === 'ocupado').length > 0 && (
                <span className="text-blue-600">
                  {data.filter(a => a.estado === 'ocupado').length} ocupados
                </span>
              )}
            </div>
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="icon" className="size-7"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina(p => p - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="min-w-[5rem] text-center">
                  Pág. {paginaActual} / {totalPaginas}
                </span>
                <Button
                  variant="outline" size="icon" className="size-7"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPagina(p => p + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ApartadoSheet
        item={sheetItem}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
      <DeleteDialog
        item={deleteItem}
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
      />
    </div>
  )
}
