import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  RefreshCw, AlertTriangle, Eye, Loader2, Vault, PackageCheck,
  TrendingUp, TrendingDown, ChevronDown, ChevronRight, ShieldAlert, ShoppingCart,
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useStatusPunto, useAbrirCajaDirecta, useCajaPadre,
  type CardAuxiliar, type PanelPunto, type TipoAlerta,
} from '@/queries/cajas.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt       = (v: string | null | undefined) => v ? COP.format(Number(v)) : '$0'
const fmtOrDash = (v: string | null | undefined) => v ? COP.format(Number(v)) : '—'

function tipoLabel(tipo: string) {
  const MAP: Record<string, string> = { pos: 'POS', general: 'Caja Fuerte' }
  return MAP[tipo] ?? tipo
}

function estadoBadge(estado: CardAuxiliar['estado']) {
  if (estado === 'sin_sesion') return <Badge variant="outline" className="text-[10px]">Disponible</Badge>
  if (estado === 'cerrada')    return <Badge variant="secondary" className="text-[10px]">Cerrada</Badge>
  return <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Abierta</Badge>
}

function cardBg(card: CardAuxiliar) {
  if (card.estado === 'sin_sesion') return 'border-dashed border-border bg-muted/20 hover:bg-muted/40'
  if (card.estado === 'cerrada')    return 'border-border bg-muted/30 hover:bg-muted/50'
  if (card.alertas.includes('limite_efectivo_caja'))
    return 'border-red-300 bg-red-50/60 hover:bg-red-50 dark:border-red-800 dark:bg-red-950/20'
  if (card.alertas.includes('reposicion_caja'))
    return 'border-amber-300 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20'
  return 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20'
}

function dotCls(card: CardAuxiliar) {
  if (card.estado === 'sin_sesion') return 'bg-zinc-400'
  if (card.estado === 'cerrada')    return 'bg-zinc-300'
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
}: {
  panel:      PanelPunto
  cajas:      CardAuxiliar[]
  sucursalId: number
}) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const alertas = cajas.flatMap(c =>
    c.alertas.map(a => ({ concepto: ALERTA_LABELS[a] ?? a, observacion: c.nombre }))
  )

  const irACierre = () => navigate(`/cajas/cierre/${sucursalId}`)

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
                      <td className="px-3 py-1.5 font-medium text-red-700 dark:text-red-400">
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
  const servicios = SERVICIOS[card.tipo] ?? []

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
          {estadoBadge(card.estado)}
        </div>
      </div>

      {abierta && (
        <div className="space-y-1">
          <p className="text-2xl font-bold tabular-nums leading-none">{fmtOrDash(card.saldoActual)}</p>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="size-2.5" /> {fmt(card.ingresosTurno)}
            </span>
            <span className="flex items-center gap-0.5 text-red-500">
              <TrendingDown className="size-2.5" /> {fmt(card.egresosTurno)}
            </span>
          </div>
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
          {sinSesion ? '→ Abrir caja' : abierta ? '→ Opciones' : '→ Ver cierre'}
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
              abierta ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {abierta ? 'Ir a caja →' : 'Ver cierre →'}
          </span>
        )}
      </div>
    </button>
  )
}

// ── CajaModal ─────────────────────────────────────────────────────────────────

function CajaModal({ open, onClose, card }: {
  open: boolean; onClose: () => void
  card: CardAuxiliar | null
}) {
  const navigate = useNavigate()
  const user     = useSessionStore(s => s.user)
  const esCajero = user?.rol === 'CAJERO'

  const [servicios, setServicios] = useState<string[]>([])
  const [base,      setBase]      = useState('')

  const abrir = useAbrirCajaDirecta(card?.cajaId ?? 0)

  useEffect(() => {
    if (card) {
      setServicios([...(SERVICIOS[card.tipo] ?? [])])
      setBase('')
    }
  }, [card?.cajaId])

  if (!card) return null

  const sinSesion = card.estado === 'sin_sesion'
  const abierta   = card.estado === 'abierta'
  const cerrada   = card.estado === 'cerrada'
  const catServ   = SERVICIOS[card.tipo] ?? []

  function submitApertura() {
    if (!card) return
    abrir.mutate(
      { baseAsignada: base },
      {
        onSuccess: () => { toast.success(`${card.nombre} abierta`); onClose() },
        onError:   (e) => toast.error(e.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">

        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={cn('size-2.5 rounded-full shrink-0', dotCls(card))} />
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">{card.nombre}</DialogTitle>
              <DialogDescription className="text-[11px] mt-0.5">
                {card.codigo} · {tipoLabel(card.tipo)}
                {abierta   && <span className="ml-2 text-emerald-600 font-medium">· Operando</span>}
                {cerrada   && <span className="ml-2 text-muted-foreground">· Cerrada</span>}
                {sinSesion && <span className="ml-2 text-muted-foreground">· Disponible</span>}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-5 py-4 space-y-5">

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

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Base de apertura
                  </Label>
                  <Input
                    type="number" min="0" step="1000" placeholder="0"
                    value={base} onChange={e => setBase(e.target.value)}
                    className="text-lg font-semibold tabular-nums h-11"
                  />
                  {base && Number(base) > 0 && (
                    <p className="text-sm font-bold text-primary tabular-nums">{fmt(base)}</p>
                  )}
                </div>
              </>
            )}

            {/* Abierta: stats */}
            {abierta && (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/30 border px-4 py-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo actual</p>
                  <p className="text-3xl font-bold tabular-nums mt-1">{fmtOrDash(card.saldoActual)}</p>
                  <div className="flex justify-center gap-5 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-emerald-700">
                      <TrendingUp className="size-3" /> {fmt(card.ingresosTurno)}
                    </span>
                    <span className="flex items-center gap-1 text-red-500">
                      <TrendingDown className="size-3" /> {fmt(card.egresosTurno)}
                    </span>
                  </div>
                  {card.girosCount > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {card.girosCount} giro{card.girosCount > 1 ? 's' : ''} · {fmt(card.girosValor)}
                    </p>
                  )}
                </div>

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

          </div>
        </ScrollArea>

        <div className="px-5 py-4 border-t shrink-0 flex items-center justify-end gap-2 bg-muted/20">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>

          {sinSesion && (
            <Button
              disabled={!base || Number(base) <= 0 || abrir.isPending}
              onClick={submitApertura}
            >
              {abrir.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Apertura
            </Button>
          )}

          {abierta && (
            <>
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

  const cajas         = data.cajas.filter(c => c.tipo === 'pos')
  const totalAlertas  = cajas.reduce((a, c) => a + c.alertas.length, 0)
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
          <PanelLateral panel={data.panel} cajas={cajas} sucursalId={id} />
        </aside>
      </div>

      <CajaModal
        open={!!cajaTarget}
        onClose={() => setCajaTarget(null)}
        card={cajaTarget}
      />
    </div>
  )
}
