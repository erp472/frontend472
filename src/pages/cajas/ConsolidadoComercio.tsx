import { RefreshCw, TrendingUp, Building2, AlertTriangle } from 'lucide-react'
import { Button }  from '@/components/ui/button'
import { Badge }   from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useConsolidadoComercio, type MedioPagoConsolidado } from '@/queries/cajas.queries'

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string | null | undefined) => v ? COP.format(Number(v)) : '$0'

const MEDIO_LABELS: Record<MedioPagoConsolidado, string> = {
  efectivo:        'Efectivo',
  tarjetaDebito:   'Tarjeta Débito',
  tarjetaCredito:  'Tarjeta Crédito',
  transferencia:   'Transferencia',
  consignacion:    'Consignación',
  preporteado:     'Preporteado',
  mixtoPreporteado: 'Mixto Preporteado',
}

const MEDIO_COLORS: Record<MedioPagoConsolidado, string> = {
  efectivo:        'bg-emerald-500',
  tarjetaDebito:   'bg-blue-500',
  tarjetaCredito:  'bg-violet-500',
  transferencia:   'bg-sky-500',
  consignacion:    'bg-amber-500',
  preporteado:     'bg-orange-500',
  mixtoPreporteado: 'bg-pink-500',
}

const MEDIOS = Object.keys(MEDIO_LABELS) as MedioPagoConsolidado[]

export default function ConsolidadoComercio() {
  const { data, isLoading, isError, refetch, isFetching } = useConsolidadoComercio()

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <AlertTriangle className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No se pudo cargar el consolidado</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const total = Number(data.total)
  const mediosConMonto = MEDIOS.filter(m => Number(data.porMedio[m]) > 0)

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Building2 className="size-6 text-primary shrink-0" />
          <div>
            <h1 className="text-lg font-bold">Consolidado Comercio</h1>
            <p className="text-xs text-muted-foreground">
              {data.numRegionales} regional{data.numRegionales !== 1 ? 'es' : ''} · Sesiones activas hoy
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Total general */}
      <div className="rounded-xl border bg-card p-6 text-center space-y-1 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center justify-center gap-1.5">
          <TrendingUp className="size-3.5" /> Total recaudado (todas las regionales)
        </p>
        <p className="text-4xl font-bold tabular-nums">{fmt(data.total)}</p>
        {data.numRegionales === 0 && (
          <Badge variant="outline" className="text-xs">Sin sesiones abiertas</Badge>
        )}
      </div>

      {/* Desglose por medio de pago */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Desglose por medio de pago
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {MEDIOS.map(medio => {
            const monto = Number(data.porMedio[medio])
            const pct   = total > 0 ? (monto / total) * 100 : 0
            return (
              <div
                key={medio}
                className="rounded-xl border bg-card p-4 space-y-2 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full shrink-0 ${MEDIO_COLORS[medio]}`} />
                  <p className="text-xs font-medium text-muted-foreground truncate">{MEDIO_LABELS[medio]}</p>
                </div>
                <p className="text-lg font-bold tabular-nums">{fmt(data.porMedio[medio])}</p>
                {total > 0 && (
                  <div className="space-y-1">
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${MEDIO_COLORS[medio]}`}
                        style={{ width: `${pct.toFixed(1)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Medios sin movimiento */}
      {MEDIOS.length !== mediosConMonto.length && (
        <p className="text-xs text-muted-foreground text-center">
          {MEDIOS.length - mediosConMonto.length} medio{MEDIOS.length - mediosConMonto.length !== 1 ? 's' : ''} sin movimiento hoy
        </p>
      )}
    </div>
  )
}
