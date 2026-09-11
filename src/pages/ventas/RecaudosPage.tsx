import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Receipt, Search, XCircle, CheckCircle, Loader2, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { Badge }   from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import { useStatusPunto, useServiciosCaja } from '@/queries/cajas.queries'
import {
  useConvenios, useRecaudosSesion, useRegistrarRecaudo, useAnularRecaudo,
  type Recaudo,
} from '@/queries/recaudos.queries'

// ── Schema del formulario ─────────────────────────────────────────────────────

const schema = z.object({
  convenioId:       z.coerce.number().int().positive('Selecciona un convenio'),
  referenciaPago:   z.string().min(1, 'Requerido').max(100),
  codigoBarras:     z.string().max(200).optional(),
  monto:            z.coerce.number().positive('Debe ser mayor a 0'),
  comisionOperador: z.coerce.number().nonnegative().default(0),
})
type FormValues = z.infer<typeof schema>

// ── Badge de estado ───────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: Recaudo['estado'] }) {
  if (estado === 'exitoso')
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="size-3" /> Exitoso
      </Badge>
    )
  if (estado === 'anulado')
    return (
      <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1 dark:bg-gray-800 dark:text-gray-400">
        <XCircle className="size-3" /> Anulado
      </Badge>
    )
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 gap-1 dark:bg-red-900/30 dark:text-red-400">
      <XCircle className="size-3" /> Fallido
    </Badge>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function RecaudosPage() {
  const { cajaId: cajaIdStr } = useParams<{ cajaId: string }>()
  const cajaId = Number(cajaIdStr)
  const navigate = useNavigate()
  const sucursalId = useSessionStore(s => s.user?.sucursal_id ?? 0)

  const { data: status }     = useStatusPunto(sucursalId)
  const { servicioActivo }   = useServiciosCaja(cajaId)
  const sesionActiva         = status?.cajas.find(c => c.cajaId === cajaId)
  const sesionId             = sesionActiva?.sesionId ?? 0

  const { data: convenios, isLoading: loadingConvenios } = useConvenios(sucursalId)
  const { data: recaudos,  isLoading: loadingRecaudos  } = useRecaudosSesion(sesionId)

  const registrar = useRegistrarRecaudo(cajaId)
  const anular    = useAnularRecaudo()

  const [anularId, setAnularId] = useState<number | null>(null)
  const [buscar,   setBuscar]   = useState('')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { comisionOperador: 0 },
  })

  const convenioSelId = watch('convenioId')

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await registrar.mutateAsync(values)
      toast.success(`Recaudo registrado — $${Number(res.recaudo.monto).toLocaleString('es-CO')}`)
      reset()
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al registrar recaudo')
    }
  }

  const confirmarAnular = async () => {
    if (!anularId) return
    try {
      await anular.mutateAsync(anularId)
      toast.success('Recaudo anulado')
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al anular')
    } finally {
      setAnularId(null)
    }
  }

  const recaudosFiltrados = (recaudos ?? []).filter(r =>
    buscar === '' ||
    r.referenciaPago.toLowerCase().includes(buscar.toLowerCase()) ||
    (r.codigoBarras ?? '').toLowerCase().includes(buscar.toLowerCase())
  )

  if (!servicioActivo('recaudo_facturas')) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-12 text-muted-foreground">
        <XCircle className="size-8 opacity-30" />
        <p className="text-sm">El supervisor inhabilitó el recaudo de facturas en esta caja</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Volver</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <BadgeCheck className="size-5 text-primary" /> Recaudos
          </h1>
          <p className="text-xs text-muted-foreground">Caja #{cajaId}</p>
        </div>
      </div>

      <Tabs defaultValue="registrar">
        <TabsList className="w-full">
          <TabsTrigger value="registrar" className="flex-1">Registrar</TabsTrigger>
          <TabsTrigger value="historial" className="flex-1">
            Turno ({recaudos?.filter(r => r.estado !== 'anulado').length ?? 0})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Registrar ── */}
        <TabsContent value="registrar" className="mt-4">
          <form onSubmit={handleSubmit(onSubmit as never)} className="space-y-4">

            {/* Convenio */}
            <div className="space-y-1">
              <Label>Convenio *</Label>
              {loadingConvenios ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={convenioSelId ? String(convenioSelId) : ''}
                  onValueChange={v => setValue('convenioId', Number(v), { shouldValidate: true })}
                >
                  <SelectTrigger className={cn(errors.convenioId && 'border-destructive')}>
                    <SelectValue placeholder="Selecciona un convenio" />
                  </SelectTrigger>
                  <SelectContent>
                    {(convenios ?? []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre} <span className="text-muted-foreground text-xs ml-1">({c.codigo})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.convenioId && <p className="text-xs text-destructive">{errors.convenioId.message}</p>}
            </div>

            {/* Referencia y código de barras */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Referencia de pago *</Label>
                <Input {...register('referenciaPago')} placeholder="Número de referencia" className={cn(errors.referenciaPago && 'border-destructive')} />
                {errors.referenciaPago && <p className="text-xs text-destructive">{errors.referenciaPago.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Código de barras</Label>
                <Input {...register('codigoBarras')} placeholder="Opcional" />
              </div>
            </div>

            {/* Monto y comisión */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto a recaudar *</Label>
                <Input {...register('monto')} type="number" step="0.01" min="0" placeholder="0.00" className={cn(errors.monto && 'border-destructive')} />
                {errors.monto && <p className="text-xs text-destructive">{errors.monto.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Comisión operador</Label>
                <Input {...register('comisionOperador')} type="number" step="0.01" min="0" placeholder="0.00" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || registrar.isPending}>
              {(isSubmitting || registrar.isPending) ? (
                <><Loader2 className="size-4 animate-spin mr-2" /> Registrando...</>
              ) : (
                <><Receipt className="size-4 mr-2" /> Registrar recaudo</>
              )}
            </Button>
          </form>
        </TabsContent>

        {/* ── Tab: Historial del turno ── */}
        <TabsContent value="historial" className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por referencia o código..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
            />
          </div>

          {loadingRecaudos ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : recaudosFiltrados.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {buscar ? 'Sin resultados' : 'No hay recaudos en este turno'}
            </div>
          ) : (
            <div className="space-y-2">
              {recaudosFiltrados.map(r => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">Ref: {r.referenciaPago}</p>
                    {r.codigoBarras && (
                      <p className="text-xs text-muted-foreground truncate">{r.codigoBarras}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold">
                      ${Number(r.monto).toLocaleString('es-CO')}
                    </span>
                    <EstadoBadge estado={r.estado} />
                    {r.estado === 'exitoso' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive hover:text-destructive"
                        onClick={() => setAnularId(r.id)}
                      >
                        Anular
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog confirmación anulación */}
      <Dialog open={!!anularId} onOpenChange={open => !open && setAnularId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular recaudo #{anularId}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. ¿Confirmas la anulación?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnularId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={confirmarAnular}
              disabled={anular.isPending}
            >
              {anular.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
