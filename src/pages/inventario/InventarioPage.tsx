import { useState } from 'react'
import {
  Package, Search, ClipboardList, History,
  AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Loader2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Switch }    from '@/components/ui/switch'
import { Label }     from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useSessionStore } from '@/stores/useSessionStore'
import { useSucursales }   from '@/queries/sucursales.queries'
import {
  useStock, useMovimientos, useAjusteInventario,
  type StockItem, type MovimientoItem,
} from '@/queries/inventario.queries'

// ── Badge de estado ───────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: 'ok' | 'bajo' | 'critico' }) {
  if (estado === 'ok')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
        <CheckCircle className="size-3" /> OK
      </Badge>
    )
  if (estado === 'bajo')
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
        <AlertTriangle className="size-3" /> Bajo
      </Badge>
    )
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
      <XCircle className="size-3" /> Crítico
    </Badge>
  )
}

// ── Badge de tipo de movimiento ───────────────────────────────────────────────

function TipoMovBadge({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    entrada:   'bg-green-100 text-green-800',
    salida:    'bg-red-100 text-red-800',
    ajuste:    'bg-blue-100 text-blue-800',
    devolucion:'bg-purple-100 text-purple-800',
  }
  return (
    <Badge className={`${map[tipo] ?? 'bg-muted text-muted-foreground'} capitalize text-[10px]`}>
      {tipo}
    </Badge>
  )
}

// ── Modal de ajuste ───────────────────────────────────────────────────────────

const ajusteSchema = z.object({
  cantidad_nueva: z.coerce.number().int().min(0, 'No puede ser negativo'),
  observacion:    z.string().max(500).optional(),
})
type AjusteForm = z.infer<typeof ajusteSchema>

function AjusteModal({
  item, sucursalId, open, onClose,
}: { item: StockItem; sucursalId: number; open: boolean; onClose: () => void }) {
  const mutation = useAjusteInventario(sucursalId)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AjusteForm>({
    resolver: zodResolver(ajusteSchema),
    defaultValues: { cantidad_nueva: item.stockActual, observacion: '' },
  })

  const onSubmit = (data: AjusteForm) => {
    mutation.mutate(
      { productoId: item.productoId, cantidad_nueva: data.cantidad_nueva, observacion: data.observacion || undefined },
      {
        onSuccess: () => {
          toast.success('Stock actualizado')
          reset()
          onClose()
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Error al ajustar'
          toast.error(msg)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-4" />
            Ajuste físico de stock
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {item.productoCodigo} — {item.productoNombre}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="flex gap-6 text-sm">
            <span className="text-muted-foreground">Conteo actual: <strong>{item.stockActual}</strong></span>
            <span className="text-muted-foreground">Mínimo: <strong>{item.stockMinimo}</strong></span>
          </div>

          <div className="space-y-1">
            <Label htmlFor="cantidad_nueva">Conteo físico real</Label>
            <Input
              id="cantidad_nueva"
              type="number"
              min={0}
              {...register('cantidad_nueva')}
            />
            {errors.cantidad_nueva && (
              <p className="text-xs text-destructive">{errors.cantidad_nueva.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="observacion">Observación (opcional)</Label>
            <Input id="observacion" {...register('observacion')} placeholder="Motivo del ajuste…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Guardar ajuste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const ROLES_WRITE = ['INVENTARIOS', 'ADMIN_SISTEMA']

// ── Tabla de stock ────────────────────────────────────────────────────────────

function StockTable({ sucursalId, canWrite }: { sucursalId: number; canWrite: boolean }) {
  const [buscar,       setBuscar]       = useState('')
  const [soloConStock, setSoloConStock] = useState(false)
  const [pagina,       setPagina]       = useState(1)
  const [selected,     setSelected]     = useState<StockItem | null>(null)
  const limite = 50

  const { data, isLoading, isFetching, refetch } = useStock(
    sucursalId,
    { buscar: buscar || undefined, soloConStock, pagina, limite },
  )

  const totalPaginas = data ? Math.ceil(data.total / limite) : 1

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar producto…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPagina(1) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="solo-stock" checked={soloConStock} onCheckedChange={(v) => { setSoloConStock(v); setPagina(1) }} />
          <Label htmlFor="solo-stock" className="text-sm cursor-pointer">Solo con stock</Label>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Código</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Producto</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Tipo</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Actual</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground text-right">Mínimo</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Estado</th>
              <th className="px-4 py-2.5 font-medium text-xs text-muted-foreground">Actualizado</th>
              {canWrite && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: canWrite ? 8 : 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              : data?.datos.map((item) => (
                  <tr key={item.productoId} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.productoCodigo}</td>
                    <td className="px-4 py-3 font-medium max-w-56 truncate">{item.productoNombre}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{item.productoTipo}</td>
                    <td className="px-4 py-3 text-right font-semibold">{item.stockActual}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{item.stockMinimo}</td>
                    <td className="px-4 py-3"><EstadoBadge estado={item.estado} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.ultimaActualizacion
                        ? new Date(item.ultimaActualizacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: '2-digit' })
                        : '—'}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => setSelected(item)}>
                          Ajustar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
            }
            {!isLoading && data?.datos.length === 0 && (
              <tr>
                <td colSpan={canWrite ? 8 : 7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay productos que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.total ?? 0} productos</span>
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

      {selected && (
        <AjusteModal
          item={selected}
          sucursalId={sucursalId}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ── Tabla de movimientos ──────────────────────────────────────────────────────

function MovimientosTable({ sucursalId }: { sucursalId: number }) {
  const [tipo,   setTipo]   = useState<string>('')
  const [pagina, setPagina] = useState(1)
  const limite = 30

  const { data, isLoading } = useMovimientos(
    sucursalId,
    { tipo: tipo as 'ajuste' | undefined, pagina, limite },
  )

  const totalPaginas = data ? Math.ceil(data.total / limite) : 1

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={tipo} onValueChange={(v) => { setTipo(v === 'todos' ? '' : v); setPagina(1) }}>
          <SelectTrigger className="w-40">
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
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InventarioPage() {
  const user = useSessionStore((s) => s.user)

  const isAdmin  = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL'
  const canWrite = !!user?.rol && ROLES_WRITE.includes(user.rol)
  const defaultId = user?.sucursal_id ?? 0

  const [sucursalId, setSucursalId] = useState<number>(defaultId)

  const { data: sucursalesData } = useSucursales({ limite: 500 })

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="size-5 text-primary" />
          <h1 className="text-xl font-semibold">Inventario</h1>
        </div>

        {isAdmin && (
          <Select
            value={String(sucursalId)}
            onValueChange={(v) => setSucursalId(Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Seleccionar sucursal…" />
            </SelectTrigger>
            <SelectContent>
              {sucursalesData?.datos.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {sucursalId === 0 ? (
        <div className="rounded-md border px-6 py-10 text-center text-sm text-muted-foreground">
          Selecciona una sucursal para ver el inventario.
        </div>
      ) : (
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock" className="gap-1.5">
              <Package className="size-3.5" /> Stock actual
            </TabsTrigger>
            <TabsTrigger value="movimientos" className="gap-1.5">
              <History className="size-3.5" /> Movimientos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4">
            <StockTable sucursalId={sucursalId} canWrite={canWrite} />
          </TabsContent>
          <TabsContent value="movimientos" className="mt-4">
            <MovimientosTable sucursalId={sucursalId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
