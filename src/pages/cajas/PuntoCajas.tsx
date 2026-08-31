import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RefreshCw, AlertTriangle, Eye, Loader2, Vault, PackageCheck,
  TrendingUp, TrendingDown, ChevronDown, ChevronRight, ShieldAlert, ShoppingCart, Settings,
  ArrowLeftRight, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Checkbox }  from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useStatusPunto, useAbrirCajaDirecta, useCajaPadre, useHistorialSesiones, useUpdateCaja,
  useCambioCustodia, useConfirmarCustodia, useDiferenciasPendientes,
  useAbrirSesionPrincipal, useCerrarSesionPrincipal, esCajaOperativa,
  type CardAuxiliar, type PanelPunto, type TipoAlerta, type CambioCustodiaResult,
  type DiferenciaPendiente, type MedioPagoCaja,
} from '@/queries/cajas.queries'
import { useUsers } from '@/queries/users.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt       = (v: string | null | undefined) => v ? COP.format(Number(v)) : '$0'
const fmtOrDash = (v: string | null | undefined) => v ? COP.format(Number(v)) : '—'

function tipoLabel(tipo: string) {
  const MAP: Record<string, string> = { pos: 'POS', general: 'Caja Fuerte' }
  return MAP[tipo] ?? tipo
}

const MEDIO_LABELS: Record<MedioPagoCaja, string> = {
  efectivo:          'Efectivo',
  tarjeta_debito:    'T. Débito',
  tarjeta_credito:   'T. Crédito',
  transferencia:     'Transferencia',
  consignacion:      'Consignación',
  cheque:            'Cheque',
  preporteado:       'Preporteado',
  mixto_preporteado: 'Mixto preporteado',
  estampilla:        'Estampilla',
}

// saldoActual es solo el efectivo del cajón: un pago con tarjeta o preporteado se
// factura pero nunca entra físicamente. El desglose evita que el cajero lo lea como
// venta perdida.
function desgloseNoEfectivo(card: CardAuxiliar) {
  return (Object.entries(card.saldoPorMedioPago) as [MedioPagoCaja, string][])
    .filter(([medio, monto]) => medio !== 'efectivo' && Number(monto) !== 0)
}

function totalNoEfectivo(card: CardAuxiliar) {
  return desgloseNoEfectivo(card).reduce((acc, [, monto]) => acc + Number(monto), 0)
}

function estadoBadge(estado: CardAuxiliar['estado']) {
  if (estado === 'sin_sesion') return <Badge variant="outline" className="text-[10px]">Disponible</Badge>
  if (estado === 'cerrada')    return <Badge variant="secondary" className="text-[10px]">Cerrada</Badge>
  return <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Abierta</Badge>
}

function isSinCajero(card: CardAuxiliar) {
  return card.estado === 'abierta' && esCajaOperativa(card.tipo) && card.cajeroId === null
}

function cardBg(card: CardAuxiliar) {
  if (card.estado === 'sin_sesion') return 'border-dashed border-border bg-muted/20 hover:bg-muted/40'
  if (card.estado === 'cerrada')    return 'border-border bg-muted/30 hover:bg-muted/50'
  if (isSinCajero(card))
    return 'border-amber-300 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
  if (card.alertas.includes('limite_efectivo_caja'))
    return 'border-red-300 bg-red-50/60 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/20'
  if (card.alertas.includes('reposicion_caja'))
    return 'border-amber-300 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
  return 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
}

function dotCls(card: CardAuxiliar) {
  if (card.estado === 'sin_sesion') return 'bg-zinc-400'
  if (card.estado === 'cerrada')    return 'bg-zinc-300'
  if (isSinCajero(card))           return 'bg-amber-400'
  if (card.alertas.includes('limite_efectivo_caja')) return 'bg-red-500 animate-pulse'
  if (card.alertas.includes('reposicion_caja'))      return 'bg-amber-500 animate-pulse'
  return 'bg-emerald-500'
}

// ── Alertas ───────────────────────────────────────────────────────────────────

const ALERTA_LABELS: Record<TipoAlerta, string> = {
  reposicion_caja:      'Reposición requerida',
  limite_efectivo_caja: 'Límite de efectivo excedido',
}

// ── Panel lateral derecho ─────────────────────────────────────────────────────

function PanelLateral({
  panel,
  cajas,
  sucursalId,
  cajaFuerte,
  cajaPadreId,
  diferenciasPendientes,
}: {
  panel:                 PanelPunto
  cajas:                 CardAuxiliar[]
  sucursalId:            number
  cajaFuerte:            CardAuxiliar | undefined
  cajaPadreId:           number
  diferenciasPendientes: DiferenciaPendiente[]
}) {
  const navigate = useNavigate()
  const [open,          setOpen]          = useState(true)
  const [montoFuerte,   setMontoFuerte]   = useState('')
  const [arqueoFuerte,  setArqueoFuerte]  = useState('')
  const [confirmarArq,  setConfirmarArq]  = useState('')
  const [showCierreFuerte, setShowCierreFuerte] = useState(false)

  const abrirPrincipal  = useAbrirSesionPrincipal(cajaPadreId)
  const cerrarPrincipal = useCerrarSesionPrincipal()

  const alertasOperativas = cajas.flatMap(c =>
    c.alertas.map(a => ({ concepto: ALERTA_LABELS[a] ?? a, observacion: c.nombre, esDiferencia: false }))
  )
  const alertasDiferencias = diferenciasPendientes.map(d => ({
    concepto:     d.tipoDiferencia === 'faltante'
      ? `Faltante: ${COP.format(Number(d.monto))}`
      : `Sobrante: +${COP.format(Number(d.monto))}`,
    observacion:  d.cajaNombre,
    esDiferencia: true,
  }))
  const alertas = [...alertasOperativas, ...alertasDiferencias]

  const irACierre = () => navigate(`/cajas/cierre/${sucursalId}`)

  const fuerteAbierta = cajaFuerte?.estado === 'abierta'
  const fuerteSinSesion = !cajaFuerte || cajaFuerte.estado === 'sin_sesion'

  // El backend anula los montos del panel para el rol CAJERO. Se ocultan los
  // bloques en vez de mostrar $0, que se leería como una bóveda vacía.
  const puedeVerBoveda = panel.cajaFuerteGeneral !== null

  const panelRows = [
    { label: 'Base',                 valor: panel.baseGeneral },
    { label: 'Caja General Pto',     valor: panel.cajaGeneral },
    { label: 'Caja Fuerte Gener.',   valor: panel.cajaFuerteGeneral },
  ]

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-card text-xs">

      {/* Alertas */}
      <div className="border-b">
        {/* Cabecera — colapsa/expande y lleva a cierre */}
        <div className="flex items-center border-b">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex-1 flex items-center gap-1.5 px-3 py-2.5 hover:bg-muted/30 transition-colors text-left"
          >
            {alertas.length > 0 && <AlertTriangle className="size-3 text-red-500 shrink-0" />}
            <span className="font-semibold text-[11px] uppercase tracking-wide">
              Alertas ({alertas.length})
            </span>
            <ChevronDown className={cn(
              'size-3.5 text-muted-foreground transition-transform duration-150 ml-auto',
              open && 'rotate-180',
            )} />
          </button>
          <button
            type="button"
            onClick={irACierre}
            className="px-2.5 py-2.5 text-primary hover:bg-muted/30 transition-colors border-l shrink-0"
            title="Ver reporte de cierre"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {open && (
          <>
            {/* Banner rojo clickeable */}
            {alertas.length > 0 && (
              <button
                type="button"
                onClick={irACierre}
                className="w-full flex items-center justify-between px-3 py-2 bg-red-600 hover:bg-red-700 transition-colors text-white"
              >
                <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <AlertTriangle className="size-3.5 text-yellow-300" />
                  {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} activa{alertas.length !== 1 ? 's' : ''}
                </span>
                <span className="text-[10px] text-red-200 flex items-center gap-0.5">
                  Ver cierre <ChevronRight className="size-3" />
                </span>
              </button>
            )}

            <table className="w-full border-t">
              <thead>
                <tr className="bg-muted/40">
                  <th className="px-3 py-1.5 text-left text-muted-foreground font-semibold">Concepto</th>
                  <th className="px-3 py-1.5 text-left text-muted-foreground font-semibold">Caja</th>
                </tr>
              </thead>
              <tbody>
                {alertas.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground italic">
                      Sin alertas activas
                    </td>
                  </tr>
                ) : (
                  alertas.map((a, i) => (
                    <tr
                      key={i}
                      onClick={irACierre}
                      className="border-t cursor-pointer hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors"
                    >
                      <td className={cn(
                        'px-3 py-1.5 font-medium',
                        a.esDiferencia
                          ? a.concepto.startsWith('Faltante')
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-amber-700 dark:text-amber-400'
                          : 'text-red-700 dark:text-red-400',
                      )}>
                        {a.concepto}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">{a.observacion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Enlace "Ver proceso de cierre" siempre visible */}
            <button
              type="button"
              onClick={irACierre}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-[11px] text-primary hover:bg-muted/30 transition-colors border-t font-medium"
            >
              Ver proceso de cierre
              <ChevronRight className="size-3" />
            </button>
          </>
        )}
      </div>

      {/* Saldo asignado al punto */}
      {puedeVerBoveda && (
      <div>
        <div className="px-3 py-2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider">
          Saldo Asignado al Punto
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold w-5">#</th>
              <th className="px-2 py-1.5 text-left text-muted-foreground font-semibold">Concepto</th>
              <th className="px-2 py-1.5 text-right text-muted-foreground font-semibold">Saldo Actual</th>
            </tr>
          </thead>
          <tbody>
            {panelRows.map((row, i) => (
              <tr key={row.label} className="border-t">
                <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                <td className="px-2 py-1.5">{row.label}</td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium">{fmt(row.valor)}</td>
              </tr>
            ))}
            <tr className="border-t bg-muted/20">
              <td colSpan={2} className="px-2 py-1.5 text-muted-foreground">Acumulado Moneda Circulante</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmt(panel.acumuladoMonedaCirculante)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      )}

      {/* Caja Fuerte — apertura / cierre */}
      {puedeVerBoveda && (
      <div className="border-t">
        <div className="px-3 py-2 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Vault className="size-3" />
          Caja Fuerte
          {fuerteAbierta && <span className="ml-auto text-emerald-600">Abierta</span>}
          {fuerteSinSesion && <span className="ml-auto text-muted-foreground">Sin sesión</span>}
          {cajaFuerte?.estado === 'cerrada' && <span className="ml-auto text-amber-600">Cerrada</span>}
        </div>

        {/* Sin sesión: abrir */}
        {fuerteSinSesion && (
          <div className="px-3 py-2 space-y-2">
            <Input
              type="number" min="0" step="10000"
              placeholder="Monto de apertura"
              className="h-8 text-sm tabular-nums"
              value={montoFuerte}
              onChange={e => setMontoFuerte(e.target.value)}
            />
            {montoFuerte && Number(montoFuerte) > 0 && (
              <p className="text-[11px] text-muted-foreground tabular-nums">{fmt(montoFuerte)}</p>
            )}
            <Button
              size="sm" className="w-full gap-1.5"
              disabled={!montoFuerte || Number(montoFuerte) < 0 || abrirPrincipal.isPending}
              onClick={() =>
                abrirPrincipal.mutate(montoFuerte, {
                  onSuccess: () => { toast.success('Caja Fuerte abierta'); setMontoFuerte('') },
                  onError:   e  => toast.error(e.message),
                })
              }
            >
              {abrirPrincipal.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Abrir Caja Fuerte
            </Button>
          </div>
        )}

        {/* Abierta: mostrar saldo + botón cierre */}
        {fuerteAbierta && (
          <div className="px-3 py-2 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Saldo</span>
              <span className="font-semibold tabular-nums">{fmt(cajaFuerte?.saldoActual)}</span>
            </div>
            {!showCierreFuerte ? (
              <Button
                variant="outline" size="sm" className="w-full text-xs"
                onClick={() => setShowCierreFuerte(true)}
              >
                Cerrar Caja Fuerte
              </Button>
            ) : (
              <div className="space-y-2">
                <Input
                  type="number" min="0" step="10000"
                  placeholder="Total arqueo"
                  className="h-8 text-sm tabular-nums"
                  value={arqueoFuerte}
                  onChange={e => setArqueoFuerte(e.target.value)}
                />
                <Input
                  type="number" min="0" step="10000"
                  placeholder="Confirmar arqueo"
                  className={cn('h-8 text-sm tabular-nums', confirmarArq && arqueoFuerte !== confirmarArq && 'border-red-400')}
                  value={confirmarArq}
                  onChange={e => setConfirmarArq(e.target.value)}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm" className="flex-1 text-xs gap-1"
                    disabled={
                      !arqueoFuerte || arqueoFuerte !== confirmarArq ||
                      !cajaFuerte?.sesionId || cerrarPrincipal.isPending
                    }
                    onClick={() => {
                      if (!cajaFuerte?.sesionId) return
                      cerrarPrincipal.mutate(
                        { sesionId: cajaFuerte.sesionId, totalArqueo: arqueoFuerte },
                        {
                          onSuccess: () => {
                            toast.success('Caja Fuerte cerrada')
                            setShowCierreFuerte(false); setArqueoFuerte(''); setConfirmarArq('')
                          },
                          onError: e => toast.error(e.message),
                        },
                      )
                    }}
                  >
                    {cerrarPrincipal.isPending && <Loader2 className="size-3 animate-spin" />}
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCierreFuerte(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {cajaFuerte?.estado === 'cerrada' && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">
            Sesión cerrada · {fmt(cajaFuerte.saldoActual)}
          </div>
        )}
      </div>
      )}
    </div>
  )
}

// ── Catálogo de servicios por tipo ────────────────────────────────────────────

const SERVICIOS: Record<string, string[]> = {
  pos: [
    'Emisión Giros Nacionales', 'Pago Giros Nacionales', 'Anulación Giro Nacional',
    'Emisión Giros Internacionales', 'Pago Giros Internacionales',
    'Estampillas', 'Venta de Empaques', 'Certificaciones', 'Apartado Postal', 'Recaudo de Facturas',
  ],
}

// ── CajaCard ──────────────────────────────────────────────────────────────────

function CajaCard({ card, onSelect }: { card: CardAuxiliar; onSelect: (c: CardAuxiliar) => void }) {
  const navigate  = useNavigate()
  const abierta   = card.estado === 'abierta'
  const sinSesion = card.estado === 'sin_sesion'
  const cerrada   = card.estado === 'cerrada'
  const sinCajero = isSinCajero(card)
  const servicios = SERVICIOS[card.tipo] ?? []
  const noEfectivo = totalNoEfectivo(card)

  return (
    <button
      type="button"
      onClick={() => onSelect(card)}
      className={cn(
        'group w-full rounded-xl border-2 p-4 text-left flex flex-col gap-3 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'hover:shadow-md hover:-translate-y-0.5',
        cardBg(card),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('size-2 shrink-0 rounded-full mt-0.5', dotCls(card))} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{card.nombre}</p>
            <p className="text-[11px] text-muted-foreground">{card.codigo}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{tipoLabel(card.tipo)}</Badge>
          {sinCajero
            ? <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">Sin cajero</Badge>
            : estadoBadge(card.estado)
          }
        </div>
      </div>

      {abierta && (
        <div className="space-y-1">
          <p className="text-2xl font-bold tabular-nums leading-none">{fmtOrDash(card.saldoActual)}</p>
          <p className="text-[10px] text-muted-foreground">Efectivo en caja</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="size-2.5" /> {fmt(card.ingresosSesion)}
            </span>
            <span className="flex items-center gap-0.5 text-red-500">
              <TrendingDown className="size-2.5" /> {fmt(card.egresosSesion)}
            </span>
          </div>
          {noEfectivo !== 0 && (
            <p className="text-[10px] text-sky-700 dark:text-sky-400 tabular-nums">
              + {fmt(String(noEfectivo))} en otros medios
            </p>
          )}
          {card.girosCount > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {card.girosCount} giro{card.girosCount > 1 ? 's' : ''} · {fmt(card.girosValor)}
            </p>
          )}
        </div>
      )}

      {sinSesion && (
        <div className="space-y-1.5">
          {servicios.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {servicios.slice(0, 3).map(s => (
                <span key={s} className="text-[10px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">{s}</span>
              ))}
              {servicios.length > 3 && (
                <span className="text-[10px] text-muted-foreground px-1">+{servicios.length - 3} más</span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Sin servicios configurados</p>
          )}
          <p className="text-[11px] text-muted-foreground">Base: — · Sin sesión activa</p>
        </div>
      )}

      {cerrada && (
        <div>
          <p className="text-lg font-bold tabular-nums text-muted-foreground">{fmtOrDash(card.saldoActual)}</p>
          <p className="text-[10px] text-muted-foreground">Arqueo final</p>
        </div>
      )}

      {card.alertas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.alertas.includes('limite_efectivo_caja') && (
            <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Límite excedido</Badge>
          )}
          {card.alertas.includes('reposicion_caja') && !card.alertas.includes('limite_efectivo_caja') && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-400 text-amber-700">
              Reposición
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <p className={cn(
          'text-[10px] font-medium text-primary',
          'opacity-0 group-hover:opacity-100 transition-opacity',
        )}>
          {sinSesion ? '→ Abrir caja' : sinCajero ? '→ Asignar cajero' : abierta ? '→ Opciones' : '→ Ver cierre'}
        </p>
        {(abierta || cerrada) && card.sesionId && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); navigate(`/cajas/punto/${card.sesionId}`) }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); navigate(`/cajas/punto/${card.sesionId}`) } }}
            className={cn(
              'text-[10px] font-medium underline underline-offset-2 cursor-pointer',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              abierta && !sinCajero ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {sinCajero ? 'Ver sesión →' : abierta ? 'Ir a caja →' : 'Ver cierre →'}
          </span>
        )}
      </div>
    </button>
  )
}

// ── CustodiaDialog ────────────────────────────────────────────────────────────

function CustodiaDialog({
  open, onClose, sesionId, sesionesAbiertas, saldoActual, cajaPadreId, cajaFuerte,
}: {
  open:             boolean
  onClose:          () => void
  sesionId:         number
  sesionesAbiertas: CardAuxiliar[]
  saldoActual:      string | null
  cajaPadreId:      number
  cajaFuerte:       CardAuxiliar | undefined
}) {
  const user      = useSessionStore(s => s.user)
  const esSupervisor = user?.rol === 'SUPERVISOR_REGIONAL' || user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL'
  const enviar    = useCambioCustodia(sesionId)
  const confirmar = useConfirmarCustodia()
  const abrirFuerte = useAbrirSesionPrincipal(cajaPadreId)
  const [montoFuerte, setMontoFuerte] = useState('')

  const [destiId,   setDestiId]   = useState('')
  const [monto,     setMonto]     = useState('')
  const [motivo,    setMotivo]    = useState('')
  const [resultado, setResultado] = useState<CambioCustodiaResult | null>(null)

  const [codigoIn,   setCodigoIn]   = useState('')
  const [montoRec,   setMontoRec]   = useState('')
  const [confirmado, setConfirmado] = useState(false)

  // Custodia siempre va a la caja principal (general) del punto, nunca a otras POS
  const destinos = sesionesAbiertas.filter(c => c.sesionId !== null && c.tipo === 'general')
  const montoNum = Number(monto.replace(/\./g, '').replace(/,/g, ''))
  const saldoNum = Number(saldoActual ?? 0)
  const montoOk  = montoNum > 0 && montoNum <= saldoNum

  function handleClose() {
    setDestiId(''); setMonto(''); setMotivo(''); setResultado(null)
    setCodigoIn(''); setMontoRec(''); setConfirmado(false)
    setMontoFuerte('')
    onClose()
  }

  function handleEnviar() {
    enviar.mutate(
      { sesionDestinoId: Number(destiId), monto: String(montoNum), ...(motivo.trim() ? { motivo: motivo.trim() } : {}) },
      {
        onSuccess: r => { setResultado(r as CambioCustodiaResult); toast.success('Remesa generada') },
        onError:   (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
      },
    )
  }

  function handleConfirmar() {
    confirmar.mutate(
      { codigoRemesa: codigoIn.trim().toUpperCase(), montoRecibido: montoRec },
      {
        onSuccess: () => { setConfirmado(true); toast.success('Custodia confirmada — saldo acreditado') },
        onError:   (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-[538px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-4" /> Cambio de Custodia
          </DialogTitle>
          <DialogDescription className="text-xs">
            Saldo disponible: <strong className="text-foreground tabular-nums">{fmt(saldoActual)}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="enviar" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="enviar" className="flex-1">Enviar remesa</TabsTrigger>
            <TabsTrigger value="confirmar" className="flex-1">Confirmar recepción</TabsTrigger>
          </TabsList>

          {/* Tab: Enviar */}
          <TabsContent value="enviar" className="mt-4 space-y-3">
            {resultado ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-2">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Código de remesa</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-emerald-800 dark:text-emerald-300">{resultado.codigoRemesa}</p>
                  <p className="text-xs text-muted-foreground">Monto: <strong>{fmt(resultado.montoEmitido)}</strong></p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { void navigator.clipboard.writeText(resultado.codigoRemesa); toast.success('Código copiado') }}>
                    <Copy className="size-3.5 mr-1.5" /> Copiar código
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setResultado(null)}>Nueva remesa</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Caja destino</Label>
                  {destinos.length === 0 ? (
                    <div className="rounded-md border border-dashed p-3 space-y-2.5 text-center">
                      <p className="text-xs text-muted-foreground">
                        La Caja Principal no está abierta. Debe abrirse para recibir el efectivo de custodia.
                      </p>
                      {esSupervisor && (!cajaFuerte || cajaFuerte.estado === 'sin_sesion') && (
                        <div className="space-y-2">
                          <input
                            type="number" min="0" step="10000"
                            className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="Monto apertura Caja Fuerte"
                            value={montoFuerte}
                            onChange={e => setMontoFuerte(e.target.value)}
                          />
                          <Button
                            size="sm" className="w-full"
                            disabled={!montoFuerte || Number(montoFuerte) <= 0 || abrirFuerte.isPending}
                            onClick={() => abrirFuerte.mutate(montoFuerte, {
                              onSuccess: () => { toast.success('Caja Fuerte abierta'); setMontoFuerte('') },
                              onError:   e  => toast.error(e.message),
                            })}
                          >
                            {abrirFuerte.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                            Abrir Caja Fuerte
                          </Button>
                        </div>
                      )}
                      {!esSupervisor && (
                        <p className="text-[11px] text-muted-foreground">Solicite al supervisor que abra la Caja Fuerte.</p>
                      )}
                    </div>
                  ) : (
                    <Select value={destiId} onValueChange={setDestiId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar caja…" /></SelectTrigger>
                      <SelectContent>
                        {destinos.map(c => (
                          <SelectItem key={c.sesionId} value={String(c.sesionId)}>
                            {c.nombre} — Caja Principal ({fmt(c.saldoActual)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monto (COP)</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={`Máx ${fmt(saldoActual)}`}
                    value={monto}
                    onChange={e => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
                  />
                  {monto && !montoOk && (
                    <p className="text-xs text-destructive">{montoNum <= 0 ? 'Monto inválido' : 'Supera el saldo disponible'}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ej: Abastecimiento…"
                    value={motivo}
                    maxLength={300}
                    onChange={e => setMotivo(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={!destiId || !montoOk || enviar.isPending} onClick={handleEnviar}>
                  {enviar.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Generar remesa
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab: Confirmar */}
          <TabsContent value="confirmar" className="mt-4 space-y-3">
            {confirmado ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-2">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ Custodia confirmada</p>
                <p className="text-xs text-muted-foreground">Saldo acreditado en la caja de origen</p>
                <Button size="sm" variant="ghost" onClick={() => { setCodigoIn(''); setMontoRec(''); setConfirmado(false) }}>
                  Confirmar otra
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Código de remesa</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono tracking-widest uppercase placeholder:text-muted-foreground placeholder:normal-case focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="16 caracteres"
                    maxLength={16}
                    value={codigoIn}
                    onChange={e => setCodigoIn(e.target.value.replace(/\s/g, ''))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monto físico recibido (COP)</Label>
                  <input
                    type="number" min="0" step="1000"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Valor exacto recibido"
                    value={montoRec}
                    onChange={e => setMontoRec(e.target.value)}
                  />
                </div>
                <Button className="w-full" disabled={!codigoIn.trim() || !montoRec || confirmar.isPending} onClick={handleConfirmar}>
                  {confirmar.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
                  Confirmar recepción
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── CajaModal ─────────────────────────────────────────────────────────────────

function CajaModal({ open, onClose, card, sucursalId, sesionesAbiertas, cajaPadreId, cajaFuerte, panel }: {
  open: boolean; onClose: () => void
  card: CardAuxiliar | null
  sucursalId: number
  sesionesAbiertas: CardAuxiliar[]
  cajaPadreId: number
  cajaFuerte: CardAuxiliar | undefined
  panel: PanelPunto
}) {
  const navigate    = useNavigate()
  const user        = useSessionStore(s => s.user)
  const esCajero    = user?.rol === 'CAJERO'
  const esSupervisor = user?.rol === 'SUPERVISOR_REGIONAL' || user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL'

  const [servicios,    setServicios]    = useState<string[]>([])
  const [base,         setBase]         = useState('')
  const [cajeroId,     setCajeroId]     = useState<number | undefined>(undefined)
  const [showConfig,   setShowConfig]   = useState(false)
  const [limiteAlerta, setLimiteAlerta] = useState('')
  const [baseDia,      setBaseDia]      = useState('')
  const [showCustodia, setShowCustodia] = useState(false)

  const { data: usuariosSuc, isError: cajerosNoDisponibles } = useUsers({
    rol:        'CAJERO',
    sucursal_id: user?.sucursal_id ?? undefined,
    activo:     true,
    limite:     50,
  })
  const cajeros = usuariosSuc?.datos ?? []

  const abrir      = useAbrirCajaDirecta(card?.cajaId ?? 0)
  const updateCaja = useUpdateCaja(card?.cajaId ?? 0, sucursalId)
  const { data: historial } = useHistorialSesiones(card?.cajaId ?? 0)

  useEffect(() => {
    if (card) {
      setServicios([...(SERVICIOS[card.tipo] ?? [])])
      setBase('')
      // Pre-select: cajeroFijo when opening a new session, otherwise the active session cajero
      setCajeroId(card.estado === 'sin_sesion'
        ? (card.cajeroFijoId ?? undefined)
        : (card.cajeroId ?? undefined))
      setLimiteAlerta(card.limiteAlerta ?? '')
      setBaseDia(card.baseDia ?? '')
      setShowConfig(false)
    }
  }, [card?.cajaId])

  if (!card) return null

  const sinSesion = card.estado === 'sin_sesion'
  const abierta   = card.estado === 'abierta'
  const cerrada   = card.estado === 'cerrada'
  const sinCajero = isSinCajero(card)
  const catServ   = SERVICIOS[card.tipo] ?? []

  // BR-CAJ-011: base disponible para esta apertura
  const baseDisponible  = Number(panel.baseDisponible ?? '0')
  const baseEntrada     = Number(base) || 0
  const baseSinCupo     = sinSesion && baseDisponible <= 0
  const baseExcedeCupo  = baseEntrada > 0 && baseEntrada > baseDisponible

  // La sesión nace a nombre de un cajero: el que elija la apertura o, si no elige, el fijo
  // de la caja. Sin ninguno de los dos el backend rechaza la apertura de una caja operativa.
  const cajeroApertura = esCajaOperativa(card.tipo) ? (cajeroId ?? card.cajeroFijoId ?? null) : null
  const faltaCajero    = sinSesion && esCajaOperativa(card.tipo) && cajeroApertura === null
  const nombreCajero   = cajeros.find(c => c.id === cajeroApertura)?.nombre ?? null

  function submitConfig() {
    if (!card) return
    updateCaja.mutate(
      {
        limiteAlerta: limiteAlerta ? limiteAlerta : null,
        baseDia:      baseDia      ? baseDia      : undefined,
      },
      {
        onSuccess: () => { toast.success('Configuración guardada'); setShowConfig(false) },
        onError:   (e) => toast.error(e.message),
      },
    )
  }

  function submitApertura() {
    if (!card) return
    abrir.mutate(
      { baseAsignada: base, ...(cajeroApertura ? { cajeroAsignadoId: cajeroApertura } : {}) },
      {
        onSuccess: () => { toast.success(`${card.nombre} abierta`); onClose() },
        onError:   (e) => toast.error(e.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">

        <DialogHeader className="pl-6 pr-14 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={cn('size-2.5 rounded-full shrink-0', dotCls(card))} />
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">{card.nombre}</DialogTitle>
              <DialogDescription className="text-[11px] mt-0.5">
                {card.codigo} · {tipoLabel(card.tipo)}
                {abierta && !sinCajero && <span className="ml-2 text-emerald-600 font-medium">· Operando</span>}
                {sinCajero             && <span className="ml-2 text-amber-600 font-medium">· Sin cajero asignado</span>}
                {cerrada               && <span className="ml-2 text-muted-foreground">· Cerrada</span>}
                {sinSesion             && <span className="ml-2 text-muted-foreground">· Disponible</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-5 space-y-5">

            {/* Sin sesión: servicios + base */}
            {sinSesion && (
              <>
                {catServ.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <PackageCheck className="size-3.5" /> Productos Asignados
                      </Label>
                      <div className="flex gap-2 text-[11px]">
                        <button type="button" className="text-primary hover:underline"
                          onClick={() => setServicios([...catServ])}>Todos</button>
                        <span className="text-muted-foreground">·</span>
                        <button type="button" className="text-muted-foreground hover:text-foreground hover:underline"
                          onClick={() => setServicios([])}>Ninguno</button>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      {catServ.map(s => (
                        <div key={s} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`srv-${card.cajaId}-${s}`}
                            checked={servicios.includes(s)}
                            onCheckedChange={() =>
                              setServicios(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
                            }
                          />
                          <label htmlFor={`srv-${card.cajaId}-${s}`} className="text-sm cursor-pointer select-none leading-none">
                            {s}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {servicios.length} de {catServ.length} servicio{catServ.length > 1 ? 's' : ''} seleccionado{servicios.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                <Separator />

                {esSupervisor && esCajaOperativa(card.tipo) && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cajero asignado
                    </Label>
                    {cajeros.length > 0 ? (
                      <select
                        value={cajeroId ?? ''}
                        onChange={e => setCajeroId(e.target.value ? Number(e.target.value) : undefined)}
                        className={cn(
                          'w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring',
                          faltaCajero && 'border-red-400 focus:ring-red-400',
                        )}
                      >
                        <option value="">Sin asignar</option>
                        {cajeros.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} — {c.email}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2.5 text-[12px] text-amber-700 dark:text-amber-400">
                        {cajerosNoDisponibles
                          ? 'No se pudo cargar la lista de cajeros: el módulo de usuarios está desactivado. Actívelo en Aperturas del sistema.'
                          : 'No hay cajeros activos en esta sucursal. Cree uno antes de abrir la caja.'}
                      </div>
                    )}
                    {faltaCajero ? (
                      <p className="text-xs text-red-500">
                        Esta caja no tiene cajero fijo, así que no se puede abrir: la sesión nacería sin
                        dueño y cualquiera podría vender en ella.
                      </p>
                    ) : nombreCajero ? (
                      <p className="text-[11px] text-muted-foreground">
                        La sesión y sus ventas quedan a nombre de {nombreCajero}. Solo él podrá vender en esta caja.
                      </p>
                    ) : cajeroApertura !== null && (
                      <p className="text-[11px] text-muted-foreground">
                        Se abrirá con el cajero fijo de la caja.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Base de apertura
                    </Label>
                    <span className={cn(
                      'text-[11px] tabular-nums font-medium',
                      baseSinCupo ? 'text-red-500' : 'text-muted-foreground',
                    )}>
                      Disponible: {fmt(String(baseDisponible))}
                    </span>
                  </div>
                  {baseSinCupo ? (
                    <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-3 py-3 text-[12px] text-red-700 dark:text-red-400">
                      Base agotada — todas las cajas del punto tienen la base asignada al completo.
                      Cierre una caja auxiliar para liberar cupo.
                    </div>
                  ) : (
                    <>
                      <Input
                        type="number" min="0" max={baseDisponible} step="1000" placeholder="0"
                        value={base} onChange={e => setBase(e.target.value)}
                        className={cn('text-lg font-semibold tabular-nums h-11', baseExcedeCupo && 'border-red-400 focus-visible:ring-red-400')}
                      />
                      {baseExcedeCupo && (
                        <p className="text-xs text-red-500">Supera la base disponible ({fmt(String(baseDisponible))})</p>
                      )}
                      {base && Number(base) > 0 && !baseExcedeCupo && (
                        <p className="text-sm font-bold text-primary tabular-nums">{fmt(base)}</p>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Abierta: stats */}
            {abierta && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/30 border px-4 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Efectivo en caja</p>
                  <p className="text-3xl font-bold tabular-nums mt-1">{fmtOrDash(card.saldoActual)}</p>
                  <div className="flex justify-center gap-5 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <TrendingUp className="size-3" /> {fmt(card.ingresosSesion)}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <TrendingDown className="size-3" /> {fmt(card.egresosSesion)}
                    </span>
                  </div>
                  {card.girosCount > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {card.girosCount} giro{card.girosCount > 1 ? 's' : ''} · {fmt(card.girosValor)}
                    </p>
                  )}
                </div>

                {desgloseNoEfectivo(card).length > 0 && (
                  <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Facturado en otros medios
                    </p>
                    {desgloseNoEfectivo(card).map(([medio, monto]) => (
                      <div key={medio} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{MEDIO_LABELS[medio]}</span>
                        <span className="tabular-nums font-medium">{fmt(monto)}</span>
                      </div>
                    ))}
                    <Separator className="my-1" />
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Total no efectivo</span>
                      <span className="tabular-nums">{fmt(String(totalNoEfectivo(card)))}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-0.5">
                      No entra al cajón: no se cuenta en el arqueo.
                    </p>
                  </div>
                )}

                {card.deltaReposicion && Number(card.deltaReposicion) > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Reposición sugerida</span>
                      <span className="tabular-nums font-semibold">{fmt(card.deltaReposicion)}</span>
                    </div>
                    {card.tTarget && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        Nivel óptimo: {fmt(card.tTarget)}
                      </p>
                    )}
                  </div>
                )}

                {card.alertas.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {card.alertas.includes('limite_efectivo_caja') && (
                      <Badge variant="destructive" className="text-xs">Límite de efectivo excedido</Badge>
                    )}
                    {card.alertas.includes('reposicion_caja') && (
                      <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">
                        Requiere reposición
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cerrada: arqueo */}
            {cerrada && (
              <div className="rounded-lg border bg-muted/30 px-4 py-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Arqueo final</p>
                <p className="text-3xl font-bold tabular-nums mt-1">{fmtOrDash(card.saldoActual)}</p>
              </div>
            )}

            {/* Configurar límites — solo supervisores */}
            {esSupervisor && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfig(o => !o)}
                  className="w-full flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="size-3.5" />
                  Configurar límites
                  <ChevronDown className={cn('size-3 ml-auto transition-transform duration-150', showConfig && 'rotate-180')} />
                </button>
                {showConfig && (
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Base del día
                      </Label>
                      <Input
                        type="number" min="0" step="1000" placeholder="Sin base configurada"
                        value={baseDia} onChange={e => setBaseDia(e.target.value)}
                        className="h-9 tabular-nums"
                      />
                      {baseDia && Number(baseDia) > 0 && (
                        <p className="text-[11px] text-muted-foreground tabular-nums">{fmt(baseDia)}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Límite de alerta de efectivo
                      </Label>
                      <Input
                        type="number" min="0" step="10000" placeholder="Sin límite (dejar vacío para desactivar)"
                        value={limiteAlerta} onChange={e => setLimiteAlerta(e.target.value)}
                        className="h-9 tabular-nums"
                      />
                      {limiteAlerta && Number(limiteAlerta) > 0 && (
                        <p className="text-[11px] text-muted-foreground tabular-nums">{fmt(limiteAlerta)}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        Genera una alerta cuando el efectivo supera este monto. Vacío = sin límite.
                      </p>
                    </div>
                    <Button
                      size="sm" className="w-full"
                      disabled={updateCaja.isPending}
                      onClick={submitConfig}
                    >
                      {updateCaja.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                      Guardar configuración
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Historial de sesiones */}
            {historial && historial.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Historial de sesiones
                  </p>
                  {historial.length > 5 && (
                    <button
                      type="button"
                      onClick={() => { onClose(); navigate(`/cajas/cierre/${sucursalId}`) }}
                      className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                    >
                      Ver todas ({historial.length}) <ChevronRight className="size-3" />
                    </button>
                  )}
                </div>
                <div className="rounded-lg border overflow-hidden divide-y text-xs">
                  {historial.slice(0, 5).map(s => {
                    const diferencia = s.montoCierre != null
                      ? Number(s.montoCierre) - Number(s.montoApertura)
                      : null
                    const esForzada = s.estado === 'forzada'
                    return (
                      <div key={s.id} className={cn('px-3 py-2 flex items-center gap-3',
                        esForzada && 'bg-destructive/5',
                        s.estado === 'abierta' && 'bg-emerald-50/60 dark:bg-emerald-950/20',
                      )}>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={cn('font-semibold',
                              s.estado === 'abierta' ? 'text-emerald-600' : esForzada ? 'text-destructive' : 'text-foreground',
                            )}>
                              {s.estado === 'abierta' ? 'Abierta' : esForzada ? 'Forzada' : 'Cerrada'}
                            </span>
                            <span className="text-muted-foreground">·</span>
                            <span className="text-muted-foreground tabular-nums">
                              {new Date(s.fechaApertura).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })}
                              {' '}
                              {new Date(s.fechaApertura).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {s.fechaCierre && (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-muted-foreground tabular-nums">
                                  {new Date(s.fechaCierre).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
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
                          {diferencia != null && (
                            <span className={cn('font-semibold',
                              diferencia < 0 ? 'text-destructive' : diferencia > 0 ? 'text-amber-600' : 'text-emerald-600',
                            )}>
                              {diferencia === 0 ? '✓' : diferencia > 0 ? `+${fmt(diferencia.toString())}` : fmt(diferencia.toString())}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {historial.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    +{historial.length - 5} sesión{historial.length - 5 !== 1 ? 'es' : ''} anterior{historial.length - 5 !== 1 ? 'es' : ''} en Alertas Generales
                  </p>
                )}
              </div>
            )}

          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t shrink-0 flex items-center justify-end gap-2 bg-muted/20">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>

          {sinSesion && (
            <Button
              disabled={!base || Number(base) <= 0 || abrir.isPending || baseSinCupo || baseExcedeCupo || faltaCajero}
              onClick={submitApertura}
            >
              {abrir.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Apertura
            </Button>
          )}

          {abierta && (
            <>
              <Button variant="outline" onClick={() => setShowCustodia(true)}>
                <ArrowLeftRight className="mr-2 size-4" /> Cambio de Custodia
              </Button>
              <Button variant="outline" onClick={() => { onClose(); navigate(`/cajas/punto/${card.sesionId}`) }}>
                <Eye className="mr-2 size-4" /> Ver movimientos
              </Button>
              {esCajero && (
                <Button onClick={() => { onClose(); navigate(`/ventas/caja/${card.cajaId}`) }}>
                  <ShoppingCart className="mr-2 size-4" /> Ir a Ventas
                </Button>
              )}
            </>
          )}

          {cerrada && card.sesionId && (
            <Button variant="outline" onClick={() => { onClose(); navigate(`/cajas/punto/${card.sesionId}`) }}>
              <Eye className="mr-2 size-4" /> Ver cierre
            </Button>
          )}
        </div>
      </DialogContent>

      {/* Dialog de custodia — se monta desde CajaModal para tener acceso a card y sesionesAbiertas */}
      {abierta && card.sesionId && (
        <CustodiaDialog
          open={showCustodia}
          onClose={() => setShowCustodia(false)}
          sesionId={card.sesionId}
          sesionesAbiertas={sesionesAbiertas ?? []}
          saldoActual={card.saldoActual}
          cajaPadreId={cajaPadreId}
          cajaFuerte={cajaFuerte}
        />
      )}
    </Dialog>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PuntoCajas() {
  const { sucursalId } = useParams<{ sucursalId: string }>()
  const navigate = useNavigate()
  const id = Number(sucursalId)

  const { data, isLoading, isError, refetch, isFetching } = useStatusPunto(id)
  const { data: cajaPadre } = useCajaPadre(data?.cajaPadreId ?? 0)
  const { data: diferenciasPendientes = [] } = useDiferenciasPendientes(id)
  const user = useSessionStore(s => s.user)

  const [cajaTarget, setCajaTarget] = useState<CardAuxiliar | null>(null)

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <AlertTriangle className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No se pudo cargar el estado del punto</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  const cajas         = data.cajas.filter(c => esCajaOperativa(c.tipo))
  const cajaFuerte    = data.cajas.find(c => c.tipo === 'general')
  const totalAlertas  = cajas.reduce((a, c) => a + c.alertas.length, 0) + diferenciasPendientes.length
  const totalAbiertas = cajas.filter(c => c.estado === 'abierta').length

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Vault className="size-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">
              {cajaPadre?.nombre ?? `Punto de Caja — Sucursal ${id}`}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.nombre ?? '—'} · {new Date().toLocaleString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {totalAbiertas > 0 && (
            <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
              {totalAbiertas} abierta{totalAbiertas !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button
            variant={totalAlertas > 0 ? 'destructive' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => navigate(`/cajas/cierre/${id}`)}
          >
            <ShieldAlert className="size-3.5" />
            Alertas de Cierre
            {totalAlertas > 0 && (
              <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] bg-white/20 hover:bg-white/20">
                {totalAlertas}
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="size-7"
            onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </header>

      {/* Cuerpo: grid + panel lateral */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Grid de cajas */}
        <div className="flex-1 overflow-auto p-5">
          {cajas.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {cajas.map(c => <CajaCard key={c.cajaId} card={c} onSelect={setCajaTarget} />)}
            </div>
          ) : (
            <div className="py-20 text-center text-sm text-muted-foreground">
              No hay cajas POS configuradas en este punto
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <aside className="w-72 shrink-0 border-l overflow-hidden">
          <PanelLateral
            panel={data.panel}
            cajas={cajas}
            sucursalId={id}
            cajaFuerte={cajaFuerte}
            cajaPadreId={data.cajaPadreId}
            diferenciasPendientes={diferenciasPendientes}
          />
        </aside>
      </div>

      <CajaModal
        open={!!cajaTarget}
        onClose={() => setCajaTarget(null)}
        card={cajaTarget}
        sucursalId={id}
        cajaPadreId={data.cajaPadreId}
        cajaFuerte={cajaFuerte}
        panel={data.panel}
        sesionesAbiertas={[
          ...cajas.filter(c => c.estado === 'abierta'),
          ...(cajaFuerte && cajaFuerte.estado === 'abierta' ? [cajaFuerte] : []),
        ]}
      />
    </div>
  )
}
