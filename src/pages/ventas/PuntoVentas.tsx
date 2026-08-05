import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, ArrowRight, AlertTriangle, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, AlertCircle, Banknote, LogOut,
  ArrowLeftRight, Loader2, Copy, Send, Inbox,
} from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useStatusPunto, useMovimientos, useCerrarAuxiliar, useAbrirCajaDirecta,
  useCambioCustodia, useConfirmarCustodia,
  type CardAuxiliar, type CambioCustodiaResult,
} from '@/queries/cajas.queries'
import { useResumenTurno } from '@/queries/ventas.queries'
import { toast } from 'sonner'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string | number | null | undefined) => (v != null ? COP.format(Number(v)) : '$0')

const TIPO_MOV: Record<string, string> = {
  apertura:            'Apertura',
  venta_producto:      'Venta producto',
  venta_servicio:      'Venta servicio',
  venta_estampilla:    'Estampilla',
  apartado_postal:     'Apartado postal',
  giro_pago:           'Pago giro',
  giro_emision_cobro:  'Emisión giro',
  consignacion:        'Consignación',
  reposicion:          'Reposición',
  cambio_custodia_in:  'Custodia recibida',
  cambio_custodia_out: 'Custodia entregada',
  diferencia_faltante: 'Faltante',
  diferencia_sobrante: 'Sobrante',
  anulacion:           'Anulación',
  recaudo:             'Recaudo',
}

// ── CustodiaDialog — tab Enviar + tab Recibir ─────────────────────────────────

function CustodiaDialog({
  open, onClose, sesionId, cajaFuerte, saldoActual,
}: {
  open:        boolean
  onClose:     () => void
  sesionId:    number
  cajaFuerte:  CardAuxiliar | undefined
  saldoActual: string | null
}) {
  const enviar    = useCambioCustodia(sesionId)
  const confirmar = useConfirmarCustodia()

  // Tab Enviar
  const [monto,     setMonto]     = useState('')
  const [motivo,    setMotivo]    = useState('')
  const [resultado, setResultado] = useState<CambioCustodiaResult | null>(null)

  // Tab Recibir
  const [codigoIn,   setCodigoIn]   = useState('')
  const [montoRec,   setMontoRec]   = useState('')
  const [confirmado, setConfirmado] = useState(false)

  const sesionDestinoId = cajaFuerte?.sesionId ?? null

  const montoNum = Number(monto.replace(/\./g, '').replace(/,/g, ''))
  const saldoNum = Number(saldoActual ?? 0)
  const montoOk  = montoNum > 0 && montoNum <= saldoNum

  function handleClose() {
    setMonto(''); setMotivo(''); setResultado(null)
    setCodigoIn(''); setMontoRec(''); setConfirmado(false)
    onClose()
  }

  function handleEnviar() {
    if (!sesionDestinoId) return
    enviar.mutate(
      { sesionDestinoId, monto: String(montoNum), ...(motivo.trim() ? { motivo: motivo.trim() } : {}) },
      {
        onSuccess: r => { setResultado(r); toast.success('Remesa generada') },
        onError:   (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error'),
      },
    )
  }

  function handleConfirmar() {
    confirmar.mutate(
      { codigoRemesa: codigoIn.trim().toUpperCase(), montoRecibido: montoRec },
      {
        onSuccess: () => { setConfirmado(true); toast.success('Custodia confirmada — saldo acreditado') },
        onError:   (e: unknown) => toast.error(e instanceof Error ? e.message : 'Error al confirmar'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ArrowLeftRight className="size-4" /> Cambio de Custodia
          </DialogTitle>
          <DialogDescription className="text-xs">
            Saldo disponible: <strong className="text-foreground tabular-nums">{fmt(saldoActual)}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="enviar" className="mt-4">
          <TabsList className="mx-5 grid w-[calc(100%-2.5rem)] grid-cols-2">
            <TabsTrigger value="enviar" className="gap-1.5 text-xs">
              <Send className="size-3" /> Enviar remesa
            </TabsTrigger>
            <TabsTrigger value="recibir" className="gap-1.5 text-xs">
              <Inbox className="size-3" /> Confirmar recepción
            </TabsTrigger>
          </TabsList>

          {/* ── Tab: Enviar ─────────────────────────────────────────────── */}
          <TabsContent value="enviar" className="px-5 pb-5 pt-4 space-y-3">
            {resultado ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-2">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Código de remesa generado</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-emerald-800 dark:text-emerald-300">
                    {resultado.codigoRemesa}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Monto: <strong>{fmt(resultado.montoEmitido)}</strong> — entrega este código al receptor
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                    void navigator.clipboard.writeText(resultado.codigoRemesa)
                    toast.success('Código copiado')
                  }}>
                    <Copy className="size-3.5 mr-1.5" /> Copiar código
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setResultado(null); setMonto(''); setMotivo('') }}>
                    Nueva remesa
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Caja destino</Label>
                  {cajaFuerte ? (
                    <div className="flex items-center gap-2 h-8 rounded-md border bg-muted/40 px-3 text-sm text-foreground">
                      <span className="flex-1 truncate font-medium">{cajaFuerte.nombre}</span>
                      <span className="tabular-nums text-xs text-muted-foreground shrink-0">{fmt(cajaFuerte.saldoActual)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground rounded-md border border-dashed px-3 py-2">
                      Caja Principal no disponible.
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monto a enviar (COP)</Label>
                  <input
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={`Máx ${fmt(saldoActual)}`}
                    value={monto}
                    onChange={e => setMonto(e.target.value.replace(/[^0-9.,]/g, ''))}
                  />
                  {monto && !montoOk && (
                    <p className="text-xs text-destructive">
                      {montoNum <= 0 ? 'Ingrese un monto válido' : 'Supera el saldo disponible'}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Motivo (opcional)</Label>
                  <input
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ej: Abastecimiento de caja…"
                    value={motivo}
                    maxLength={300}
                    onChange={e => setMotivo(e.target.value)}
                  />
                </div>
                <Button
                  size="sm" className="w-full"
                  disabled={!montoOk || enviar.isPending}
                  onClick={handleEnviar}
                >
                  {enviar.isPending
                    ? <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    : <Send className="size-3.5 mr-1.5" />
                  }
                  Generar remesa
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── Tab: Recibir ────────────────────────────────────────────── */}
          <TabsContent value="recibir" className="px-5 pb-5 pt-4 space-y-3">
            {confirmado ? (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center space-y-2">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ Custodia confirmada</p>
                <p className="text-xs text-muted-foreground">El monto fue acreditado en tu saldo.</p>
                <Button size="sm" variant="ghost" onClick={() => { setCodigoIn(''); setMontoRec(''); setConfirmado(false) }}>
                  Confirmar otra
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Ingresa el código que te envió el remitente y el monto físico que recibiste.
                </p>
                <div className="space-y-1">
                  <Label className="text-xs">Código de remesa</Label>
                  <input
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-base font-mono tracking-[0.25em] uppercase placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="16 caracteres"
                    maxLength={16}
                    value={codigoIn}
                    onChange={e => setCodigoIn(e.target.value.replace(/\s/g, ''))}
                  />
                  {codigoIn.length > 0 && codigoIn.length < 16 && (
                    <p className="text-[10px] text-muted-foreground">{16 - codigoIn.length} caracteres restantes</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monto físico recibido (COP)</Label>
                  <input
                    type="number" min="0" step="1000"
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm tabular-nums placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Ingresa el valor exacto recibido"
                    value={montoRec}
                    onChange={e => setMontoRec(e.target.value)}
                  />
                </div>
                <Button
                  size="sm" className="w-full"
                  disabled={codigoIn.trim().length !== 16 || !montoRec || confirmar.isPending}
                  onClick={handleConfirmar}
                >
                  {confirmar.isPending
                    ? <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    : <Inbox className="size-3.5 mr-1.5" />
                  }
                  Confirmar recepción
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="px-5 pb-5 flex justify-end border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── CajaCard (selector para supervisores/admin) ───────────────────────────────

function CajaCard({ card }: { card: CardAuxiliar }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/ventas/caja/${card.cajaId}`)}
      className={cn(
        'group w-full rounded-xl border-2 p-4 text-left flex flex-col gap-3 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'hover:shadow-md hover:-translate-y-0.5',
        'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 shrink-0 rounded-full mt-0.5 bg-emerald-500" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{card.nombre}</p>
            <p className="text-[11px] text-muted-foreground">{card.codigo}</p>
          </div>
        </div>
        <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600 shrink-0">
          Abierta
        </Badge>
      </div>

      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{fmt(card.saldoActual)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Saldo actual</p>
      </div>

      <div className="flex items-center justify-end mt-auto">
        <span className={cn(
          'flex items-center gap-1 text-[11px] font-medium text-primary',
          'opacity-0 group-hover:opacity-100 transition-opacity',
        )}>
          Ir a caja <ArrowRight className="size-3" />
        </span>
      </div>
    </button>
  )
}

// ── CajeroDashboard (vista principal del cajero antes de iniciar venta) ────────

function CajeroDashboard({ card, cajaId, cajaFuerte }: { card: CardAuxiliar; cajaId: number; cajaFuerte: CardAuxiliar | undefined }) {
  const navigate  = useNavigate()
  const user      = useSessionStore(s => s.user)
  const sesionId  = card.sesionId ?? null

  const { data: resumen, isError: resumenError } = useResumenTurno(cajaId)
  const { data: movimientos } = useMovimientos(sesionId ?? 0)
  const cerrar = useCerrarAuxiliar(sesionId ?? 0)

  const saldo    = Number(card.saldoActual ?? 0)
  const ingresos = Number(card.ingresosSesion ?? 0)
  const egresos  = Number(card.egresosSesion ?? 0)
  const total    = resumen?.totalGeneral ?? 0

  const [showCierre,   setShowCierre]   = useState(false)
  const [showCustodia, setShowCustodia] = useState(false)
  const [arqueoInput,  setArqueoInput]  = useState('')
  const [obsInput,     setObsInput]     = useState('')

  const arqueo      = Number(arqueoInput.replace(/\./g, '').replace(/,/g, '')) || saldo
  const diferencia  = arqueo - saldo

  const handleCerrar = async () => {
    try {
      const cantidadArqueo = Math.round(arqueo)
      await cerrar.mutateAsync({
        totalArqueo: arqueo.toFixed(2),
        ...(obsInput.trim() ? { observaciones: obsInput.trim() } : {}),
        // RF-3.01: una denominación que cubre el total (desarrollo — producción usará desglose completo)
        denominaciones: cantidadArqueo > 0
          ? [{ denominacion: cantidadArqueo, tipo: 'billete' as const, cantidad: 1, valorTotal: cantidadArqueo }]
          : [{ denominacion: 1, tipo: 'moneda' as const, cantidad: 0, valorTotal: 0 }],
      })
      toast.success('Turno cerrado correctamente')
      setShowCierre(false)
    } catch {
      toast.error('No se pudo cerrar el turno')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header de caja */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{card.nombre}</h1>
            <p className="text-[11px] text-muted-foreground">{card.codigo} · {new Date().toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {card.alertas.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {card.alertas.length} alerta{card.alertas.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">Abierta</Badge>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => { setArqueoInput(''); setObsInput(''); setShowCierre(true) }}
          >
            <LogOut className="size-3" />
            Cerrar turno
          </Button>
        </div>
      </div>

      {/* Modal de cierre */}
      <Dialog open={showCierre} onOpenChange={setShowCierre}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Cerrar turno — {card.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 border px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Saldo esperado</span>
                <span className="font-semibold tabular-nums">{fmt(saldo)}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total arqueo físico (deja vacío = pago exacto)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={`Ej: ${saldo.toFixed(0)} (sin puntos)`}
                value={arqueoInput}
                onChange={e => setArqueoInput(e.target.value)}
                className="h-9"
              />
              {arqueoInput && Math.abs(diferencia) > 0 && (
                <p className={cn('text-xs font-medium', diferencia < 0 ? 'text-destructive' : 'text-amber-600')}>
                  {diferencia < 0 ? `Faltante: ${fmt(Math.abs(diferencia))}` : `Sobrante: ${fmt(diferencia)}`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones (opcional)</Label>
              <Input
                placeholder="Ej. todo cuadra"
                value={obsInput}
                onChange={e => setObsInput(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCierre(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCerrar}
              disabled={cerrar.isPending}
            >
              {cerrar.isPending ? 'Cerrando…' : 'Confirmar cierre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto">
        <div className="p-5 space-y-5 max-w-2xl mx-auto">

          {/* 4 stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              { label: 'Saldo actual',    value: saldo,    icon: DollarSign,  color: 'text-primary',     bg: 'bg-primary/5 border-primary/20' },
              { label: 'Ingresos turno',  value: ingresos, icon: TrendingUp,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' },
              { label: 'Egresos turno',   value: egresos,  icon: TrendingDown, color: 'text-orange-500',  bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' },
              { label: 'Total ventas',    value: total,    icon: Banknote,    color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' },
            ] as { label: string; value: number; icon: React.ElementType; color: string; bg: string }[]).map(c => (
              <div key={c.label} className={cn('rounded-xl border p-3 space-y-2', c.bg)}>
                <div className="flex items-center gap-1.5">
                  <c.icon className={cn('size-3.5 shrink-0', c.color)} />
                  <p className="text-[10px] font-medium text-muted-foreground leading-none uppercase tracking-wide">{c.label}</p>
                </div>
                <p className={cn('text-xl font-bold tabular-nums leading-none', c.color)}>{fmt(c.value)}</p>
              </div>
            ))}
          </div>

          {/* Alertas */}
          {card.alertas.length > 0 && (
            <div className="space-y-2">
              {card.alertas.map(a => (
                <div key={a} className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    {a === 'reposicion_caja'
                      ? 'Saldo por debajo del mínimo — solicita reposición al supervisor.'
                      : 'Límite de efectivo alcanzado — realiza una consignación.'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Resumen del turno */}
          {(resumen || resumenError) && (
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Resumen del turno
                </p>
              </div>
              {resumenError ? (
                <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                  No se pudo cargar el resumen
                </div>
              ) : resumen && (
                <>
                  <div className="divide-y">
                    {([
                      { label: 'Sellos',      data: resumen.sellos },
                      { label: 'Productos',   data: resumen.productos },
                      { label: 'Apartados',   data: resumen.apartados },
                      { label: 'Servicios',   data: resumen.servicios },
                      { label: 'Anulaciones', data: resumen.anulaciones },
                    ] as { label: string; data: { cantidad: number; total: number } }[]).map(({ label, data }) => (
                      <div key={label} className="flex items-center px-4 py-2.5 text-sm">
                        <span className="flex-1 text-muted-foreground">{label}</span>
                        {data.cantidad > 0 ? (
                          <>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 mr-3">{data.cantidad}</Badge>
                            <span className="tabular-nums font-semibold w-28 text-right">{fmt(data.total)}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/30 w-28 text-right">—</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t text-sm font-bold">
                    <span>Total general</span>
                    <span className="tabular-nums text-primary">{fmt(resumen.totalGeneral)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Últimos movimientos */}
          {!!movimientos && movimientos.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-2.5 bg-muted/40 border-b">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Últimos movimientos
                </p>
              </div>
              <div className="divide-y max-h-56 overflow-auto">
                {[...movimientos].reverse().slice(0, 15).map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="text-muted-foreground w-12 shrink-0 tabular-nums text-xs">
                      {new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex-1 truncate text-foreground/80">
                      {TIPO_MOV[m.tipo] ?? m.tipo}
                    </span>
                    <span className={cn(
                      'tabular-nums font-semibold shrink-0 text-xs',
                      Number(m.monto) < 0 ? 'text-red-500' : 'text-emerald-600',
                    )}>
                      {fmt(Math.abs(Number(m.monto)))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="pt-2 space-y-2">
            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={() => navigate(`/ventas/caja/${cajaId}`)}
            >
              <ShoppingCart className="size-5" />
              Nueva venta
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowCustodia(true)}
              disabled={!sesionId}
            >
              <ArrowLeftRight className="size-4" />
              Cambio de Custodia
            </Button>
          </div>

        </div>
      </div>

      {sesionId && (
        <CustodiaDialog
          open={showCustodia}
          onClose={() => setShowCustodia(false)}
          sesionId={sesionId}
          cajaFuerte={cajaFuerte}
          saldoActual={card.saldoActual}
        />
      )}
    </div>
  )
}

// ── AbrirTurnoDashboard (caja cerrada o sin sesión — cajero puede reabrir) ────

function AbrirTurnoDashboard({ card }: { card: CardAuxiliar }) {
  const abrir = useAbrirCajaDirecta(card.cajaId)

  const [baseInput, setBaseInput] = useState('')

  const handleAbrir = async () => {
    const base = Number(baseInput.replace(/\./g, '').replace(/,/g, ''))
    if (!base || base <= 0) {
      toast.error('Ingresa un monto de apertura válido')
      return
    }
    try {
      await abrir.mutateAsync({ baseAsignada: base.toFixed(2) })
      toast.success('Turno abierto')
    } catch {
      toast.error('No se pudo abrir el turno')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8 text-center">
      <div className="rounded-full bg-muted p-4">
        <Banknote className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{card.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          {card.estado === 'cerrada' ? 'Turno cerrado — abre uno nuevo para continuar.' : 'Caja disponible — ingresa el monto de apertura.'}
        </p>
      </div>
      <div className="w-full max-w-xs space-y-3">
        <div className="space-y-1.5 text-left">
          <Label className="text-xs">Monto de apertura (sin puntos)</Label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Ej: 350000"
            value={baseInput}
            onChange={e => setBaseInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAbrir()}
            className="h-10 text-center text-base tabular-nums"
          />
        </div>
        <Button
          className="w-full h-10 gap-2"
          onClick={handleAbrir}
          disabled={abrir.isPending || !baseInput}
        >
          {abrir.isPending ? 'Abriendo…' : 'Abrir turno'}
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function PuntoVentas() {
  const user       = useSessionStore(s => s.user)
  const sucursalId = user?.sucursal_id ?? null
  const esCajero   = user?.rol === 'CAJERO' || user?.rol === 'USUARIO_POST'

  // Polling rápido cuando el cajero no tiene caja abierta (espera apertura del supervisor)
  const [esperandoApertura, setEsperandoApertura] = useState(false)
  const intervalo = esCajero && esperandoApertura ? 5_000 : 30_000

  const { data, isLoading, isError, refetch, isFetching } = useStatusPunto(
    sucursalId ?? 0,
    intervalo,
  )

  const todasPosCajas = data?.cajas.filter(c => c.tipo === 'pos') ?? []
  const todasAbiertas = todasPosCajas.filter(c => c.estado === 'abierta')

  const cajasAbiertas = esCajero
    ? todasAbiertas.filter(c => c.cajeroId === Number(user?.id))
    : todasAbiertas

  // Caja cerrada/sin_sesión asignable al cajero (para poder reabrirla)
  const cajaParaAbrir = esCajero && cajasAbiertas.length === 0
    ? (todasPosCajas.find(c => c.cajeroId === Number(user?.id) && c.estado !== 'abierta') ??
       todasPosCajas.find(c => c.estado !== 'abierta'))
    : null

  // Activar polling rápido cuando el cajero no tiene caja abierta
  useEffect(() => {
    if (esCajero) setEsperandoApertura(cajasAbiertas.length === 0)
  }, [esCajero, cajasAbiertas.length])

  // Para CAJERO con una sola caja: mostrar el dashboard (sin auto-redirect)
  if (esCajero && cajasAbiertas.length === 1) {
    const card = cajasAbiertas[0]!
    const cajaFuerte = data?.cajas.find(c => c.tipo === 'general')
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ShoppingCart className="size-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">Punto de Ventas</h1>
              <p className="text-[11px] text-muted-foreground truncate">{user?.nombre ?? '—'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          </Button>
        </header>
        <CajeroDashboard card={card} cajaId={card.cajaId} cajaFuerte={cajaFuerte} />
      </div>
    )
  }

  // Para CAJERO con caja cerrada: mostrar pantalla de apertura
  if (esCajero && cajaParaAbrir) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex items-center justify-between gap-4 px-5 py-3 border-b bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <ShoppingCart className="size-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold truncate">Punto de Ventas</h1>
              <p className="text-[11px] text-muted-foreground truncate">{user?.nombre ?? '—'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          </Button>
        </header>
        <AbrirTurnoDashboard card={cajaParaAbrir} />
      </div>
    )
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ──
  if (isError || (sucursalId !== null && !data)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <AlertTriangle className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">No se pudo cargar las cajas disponibles</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // ── Sin sucursal asignada ──
  if (sucursalId === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-3 text-center">
          <AlertTriangle className="mx-auto size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">Tu usuario no tiene una sucursal asignada</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-5 py-3 border-b bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <ShoppingCart className="size-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">Punto de Ventas</h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {user?.nombre ?? '—'} · {new Date().toLocaleString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cajasAbiertas.length > 0 && (
            <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
              {cajasAbiertas.length} abierta{cajasAbiertas.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('size-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </header>

      {/* Grid de cajas */}
      <div className="flex-1 overflow-auto p-5">
        {cajasAbiertas.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {cajasAbiertas.map(c => (
              <CajaCard key={c.cajaId} card={c} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-sm text-muted-foreground space-y-2">
            <AlertTriangle className="mx-auto size-8 text-muted-foreground/30" />
            <p>
              {esCajero
                ? 'Tu caja no tiene una sesión activa. Contacta al supervisor para que abra tu turno.'
                : 'No hay cajas con sesión activa en este momento.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
