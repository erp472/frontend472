import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Loader2,
  MailOpen,
  RefreshCw,
  Search,
  ShieldBan,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useApartadosPorSucursal,
  type EstadoApartado,
  type TamanoApartado,
} from '@/queries/ventas.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import { cn } from '@/lib/utils'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const TAMANO_LABEL: Record<TamanoApartado, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande:  'Grande',
}

const TAMANO_BADGE: Record<TamanoApartado, string> = {
  pequeno: 'bg-sky-500/10 text-sky-700 border-sky-300',
  mediano: 'bg-violet-500/10 text-violet-700 border-violet-300',
  grande:  'bg-amber-500/10 text-amber-700 border-amber-300',
}

const ESTADO_CONFIG: Record<EstadoApartado, {
  label: string
  className: string
  icon: React.ElementType
  bloqueado: boolean
}> = {
  disponible:   { label: 'Disponible',    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-300', icon: CheckCircle2, bloqueado: false },
  ocupado:      { label: 'Vendido',        className: 'bg-red-500/10 text-red-700 border-red-300',             icon: ShieldBan,    bloqueado: true  },
  reservado:    { label: 'En carrito',     className: 'bg-yellow-500/10 text-yellow-700 border-yellow-300',    icon: Clock,        bloqueado: true  },
  vencido:      { label: 'Vencido',        className: 'bg-gray-500/10 text-gray-600 border-gray-300',          icon: AlertCircle,  bloqueado: true  },
  mantenimiento:{ label: 'Mantenimiento', className: 'bg-orange-500/10 text-orange-700 border-orange-300',    icon: Wrench,       bloqueado: true  },
}

const TODOS_LOS_ESTADOS: EstadoApartado[] = ['disponible', 'reservado', 'ocupado', 'vencido', 'mantenimiento']

function formatFecha(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado as EstadoApartado]
  if (!cfg) return <Badge variant="outline">{estado}</Badge>
  const Icon = cfg.icon
  return (
    <Badge variant="outline" className={cn('gap-1', cfg.className)}>
      <Icon className="size-3" />
      {cfg.label}
    </Badge>
  )
}

function AlertaBadge({ dias, alerta }: { dias: number; alerta: boolean }) {
  if (alerta) {
    return (
      <Badge variant="outline" className="gap-1 bg-red-500/10 text-red-700 border-red-300">
        <AlertTriangle className="size-3" />
        ¡Vence pronto!
      </Badge>
    )
  }
  if (dias > 0) {
    return (
      <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-300">
        <Bell className="size-3" />
        {dias} días antes
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <BellOff className="size-3" />
      Sin alerta
    </Badge>
  )
}

function RowSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

export default function ApartadosVentaPage() {
  const user       = useSessionStore((s) => s.user)
  const sucursalId = user?.sucursal_id ?? 0

  const [filtroTamano, setFiltroTamano] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscar,       setBuscar]       = useState('')

  const { data: lista = [], isLoading, isError, refetch, isFetching } =
    useApartadosPorSucursal(sucursalId, filtroTamano || undefined)

  const totalDisponibles = lista.filter((a) => a.estado === 'disponible').length

  const listaFiltrada = lista.filter((a) => {
    if (filtroEstado && a.estado !== filtroEstado) return false
    if (buscar && !a.numero.toLowerCase().includes(buscar.toLowerCase())) return false
    return true
  })

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-5">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Apartados Postales</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Cargando...'
                : `${totalDisponibles} disponibles · ${lista.length} en total`}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching
              ? <Loader2 className="size-4 animate-spin" />
              : <RefreshCw className="size-4" />}
            <span className="ml-1.5">Actualizar</span>
          </Button>
        </div>

        {/* Resumen por tamaño */}
        {!isLoading && lista.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {(['pequeno', 'mediano', 'grande'] as TamanoApartado[]).map((t) => {
              const disp     = lista.filter((a) => a.tamano === t && a.estado === 'disponible').length
              const total    = lista.filter((a) => a.tamano === t).length
              const selected = filtroTamano === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFiltroTamano(selected ? '' : t)}
                  className={[
                    'rounded-xl border p-4 text-left transition-colors hover:bg-muted/50',
                    selected ? 'border-primary bg-primary/5' : '',
                  ].join(' ')}
                >
                  <p className="text-2xl font-bold tabular-nums">{disp}</p>
                  <p className="text-sm text-muted-foreground">
                    {TAMANO_LABEL[t]} · {total} total
                  </p>
                </button>
              )
            })}
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar número..."
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
            />
          </div>
          <Select value={filtroTamano} onValueChange={setFiltroTamano}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos los tamaños" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los tamaños</SelectItem>
              <SelectItem value="pequeno">Pequeño</SelectItem>
              <SelectItem value="mediano">Mediano</SelectItem>
              <SelectItem value="grande">Grande</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los estados</SelectItem>
              {TODOS_LOS_ESTADOS.map((e) => (
                <SelectItem key={e} value={e}>
                  {ESTADO_CONFIG[e].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabla */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">N° Apartado</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha apertura</TableHead>
                <TableHead>Alerta disponible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <RowSkeleton />
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertCircle className="size-8 opacity-40" />
                      <p className="text-sm">No se pudo cargar los apartados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : listaFiltrada.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <MailOpen className="size-8 opacity-30" />
                      <p className="text-sm">
                        {buscar || filtroTamano || filtroEstado
                          ? 'Sin resultados para los filtros aplicados'
                          : 'No hay apartados registrados en tu sucursal'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                listaFiltrada.map((a) => {
                  const bloqueado = ESTADO_CONFIG[a.estado as EstadoApartado]?.bloqueado ?? false
                  return (
                    <TableRow
                      key={a.id}
                      className={cn(bloqueado && 'opacity-60 bg-muted/30')}
                    >
                      <TableCell className="font-mono font-semibold">{a.numero}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={TAMANO_BADGE[a.tamano as TamanoApartado] ?? ''}
                        >
                          {TAMANO_LABEL[a.tamano as TamanoApartado] ?? a.tamano}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {a.valor != null ? COP.format(a.valor) : '—'}
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={a.estado} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatFecha(a.fechaInicio)}
                      </TableCell>
                      <TableCell>
                        <AlertaBadge
                          dias={a.diasAlertaVencimiento}
                          alerta={a.alertaVencimiento}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>

          {!isLoading && !isError && (
            <div className="border-t px-4 py-2 text-xs text-muted-foreground tabular-nums">
              {listaFiltrada.length} de {lista.length} apartados
              {totalDisponibles > 0 && (
                <span className="ml-2 text-emerald-600 font-medium">
                  · {totalDisponibles} disponibles para venta
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
