import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, AlertCircle, TrendingDown, TrendingUp,
  CheckCircle2, Clock, Filter, RefreshCw,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Skeleton }  from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useDiferenciasBySucursal } from '@/queries/cajas.queries'
import type { DiferenciaRegistro, DiferenciaRegistroFiltros } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})
const fmt = (n: string | number) => COP.format(Number(n))

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Badges de estado y tipo ───────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: DiferenciaRegistro['tipoDiferencia'] }) {
  if (tipo === 'faltante')
    return (
      <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-semibold text-xs">
        <TrendingDown className="size-3.5" />Faltante
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold text-xs">
      <TrendingUp className="size-3.5" />Sobrante
    </span>
  )
}

function EstadoBadge({ estado }: { estado: DiferenciaRegistro['estado'] }) {
  if (estado === 'pendiente')
    return <Badge variant="outline" className="text-xs gap-1"><Clock className="size-3" />Pendiente</Badge>
  if (estado === 'aprobada')
    return <Badge className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="size-3" />Aprobada</Badge>
  return <Badge variant="destructive" className="text-xs">Rechazada</Badge>
}

// ── Resumen de totales ────────────────────────────────────────────────────────

function ResumenTotales({ datos }: { datos: DiferenciaRegistro[] }) {
  const faltantes = datos.filter(d => d.tipoDiferencia === 'faltante')
  const sobrantes = datos.filter(d => d.tipoDiferencia === 'sobrante')
  const totalFaltante = faltantes.reduce((s, d) => s + Number(d.monto), 0)
  const totalSobrante = sobrantes.reduce((s, d) => s + Number(d.monto), 0)
  const pendientes    = datos.filter(d => d.estado === 'pendiente').length
  const neto = totalSobrante - totalFaltante

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-lg border bg-card p-3 space-y-0.5">
        <p className="text-xs text-muted-foreground">Total registros</p>
        <p className="text-xl font-bold tabular-nums">{datos.length}</p>
      </div>
      <div className="rounded-lg border bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-800 p-3 space-y-0.5">
        <p className="text-xs text-red-700 dark:text-red-400">Faltantes ({faltantes.length})</p>
        <p className="text-xl font-bold tabular-nums text-red-700 dark:text-red-400">{fmt(totalFaltante)}</p>
      </div>
      <div className="rounded-lg border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-3 space-y-0.5">
        <p className="text-xs text-amber-700 dark:text-amber-400">Sobrantes ({sobrantes.length})</p>
        <p className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-400">+{fmt(totalSobrante)}</p>
      </div>
      <div className={cn(
        'rounded-lg border p-3 space-y-0.5',
        neto < -0.5 ? 'bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-800' :
        neto > 0.5  ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800' :
        'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800',
      )}>
        <p className="text-xs text-muted-foreground">
          Neto{pendientes > 0 && <span className="ml-1 text-orange-500">({pendientes} pend.)</span>}
        </p>
        <p className={cn(
          'text-xl font-bold tabular-nums',
          neto < -0.5 ? 'text-red-700 dark:text-red-400' :
          neto > 0.5  ? 'text-amber-700 dark:text-amber-400' :
          'text-emerald-700 dark:text-emerald-400',
        )}>
          {neto >= 0 ? '+' : ''}{fmt(neto)}
        </p>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function RegistroDiferencias() {
  const { sucursalId } = useParams<{ sucursalId: string }>()
  const navigate = useNavigate()
  const id = Number(sucursalId)

  const [filtros, setFiltros] = useState<DiferenciaRegistroFiltros>({})
  const [draft, setDraft] = useState<DiferenciaRegistroFiltros>({})

  const { data = [], isLoading, isError, refetch, isFetching } = useDiferenciasBySucursal(id, filtros)

  function aplicar() {
    setFiltros({ ...draft })
  }

  function limpiar() {
    setDraft({})
    setFiltros({})
  }

  const hayFiltros = !!(filtros.tipo || filtros.estado || filtros.desde || filtros.hasta)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">Registro de Diferencias</h1>
            <p className="text-[11px] text-muted-foreground">Historial informativo — no afecta saldos ni cierres</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('size-3.5 mr-1.5', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </header>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Filtros */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Filter className="size-3.5" />Filtros
            {hayFiltros && (
              <button type="button" className="ml-2 underline text-muted-foreground font-normal normal-case tracking-normal" onClick={limpiar}>
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={draft.tipo ?? '_all'}
                onValueChange={(v) => setDraft(p => ({ ...p, tipo: v === '_all' ? undefined : v as 'faltante' | 'sobrante' }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  <SelectItem value="faltante">Faltante</SelectItem>
                  <SelectItem value="sobrante">Sobrante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select
                value={draft.estado ?? '_all'}
                onValueChange={(v) => setDraft(p => ({ ...p, estado: v === '_all' ? undefined : v as DiferenciaRegistroFiltros['estado'] }))}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobada">Aprobada</SelectItem>
                  <SelectItem value="rechazada">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={draft.desde ?? ''}
                onChange={(e) => setDraft(p => ({ ...p, desde: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={draft.hasta ?? ''}
                onChange={(e) => setDraft(p => ({ ...p, hasta: e.target.value || undefined }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="h-7 text-xs" onClick={aplicar}>Aplicar filtros</Button>
          </div>
        </div>

        {/* Resumen */}
        {!isLoading && data.length > 0 && <ResumenTotales datos={data} />}

        {/* Tabla */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Fecha</TableHead>
                <TableHead>Caja</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertCircle className="size-8 opacity-40" />
                      <p className="text-sm">No se pudo cargar el registro.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="size-8 opacity-30 text-emerald-500" />
                      <p className="text-sm">Sin diferencias registradas{hayFiltros ? ' con estos filtros' : ''}.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((d) => (
                  <TableRow
                    key={d.id}
                    className={cn(
                      d.tipoDiferencia === 'faltante' && d.estado === 'pendiente' && 'bg-red-50/40 dark:bg-red-950/10',
                      d.tipoDiferencia === 'sobrante' && d.estado === 'pendiente' && 'bg-amber-50/40 dark:bg-amber-950/10',
                    )}
                  >
                    <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                      {fmtFecha(d.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{d.cajaNombre}</TableCell>
                    <TableCell><TipoBadge tipo={d.tipoDiferencia} /></TableCell>
                    <TableCell className={cn(
                      'text-right tabular-nums font-bold text-sm',
                      d.tipoDiferencia === 'faltante' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400',
                    )}>
                      {d.tipoDiferencia === 'faltante' ? '-' : '+'}{fmt(d.monto)}
                    </TableCell>
                    <TableCell><EstadoBadge estado={d.estado} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                      {d.observaciones ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {data.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {data.length} registro{data.length !== 1 ? 's' : ''} — vista informativa, sin efecto sobre caja ni cierre
          </p>
        )}
      </div>
    </div>
  )
}
