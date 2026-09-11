import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Package, PackageCheck, Plus, X, ChevronRight,
  Loader2, RefreshCw, Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useSacas, useSaca, useCrearSaca, useCerrarSaca,
  type Saca, type TipoSaca, type TipoConsolidacionSaca,
} from '@/queries/sacas.queries'

// ── Schemas ───────────────────────────────────────────────────────────────────

const crearSchema = z.object({
  numeroPrecinto:      z.string().min(1, 'Requerido'),
  tipo:                z.enum(['nacional', 'internacional']),
  tipoConsolidacion:   z.enum(['consolidada', 'directa']).default('directa'),
  centroOperativoDest: z.string().optional(),
  transportistaNombre: z.string().optional(),
})
type CrearForm = z.infer<typeof crearSchema>

const cerrarSchema = z.object({
  pesoKg:              z.coerce.number().positive('Ingresa el peso').optional(),
  transportistaNombre: z.string().optional(),
  fechaDespacho:       z.string().optional(),
})
type CerrarForm = z.infer<typeof cerrarSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Badge estado ──────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: Saca['estado'] }) {
  if (estado === 'abierta')
    return <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Abierta</Badge>
  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      <PackageCheck className="size-3" />Cerrada
    </Badge>
  )
}

// ── Resumen de totales ────────────────────────────────────────────────────────

function ResumenSacas({ sacas }: { sacas: Saca[] }) {
  const abiertas    = sacas.filter(s => s.estado === 'abierta').length
  const totalEnvios = sacas.reduce((acc, s) => acc + s.totalEnvios, 0)

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="rounded-lg border bg-card p-3 space-y-0.5">
        <p className="text-xs text-muted-foreground">Total sacas</p>
        <p className="text-xl font-bold tabular-nums">{sacas.length}</p>
      </div>
      <div className="rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-3 space-y-0.5">
        <p className="text-xs text-emerald-700 dark:text-emerald-400">Abiertas</p>
        <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{abiertas}</p>
      </div>
      <div className="rounded-lg border bg-card p-3 space-y-0.5">
        <p className="text-xs text-muted-foreground">Envíos totales</p>
        <p className="text-xl font-bold tabular-nums">{totalEnvios}</p>
      </div>
    </div>
  )
}

// ── Tarjeta saca ──────────────────────────────────────────────────────────────

function cardBgSaca(saca: Saca) {
  if (saca.estado === 'cerrada')
    return 'border-border bg-muted/30 hover:bg-muted/50'
  return 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
}

function SacaCard({ saca, onClick }: { saca: Saca; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-colors group',
        cardBgSaca(saca),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={cn(
            'mt-1.5 size-2 rounded-full shrink-0',
            saca.estado === 'abierta' ? 'bg-emerald-500' : 'bg-zinc-300',
          )} />
          <div className="min-w-0">
            <p className="font-semibold text-sm">
              Precinto <span className="font-mono">#{saca.numeroPrecinto}</span>
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground capitalize">{saca.tipo}</span>
              <span className="text-muted-foreground/50 text-xs">·</span>
              <span className="text-xs text-muted-foreground capitalize">{saca.tipoConsolidacion}</span>
            </div>
            {saca.centroOperativoDest && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {saca.centroOperativoDest}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <EstadoBadge estado={saca.estado} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {saca.totalEnvios} envío{saca.totalEnvios !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pl-5">
        <span className="text-xs text-muted-foreground">{fmtFecha(saca.createdAt)}</span>
        <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

function DetalleSaca({ sacaId, sucursalId, onClose }: {
  sacaId: number
  sucursalId: number
  onClose: () => void
}) {
  const { data: saca, isLoading } = useSaca(sacaId)
  const cerrar = useCerrarSaca(sucursalId)
  const [showCerrar, setShowCerrar] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<CerrarForm>({
    resolver: zodResolver(cerrarSchema),
  })

  const onCerrar = async (values: CerrarForm) => {
    try {
      await cerrar.mutateAsync({ id: sacaId, payload: values })
      toast.success('Saca cerrada correctamente')
      setShowCerrar(false)
      onClose()
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cerrar saca')
    }
  }

  if (isLoading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
    </div>
  )

  if (!saca) return <p className="text-sm text-muted-foreground">Saca no encontrada.</p>

  return (
    <div className="space-y-5">

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Precinto</p>
          <p className="text-sm font-semibold font-mono">#{saca.numeroPrecinto}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Estado</p>
          <div className="mt-0.5"><EstadoBadge estado={saca.estado} /></div>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Tipo</p>
          <p className="text-sm capitalize">{saca.tipo}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Consolidación</p>
          <p className="text-sm capitalize">{saca.tipoConsolidacion}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Envíos</p>
          <p className="text-sm font-semibold tabular-nums">{saca.totalEnvios}</p>
        </div>
        {saca.pesoKg != null && (
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Peso</p>
            <p className="text-sm tabular-nums">{saca.pesoKg} kg</p>
          </div>
        )}
        {saca.centroOperativoDest && (
          <div className="col-span-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Centro destino</p>
            <p className="text-sm">{saca.centroOperativoDest}</p>
          </div>
        )}
        {saca.transportistaNombre && (
          <div className="col-span-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Transportista</p>
            <p className="text-sm">{saca.transportistaNombre}</p>
          </div>
        )}
        {saca.fechaDespacho && (
          <div className="col-span-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Despacho</p>
            <p className="text-sm">{new Date(saca.fechaDespacho).toLocaleDateString('es-CO')}</p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Creada</p>
          <p className="text-sm">{fmtFecha(saca.createdAt)}</p>
        </div>
        {saca.cerradaAt && (
          <div className="col-span-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Cerrada</p>
            <p className="text-sm">{fmtFecha(saca.cerradaAt)}</p>
          </div>
        )}
      </div>

      {/* Acción cerrar */}
      {saca.estado === 'abierta' && (
        <Button className="w-full" variant="outline" onClick={() => setShowCerrar(true)}>
          <Lock className="size-4 mr-2" /> Cerrar saca
        </Button>
      )}

      {/* Dialog cerrar */}
      <Dialog open={showCerrar} onOpenChange={setShowCerrar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar saca #{saca.numeroPrecinto}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCerrar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Peso (kg)</Label>
              <Input
                {...register('pesoKg')}
                type="number" step="0.01" min="0"
                placeholder="0.00"
                className={errors.pesoKg ? 'border-destructive' : ''}
              />
              {errors.pesoKg && <p className="text-xs text-destructive">{errors.pesoKg.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transportista</Label>
              <Input {...register('transportistaNombre')} placeholder="Nombre del transportista" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha de despacho</Label>
              <Input {...register('fechaDespacho')} type="date" />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCerrar(false)}>Cancelar</Button>
              <Button type="submit" disabled={cerrar.isPending}>
                {cerrar.isPending
                  ? <Loader2 className="size-4 animate-spin mr-2" />
                  : <Lock className="size-4 mr-2" />
                }
                Confirmar cierre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SacasPage() {
  const { sucursalId: sucursalIdStr } = useParams<{ sucursalId: string }>()
  const sucursalId = Number(sucursalIdStr) || useSessionStore(s => s.user?.sucursal_id ?? 0)

  const [filtroEstado, setFiltroEstado]   = useState<string>('abierta')
  const [showCrear, setShowCrear]         = useState(false)
  const [detalleSacaId, setDetalleSacaId] = useState<number | null>(null)

  const { data: sacas = [], isLoading, isError, refetch, isFetching } = useSacas(sucursalId, filtroEstado)
  const crear = useCrearSaca(sucursalId)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CrearForm>({
    resolver: zodResolver(crearSchema) as never,
    defaultValues: { tipo: 'nacional', tipoConsolidacion: 'directa' },
  })

  const tipoVal         = watch('tipo')
  const consolidacionVal = watch('tipoConsolidacion')

  const onCrear = async (values: CrearForm) => {
    try {
      await crear.mutateAsync({ ...values, sucursalId })
      toast.success(`Saca #${values.numeroPrecinto} creada`)
      setShowCrear(false)
      reset()
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al crear saca')
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Package className="size-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">Sacas postales</h1>
            <p className="text-[11px] text-muted-foreground">Sucursal #{sucursalId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={() => setShowCrear(true)}>
            <Plus className="size-4 mr-1.5" /> Nueva saca
          </Button>
        </div>
      </header>

      {/* Cuerpo */}
      <div className="flex-1 overflow-auto p-5">

        {/* Filtro */}
        <Tabs value={filtroEstado} onValueChange={setFiltroEstado} className="mb-4">
          <TabsList>
            <TabsTrigger value="abierta">Abiertas</TabsTrigger>
            <TabsTrigger value="cerrada">Cerradas</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Resumen */}
        {!isLoading && !isError && sacas.length > 0 && <ResumenSacas sacas={sacas} />}

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">No se pudo cargar las sacas</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
          </div>
        ) : sacas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Package className="size-10 opacity-30" />
            <p className="text-sm">
              No hay sacas {filtroEstado === 'abierta' ? 'abiertas' : 'cerradas'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {sacas.map(s => (
              <SacaCard key={s.id} saca={s} onClick={() => setDetalleSacaId(s.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Sheet detalle */}
      <Sheet open={!!detalleSacaId} onOpenChange={open => !open && setDetalleSacaId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Detalle de saca</SheetTitle>
          </SheetHeader>
          {detalleSacaId && (
            <DetalleSaca
              sacaId={detalleSacaId}
              sucursalId={sucursalId}
              onClose={() => setDetalleSacaId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog crear */}
      <Dialog open={showCrear} onOpenChange={open => { setShowCrear(open); if (!open) reset() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="size-4" /> Nueva saca
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCrear as never)} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Número de precinto *</Label>
              <Input
                {...register('numeroPrecinto')}
                placeholder="P-2024-0001"
                className={errors.numeroPrecinto ? 'border-destructive' : ''}
              />
              {errors.numeroPrecinto && (
                <p className="text-xs text-destructive">{errors.numeroPrecinto.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={tipoVal} onValueChange={v => setValue('tipo', v as TipoSaca)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Consolidación</Label>
                <Select value={consolidacionVal} onValueChange={v => setValue('tipoConsolidacion', v as TipoConsolidacionSaca)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directa">Directa</SelectItem>
                    <SelectItem value="consolidada">Consolidada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Centro operativo destino</Label>
              <Input {...register('centroOperativoDest')} placeholder="Bogotá — COP" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transportista</Label>
              <Input {...register('transportistaNombre')} placeholder="Nombre del transportista" />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setShowCrear(false); reset() }}>
                <X className="size-4 mr-1" /> Cancelar
              </Button>
              <Button type="submit" disabled={crear.isPending}>
                {crear.isPending
                  ? <Loader2 className="size-4 animate-spin mr-2" />
                  : <Plus className="size-4 mr-2" />
                }
                Crear saca
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
