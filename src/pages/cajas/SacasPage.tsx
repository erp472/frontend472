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
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useSacas, useSaca, useCrearSaca, useCerrarSaca,
  type Saca, type TipoSaca, type TipoConsolidacionSaca,
} from '@/queries/sacas.queries'

// ── Schemas ───────────────────────────────────────────────────────────────────

const crearSchema = z.object({
  numeroPrecinto:     z.string().min(1, 'Requerido'),
  tipo:               z.enum(['nacional', 'internacional']),
  tipoConsolidacion:  z.enum(['consolidada', 'directa']).default('directa'),
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

// ── Badge estado ──────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: Saca['estado'] }) {
  return estado === 'abierta'
    ? <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Abierta</Badge>
    : <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400"><PackageCheck className="size-3 mr-1" />Cerrada</Badge>
}

// ── Tarjeta saca ──────────────────────────────────────────────────────────────

function SacaCard({ saca, onClick }: { saca: Saca; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">Precinto #{saca.numeroPrecinto}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {saca.tipo} · {saca.tipoConsolidacion}
          </p>
          {saca.centroOperativoDest && (
            <p className="text-xs text-muted-foreground truncate">→ {saca.centroOperativoDest}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <EstadoBadge estado={saca.estado} />
          <span className="text-xs text-muted-foreground">{saca.totalEnvios} envío(s)</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted-foreground">
          {new Date(saca.createdAt).toLocaleDateString('es-CO')}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

function DetalleSaca({ sacaId, sucursalId, onClose }: { sacaId: number; sucursalId: number; onClose: () => void }) {
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
    <div className="space-y-3 p-1">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
    </div>
  )

  if (!saca) return <p className="text-sm text-muted-foreground">Saca no encontrada.</p>

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Precinto</p>
          <p className="font-medium">#{saca.numeroPrecinto}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estado</p>
          <EstadoBadge estado={saca.estado} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="capitalize">{saca.tipo} · {saca.tipoConsolidacion}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Envíos</p>
          <p className="font-medium">{saca.totalEnvios}</p>
        </div>
        {saca.centroOperativoDest && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Centro destino</p>
            <p>{saca.centroOperativoDest}</p>
          </div>
        )}
        {saca.transportistaNombre && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Transportista</p>
            <p>{saca.transportistaNombre}</p>
          </div>
        )}
        {saca.pesoKg && (
          <div>
            <p className="text-xs text-muted-foreground">Peso</p>
            <p>{saca.pesoKg} kg</p>
          </div>
        )}
        {saca.fechaDespacho && (
          <div>
            <p className="text-xs text-muted-foreground">Despacho</p>
            <p>{new Date(saca.fechaDespacho).toLocaleDateString('es-CO')}</p>
          </div>
        )}
      </div>

      {/* Acción cerrar */}
      {saca.estado === 'abierta' && (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => setShowCerrar(true)}
        >
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
            <div className="space-y-1">
              <Label>Peso (kg)</Label>
              <Input {...register('pesoKg')} type="number" step="0.01" min="0" placeholder="0.00" className={errors.pesoKg ? 'border-destructive' : ''} />
              {errors.pesoKg && <p className="text-xs text-destructive">{errors.pesoKg.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Transportista</Label>
              <Input {...register('transportistaNombre')} placeholder="Nombre del transportista" />
            </div>
            <div className="space-y-1">
              <Label>Fecha de despacho</Label>
              <Input {...register('fechaDespacho')} type="date" />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCerrar(false)}>Cancelar</Button>
              <Button type="submit" disabled={cerrar.isPending}>
                {cerrar.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : <Lock className="size-4 mr-2" />}
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

  const [filtroEstado, setFiltroEstado] = useState<string>('abierta')
  const [showCrear,    setShowCrear]    = useState(false)
  const [detalleSacaId, setDetalleSacaId] = useState<number | null>(null)

  const { data: sacas, isLoading, refetch, isFetching } = useSacas(sucursalId, filtroEstado)
  const crear = useCrearSaca(sucursalId)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CrearForm>({
    resolver: zodResolver(crearSchema),
    defaultValues: { tipo: 'nacional', tipoConsolidacion: 'directa' },
  })

  const tipoVal = watch('tipo')
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
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Package className="size-5 text-primary" /> Sacas postales
          </h1>
          <p className="text-xs text-muted-foreground">Sucursal #{sucursalId}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost" size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowCrear(true)}>
            <Plus className="size-4 mr-1" /> Nueva saca
          </Button>
        </div>
      </div>

      {/* Filtro */}
      <Tabs value={filtroEstado} onValueChange={setFiltroEstado}>
        <TabsList className="w-full">
          <TabsTrigger value="abierta" className="flex-1">Abiertas</TabsTrigger>
          <TabsTrigger value="cerrada" className="flex-1">Cerradas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : (sacas ?? []).length === 0 ? (
        <div className="text-center py-14 text-muted-foreground">
          <Package className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay sacas {filtroEstado === 'abierta' ? 'abiertas' : 'cerradas'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(sacas ?? []).map(s => (
            <SacaCard key={s.id} saca={s} onClick={() => setDetalleSacaId(s.id)} />
          ))}
        </div>
      )}

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
            <DialogTitle>Nueva saca</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCrear)} className="space-y-4">
            <div className="space-y-1">
              <Label>Número de precinto *</Label>
              <Input
                {...register('numeroPrecinto')}
                placeholder="P-2024-0001"
                className={errors.numeroPrecinto ? 'border-destructive' : ''}
              />
              {errors.numeroPrecinto && <p className="text-xs text-destructive">{errors.numeroPrecinto.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={tipoVal} onValueChange={v => setValue('tipo', v as TipoSaca)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nacional">Nacional</SelectItem>
                    <SelectItem value="internacional">Internacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Consolidación</Label>
                <Select value={consolidacionVal} onValueChange={v => setValue('tipoConsolidacion', v as TipoConsolidacionSaca)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directa">Directa</SelectItem>
                    <SelectItem value="consolidada">Consolidada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Centro operativo destino</Label>
              <Input {...register('centroOperativoDest')} placeholder="Bogotá — COP" />
            </div>
            <div className="space-y-1">
              <Label>Transportista</Label>
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
