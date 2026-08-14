import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  Landmark,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Vault,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  type CardAuxiliar,
  type DiferenciaHistorial,
  type DiferenciaPendiente,
  type PanelPunto,
  type SesionConAlertas,
  type SesionHistorial,
  type TipoAlerta,
  useAprobarConsignacion,
  useCajaPadre,
  useCerrarSesionPrincipal,
  useCierreMultipleConArqueo,
  useConsignaciones,
  useDiferenciasPendientes,
  useHistorialAlertas,
  useHistorialSesiones,
  useRegistrarConsignacion,
  useResetAutomatico,
  useResolverDiferencia,
  useStatusPunto,
} from '@/queries/cajas.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const fmt = (n: number | string | null | undefined) => COP.format(Number(n ?? 0))

const ALERTA_LABELS: Record<TipoAlerta, string> = {
  reposicion_caja: 'Reposición requerida',
  limite_efectivo_caja: 'Límite de efectivo excedido',
}

type Estado = 'ok' | 'faltante' | 'sobrante' | 'pendiente'

interface FilaCaja {
  caja: CardAuxiliar
  esperado: number
  contado: number | null
  diferencia: number | null
  estado: Estado
}

interface CierreRegistrado {
  nombre: string
  diferencia: number
}

interface CierreLocal {
  contado: number
  diferencia: number | null
}

function calcEstado(dif: number | null): Estado {
  if (dif === null) return 'pendiente'
  if (Math.abs(dif) < 1) return 'ok'
  return dif < 0 ? 'faltante' : 'sobrante'
}

// ── DifBadge ─────────────────────────────────────────────────────────────────

function DifBadge({ estado, dif }: { estado: Estado; dif: number | null }) {
  if (estado === 'pendiente') return <span className="text-muted-foreground text-xs">—</span>
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
  fila: FilaCaja
  contadoStr: string
  onChange: (v: string) => void
  onCerrar: () => void
  cerrando: boolean
}) {
  const { caja, esperado, estado } = fila
  const yaActiva = caja.estado === 'abierta'
  const recienCerrada = caja.estado === 'cerrada'

  const rowCls = cn(
    'grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-3 border-b last:border-b-0 transition-colors',
    (yaActiva || recienCerrada) && estado === 'ok' && 'bg-emerald-50/50 dark:bg-emerald-950/20',
    (yaActiva || recienCerrada) && estado === 'faltante' && 'bg-red-50/60 dark:bg-red-950/20',
    (yaActiva || recienCerrada) && estado === 'sobrante' && 'bg-amber-50/60 dark:bg-amber-950/20',
    !yaActiva && !recienCerrada && 'opacity-40',
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
            onChange={(e) => onChange(e.target.value)}
            className="h-8 text-right text-sm tabular-nums font-mono"
            disabled={cerrando || caja.estado !== 'abierta'}
          />
        ) : recienCerrada ? (
          <span
            className={cn(
              'text-sm font-mono tabular-nums font-medium',
              estado === 'ok' && 'text-emerald-700 dark:text-emerald-400',
              estado === 'faltante' && 'text-red-700 dark:text-red-400',
              estado === 'sobrante' && 'text-amber-700 dark:text-amber-400',
            )}
          >
            {fila.contado !== null ? fmt(fila.contado) : '—'}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Sin sesión</span>
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
            {cerrando ? <Loader2 className="size-3 animate-spin" /> : <Lock className="size-3" />}
            Cerrar
          </Button>
        ) : recienCerrada ? (
          <span
            className={cn(
              'flex items-center gap-1 text-[11px] font-medium px-1.5',
              estado === 'ok' && 'text-emerald-700',
              estado === 'faltante' && 'text-red-600',
              estado === 'sobrante' && 'text-amber-600',
              estado === 'pendiente' && 'text-muted-foreground',
            )}
          >
            <CheckCircle2 className="size-3.5 shrink-0" />
            Cerrada
          </span>
        ) : (
          <CheckCircle2 className="size-4 text-muted-foreground/40" />
        )}
      </div>
    </div>
  )
}

// ── BannerEstado ──────────────────────────────────────────────────────────────

function BannerEstado({ filas }: { filas: FilaCaja[] }) {
  const activas = filas.filter((f) => f.caja.estado === 'abierta')
  const cuadran = activas.filter((f) => f.estado === 'ok')
  const faltantes = activas.filter((f) => f.estado === 'faltante')
  const sobrantes = activas.filter((f) => f.estado === 'sobrante')
  const pendientes = activas.filter((f) => f.estado === 'pendiente')

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

// ── HistorialAlertasCaja ──────────────────────────────────────────────────────

function fmtFechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

function HistorialAlertasCaja({ cajaId, cajaNombre }: { cajaId: number; cajaNombre: string }) {
  const { data, isLoading } = useHistorialAlertas(cajaId)

  const sesionesConDif = (data ?? []).filter((s) => s.diferencias.length > 0)

  return (
    <div>
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 bg-muted/40 text-muted-foreground border-b">
        <History className="size-3" />
        {cajaNombre}
      </div>

      {isLoading ? (
        <div className="p-3 space-y-1.5">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : sesionesConDif.length === 0 ? (
        <p className="px-3 py-2.5 text-[11px] text-muted-foreground italic">
          Sin alertas registradas
        </p>
      ) : (
        <div className="divide-y">
          {sesionesConDif.map((s) => (
            <SesionAlertaRow key={s.id} sesion={s} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── DiferenciaItemRow ─────────────────────────────────────────────────────────

function DiferenciaItemRow({ d }: { d: DiferenciaHistorial }) {
  const [obs, setObs] = useState('')
  const [showObs, setShowObs] = useState(false)
  const resolver = useResolverDiferencia()

  const handleResolver = (estado: 'aprobada' | 'rechazada') => {
    resolver.mutate(
      { id: d.id, estado, observaciones: obs.trim() || undefined },
      {
        onSuccess: () =>
          toast.success(estado === 'aprobada' ? 'Diferencia aprobada' : 'Diferencia rechazada'),
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <div className="pt-1.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className={cn(
              'font-semibold capitalize',
              d.tipo === 'faltante' ? 'text-red-600' : 'text-amber-600',
            )}
          >
            {d.tipo === 'faltante' ? `−${fmt(d.monto)}` : `+${fmt(d.monto)}`}
          </p>
          <p className="text-muted-foreground text-[10px]">{ESTADO_LABEL[d.estado] ?? d.estado}</p>
        </div>
        <span className="text-muted-foreground text-[10px] shrink-0">
          {fmtFechaCorta(d.createdAt)}
        </span>
      </div>

      {d.estado === 'pendiente' && (
        <div className="space-y-1">
          {showObs && (
            <Textarea
              placeholder="Observaciones (opcional)"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="h-12 text-[10px] resize-none"
            />
          )}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              className="flex-1 h-5 text-[9px] px-1"
              disabled={resolver.isPending}
              onClick={() => handleResolver('aprobada')}
            >
              {resolver.isPending && <Loader2 className="size-2.5 animate-spin mr-0.5" />}
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-5 text-[9px] px-1"
              disabled={resolver.isPending}
              onClick={() => handleResolver('rechazada')}
            >
              Rechazar
            </Button>
            <button
              type="button"
              className="text-[9px] text-muted-foreground underline shrink-0 ml-0.5"
              onClick={() => setShowObs((v) => !v)}
            >
              {showObs ? 'sin obs.' : 'obs.'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SesionAlertaRow({ sesion }: { sesion: SesionConAlertas }) {
  const [open, setOpen] = useState(false)
  const neto = sesion.diferencias.reduce((sum, d) => {
    const v = Number(d.monto)
    return sum + (d.tipo === 'faltante' ? -v : v)
  }, 0)

  return (
    <div
      className={cn(
        'text-[11px]',
        neto < -0.5 ? 'bg-red-50/50 dark:bg-red-950/10' : 'bg-amber-50/50 dark:bg-amber-950/10',
      )}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-black/5 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <p className="font-medium truncate">{fmtFechaCorta(sesion.fechaApertura)}</p>
          <p className={cn('font-semibold', neto < -0.5 ? 'text-red-600' : 'text-amber-600')}>
            {neto < 0 ? `Faltante ${fmt(Math.abs(neto))}` : `Sobrante +${fmt(neto)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {sesion.diferencias.length}
          </Badge>
          {neto < -0.5 ? (
            <TrendingDown className="size-3.5 text-red-400" />
          ) : (
            <TrendingUp className="size-3.5 text-amber-400" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-0 border-t border-dashed border-current/10">
          {sesion.diferencias.map((d) => (
            <DiferenciaItemRow key={d.id} d={d} />
          ))}
          {sesion.montoCierre && (
            <div className="pt-1 border-t border-dashed border-current/10 flex justify-between text-muted-foreground">
              <span>Arqueo:</span>
              <span className="tabular-nums font-medium text-foreground">
                {fmt(sesion.montoCierre)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── CajaAlertaCard ────────────────────────────────────────────────────────────

function CajaAlertaCard({
  caja,
  pendientes,
  cierreRegistrado,
}: {
  caja: CardAuxiliar
  pendientes: DiferenciaPendiente[]
  cierreRegistrado: CierreRegistrado | undefined
}) {
  const { data: alertasData, isLoading: loadingAlertas } = useHistorialAlertas(caja.cajaId)
  const { data: historialData, isLoading: loadingHistorial } = useHistorialSesiones(caja.cajaId)

  const sesionesConDif = (alertasData ?? []).filter(
    (s: SesionConAlertas) => s.diferencias.length > 0,
  )
  const historial = (historialData ?? []) as SesionHistorial[]
  const tieneActivas = caja.alertas.length > 0 || pendientes.length > 0 || !!cierreRegistrado
  const tieneHistorialDif = sesionesConDif.length > 0

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        tieneActivas
          ? 'border-red-200 dark:border-red-800'
          : tieneHistorialDif
            ? 'border-amber-200 dark:border-amber-800'
            : 'border-border',
      )}
    >
      {/* Cabecera */}
      <div
        className={cn(
          'px-3 py-2.5 flex items-center justify-between gap-2',
          tieneActivas
            ? 'bg-red-50/60 dark:bg-red-950/20'
            : tieneHistorialDif
              ? 'bg-amber-50/40 dark:bg-amber-950/10'
              : 'bg-muted/30',
        )}
      >
        <div className="min-w-0">
          <p className="font-semibold text-sm">{caja.nombre}</p>
          <p className="text-[11px] text-muted-foreground">{caja.codigo}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {caja.saldoActual != null && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {fmt(caja.saldoActual)}
            </span>
          )}
          <Badge
            variant={caja.estado === 'abierta' ? 'default' : 'secondary'}
            className={cn(
              'text-[9px] px-1.5',
              caja.estado === 'abierta' && 'bg-emerald-600 hover:bg-emerald-600',
            )}
          >
            {caja.estado === 'abierta'
              ? 'Abierta'
              : caja.estado === 'cerrada'
                ? 'Cerrada'
                : 'Sin sesión'}
          </Badge>
        </div>
      </div>

      {/* Alertas operativas */}
      {caja.alertas.map((a) => (
        <div
          key={a}
          className="px-3 py-2 flex items-center gap-2 border-t bg-amber-50/40 dark:bg-amber-950/10"
        >
          <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            {ALERTA_LABELS[a] ?? a}
          </span>
        </div>
      ))}

      {/* Cierre registrado en esta sesión de página */}
      {cierreRegistrado && (
        <div
          className={cn(
            'px-3 py-2 flex items-center justify-between border-t text-xs',
            cierreRegistrado.diferencia < -0.5
              ? 'bg-red-50/60 dark:bg-red-950/10'
              : 'bg-amber-50/60 dark:bg-amber-950/10',
          )}
        >
          <span className="text-muted-foreground italic">Cierre reciente</span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              cierreRegistrado.diferencia < -0.5 ? 'text-red-600' : 'text-amber-600',
            )}
          >
            {cierreRegistrado.diferencia < -0.5
              ? `Faltante ${fmt(Math.abs(cierreRegistrado.diferencia))}`
              : `Sobrante +${fmt(cierreRegistrado.diferencia)}`}
          </span>
        </div>
      )}

      {/* Diferencias pendientes del backend */}
      {pendientes.map((d) => (
        <div
          key={d.id}
          className={cn(
            'px-3 py-2 flex items-center justify-between border-t text-xs',
            d.tipoDiferencia === 'faltante'
              ? 'bg-red-50/60 dark:bg-red-950/10'
              : 'bg-amber-50/60 dark:bg-amber-950/10',
          )}
        >
          <span className="text-muted-foreground">
            {new Date(d.createdAt).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: '2-digit',
            })}
          </span>
          <span
            className={cn(
              'font-semibold tabular-nums',
              d.tipoDiferencia === 'faltante' ? 'text-red-600' : 'text-amber-600',
            )}
          >
            {d.tipoDiferencia === 'faltante'
              ? `Faltante ${fmt(d.monto)}`
              : `Sobrante +${fmt(d.monto)}`}
          </span>
        </div>
      ))}

      {/* Historial de diferencias */}
      {loadingAlertas ? (
        <div className="p-2 border-t">
          <Skeleton className="h-6 w-full" />
        </div>
      ) : sesionesConDif.length > 0 ? (
        <div className="border-t">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/20 border-b">
            Historial de diferencias ({sesionesConDif.length})
          </p>
          <div className="divide-y">
            {sesionesConDif.map((s: SesionConAlertas) => (
              <SesionAlertaRow key={s.id} sesion={s} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Historial de sesiones completo — siempre visible */}
      <div className="border-t">
        <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/20 border-b">
          <History className="size-3" />
          Historial de sesiones
          {historial.length > 0 && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 ml-1">
              {historial.length}
            </Badge>
          )}
        </div>

        {loadingHistorial ? (
          <div className="p-3 space-y-1.5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : historial.length === 0 ? (
          <p className="px-3 py-2.5 text-[11px] text-muted-foreground italic">
            Sin sesiones registradas
          </p>
        ) : (
          <div className="divide-y">
            {historial.map((s) => {
              const dif =
                s.montoCierre != null ? Number(s.montoCierre) - Number(s.montoApertura) : null
              const esForzada = s.estado === 'forzada'
              return (
                <div
                  key={s.id}
                  className={cn(
                    'px-3 py-2 flex items-center gap-3 text-xs',
                    esForzada && 'bg-destructive/5',
                    s.estado === 'abierta' && 'bg-emerald-50/40 dark:bg-emerald-950/10',
                  )}
                >
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          'font-semibold',
                          s.estado === 'abierta'
                            ? 'text-emerald-600'
                            : esForzada
                              ? 'text-destructive'
                              : 'text-foreground',
                        )}
                      >
                        {s.estado === 'abierta' ? 'Abierta' : esForzada ? 'Forzada' : 'Cerrada'}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground tabular-nums">
                        {new Date(s.fechaApertura).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                        })}{' '}
                        {new Date(s.fechaApertura).toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {s.fechaCierre && (
                        <>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-muted-foreground tabular-nums">
                            {new Date(s.fechaCierre).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                    {s.observaciones && (
                      <span className="text-muted-foreground truncate">{s.observaciones}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-muted-foreground">{fmt(s.montoApertura)}</span>
                    {dif != null && (
                      <span
                        className={cn(
                          'font-semibold',
                          dif < 0
                            ? 'text-destructive'
                            : dif > 0
                              ? 'text-amber-600'
                              : 'text-emerald-600',
                        )}
                      >
                        {dif === 0 ? '✓' : dif > 0 ? `+${fmt(String(dif))}` : fmt(String(dif))}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!tieneActivas && !tieneHistorialDif && !loadingAlertas && (
        <div className="px-3 py-3 text-center text-[11px] text-muted-foreground italic border-t">
          Sin alertas registradas
        </div>
      )}
    </div>
  )
}

// ── AlertasGeneralesGrid ──────────────────────────────────────────────────────

function AlertasGeneralesGrid({
  cajasPos,
  diferenciasPendientes,
  cierresConDif,
}: {
  cajasPos: CardAuxiliar[]
  diferenciasPendientes: DiferenciaPendiente[]
  cierresConDif: Record<number, CierreRegistrado>
}) {
  if (cajasPos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
        <AlertTriangle className="size-8 opacity-30" />
        No hay cajas POS configuradas
      </div>
    )
  }

  const cierresPorNombre = Object.fromEntries(
    Object.values(cierresConDif).map((c) => [c.nombre, c]),
  )

  return (
    <div className="p-4 space-y-4">
      {cajasPos.map((caja) => (
        <CajaAlertaCard
          key={caja.cajaId}
          caja={caja}
          pendientes={diferenciasPendientes.filter((d) => d.cajaNombre === caja.nombre)}
          cierreRegistrado={cierresPorNombre[caja.nombre]}
        />
      ))}
    </div>
  )
}

// ── SeccionConsignaciones ─────────────────────────────────────────────────────

function SeccionConsignaciones({ sesionId }: { sesionId: number }) {
  const [open, setOpen] = useState(false)
  const [medio, setMedio] = useState<'banco' | 'transportadora'>('banco')
  const [bancoNombre, setBancoNombre] = useState('')
  const [tipoCuenta, setTipoCuenta] = useState<'ahorros' | 'corriente'>('ahorros')
  const [numeroCuenta, setNumeroCuenta] = useState('')
  const [monto, setMonto] = useState('')
  const [proposito, setProposito] = useState('')

  const { data: consignaciones = [], refetch } = useConsignaciones(sesionId)
  const registrar = useRegistrarConsignacion(sesionId)
  const aprobar = useAprobarConsignacion()

  const pendientes = consignaciones.filter((c) => c.estado === 'pendiente')

  function handleRegistrar() {
    registrar.mutate(
      {
        medio,
        bancoNombre: bancoNombre || undefined,
        tipoCuenta,
        numeroCuenta: numeroCuenta || undefined,
        monto,
        proposito: proposito || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Consignación registrada — pendiente de aprobación')
          setMonto('')
          setBancoNombre('')
          setNumeroCuenta('')
          setProposito('')
          refetch()
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  function handleAprobar(id: number, estado: 'aprobada' | 'rechazada') {
    aprobar.mutate(
      { id, estado },
      {
        onSuccess: () => {
          toast.success(estado === 'aprobada' ? 'Consignación aprobada' : 'Consignación rechazada')
          refetch()
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <div className="border-t">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Landmark className="size-3" />
          Consignaciones
          {pendientes.length > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">
              {pendientes.length} pend.
            </Badge>
          )}
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Form registrar */}
          <div className="rounded border p-2.5 space-y-2.5 bg-muted/10 text-[11px]">
            <p className="font-semibold text-[10px] uppercase tracking-wide text-muted-foreground">
              Nueva consignación
            </p>

            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="medioCons"
                  checked={medio === 'banco'}
                  onChange={() => setMedio('banco')}
                />
                Banco
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="medioCons"
                  checked={medio === 'transportadora'}
                  onChange={() => setMedio('transportadora')}
                />
                Transportadora
              </label>
            </div>

            {medio === 'banco' && (
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Banco</Label>
                  <Input
                    className="h-7 text-xs"
                    value={bancoNombre}
                    onChange={(e) => setBancoNombre(e.target.value)}
                    placeholder="Nombre del banco"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Tipo cuenta</Label>
                    <select
                      value={tipoCuenta}
                      onChange={(e) => setTipoCuenta(e.target.value as 'ahorros' | 'corriente')}
                      className="w-full h-7 rounded border bg-background px-1.5 text-xs"
                    >
                      <option value="ahorros">Ahorros</option>
                      <option value="corriente">Corriente</option>
                    </select>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px]">Nro. cuenta</Label>
                    <Input
                      className="h-7 text-xs"
                      value={numeroCuenta}
                      onChange={(e) => setNumeroCuenta(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-0.5">
              <Label className="text-[10px]">Valor (COP)</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                className="h-7 text-xs tabular-nums"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
              {monto && Number(monto) > 0 && (
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {fmt(Number(monto))}
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Propósito</Label>
              <Input
                className="h-7 text-xs"
                value={proposito}
                onChange={(e) => setProposito(e.target.value)}
                placeholder="Ej: Reposición diaria"
              />
            </div>

            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!monto || Number(monto) <= 0 || registrar.isPending}
              onClick={handleRegistrar}
            >
              {registrar.isPending && <Loader2 className="size-3 mr-1.5 animate-spin" />}
              Registrar
            </Button>
          </div>

          {/* Lista */}
          {consignaciones.length > 0 && (
            <div className="divide-y border rounded overflow-hidden">
              {consignaciones.map((c) => (
                <div key={c.id} className="p-2 text-[11px] space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-medium truncate">
                      {c.bancoNombre ?? (c.medio === 'banco' ? 'Banco' : 'Transportadora')}
                    </span>
                    <span
                      className={cn(
                        'text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0',
                        c.estado === 'pendiente' && 'bg-amber-100 text-amber-700',
                        c.estado === 'aprobada' && 'bg-emerald-100 text-emerald-700',
                        c.estado === 'rechazada' && 'bg-red-100 text-red-700',
                      )}
                    >
                      {c.estado}
                    </span>
                  </div>
                  <p className="font-bold tabular-nums">{fmt(Number(c.monto))}</p>
                  {c.estado === 'pendiente' && (
                    <div className="flex gap-1.5 pt-0.5">
                      <Button
                        size="sm"
                        className="flex-1 h-6 text-[10px]"
                        onClick={() => handleAprobar(c.id, 'aprobada')}
                        disabled={aprobar.isPending}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-6 text-[10px]"
                        onClick={() => handleAprobar(c.id, 'rechazada')}
                        disabled={aprobar.isPending}
                      >
                        Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── PanelCierre: sidebar derecho ──────────────────────────────────────────────

function PanelCierre({
  panel,
  cajasPos,
  cierresConDif,
  sesionPrincipalId,
  diferenciasPendientes,
}: {
  panel: PanelPunto
  cajasPos: CardAuxiliar[]
  cierresConDif: Record<number, CierreRegistrado>
  sesionPrincipalId: number | null
  diferenciasPendientes: DiferenciaPendiente[]
}) {
  const [arqueoFuerte, setArqueoFuerte] = useState('')
  const [confirmarArq, setConfirmarArq] = useState('')
  const [showCierreP, setShowCierreP] = useState(false)
  const cerrarPrincipal = useCerrarSesionPrincipal()

  const alertasSesion = Object.values(cierresConDif)
  const nombresEnSesion = new Set(alertasSesion.map((a) => a.nombre))
  const alertasBackend = diferenciasPendientes
    .filter((d) => !nombresEnSesion.has(d.cajaNombre))
    .map((d) => ({
      nombre: d.cajaNombre,
      diferencia: d.tipoDiferencia === 'faltante' ? -Number(d.monto) : Number(d.monto),
    }))
  const alertas = [...alertasSesion, ...alertasBackend]
  const alertasOperativas = cajasPos
    .filter((c) => c.alertas.length > 0)
    .flatMap((c) => c.alertas.map((a) => ({ cajaNombre: c.nombre, tipo: a })))
  const totalAlertCount = alertas.length + alertasOperativas.length

  const faltantes = alertas.filter((a) => a.diferencia < -0.5)
  const sobrantes = alertas.filter((a) => a.diferencia > 0.5)
  const totalFaltante = faltantes.reduce((s, a) => s + a.diferencia, 0)
  const totalSobrante = sobrantes.reduce((s, a) => s + a.diferencia, 0)
  const netoDiferencia = totalFaltante + totalSobrante

  const totalCajas = cajasPos.length
  const cajasCerradas = cajasPos.filter((c) => c.estado === 'cerrada').length
  const todasCerradas = totalCajas > 0 && cajasPos.every((c) => c.estado !== 'abierta')
  const progreso = totalCajas > 0 ? Math.round((cajasCerradas / totalCajas) * 100) : 0
  const encuadreOk = todasCerradas && alertas.every((a) => Math.abs(a.diferencia) < 1)

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
          <span className="font-semibold text-[11px] uppercase tracking-wide">
            Progreso de Cierre
          </span>
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

        <div
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium',
            encuadreOk && 'text-emerald-700 dark:text-emerald-400',
            todasCerradas && !encuadreOk && 'text-amber-700 dark:text-amber-400',
            !todasCerradas && 'text-muted-foreground',
          )}
        >
          {encuadreOk ? (
            <>
              <CheckCircle2 className="size-3" /> Punto encuadrado
            </>
          ) : todasCerradas ? (
            <>
              <AlertTriangle className="size-3" /> Cerradas con diferencias
            </>
          ) : (
            <>
              <Clock className="size-3" /> Cierre en progreso
            </>
          )}
        </div>
      </div>

      {/* Alertas de cierre */}
      <div className="border-b">
        <div
          className={cn(
            'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5',
            totalAlertCount > 0 ? 'bg-red-600 text-white' : 'bg-muted/40 text-muted-foreground',
          )}
        >
          <AlertTriangle className="size-3" />
          Alertas de Cierre ({totalAlertCount})
        </div>

        {totalAlertCount === 0 ? (
          <p className="px-3 py-3 text-muted-foreground text-center italic text-[11px]">
            Sin alertas registradas
          </p>
        ) : (
          <div className="divide-y">
            {alertasOperativas.map((a, i) => (
              <div
                key={`op-${i}`}
                className="px-3 py-2 flex items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/10"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate text-[11px]">{a.cajaNombre}</p>
                  <p className="font-semibold text-[11px] text-amber-600">
                    {ALERTA_LABELS[a.tipo] ?? a.tipo}
                  </p>
                </div>
                <AlertTriangle className="size-4 text-amber-400 shrink-0" />
              </div>
            ))}
            {alertas.map((a, i) => (
              <div
                key={`dif-${i}`}
                className={cn(
                  'px-3 py-2 flex items-center justify-between gap-2',
                  a.diferencia < -0.5
                    ? 'bg-red-50/60 dark:bg-red-950/10'
                    : 'bg-amber-50/60 dark:bg-amber-950/10',
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium truncate text-[11px]">{a.nombre}</p>
                  <p
                    className={cn(
                      'font-semibold text-[11px]',
                      a.diferencia < -0.5 ? 'text-red-600' : 'text-amber-600',
                    )}
                  >
                    {a.diferencia < -0.5
                      ? `Faltante: ${fmt(Math.abs(a.diferencia))}`
                      : `Sobrante: +${fmt(a.diferencia)}`}
                  </p>
                </div>
                {a.diferencia < -0.5 ? (
                  <TrendingDown className="size-4 text-red-400 shrink-0" />
                ) : (
                  <TrendingUp className="size-4 text-amber-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen diferencias */}
      {alertas.length > 0 && (
        <div className="border-b p-3 space-y-1.5">
          <p className="font-semibold text-[11px] uppercase tracking-wide">
            Resumen de Diferencias
          </p>
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
          <div
            className={cn(
              'flex justify-between font-bold',
              Math.abs(netoDiferencia) < 1
                ? 'text-emerald-700'
                : netoDiferencia < 0
                  ? 'text-red-700'
                  : 'text-amber-700',
            )}
          >
            <span>Diferencia neta</span>
            <span className="tabular-nums">
              {netoDiferencia >= 0 ? '+' : ''}
              {fmt(netoDiferencia)}
            </span>
          </div>
        </div>
      )}

      {/* Estado de encuadre — solo cuando todas las cajas están cerradas */}
      {todasCerradas && (
        <div
          className={cn(
            'mx-3 my-3 rounded-lg p-3 text-center border',
            encuadreOk
              ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-800',
          )}
        >
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

          {/* Cierre de sesión principal */}
          {sesionPrincipalId != null && (
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Lock className="size-3" /> Cerrar Caja Fuerte
              </p>
              {!showCierreP ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => setShowCierreP(true)}
                >
                  <Lock className="size-3 mr-1.5" />
                  Cerrar sesión principal
                </Button>
              ) : (
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Total arqueo"
                    className="h-8 text-xs tabular-nums"
                    value={arqueoFuerte}
                    onChange={(e) => setArqueoFuerte(e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="Confirmar arqueo"
                    className={cn(
                      'h-8 text-xs tabular-nums',
                      confirmarArq && arqueoFuerte !== confirmarArq && 'border-red-400',
                    )}
                    value={confirmarArq}
                    onChange={(e) => setConfirmarArq(e.target.value)}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="flex-1 text-xs gap-1"
                      disabled={
                        !arqueoFuerte || arqueoFuerte !== confirmarArq || cerrarPrincipal.isPending
                      }
                      onClick={() =>
                        cerrarPrincipal.mutate(
                          { sesionId: sesionPrincipalId, totalArqueo: arqueoFuerte },
                          {
                            onSuccess: () => {
                              toast.success('Caja Fuerte cerrada — día operativo finalizado')
                              setShowCierreP(false)
                              setArqueoFuerte('')
                              setConfirmarArq('')
                            },
                            onError: (e) => toast.error(e.message),
                          },
                        )
                      }
                    >
                      {cerrarPrincipal.isPending && <Loader2 className="size-3 animate-spin" />}
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setShowCierreP(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Operaciones del supervisor — solo si hay sesión principal activa */}
      {sesionPrincipalId != null && <SeccionConsignaciones sesionId={sesionPrincipalId} />}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AlertasCierre() {
  const { sucursalId } = useParams<{ sucursalId: string }>()
  const navigate = useNavigate()
  const id = Number(sucursalId)

  const qc = useQueryClient()
  const { data, isLoading, isFetching, refetch } = useStatusPunto(id)
  const { data: cajaPadre } = useCajaPadre(data?.cajaPadreId ?? 0)
  const { data: diferenciasPendientes = [] } = useDiferenciasPendientes(id)
  const cerrar = useCierreMultipleConArqueo()
  const reset = useResetAutomatico()

  const [vista, setVista] = useState<'arqueo' | 'alertas'>('arqueo')
  const [contado, setContado] = useState<Record<number, string>>({})
  const [cerrando, setCerrando] = useState<Record<number, boolean>>({})
  const [cierresConDif, setCierresConDif] = useState<Record<number, CierreRegistrado>>({})
  const [cierresLocales, setCierresLocales] = useState<Record<number, CierreLocal>>({})
  const [showReset, setShowReset] = useState(false)

  const cajasPos: CardAuxiliar[] = useMemo(
    () => (data?.cajas ?? []).filter((c) => c.tipo === 'pos'),
    [data],
  )

  const sesionPrincipalId = useMemo(
    () => data?.cajas.find((c) => c.tipo === 'general')?.sesionId ?? null,
    [data],
  )

  const totalAlertasMain = useMemo(() => {
    const sesionNombres = new Set(Object.values(cierresConDif).map((c) => c.nombre))
    const backendCount = diferenciasPendientes.filter(
      (d) => !sesionNombres.has(d.cajaNombre),
    ).length
    const sesionCount = Object.keys(cierresConDif).length
    const opCount = cajasPos.reduce((s, c) => s + c.alertas.length, 0)
    return sesionCount + backendCount + opCount
  }, [cierresConDif, diferenciasPendientes, cajasPos])

  const filas: FilaCaja[] = useMemo(
    () =>
      cajasPos.map((c) => {
        // Si esta caja fue cerrada durante esta sesión de la página,
        // mostramos los datos del cierre aunque el backend ya no devuelva la sesión
        const local = c.sesionId === null ? cierresLocales[c.cajaId] : undefined
        if (local) {
          return {
            caja: { ...c, estado: 'cerrada' as const },
            esperado: 0,
            contado: local.contado,
            diferencia: local.diferencia,
            estado: calcEstado(local.diferencia),
          }
        }
        const esperado = Number(c.saldoActual ?? 0)
        const cStr = c.sesionId != null ? (contado[c.sesionId] ?? '') : ''
        const contadoN = cStr !== '' ? Number(cStr) : null
        const dif = contadoN !== null ? contadoN - esperado : null
        return { caja: c, esperado, contado: contadoN, diferencia: dif, estado: calcEstado(dif) }
      }),
    [cajasPos, contado, cierresLocales],
  )

  const totalEsperado = filas
    .filter((f) => f.caja.estado === 'abierta')
    .reduce((s, f) => s + f.esperado, 0)
  const totalContado = filas
    .filter((f) => f.contado !== null)
    .reduce((s, f) => s + (f.contado ?? 0), 0)
  const totalDif = filas
    .filter((f) => f.diferencia !== null)
    .reduce((s, f) => s + (f.diferencia ?? 0), 0)

  const handleCerrar = async (fila: FilaCaja) => {
    const { caja } = fila
    if (!caja.sesionId || fila.contado === null) return
    const sid = caja.sesionId
    const cajaId = caja.cajaId
    setCerrando((p) => ({ ...p, [sid]: true }))
    try {
      await cerrar.mutateAsync({ sesionId: sid, totalArqueo: String(fila.contado) })

      // Guardar cierre local (por cajaId) para mostrar la fila con datos de arqueo
      setCierresLocales((p) => ({
        ...p,
        [cajaId]: { contado: fila.contado!, diferencia: fila.diferencia },
      }))

      // Registrar en alertas del panel si hay diferencia significativa
      if (fila.diferencia !== null && Math.abs(fila.diferencia) >= 1) {
        setCierresConDif((p) => ({
          ...p,
          [sid]: { nombre: caja.nombre, diferencia: fila.diferencia! },
        }))
      }

      toast.success(`${caja.nombre} cerrada`, {
        description:
          fila.estado === 'ok'
            ? 'Sin diferencias'
            : fila.estado === 'faltante'
              ? `Faltante: ${fmt(Math.abs(fila.diferencia!))}`
              : `Sobrante: +${fmt(fila.diferencia!)}`,
      })
      void qc.invalidateQueries({ queryKey: ['cajas', 'diferencias-pendientes', id] })
      setContado((p) => {
        const n = { ...p }
        delete n[sid]
        return n
      })
    } catch {
      toast.error(`No se pudo cerrar ${caja.nombre}`)
    } finally {
      setCerrando((p) => ({ ...p, [sid]: false }))
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
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">Proceso de Cierre — {nombrePunto}</h1>
            <p className="text-[11px] text-muted-foreground">
              Ingresa el total contado en cada caja para detectar diferencias
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setShowReset(true)}
            disabled={cajasPos.filter((c) => c.estado === 'abierta').length === 0}
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Reset automático
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('size-3.5 mr-1.5', isFetching && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </header>

      {/* Confirmación reset automático */}
      <Dialog open={showReset} onOpenChange={setShowReset}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw className="size-4" />
              Reset automático del punto
            </DialogTitle>
            <DialogDescription>
              Esta acción cierra forzadamente{' '}
              <strong>todas las sesiones auxiliares abiertas</strong> del punto, devolviendo el
              saldo de cada una a la caja principal. Las sesiones quedan marcadas como{' '}
              <em>Cierre a revisar</em> en el historial de auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-destructive/5 border-destructive/20 px-3 py-2 text-sm text-destructive">
            Cajas que se cerrarán:{' '}
            <strong>
              {cajasPos
                .filter((c) => c.estado === 'abierta')
                .map((c) => c.nombre)
                .join(', ') || '—'}
            </strong>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={reset.isPending}
              onClick={() => {
                if (!data?.cajaPadreId) return
                reset.mutate(data.cajaPadreId, {
                  onSuccess: (res) => {
                    toast.success(
                      `Reset completado — ${res.auxiliaresCerradas} sesión(es) cerrada(s)`,
                    )
                    setShowReset(false)
                  },
                  onError: (e) => toast.error(e.message),
                })
              }}
            >
              {reset.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Confirmar reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cuerpo: tabla principal + panel lateral */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Área principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Banner de estado + toggle Arqueo / Alertas */}
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <BannerEstado filas={filas} />
            </div>
            <div className="flex shrink-0 rounded-md border overflow-hidden text-[11px]">
              <button
                type="button"
                onClick={() => setVista('arqueo')}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  vista === 'arqueo' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60',
                )}
              >
                Arqueo
              </button>
              <button
                type="button"
                onClick={() => setVista('alertas')}
                className={cn(
                  'px-3 py-1.5 font-medium border-l transition-colors flex items-center gap-1.5',
                  vista === 'alertas' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60',
                )}
              >
                Alertas
                {totalAlertasMain > 0 && (
                  <span
                    className={cn(
                      'inline-flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] px-1',
                      vista === 'alertas' ? 'bg-white/20' : 'bg-red-500 text-white',
                    )}
                  >
                    {totalAlertasMain}
                  </span>
                )}
              </button>
            </div>
          </div>

          {vista === 'arqueo' ? (
            <>
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

                    {filas.map((fila) => (
                      <FilaCajaRow
                        key={fila.caja.cajaId}
                        fila={fila}
                        contadoStr={
                          fila.caja.sesionId != null ? (contado[fila.caja.sesionId] ?? '') : ''
                        }
                        onChange={(v) =>
                          fila.caja.sesionId != null &&
                          setContado((p) => ({ ...p, [fila.caja.sesionId!]: v }))
                        }
                        onCerrar={() => handleCerrar(fila)}
                        cerrando={!!(fila.caja.sesionId && cerrando[fila.caja.sesionId])}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer totales (solo si hay cajas abiertas) */}
              {cajasPos.some((c) => c.estado === 'abierta') && (
                <>
                  <Separator />
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/30 text-sm font-semibold tabular-nums shrink-0">
                    <span className="text-muted-foreground uppercase text-[11px] tracking-wide self-center">
                      Totales
                    </span>
                    <span className="text-right font-mono">{fmt(totalEsperado)}</span>
                    <span className="text-right font-mono">
                      {filas.some((f) => f.contado !== null) ? fmt(totalContado) : '—'}
                    </span>
                    <span
                      className={cn(
                        'text-right font-mono',
                        totalDif < -0.5 && 'text-red-600',
                        totalDif > 0.5 && 'text-amber-600',
                        Math.abs(totalDif) < 0.5 &&
                          filas.some((f) => f.diferencia !== null) &&
                          'text-emerald-600',
                      )}
                    >
                      {filas.some((f) => f.diferencia !== null)
                        ? (totalDif >= 0 ? '+' : '') + fmt(totalDif)
                        : '—'}
                    </span>
                    <div className="w-16" />
                  </div>
                </>
              )}
            </>
          ) : (
            /* Vista Alertas — full width, tarjeta por caja */
            <div className="flex-1 overflow-auto">
              <AlertasGeneralesGrid
                cajasPos={cajasPos}
                diferenciasPendientes={diferenciasPendientes}
                cierresConDif={cierresConDif}
              />
            </div>
          )}
        </div>

        {/* Panel lateral derecho */}
        {data && (
          <aside className="w-72 shrink-0 border-l overflow-hidden">
            <PanelCierre
              panel={data.panel}
              cajasPos={cajasPos}
              cierresConDif={cierresConDif}
              sesionPrincipalId={sesionPrincipalId}
              diferenciasPendientes={diferenciasPendientes}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
