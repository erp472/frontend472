import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, AlertTriangle, TrendingDown, TrendingUp,
  RefreshCw, Lock, Loader2, ShieldCheck, ArrowLeft,
  Vault, Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  useStatusPunto, useCierreMultiple, useCajaPadre,
  type CardAuxiliar, type PanelPunto,
} from '@/queries/cajas.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (n: number | string | null | undefined) => COP.format(Number(n ?? 0))

type Estado = 'ok' | 'faltante' | 'sobrante' | 'pendiente'

interface FilaCaja {
  caja:       CardAuxiliar
  esperado:   number
  contado:    number | null
  diferencia: number | null
  estado:     Estado
}

interface CierreRegistrado {
  nombre:     string
  diferencia: number
}

function calcEstado(dif: number | null): Estado {
  if (dif === null) return 'pendiente'
  if (Math.abs(dif) < 1) return 'ok'
  return dif < 0 ? 'faltante' : 'sobrante'
}

// ── DifBadge ─────────────────────────────────────────────────────────────────

function DifBadge({ estado, dif }: { estado: Estado; dif: number | null }) {
  if (estado === 'pendiente')
    return <span className="text-muted-foreground text-xs">—</span>
  if (estado === 'ok')
    return (
      <span className="flex items-center gap-1 text-emerald-600 font-semibold text-sm">
        <CheckCircle2 className="size-3.5" /> Cuadra
      </span>
    )
  if (estado === 'faltante')
    return (
      <span className="flex items-center gap-1 text-red-600 font-semibold text-sm">
        <TrendingDown className="size-3.5" /> {fmt(Math.abs(dif!))}
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
      <TrendingUp className="size-3.5" /> +{fmt(dif!)}
    </span>
  )
}

// ── FilaCajaRow ───────────────────────────────────────────────────────────────

function FilaCajaRow({
  fila,
  contadoStr,
  onChange,
  onCerrar,
  cerrando,
}: {
  fila:       FilaCaja
  contadoStr: string
  onChange:   (v: string) => void
  onCerrar:   () => void
  cerrando:   boolean
}) {
  const { caja, esperado, estado } = fila
  const yaActiva = caja.estado === 'abierta'

  const rowCls = cn(
    'grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-3 border-b last:border-b-0 transition-colors',
    estado === 'ok'        && 'bg-emerald-50/50 dark:bg-emerald-950/20',
    estado === 'faltante'  && 'bg-red-50/60 dark:bg-red-950/20',
    estado === 'sobrante'  && 'bg-amber-50/60 dark:bg-amber-950/20',
    !yaActiva              && 'opacity-50',
  )

  return (
    <div className={rowCls}>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-sm truncate">{caja.nombre}</span>
        <span className="text-[11px] text-muted-foreground">{caja.codigo}</span>
      </div>

      <div className="text-right tabular-nums text-sm font-mono">
        {yaActiva ? fmt(esperado) : '—'}
      </div>

      <div>
        {yaActiva ? (
          <Input
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={contadoStr}
            onChange={e => onChange(e.target.value)}
            className="h-8 text-right text-sm tabular-nums font-mono"
            disabled={cerrando || caja.estado !== 'abierta'}
          />
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {caja.estado === 'cerrada' ? 'Cerrada' : 'Sin sesión'}
          </span>
        )}
      </div>

      <div className="text-right">
        <DifBadge estado={estado} dif={fila.diferencia} />
      </div>

      <div className="flex justify-end">
        {yaActiva ? (
          <Button
            size="sm"
            variant={estado === 'ok' ? 'default' : 'outline'}
            className={cn(
              'h-7 text-xs gap-1',
              estado === 'faltante' && 'border-red-400 text-red-700 hover:bg-red-50',
              estado === 'sobrante' && 'border-amber-400 text-amber-700 hover:bg-amber-50',
            )}
            disabled={contadoStr === '' || cerrando}
            onClick={onCerrar}
          >
            {cerrando ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Lock className="size-3" />
            )}
            Cerrar
          </Button>
        ) : (
          <CheckCircle2 className="size-4 text-muted-foreground/40" />
        )}
      </div>
    </div>
  )
}

// ── BannerEstado ──────────────────────────────────────────────────────────────

function BannerEstado({ filas }: { filas: FilaCaja[] }) {
  const activas    = filas.filter(f => f.caja.estado === 'abierta')
  const cuadran    = activas.filter(f => f.estado === 'ok')
  const faltantes  = activas.filter(f => f.estado === 'faltante')
  const sobrantes  = activas.filter(f => f.estado === 'sobrante')
  const pendientes = activas.filter(f => f.estado === 'pendiente')

  if (activas.length === 0)
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted text-sm text-muted-foreground">
        <ShieldCheck className="size-4" />
        No hay cajas POS activas — arqueo completado
      </div>
    )

  if (faltantes.length === 0 && sobrantes.length === 0 && pendientes.length === 0)
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-sm font-medium">
        <CheckCircle2 className="size-4" />
        Todas las cajas cuadran — listo para cierre
      </div>
    )

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-lg bg-muted text-sm">
      {pendientes.length > 0 && (
        <span className="text-muted-foreground">{pendientes.length} sin contar</span>
      )}
      {cuadran.length > 0 && (
        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" /> {cuadran.length} cuadran
        </span>
      )}
      {faltantes.length > 0 && (
        <span className="flex items-center gap-1 text-red-700 dark:text-red-400 font-medium">
          <TrendingDown className="size-3.5" /> {faltantes.length} con faltante
        </span>
      )}
      {sobrantes.length > 0 && (
        <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <TrendingUp className="size-3.5" /> {sobrantes.length} con sobrante
        </span>
      )}
    </div>
  )
}

// ── PanelCierre: sidebar derecho ──────────────────────────────────────────────

function PanelCierre({
  panel,
  cajasPos,
  cierresConDif,
}: {
  panel:         PanelPunto
  cajasPos:      CardAuxiliar[]
  cierresConDif: Record<number, CierreRegistrado>
}) {
  const alertas        = Object.values(cierresConDif)
  const faltantes      = alertas.filter(a => a.diferencia < -0.5)
  const sobrantes      = alertas.filter(a => a.diferencia > 0.5)
  const totalFaltante  = faltantes.reduce((s, a) => s + a.diferencia, 0)
  const totalSobrante  = sobrantes.reduce((s, a) => s + a.diferencia, 0)
  const netoDiferencia = totalFaltante + totalSobrante

  const totalCajas    = cajasPos.length
  const cajasCerradas = cajasPos.filter(c => c.estado === 'cerrada').length
  const todasCerradas = totalCajas > 0 && cajasPos.every(c => c.estado !== 'abierta')
  const progreso      = totalCajas > 0 ? Math.round((cajasCerradas / totalCajas) * 100) : 0
  const encuadreOk    = todasCerradas && alertas.every(a => Math.abs(a.diferencia) < 1)

  return (
    <div className="flex flex-col h-full overflow-y-auto text-xs">

      {/* Saldos del Punto */}
      <div className="border-b">
        <div className="px-3 py-2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Vault className="size-3" /> Saldos del Punto
        </div>
        <div className="p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Caja Fuerte:</span>
            <span className="font-bold tabular-nums">{fmt(panel.cajaFuerteGeneral)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Caja General:</span>
            <span className="font-bold tabular-nums">{fmt(panel.cajaGeneral)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-muted-foreground">
            <span>Base asignada:</span>
            <span className="tabular-nums">{fmt(panel.baseGeneral)}</span>
          </div>
        </div>
      </div>

      {/* Progreso de cierre */}
      <div className="border-b p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[11px] uppercase tracking-wide">Progreso de Cierre</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 tabular-nums">
            {cajasCerradas}/{totalCajas}
          </Badge>
        </div>

        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              encuadreOk ? 'bg-emerald-500' : 'bg-primary',
            )}
            style={{ width: `${progreso}%` }}
          />
        </div>

        <div className={cn(
          'flex items-center gap-1.5 text-[11px] font-medium',
          encuadreOk             && 'text-emerald-700 dark:text-emerald-400',
          todasCerradas && !encuadreOk && 'text-amber-700 dark:text-amber-400',
          !todasCerradas         && 'text-muted-foreground',
        )}>
          {encuadreOk ? (
            <><CheckCircle2 className="size-3" /> Punto encuadrado</>
          ) : todasCerradas ? (
            <><AlertTriangle className="size-3" /> Cerradas con diferencias</>
          ) : (
            <><Clock className="size-3" /> Cierre en progreso</>
          )}
        </div>
      </div>

      {/* Alertas de cierre */}
      <div className="border-b">
        <div className={cn(
          'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5',
          alertas.length > 0 ? 'bg-red-600 text-white' : 'bg-muted/40 text-muted-foreground',
        )}>
          <AlertTriangle className="size-3" />
          Alertas de Cierre ({alertas.length})
        </div>

        {alertas.length === 0 ? (
          <p className="px-3 py-3 text-muted-foreground text-center italic text-[11px]">
            Sin alertas registradas
          </p>
        ) : (
          <div className="divide-y">
            {alertas.map((a, i) => (
              <div
                key={i}
                className={cn(
                  'px-3 py-2 flex items-center justify-between gap-2',
                  a.diferencia < -0.5 ? 'bg-red-50/60 dark:bg-red-950/10' : 'bg-amber-50/60 dark:bg-amber-950/10',
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate text-[11px]">{a.nombre}</p>
                  <p className={cn(
                    'font-semibold text-[11px]',
                    a.diferencia < -0.5 ? 'text-red-600' : 'text-amber-600',
                  )}>
                    {a.diferencia < -0.5
                      ? `Faltante: ${fmt(Math.abs(a.diferencia))}`
                      : `Sobrante: +${fmt(a.diferencia)}`}
                  </p>
                </div>
                {a.diferencia < -0.5
                  ? <TrendingDown className="size-4 text-red-400 shrink-0" />
                  : <TrendingUp   className="size-4 text-amber-400 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen diferencias */}
      {alertas.length > 0 && (
        <div className="border-b p-3 space-y-1.5">
          <p className="font-semibold text-[11px] uppercase tracking-wide">Resumen de Diferencias</p>
          {faltantes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Faltantes ({faltantes.length})</span>
              <span className="text-red-600 font-bold tabular-nums">{fmt(totalFaltante)}</span>
            </div>
          )}
          {sobrantes.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sobrantes ({sobrantes.length})</span>
              <span className="text-amber-600 font-bold tabular-nums">+{fmt(totalSobrante)}</span>
            </div>
          )}
          <Separator />
          <div className={cn(
            'flex justify-between font-bold',
            Math.abs(netoDiferencia) < 1 ? 'text-emerald-700' :
            netoDiferencia < 0           ? 'text-red-700' : 'text-amber-700',
          )}>
            <span>Diferencia neta</span>
            <span className="tabular-nums">
              {netoDiferencia >= 0 ? '+' : ''}{fmt(netoDiferencia)}
            </span>
          </div>
        </div>
      )}

      {/* Estado de encuadre — solo cuando todas las cajas están cerradas */}
      {todasCerradas && (
        <div className={cn(
          'mx-3 my-3 rounded-lg p-3 text-center border',
          encuadreOk
            ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800',
        )}>
          {encuadreOk ? (
            <>
              <ShieldCheck className="size-5 text-emerald-600 mx-auto mb-1" />
              <p className="font-semibold text-[11px] text-emerald-800 dark:text-emerald-300">
                Punto encuadrado
              </p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                Todos los fondos en Caja Fuerte
              </p>
            </>
          ) : (
            <>
              <AlertTriangle className="size-5 text-amber-600 mx-auto mb-1" />
              <p className="font-semibold text-[11px] text-amber-800 dark:text-amber-300">
                Cierre con diferencias
              </p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                Registrar diferencias en cada caja
              </p>
            </>
          )}
        </div>
      )}

      {/* Caja fuerte actualizada — cuando encuadrado */}
      {encuadreOk && (
        <div className="border-t p-3 space-y-1">
          <p className="font-semibold text-[11px] uppercase tracking-wide text-muted-foreground">
            Arqueo Final del Punto
          </p>
          <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caja Fuerte:</span>
              <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {fmt(panel.cajaFuerteGeneral)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caja General:</span>
              <span className="font-bold tabular-nums">{fmt(panel.cajaGeneral)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AlertasCierre() {
  const { sucursalId } = useParams<{ sucursalId: string }>()
  const navigate = useNavigate()
  const id = Number(sucursalId)

  const { data, isLoading, isFetching, refetch } = useStatusPunto(id)
  const { data: cajaPadre } = useCajaPadre(data?.cajaPadreId ?? 0)
  const cerrar = useCierreMultiple()

  const [contado,       setContado]       = useState<Record<number, string>>({})
  const [cerrando,      setCerrando]      = useState<Record<number, boolean>>({})
  const [cierresConDif, setCierresConDif] = useState<Record<number, CierreRegistrado>>({})

  const cajasPos: CardAuxiliar[] = useMemo(
    () => (data?.cajas ?? []).filter(c => c.tipo === 'pos'),
    [data],
  )

  const filas: FilaCaja[] = useMemo(() =>
    cajasPos.map(c => {
      const esperado = Number(c.saldoActual ?? 0)
      const cStr     = c.sesionId != null ? (contado[c.sesionId] ?? '') : ''
      const contadoN = cStr !== '' ? Number(cStr) : null
      const dif      = contadoN !== null ? contadoN - esperado : null
      return { caja: c, esperado, contado: contadoN, diferencia: dif, estado: calcEstado(dif) }
    }),
    [cajasPos, contado],
  )

  const totalEsperado = filas.filter(f => f.caja.estado === 'abierta').reduce((s, f) => s + f.esperado, 0)
  const totalContado  = filas.filter(f => f.contado !== null).reduce((s, f) => s + (f.contado ?? 0), 0)
  const totalDif      = filas.filter(f => f.diferencia !== null).reduce((s, f) => s + (f.diferencia ?? 0), 0)

  const handleCerrar = async (fila: FilaCaja) => {
    const { caja } = fila
    if (!caja.sesionId || fila.contado === null) return
    const sid = caja.sesionId
    setCerrando(p => ({ ...p, [sid]: true }))
    try {
      await cerrar.mutateAsync({ sesionId: sid, totalArqueo: String(fila.contado) })

      // Registrar alerta si hay diferencia
      if (fila.diferencia !== null && Math.abs(fila.diferencia) >= 1) {
        setCierresConDif(p => ({
          ...p,
          [sid]: { nombre: caja.nombre, diferencia: fila.diferencia! },
        }))
      }

      toast.success(`${caja.nombre} cerrada`, {
        description:
          fila.estado === 'ok'       ? 'Sin diferencias' :
          fila.estado === 'faltante' ? `Faltante: ${fmt(Math.abs(fila.diferencia!))}` :
                                       `Sobrante: +${fmt(fila.diferencia!)}`,
      })
      setContado(p => { const n = { ...p }; delete n[sid]; return n })
    } catch {
      toast.error(`No se pudo cerrar ${caja.nombre}`)
    } finally {
      setCerrando(p => ({ ...p, [sid]: false }))
    }
  }

  // Nombre del punto desde la caja general
  const nombrePunto = cajaPadre?.nombre ?? `Sucursal ${id}`

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-0">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">Proceso de Cierre — {nombrePunto}</h1>
            <p className="text-[11px] text-muted-foreground">
              Ingresa el total contado en cada caja para detectar diferencias
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('size-3.5 mr-1.5', isFetching && 'animate-spin')} />
          Actualizar
        </Button>
      </header>

      {/* Cuerpo: tabla principal + panel lateral */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Área principal */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Banner de estado */}
          <div className="px-4 py-2.5 border-b bg-muted/30 shrink-0">
            <BannerEstado filas={filas} />
          </div>

          {/* Tabla de cajas */}
          <div className="flex-1 overflow-auto">
            {cajasPos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                <AlertTriangle className="size-8 opacity-30" />
                No hay cajas POS en este punto
              </div>
            ) : (
              <div>
                {/* Encabezado de tabla */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2 bg-muted/40 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b sticky top-0 z-10">
                  <span>Caja</span>
                  <span className="text-right">Saldo esperado</span>
                  <span className="text-right">Total contado</span>
                  <span className="text-right">Diferencia</span>
                  <span className="w-16" />
                </div>

                {filas.map(fila => (
                  <FilaCajaRow
                    key={fila.caja.cajaId}
                    fila={fila}
                    contadoStr={fila.caja.sesionId != null ? (contado[fila.caja.sesionId] ?? '') : ''}
                    onChange={v =>
                      fila.caja.sesionId != null &&
                      setContado(p => ({ ...p, [fila.caja.sesionId!]: v }))
                    }
                    onCerrar={() => handleCerrar(fila)}
                    cerrando={!!(fila.caja.sesionId && cerrando[fila.caja.sesionId])}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer totales (solo si hay cajas abiertas) */}
          {cajasPos.some(c => c.estado === 'abierta') && (
            <>
              <Separator />
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/30 text-sm font-semibold tabular-nums shrink-0">
                <span className="text-muted-foreground uppercase text-[11px] tracking-wide self-center">
                  Totales
                </span>
                <span className="text-right font-mono">{fmt(totalEsperado)}</span>
                <span className="text-right font-mono">
                  {filas.some(f => f.contado !== null) ? fmt(totalContado) : '—'}
                </span>
                <span className={cn(
                  'text-right font-mono',
                  totalDif < -0.5  && 'text-red-600',
                  totalDif > 0.5   && 'text-amber-600',
                  Math.abs(totalDif) < 0.5 && filas.some(f => f.diferencia !== null) && 'text-emerald-600',
                )}>
                  {filas.some(f => f.diferencia !== null)
                    ? (totalDif >= 0 ? '+' : '') + fmt(totalDif)
                    : '—'}
                </span>
                <div className="w-16" />
              </div>
            </>
          )}
        </div>

        {/* Panel lateral derecho */}
        {data && (
          <aside className="w-72 shrink-0 border-l overflow-hidden">
            <PanelCierre
              panel={data.panel}
              cajasPos={cajasPos}
              cierresConDif={cierresConDif}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
