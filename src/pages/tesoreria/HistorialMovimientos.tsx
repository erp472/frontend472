import { useState } from 'react'
import { ScrollText, PlusCircle, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useCajasPrincipalesTesoreria,
  useMovimientosTesoreria,
  type MovimientoTesoreria,
  type TipoMovimientoTesoreria,
} from '@/queries/tesoreria.queries'

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string) => COP.format(Number(v))

const FECHA = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const TIPO_META: Record<TipoMovimientoTesoreria, { label: string; icon: React.ElementType; color: string; signo: string }> = {
  apertura: { label: 'Apertura', icon: PlusCircle,      color: 'text-sky-500',     signo: ''  },
  ingreso:  { label: 'Ingreso',  icon: ArrowDownCircle, color: 'text-emerald-500', signo: '+' },
  egreso:   { label: 'Egreso',   icon: ArrowUpCircle,   color: 'text-red-500',     signo: '−' },
}

const TODOS = '__todos__'

function MovimientoRow({ mov }: { mov: MovimientoTesoreria }) {
  const meta = TIPO_META[mov.tipo]
  const Icon = meta.icon

  return (
    <div className="border rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-start gap-3">
        <Icon className={`size-4 shrink-0 mt-0.5 ${meta.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{mov.puntoNombre}</p>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{meta.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">{mov.sucursalNombre}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-sm font-bold tabular-nums ${meta.color}`}>
            {meta.signo}{fmt(mov.monto)}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums">
            queda {fmt(mov.saldoResultante)}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pl-7">{mov.descripcion}</p>

      <div className="flex items-center gap-3 flex-wrap pl-7 text-[10px] text-muted-foreground">
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{mov.codigoAprobacion}</span>
        <span>{mov.registradoPor}</span>
        <span>{FECHA.format(new Date(mov.createdAt))}</span>
      </div>
    </div>
  )
}

export default function HistorialMovimientos() {
  const [punto, setPunto] = useState<string>(TODOS)
  const [tipo, setTipo]   = useState<string>(TODOS)

  const { data: puntos = [] } = useCajasPrincipalesTesoreria()
  const { data: movimientos = [], isLoading, isFetching, refetch } = useMovimientosTesoreria({
    ...(punto !== TODOS ? { cajaPadreId: Number(punto) } : {}),
    ...(tipo  !== TODOS ? { tipo: tipo as TipoMovimientoTesoreria } : {}),
  })

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Historial de movimientos</h1>
          <p className="text-sm text-muted-foreground">
            Aperturas, ingresos y egresos del comercio hacia las cajas principales
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={punto} onValueChange={setPunto}>
          <SelectTrigger className="h-8 text-xs w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las cajas principales</SelectItem>
            {puntos.map(p => (
              <SelectItem key={p.cajaPadreId} value={String(p.cajaPadreId)}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los tipos</SelectItem>
            <SelectItem value="apertura">Apertura</SelectItem>
            <SelectItem value="ingreso">Ingreso</SelectItem>
            <SelectItem value="egreso">Egreso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : movimientos.length === 0 ? (
        <div className="border rounded-xl px-4 py-10 text-center">
          <ScrollText className="size-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Todavía no hay movimientos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {movimientos.map(m => <MovimientoRow key={m.id} mov={m} />)}
        </div>
      )}
    </div>
  )
}
