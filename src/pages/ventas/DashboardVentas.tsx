import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAbrirCajaDirecta, useHistorialSesiones, useStatusPunto } from '@/queries/cajas.queries'
import { useAlertasStock, useStock } from '@/queries/inventario.queries'
import { useResumenTurno, useVentasDia } from '@/queries/ventas.queries'
import { useSessionStore } from '@/stores/useSessionStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const fmt = (v: number) => COP.format(v)

const MEDIO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  cheque:          'Cheque',
  tarjeta_debito:  'Débito',
  tarjeta_credito: 'Crédito',
  transferencia:   'Transferencia',
  consignacion:    'Consignación',
  preporteado:     'Preporteado',
  mixto_preporteado: 'Mixto',
}

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e']

// ── AbrirSesionDialog ─────────────────────────────────────────────────────────

function AbrirSesionDialog({
  open,
  cajaId,
  cajaNombre,
  onClose,
  onExito,
}: {
  open:      boolean
  cajaId:    number
  cajaNombre: string
  onClose:   () => void
  onExito:   () => void
}) {
  const [base, setBase] = useState('')
  const abrir = useAbrirCajaDirecta(cajaId)

  const handleAbrir = async () => {
    const monto = Number(base.replace(/\D/g, ''))
    if (!monto || monto < 0) {
      toast.error('Ingresa un monto base válido')
      return
    }
    try {
      await abrir.mutateAsync({ baseAsignada: String(monto) })
      toast.success('Sesión abierta')
      setBase('')
      onExito()
    } catch {
      toast.error('No se pudo abrir la sesión')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-[380px]">
        <DialogHeader>
          <DialogTitle>Abrir sesión — {cajaNombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Monto base asignado</Label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAbrir} disabled={abrir.isPending}>
            {abrir.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Abrir sesión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
}: {
  label:   string
  value:   string
  sub:     string
  icon:    React.ElementType
  accent:  'emerald' | 'blue' | 'violet' | 'amber' | 'red' | 'neutral'
  loading: boolean
}) {
  const colorMap = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue:    'text-blue-600   dark:text-blue-400',
    violet:  'text-violet-600 dark:text-violet-400',
    amber:   'text-amber-600  dark:text-amber-400',
    red:     'text-red-600    dark:text-red-400',
    neutral: 'text-muted-foreground',
  }
  const iconBg = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40',
    blue:    'bg-blue-100    dark:bg-blue-900/40',
    violet:  'bg-violet-100  dark:bg-violet-900/40',
    amber:   'bg-amber-100   dark:bg-amber-900/40',
    red:     'bg-red-100     dark:bg-red-900/40',
    neutral: 'bg-muted',
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{label}</p>
          <div className={cn('rounded-lg p-1.5 shrink-0', iconBg[accent])}>
            <Icon className={cn('size-3.5', colorMap[accent])} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24 mb-1" />
        ) : (
          <p className={cn('text-xl font-bold tabular-nums leading-none mb-1', colorMap[accent])}>{value}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

// ── CustomTooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-[11px] shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground">
          <span className="font-semibold text-foreground">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

// ── DashboardVentas ───────────────────────────────────────────────────────────

export default function DashboardVentas() {
  const navigate    = useNavigate()
  const user        = useSessionStore((s) => s.user)
  const sucursalId  = user?.sucursal_id ?? 0

  const [abrirOpen, setAbrirOpen] = useState(false)

  // ── Server state ────────────────────────────────────────────────────────────
  const { data: statusPunto, isLoading: loadingStatus } = useStatusPunto(sucursalId)
  const { data: ventas = [],  isLoading: loadingVentas } = useVentasDia(sucursalId)
  const { data: alertasStock = [] }                       = useAlertasStock()
  const { data: stockData }                               = useStock(sucursalId, { soloConStock: false, limite: 100 }, sucursalId > 0)

  // ── Caja del cajero ─────────────────────────────────────────────────────────
  const miCaja     = statusPunto?.cajas.find((c) => c.cajeroId === Number(user?.id))
  const cajaId     = miCaja?.cajaId ?? 0
  const sesionActiva = miCaja?.estado === 'abierta'

  const { data: resumen, isLoading: loadingResumen } = useResumenTurno(cajaId)
  const { data: historialSesiones = [] }              = useHistorialSesiones(cajaId)

  // ── KPI metrics ─────────────────────────────────────────────────────────────
  const misSesionId  = miCaja?.sesionId
  const misVentas    = ventas.filter((v) => v.sesionCajaId === misSesionId)
  const totalMiTurno = resumen?.totalGeneral ?? 0
  const txCount      = misVentas.length
  const ticketProm   = txCount > 0 ? Math.round(totalMiTurno / txCount) : 0
  const saldoCaja    = Number(miCaja?.saldoActual ?? 0)

  const alerta = alertasStock.find((a) => a.sucursalId === sucursalId)
  const totalAlertasStock = (alerta?.bajo ?? 0) + (alerta?.critico ?? 0)

  // ── Gráfico: ventas por hora ─────────────────────────────────────────────────
  const ventasPorHora = useMemo(() => {
    const horas = Array.from({ length: 14 }, (_, i) => ({
      hora:     `${(i + 6).toString().padStart(2, '0')}h`,
      total:    0,
      cantidad: 0,
    }))
    for (const v of ventas) {
      const h   = new Date(v.createdAt).getHours()
      const idx = h - 6
      if (idx >= 0 && idx < horas.length) {
        horas[idx].total    += v.total
        horas[idx].cantidad += 1
      }
    }
    return horas
  }, [ventas])

  // ── Gráfico: distribución por categoría ─────────────────────────────────────
  const distribucion = useMemo(() => {
    if (!resumen) return []
    return [
      { name: 'Sellos',     value: resumen.sellos.total,     color: PIE_COLORS[0] },
      { name: 'Productos',  value: resumen.productos.total,  color: PIE_COLORS[1] },
      { name: 'Servicios',  value: resumen.servicios.total,  color: PIE_COLORS[2] },
      { name: 'Apartados',  value: resumen.apartados.total,  color: PIE_COLORS[3] },
    ].filter((d) => d.value > 0)
  }, [resumen])

  // ── Gráfico: medios de pago ──────────────────────────────────────────────────
  const mediosPago = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const v of ventas) {
      acc[v.medioPago] = (acc[v.medioPago] ?? 0) + v.total
    }
    return Object.entries(acc)
      .map(([medio, total]) => ({ medio: MEDIO_LABEL[medio] ?? medio, total }))
      .sort((a, b) => b.total - a.total)
  }, [ventas])

  // ── Stock con problemas ──────────────────────────────────────────────────────
  const stockProblemas = useMemo(
    () => (stockData?.datos ?? []).filter((s) => s.estado !== 'ok').slice(0, 6),
    [stockData],
  )

  // ── Últimas ventas (sucursal) ────────────────────────────────────────────────
  const ultimasVentas = useMemo(
    () => [...ventas].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6),
    [ventas],
  )

  // ── Guards para charts ───────────────────────────────────────────────────────
  // Mostrar chart solo si está cargando (skeleton) O tiene datos reales
  const hayVentasHoy    = ventas.length > 0
  const hayDistribucion = distribucion.length > 0
  const hayMediosPago   = mediosPago.length > 0
  const showBarChart    = loadingVentas  || hayVentasHoy
  const showPieChart    = loadingResumen || hayDistribucion

  const horaActual = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <div className="max-w-[1400px] mx-auto px-5 py-5 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">Punto de Ventas</h1>
            <p className="text-sm text-muted-foreground">
              {user?.nombre} ·{' '}
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' '}· {horaActual}
            </p>
          </div>
          {loadingStatus ? (
            <Skeleton className="h-9 w-32" />
          ) : sesionActiva ? (
            <Button onClick={() => navigate(`/ventas/caja/${cajaId}`)} className="gap-2 shrink-0">
              <ShoppingCart className="size-4" />
              Ir a vender
            </Button>
          ) : miCaja ? (
            <Button variant="outline" onClick={() => setAbrirOpen(true)} className="gap-2 shrink-0">
              <Zap className="size-4" />
              Abrir sesión
            </Button>
          ) : null}
        </div>

        {/* ── Estado de caja ──────────────────────────────────────────────────── */}
        {loadingStatus ? (
          <Skeleton className="h-14 rounded-xl" />
        ) : miCaja ? (
          <div
            className={cn(
              'flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors',
              sesionActiva
                ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                : 'bg-muted/40 border-border',
            )}
          >
            <div
              className={cn(
                'size-2.5 rounded-full shrink-0',
                sesionActiva ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30',
              )}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {miCaja.nombre}
                <span className="text-muted-foreground font-normal ml-1">({miCaja.codigo})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {sesionActiva ? 'Sesión activa' : 'Sin sesión activa — abre tu caja para comenzar'}
              </p>
            </div>
            {sesionActiva && (
              <>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo</p>
                  <p className="text-sm font-bold tabular-nums">{fmt(saldoCaja)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ingresos</p>
                  <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {fmt(Number(miCaja.ingresosSesion))}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Giros</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {miCaja.girosCount}
                    <span className="text-[10px] text-muted-foreground ml-1">({fmt(Number(miCaja.girosValor))})</span>
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
            <Store className="size-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              No tienes una caja asignada. Contacta al supervisor para que te asigne una.
            </p>
          </div>
        )}

        {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Mi turno"
            value={fmt(totalMiTurno)}
            sub={`${txCount} transaccion${txCount !== 1 ? 'es' : ''}`}
            icon={TrendingUp}
            accent={totalMiTurno > 0 ? 'emerald' : 'neutral'}
            loading={loadingResumen}
          />
          <KpiCard
            label="Ticket promedio"
            value={ticketProm > 0 ? fmt(ticketProm) : '—'}
            sub={txCount > 0 ? 'por venta' : 'Sin ventas aún'}
            icon={Banknote}
            accent={ticketProm > 0 ? 'blue' : 'neutral'}
            loading={loadingResumen}
          />
          <KpiCard
            label="Saldo en caja"
            value={sesionActiva ? fmt(saldoCaja) : '—'}
            sub={sesionActiva ? 'Sesión activa' : 'Sin sesión'}
            icon={Store}
            accent={sesionActiva ? 'violet' : 'neutral'}
            loading={loadingStatus}
          />
          <KpiCard
            label="Alertas stock"
            value={String(totalAlertasStock)}
            sub={totalAlertasStock > 0 ? `${alerta?.critico ?? 0} crítico · ${alerta?.bajo ?? 0} bajo` : 'Niveles normales'}
            icon={AlertTriangle}
            accent={alerta?.critico ? 'red' : totalAlertasStock > 0 ? 'amber' : 'neutral'}
            loading={false}
          />
        </div>

        {/* ── Charts: solo renderizar si hay datos o están cargando ──────────── */}
        {(showBarChart || showPieChart) && (
          <div
            className={cn(
              'grid gap-4',
              showBarChart && showPieChart
                ? 'grid-cols-1 lg:grid-cols-3'
                : 'grid-cols-1',
            )}
          >
            {/* Evolución por hora — ocultar si no hay ventas (post-carga) */}
            {showBarChart && (
              <Card className={cn(showPieChart ? 'lg:col-span-2' : '')}>
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Evolución de ventas — hoy</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Recaudo total por hora (sucursal)</p>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  {loadingVentas ? (
                    <Skeleton className="h-[200px] mx-3 rounded" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={ventasPorHora} margin={{ left: -4, right: 8, top: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="hora"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) =>
                            v >= 1_000_000
                              ? `${(v / 1_000_000).toFixed(1)}M`
                              : v >= 1000
                              ? `${(v / 1000).toFixed(0)}k`
                              : String(v)
                          }
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Distribución por categoría — ocultar si el turno no tiene datos (post-carga) */}
            {showPieChart && (
              <Card>
                <CardHeader className="pb-1 pt-4 px-5">
                  <CardTitle className="text-sm font-semibold">Por categoría</CardTitle>
                  <p className="text-[11px] text-muted-foreground">Composición de mi turno</p>
                </CardHeader>
                <CardContent className="px-2 pb-4">
                  {loadingResumen ? (
                    <Skeleton className="h-[200px] mx-3 rounded" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={distribucion}
                          cx="50%"
                          cy="45%"
                          innerRadius={48}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {distribucion.map((d) => (
                            <Cell key={d.name} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [fmt(v), '']}
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--card))',
                          }}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={7}
                          wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── Medios de pago — solo si hay ventas registradas ──────────────────── */}
        {hayMediosPago && (
          <Card>
            <CardHeader className="pb-1 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Medios de pago — hoy</CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Distribución de ventas por forma de pago (sucursal)
              </p>
            </CardHeader>
            <CardContent className="px-2 pb-4">
              <ResponsiveContainer width="100%" height={Math.max(72, mediosPago.length * 32)}>
                <BarChart
                  data={mediosPago}
                  layout="vertical"
                  margin={{ left: 64, right: 16, top: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1000
                        ? `${(v / 1000).toFixed(0)}k`
                        : String(v)
                    }
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="medio"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ── Bottom row: Stock + Últimas ventas ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">

          {/* Stock crítico */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Stock de productos</CardTitle>
                <p className="text-[11px] text-muted-foreground">Ítems con nivel bajo o crítico</p>
              </div>
              {totalAlertasStock > 0 && (
                <Badge variant="destructive" className="text-[10px] shrink-0">
                  {totalAlertasStock} alertas
                </Badge>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {stockProblemas.length === 0 ? (
                <div className="flex items-center gap-2.5 py-5 text-sm text-muted-foreground justify-center">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  Todos los productos tienen nivel normal
                </div>
              ) : (
                <div className="space-y-1.5">
                  {stockProblemas.map((item) => (
                    <div
                      key={item.productoId}
                      className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
                    >
                      <div
                        className={cn(
                          'size-2 rounded-full shrink-0',
                          item.estado === 'critico' ? 'bg-red-500' : 'bg-amber-400',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.productoNombre}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{item.productoCodigo}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={cn(
                            'text-xs font-bold tabular-nums',
                            item.estado === 'critico' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400',
                          )}
                        >
                          {item.stockActual}
                        </p>
                        <p className="text-[10px] text-muted-foreground">/ {item.stockMinimo} mín</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] h-4 px-1.5 shrink-0',
                          item.estado === 'critico'
                            ? 'border-red-300 text-red-600'
                            : 'border-amber-300 text-amber-600',
                        )}
                      >
                        {item.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas ventas de la sucursal */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Últimas ventas — sucursal</CardTitle>
              <p className="text-[11px] text-muted-foreground">Transacciones más recientes del día</p>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              {loadingVentas ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 rounded" />
                  ))}
                </div>
              ) : ultimasVentas.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                  <ShoppingCart className="size-8 opacity-20" />
                  <p className="text-xs">Sin ventas registradas hoy</p>
                </div>
              ) : (
                <ScrollArea className="h-[220px]">
                  <div className="space-y-1.5 pr-1">
                    {ultimasVentas.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2"
                      >
                        <Clock className="size-3 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {new Date(v.createdAt).toLocaleTimeString('es-CO', {
                            hour:   '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-muted-foreground truncate">
                            {v.detalle
                              .slice(0, 2)
                              .map((d) => d.nombreProducto)
                              .join(', ')}
                            {v.detalle.length > 2 ? ` +${v.detalle.length - 2}` : ''}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 shrink-0">
                          {MEDIO_LABEL[v.medioPago] ?? v.medioPago}
                        </Badge>
                        <span className="text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400 shrink-0">
                          {fmt(v.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Historial de sesiones ────────────────────────────────────────────── */}
        {historialSesiones.length > 0 && (
          <Card className="pb-4">
            <CardHeader className="pb-2 pt-4 px-5 flex-row items-center gap-2">
              <History className="size-3.5 text-muted-foreground shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">Historial de sesiones</CardTitle>
                <p className="text-[11px] text-muted-foreground">Últimas sesiones de tu caja auxiliar</p>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-0">
              <div className="rounded-lg border overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/40 px-3 py-2 border-b gap-x-4">
                  <span>Apertura</span>
                  <span>Cierre</span>
                  <span className="text-right">Base</span>
                  <span className="text-right">Cierre</span>
                  <span className="text-right">Estado</span>
                </div>
                <div className="divide-y">
                  {[...historialSesiones]
                    .sort((a, b) => new Date(b.fechaApertura).getTime() - new Date(a.fechaApertura).getTime())
                    .slice(0, 8)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center px-3 py-2 text-xs gap-x-4 hover:bg-muted/20 transition-colors"
                      >
                        <span className="tabular-nums text-muted-foreground">
                          {new Date(s.fechaApertura).toLocaleString('es-CO', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {s.fechaCierre
                            ? new Date(s.fechaCierre).toLocaleString('es-CO', {
                                day: '2-digit', month: '2-digit', year: '2-digit',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : <span className="text-emerald-600 font-medium">Activa</span>}
                        </span>
                        <span className="tabular-nums font-medium text-right">
                          {fmt(Number(s.montoApertura))}
                        </span>
                        <span className="tabular-nums text-right">
                          {s.montoCierre
                            ? <span className="font-semibold">{fmt(Number(s.montoCierre))}</span>
                            : <span className="text-muted-foreground/40">—</span>}
                        </span>
                        <span className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] h-4 px-1.5',
                              s.estado === 'abierta'  && 'border-emerald-300 text-emerald-700 dark:text-emerald-400',
                              s.estado === 'cerrada'  && 'border-border text-muted-foreground',
                              s.estado === 'forzada'  && 'border-amber-300 text-amber-700 dark:text-amber-400',
                            )}
                          >
                            {s.estado === 'abierta' ? 'abierta' : s.estado === 'forzada' ? 'forzada' : 'cerrada'}
                          </Badge>
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Abrir sesión dialog */}
      {miCaja && (
        <AbrirSesionDialog
          open={abrirOpen}
          cajaId={miCaja.cajaId}
          cajaNombre={miCaja.nombre}
          onClose={() => setAbrirOpen(false)}
          onExito={() => {
            setAbrirOpen(false)
            navigate(`/ventas/caja/${miCaja.cajaId}`)
          }}
        />
      )}
    </div>
  )
}
