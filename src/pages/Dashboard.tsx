import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MapPin, Store, ReceiptText, Monitor, Package, Truck,
  BarChart2, Vault, ShoppingCart, Users, ShieldCheck,
  ToggleLeft, ScrollText, UserRound, ArrowRight, MailOpen,
  AlertTriangle, TrendingUp, TrendingDown, RefreshCw, XCircle,
  Clock, ClipboardList, MailWarning, BellRing, ChevronDown, ChevronUp,
  Box, PackageX,
} from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { type User, useSessionStore } from '@/stores/useSessionStore'
import { useStatusPunto, useDiferenciasPendientes, useAlertasCierreAutomatico, esCajaOperativa, type CardAuxiliar, type DiferenciaPendiente, type TipoAlerta } from '@/queries/cajas.queries'
import { useResumenesPunto, useAlertasApartados, useAnulacionesPendientes, useVentasDia } from '@/queries/ventas.queries'
import { useAlertasStock, useOrdenesPendientes } from '@/queries/inventario.queries'
import { useCajasPrincipalesTesoreria, useMovimientosTesoreria } from '@/queries/tesoreria.queries'

const ROL_LABELS: Record<string, string> = {
  CAJERO:              'Cajero',
  ADMINISTRATIVO:      'Administrativo',
  TESORERIA:           'Tesorería',
  INVENTARIOS:         'Inventarios',
  SUPERVISOR_REGIONAL: 'Supervisor Regional',
  ADMIN_NACIONAL:      'Admin Nacional',
  ADMIN_SISTEMA:       'Admin Sistema',
}

// ── Quick-link card ───────────────────────────────────────────────────────────

function QuickCard({ to, icon: Icon, title, description }: {
  to:          string
  icon:        React.ElementType
  title:       string
  description: string
}) {
  return (
    <Link
      to={to}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-all duration-150 group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-primary/40">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <Icon className="size-4 text-primary" />
            <ArrowRight className="size-3.5 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold leading-tight">{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  )
}

// ── Header compartido ─────────────────────────────────────────────────────────

function Header({ user, subtitle }: { user: User; subtitle: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-0.5">
        <h1 className="text-lg font-bold">Panel 4-72</h1>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {ROL_LABELS[user.rol] ?? user.rol}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Bienvenido, <span className="font-medium text-foreground">{user.nombre}</span>
        {subtitle && <> · {subtitle}</>}
      </p>
    </div>
  )
}

// ── Dashboards por rol ────────────────────────────────────────────────────────

function AdminSistema({ user }: { user: User }) {
  return (
    <div className="p-6 max-w-4xl">
      <Header user={user} subtitle="Control total del sistema" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <QuickCard to="/admin/users"         icon={Users}       title="Usuarios"        description="Gestionar cuentas y roles" />
        <QuickCard to="/admin/regionales"    icon={MapPin}      title="Regionales"      description="Administrar regionales" />
        <QuickCard to="/admin/branches"      icon={Store}       title="Sucursales"      description="Ver y editar sucursales" />
        <QuickCard to="/admin/puntos-venta"  icon={ReceiptText} title="Cajas auxiliares" description="Configurar cajas auxiliares" />
        <QuickCard to="/cajas/consolidado"   icon={TrendingUp}  title="Consolidado"     description="Recaudado nacional por medio de pago" />
        <QuickCard to="/admin/devices"       icon={Monitor}     title="Equipos"         description="Equipos autorizados" />
        <QuickCard to="/admin/productos"     icon={Package}     title="Productos"       description="Catálogo de productos" />
        <QuickCard to="/admin/servicios"     icon={Truck}       title="Servicios"       description="Servicios postales" />
        <QuickCard to="/admin/apartados"     icon={MailOpen}    title="Apartados"       description="Apartados postales" />
        <QuickCard to="/admin/permisos"      icon={ShieldCheck} title="Permisos"        description="Roles y permisos" />
        <QuickCard to="/admin/feature-flags" icon={ToggleLeft}  title="Feature Flags"   description="Activar módulos" />
        <QuickCard to="/admin/audit"         icon={ScrollText}  title="Auditoría"       description="Historial de acciones" />
        <QuickCard to="/reportes"            icon={BarChart2}   title="Reportes"        description="Reportes del sistema" />
      </div>
    </div>
  )
}

function AdminNacional({ user }: { user: User }) {
  return (
    <div className="p-6 max-w-3xl">
      <Header user={user} subtitle="Gestión nacional de sucursales y catálogo" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickCard to="/admin/regionales"   icon={MapPin}        title="Regionales"        description="Ver y administrar regionales" />
        <QuickCard to="/admin/branches"     icon={Store}         title="Sucursales"        description="Sucursales del país" />
        <QuickCard to="/admin/puntos-venta" icon={ReceiptText}   title="Cajas auxiliares"  description="Cajas auxiliares por sucursal" />
        <QuickCard to="/admin/devices"      icon={Monitor}       title="Equipos"           description="Equipos autorizados" />
        <QuickCard to="/admin/productos"    icon={Package}       title="Productos"         description="Administrar catálogo" />
        <QuickCard to="/admin/servicios"    icon={Truck}         title="Servicios"         description="Servicios postales" />
        <QuickCard to="/admin/apartados"    icon={MailOpen}      title="Apartados"         description="Apartados postales" />
        <QuickCard to="/reportes"           icon={BarChart2}     title="Reportes"          description="Reportes nacionales" />
        <QuickCard to="/cajas"              icon={AlertTriangle} title="Diferencias"       description="Revisar diferencias de cierre por sucursal" />
        <QuickCard to="/ventas"             icon={XCircle}       title="Anulaciones"       description="Ver anulaciones de ventas por punto" />
      </div>
    </div>
  )
}

// ── Helpers de formato ────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string | null | undefined) => v ? COP.format(Number(v)) : '$0'

function dotCls(card: CardAuxiliar) {
  if (card.estado === 'sin_sesion') return 'bg-zinc-400'
  if (card.estado === 'cerrada')    return 'bg-zinc-300'
  if (card.estado === 'abierta' && esCajaOperativa(card.tipo) && card.cajeroId === null) return 'bg-amber-400'
  if (card.alertas.includes('limite_efectivo_caja')) return 'bg-red-500 animate-pulse'
  if (card.alertas.includes('reposicion_caja'))      return 'bg-amber-500 animate-pulse'
  return 'bg-emerald-500'
}

const TIPO_LABEL: Record<string, string> = { pos: 'POS', general: 'Caja Fuerte', menor: 'Menor', pagos: 'Pagos' }

function CajaRow({ caja: c, primera, interno }: { caja: CardAuxiliar; primera: boolean; interno?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 text-sm', !primera && 'border-t')}>
      <span className={cn('size-2 rounded-full shrink-0', dotCls(c))} />
      <span className="font-medium flex-1 truncate">{c.nombre}</span>
      <span className="text-[11px] text-muted-foreground">{TIPO_LABEL[c.tipo] ?? c.tipo}</span>
      {c.estado === 'abierta' && (
        <span className="tabular-nums font-semibold text-right w-28 text-foreground">{fmt(c.saldoActual)}</span>
      )}
      {c.estado === 'abierta' && (c.ingresosSesion !== '0' || c.egresosSesion !== '0') && (
        <span className="flex items-center gap-2 text-[11px] text-muted-foreground w-36 justify-end">
          <span className="flex items-center gap-0.5 text-emerald-600">
            <TrendingUp className="size-3" />{fmt(c.ingresosSesion)}
          </span>
          <span className="flex items-center gap-0.5 text-red-500">
            <TrendingDown className="size-3" />{fmt(c.egresosSesion)}
          </span>
        </span>
      )}
      {c.estado === 'sin_sesion' && (
        <Badge variant="outline" className="text-[10px] shrink-0">
          {interno ? 'Sin sesión' : 'Disponible'}
        </Badge>
      )}
      {c.estado === 'cerrada' && (
        <Badge variant="secondary" className="text-[10px] shrink-0">Cerrada</Badge>
      )}
      {c.alertas.length > 0 && (
        <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
      )}
    </div>
  )
}

// ── Dashboard Supervisor ──────────────────────────────────────────────────────

function Supervisor({ user }: { user: User }) {
  const sucursalId = user.sucursal_id ?? 0
  const { data, isLoading, refetch, isFetching } = useStatusPunto(sucursalId)
  const { data: diferencias = [], isLoading: loadingDif } = useDiferenciasPendientes(sucursalId)
  const { data: alertasApartados }   = useAlertasApartados(sucursalId)
  const { data: anulacionesPend = [] } = useAnulacionesPendientes(sucursalId)
  const { data: cierreAuto = [] }    = useAlertasCierreAutomatico(sucursalId)
  const { data: stockAlertas = [] }  = useAlertasStock()

  const stockSucursal = stockAlertas.filter(s => s.sucursalId === sucursalId)
  const totalStockBajo    = stockSucursal.reduce((n, s) => n + s.bajo, 0)
  const totalStockCritico = stockSucursal.reduce((n, s) => n + s.critico, 0)

  const cajas        = data?.cajas ?? []
  // Solo cuentan las cajas que atienden público. La Caja Fuerte y la Menor son
  // bolsillos de la caja principal: no abren turno, así que se reportan aparte.
  const cajaFuerte   = cajas.find(c => c.tipo === 'general')
  const cajasVenta   = cajas.filter(c => esCajaOperativa(c.tipo))
  const fondos       = cajas.filter(c => !esCajaOperativa(c.tipo))
  const abiertas     = cajasVenta.filter(c => c.estado === 'abierta' && c.cajeroId !== null).length
  const disponibles  = cajasVenta.filter(c => c.estado === 'sin_sesion').length
  const sinCajero    = cajasVenta.filter(c => c.estado === 'abierta' && c.cajeroId === null).length
  const totalAlertas = cajas.reduce((n, c) => n + c.alertas.length, 0)
  const panel        = data?.panel

  const posIds        = cajasVenta.map(c => c.cajaId)
  const resumenes     = useResumenesPunto(posIds)
  const totalAnulaciones = resumenes.reduce((s, r) => s + (r.data?.anulaciones.cantidad ?? 0), 0)
  const montoAnulaciones = resumenes.reduce((s, r) => s + (r.data?.anulaciones.total ?? 0), 0)

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-lg font-bold">Panel 4-72</h1>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Supervisor Regional</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Bienvenido, <span className="font-medium text-foreground">{user.nombre}</span>
          </p>
        </div>
        <Button
          variant="ghost" size="icon" className="size-8 mt-0.5 shrink-0"
          onClick={() => refetch()} disabled={isFetching}
          title="Actualizar"
        >
          <RefreshCw className={cn('size-4', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-primary/20">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total en punto</p>
              <p className="text-xl font-bold tabular-nums leading-none">{fmt(panel?.cajaGeneral)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Base asignada: {fmt(panel?.baseGeneral)}</p>
            </CardContent>
          </Card>
          <Card className={abiertas > 0 ? 'border-emerald-300' : 'border-border'}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cajas en atención</p>
              <p className={cn('text-xl font-bold leading-none', abiertas > 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                {abiertas} <span className="text-sm font-normal text-muted-foreground">/ {cajasVenta.length}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {disponibles} disponible{disponibles !== 1 ? 's' : ''}
                {sinCajero > 0 && <> · {sinCajero} sin cajero</>}
              </p>
              {cajaFuerte && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Caja Fuerte:{' '}
                  <span className={cn('font-medium', cajaFuerte.estado === 'abierta' ? 'text-emerald-600' : 'text-foreground')}>
                    {cajaFuerte.estado === 'abierta' ? 'abierta' : 'cerrada'}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
          <Card className={totalAlertas > 0 ? 'border-red-300' : 'border-border'}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Alertas activas</p>
              <p className={cn('text-xl font-bold leading-none', totalAlertas > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                {totalAlertas}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {totalAlertas === 0 ? 'Sin alertas' : 'Requieren atención'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Estado de cajas */}
      {!isLoading && cajasVenta.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cajas de venta y servicios</p>
          <div className="rounded-xl border overflow-hidden">
            {cajasVenta.map((c, i) => (
              <CajaRow key={c.cajaId} caja={c} primera={i === 0} />
            ))}
          </div>
        </div>
      )}

      {!isLoading && fondos.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Fondos de la caja principal
          </p>
          <div className="rounded-xl border border-dashed overflow-hidden">
            {fondos.map((c, i) => (
              <CajaRow key={c.cajaId} caja={c} primera={i === 0} interno />
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            La Caja Fuerte y la Caja Menor no atienden ventas: son custodia del punto.
          </p>
        </div>
      )}

      {/* Diferencias pendientes + Anulaciones del día */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Diferencias pendientes */}
          <Card className={diferencias.length > 0 ? 'border-amber-300' : 'border-border'}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertTriangle className={cn('size-4', diferencias.length > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
                  Diferencias pendientes
                </CardTitle>
                {diferencias.length > 0 && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 text-[10px]">
                    {diferencias.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingDif ? (
                <div className="space-y-1.5">
                  {[0,1].map(i => <Skeleton key={i} className="h-7 w-full rounded" />)}
                </div>
              ) : diferencias.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Sin diferencias pendientes</p>
              ) : (
                <div className="space-y-2">
                  {diferencias.slice(0, 4).map((d: DiferenciaPendiente) => (
                    <div key={d.id} className="flex items-center justify-between text-[11px]">
                      <span className="font-medium truncate text-foreground">{d.cajaNombre}</span>
                      <span className={cn('font-semibold tabular-nums shrink-0 ml-2', d.tipoDiferencia === 'faltante' ? 'text-red-600' : 'text-amber-600')}>
                        {d.tipoDiferencia === 'faltante' ? `−${fmt(d.monto)}` : `+${fmt(d.monto)}`}
                      </span>
                    </div>
                  ))}
                  {diferencias.length > 4 && (
                    <p className="text-[10px] text-muted-foreground">y {diferencias.length - 4} más…</p>
                  )}
                  <Link to={`/cajas/cierre/${sucursalId}`}>
                    <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                      Resolver diferencias
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anulaciones del día */}
          <Card className={totalAnulaciones > 0 ? 'border-red-200' : 'border-border'}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <XCircle className={cn('size-4', totalAnulaciones > 0 ? 'text-red-500' : 'text-muted-foreground')} />
                  Anulaciones del día
                </CardTitle>
                {totalAnulaciones > 0 && (
                  <Badge variant="destructive" className="text-[9px] px-1.5 h-4">
                    {totalAnulaciones}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {totalAnulaciones === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Sin anulaciones hoy</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Total monto:</span>
                    <span className="font-semibold text-red-600 tabular-nums">{fmt(String(montoAnulaciones))}</span>
                  </div>
                  <Separator />
                  {posIds.map((id, idx) => {
                    const r = resumenes[idx]
                    if (!r.data || r.data.anulaciones.cantidad === 0) return null
                    const c = cajas.find(ca => ca.cajaId === id)
                    return (
                      <div key={id} className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground truncate">{c?.nombre ?? `Caja ${id}`}</span>
                        <span className="font-medium text-red-600 tabular-nums shrink-0 ml-1">
                          {r.data.anulaciones.cantidad} × {fmt(String(r.data.anulaciones.total))}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Alertas adicionales */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Inventario bajo */}
          <Card className={(totalStockBajo + totalStockCritico) > 0 ? 'border-orange-300' : 'border-border'}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Package className={cn('size-4', (totalStockBajo + totalStockCritico) > 0 ? 'text-orange-500' : 'text-muted-foreground')} />
                  Stock bajo
                </CardTitle>
                {(totalStockBajo + totalStockCritico) > 0 && (
                  <Badge variant="outline" className="text-orange-700 border-orange-300 text-[10px]">
                    {totalStockBajo + totalStockCritico}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {(totalStockBajo + totalStockCritico) === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Stock en niveles normales</p>
              ) : (
                <div className="space-y-1">
                  {totalStockCritico > 0 && (
                    <p className="text-[11px] text-red-600 font-medium">{totalStockCritico} producto{totalStockCritico !== 1 ? 's' : ''} sin stock</p>
                  )}
                  {totalStockBajo > 0 && (
                    <p className="text-[11px] text-orange-600">{totalStockBajo} producto{totalStockBajo !== 1 ? 's' : ''} bajo mínimo</p>
                  )}
                  <Link to="/inventario">
                    <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1 border-orange-300 text-orange-700 hover:bg-orange-50">
                      Ver inventario
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Apartados alertas */}
          <Card className={((alertasApartados?.proximos.length ?? 0) + (alertasApartados?.vencidos.length ?? 0)) > 0 ? 'border-yellow-300' : 'border-border'}>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <MailWarning className={cn('size-4', ((alertasApartados?.proximos.length ?? 0) + (alertasApartados?.vencidos.length ?? 0)) > 0 ? 'text-yellow-600' : 'text-muted-foreground')} />
                  Apartados
                </CardTitle>
                {((alertasApartados?.proximos.length ?? 0) + (alertasApartados?.vencidos.length ?? 0)) > 0 && (
                  <Badge variant="outline" className="text-yellow-700 border-yellow-300 text-[10px]">
                    {(alertasApartados?.proximos.length ?? 0) + (alertasApartados?.vencidos.length ?? 0)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {((alertasApartados?.proximos.length ?? 0) + (alertasApartados?.vencidos.length ?? 0)) === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Sin apartados por vencer</p>
              ) : (
                <div className="space-y-1">
                  {(alertasApartados?.vencidos.length ?? 0) > 0 && (
                    <p className="text-[11px] text-red-600 font-medium">{alertasApartados!.vencidos.length} vencido{alertasApartados!.vencidos.length !== 1 ? 's' : ''}</p>
                  )}
                  {(alertasApartados?.proximos.length ?? 0) > 0 && (
                    <p className="text-[11px] text-yellow-600">{alertasApartados!.proximos.length} próximo{alertasApartados!.proximos.length !== 1 ? 's' : ''} a vencer</p>
                  )}
                  <Link to="/admin/apartados">
                    <Button size="sm" variant="outline" className="w-full text-xs h-7 mt-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                      Revisar apartados
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Anulaciones pendientes */}
          {anulacionesPend.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <ClipboardList className="size-4 text-red-500" />
                    Anulaciones pendientes
                  </CardTitle>
                  <Badge variant="destructive" className="text-[9px] px-1.5 h-4">{anulacionesPend.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-1.5">
                  {anulacionesPend.slice(0, 3).map(a => (
                    <div key={a.id} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground truncate">{a.solicitanteNombre ?? `Ref #${a.referenciaId}`}</span>
                      <span className="text-red-600 font-medium shrink-0 ml-2">{a.referenciaTipo}</span>
                    </div>
                  ))}
                  {anulacionesPend.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">y {anulacionesPend.length - 3} más…</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cierre automático */}
          {cierreAuto.length > 0 && (
            <Card className="border-purple-300">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Clock className="size-4 text-purple-500" />
                    Cierre automático
                  </CardTitle>
                  <Badge variant="outline" className="text-purple-700 border-purple-300 text-[10px]">{cierreAuto.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-1.5">
                  {cierreAuto.slice(0, 3).map(s => (
                    <div key={s.sesionId} className="flex justify-between text-[11px]">
                      <span className="font-medium truncate">{s.cajaNombre}</span>
                      <span className="text-purple-600 shrink-0 ml-2">superó reset</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <QuickCard to={`/cajas/principales/${sucursalId}`} icon={Vault}     title="Panel de Cajas"  description="Gestionar cajas y sesiones" />
          <QuickCard to="/inventario"                        icon={Package}   title="Inventario"      description="Stock y ajustes" />
          <QuickCard to="/reportes"                          icon={BarChart2} title="Reportes"        description="Cierre y movimientos" />
        </div>
      </div>

    </div>
  )
}

const ALERTA_CAJA_LABEL: Record<TipoAlerta, string> = {
  limite_efectivo_caja: 'Tope de efectivo',
  reposicion_caja:      'Requiere reposición',
}

function Cajero({ user }: { user: User }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const sucursalId = user.sucursal_id ?? 0

  const { data: ventas = [], isLoading: loadingVentas } = useVentasDia(sucursalId)
  const { data: stockAlertas = [] }                     = useAlertasStock()
  const { data: status }                                = useStatusPunto(sucursalId)

  // El backend ya recorta las tarjetas a las cajas con sesión abierta a nombre del cajero
  const miCaja = status?.cajas.find(c => esCajaOperativa(c.tipo)) ?? null

  const stockSucursal = stockAlertas.filter(s => s.sucursalId === sucursalId)
  const totalBajo     = stockSucursal.reduce((n, s) => n + s.bajo,    0)
  const totalCritico  = stockSucursal.reduce((n, s) => n + s.critico, 0)
  const totalStock    = totalBajo + totalCritico

  // Solo las ventas de su propia sesión: es la cifra por la que responde en el arqueo.
  // /ventas/sucursal/:id/dia devuelve las de toda la sucursal, incluidas las de otros cajeros.
  const misVentas    = miCaja?.sesionId
    ? ventas.filter(v => v.sesionCajaId === miCaja.sesionId)
    : []
  const totalVentas  = misVentas.reduce((sum, v) => sum + v.total, 0)

  // Solo el efectivo entra al cajón; tarjeta y transferencia no se cuentan en el arqueo
  const porMedio = miCaja?.saldoPorMedioPago
  const efectivo = Number(porMedio?.efectivo ?? 0)
  const otros    = porMedio
    ? Object.entries(porMedio).reduce((n, [medio, v]) => medio === 'efectivo' ? n : n + Number(v), 0)
    : 0

  const alertasCaja  = miCaja?.alertas ?? []
  const totalAlertas = alertasCaja.length + totalStock

  return (
    <div className="p-6 max-w-lg space-y-5">

      {/* Header + botón alertas */}
      <div className="flex items-start justify-between gap-4">
        <Header user={user} subtitle="Mi caja" />
        <Button
          variant={totalAlertas > 0 ? 'default' : 'outline'}
          size="sm"
          className="shrink-0 gap-1.5 mt-0.5"
          onClick={() => setSheetOpen(true)}
        >
          <BellRing className="size-4" />
          Alertas del día
          {totalAlertas > 0 && (
            <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 h-4">
              {totalAlertas}
            </Badge>
          )}
        </Button>
      </div>

      {!miCaja && (
        <Card className="border-dashed">
          <CardContent className="py-5 px-4 text-center space-y-1">
            <p className="text-sm font-medium">No tienes una caja abierta</p>
            <p className="text-xs text-muted-foreground">
              Tu supervisor debe abrir tu caja para que puedas vender y ver el arqueo del turno.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Arqueo del turno */}
      {miCaja && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-emerald-300">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Efectivo en caja</p>
              <p className="text-2xl font-bold tabular-nums text-emerald-700">{fmt(miCaja.saldoActual)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Abierta · {miCaja.codigo}</p>
            </CardContent>
          </Card>

          <Card className={misVentas.length > 0 ? 'border-emerald-300' : 'border-border'}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mis ventas hoy</p>
              <p className={cn('text-2xl font-bold tabular-nums', misVentas.length > 0 ? 'text-emerald-700' : 'text-muted-foreground')}>
                {misVentas.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{fmt(String(totalVentas))}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">En el cajón</p>
              <p className="text-lg font-bold tabular-nums">{fmt(String(efectivo))}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {otros > 0 ? `${fmt(String(otros))} en otros medios` : 'Todo en efectivo'}
              </p>
            </CardContent>
          </Card>

          <Card className={alertasCaja.length > 0 ? 'border-orange-300' : 'border-border'}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Alertas de caja</p>
              <p className={cn('text-2xl font-bold tabular-nums', alertasCaja.length > 0 ? 'text-orange-500' : 'text-muted-foreground')}>
                {alertasCaja.length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {alertasCaja.length > 0
                  ? alertasCaja.map(a => ALERTA_CAJA_LABEL[a]).join(' · ')
                  : 'Sin novedades'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/ventas"   icon={ShoppingCart} title="Ventas"   description="Iniciar venta en mi caja" />
        <QuickCard to="/clientes" icon={UserRound}    title="Clientes" description="Buscar cliente" />
        <QuickCard to="/reportes" icon={BarChart2}    title="Reportes" description="Resumen de mi turno" />
      </div>

      {/* Panel lateral de alertas */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-4" />
              Actividad del día
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-5">

              {/* Feed de ventas */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Mis ventas confirmadas ({misVentas.length})
                </p>
                {loadingVentas ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                ) : misVentas.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Sin ventas registradas hoy</p>
                ) : (
                  <div className="space-y-2">
                    {misVentas.map(v => (
                      <Card key={v.id} className="border-emerald-200/60">
                        <CardContent className="px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {new Date(v.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-sm font-bold tabular-nums text-emerald-700">{fmt(String(v.total))}</span>
                          </div>
                          <div className="space-y-0.5">
                            {v.detalle.map(d => (
                              <div key={d.id} className="flex justify-between text-[11px]">
                                <span className="text-foreground truncate">{d.nombreProducto}</span>
                                <span className="text-muted-foreground shrink-0 ml-2">×{d.cantidad}</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5">{v.medioPago}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Alertas de inventario */}
              {totalStock > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Alertas de inventario
                    </p>
                    <Card className="border-orange-200">
                      <CardContent className="px-3 py-3 space-y-2">
                        {totalCritico > 0 && (
                          <div className="flex items-center gap-2">
                            <PackageX className="size-3.5 text-red-500 shrink-0" />
                            <p className="text-[11px] text-red-600 font-medium">
                              {totalCritico} producto{totalCritico !== 1 ? 's' : ''} sin stock
                            </p>
                          </div>
                        )}
                        {totalBajo > 0 && (
                          <div className="flex items-center gap-2">
                            <Box className="size-3.5 text-orange-500 shrink-0" />
                            <p className="text-[11px] text-orange-600">
                              {totalBajo} producto{totalBajo !== 1 ? 's' : ''} bajo mínimo
                            </p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground pt-1 border-t">
                          Notificar al administrador para reposición de stock
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

    </div>
  )
}

function Tesoreria({ user }: { user: User }) {
  const { data: puntos = [], isLoading } = useCajasPrincipalesTesoreria()
  const { data: movimientos = [] }       = useMovimientosTesoreria({ limite: 5 })

  const totalAsignado = puntos.reduce((n, p) => n + Number(p.baseAsignada), 0)
  const sinApertura   = puntos.filter(p => !p.tieneApertura).length

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <Header user={user} subtitle="Dinero del comercio hacia las regionales" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total asignado</p>
            {isLoading
              ? <Skeleton className="h-7 w-24" />
              : <p className="text-xl font-bold tabular-nums">{fmt(totalAsignado.toFixed(2))}</p>}
            <p className="text-[11px] text-muted-foreground mt-1">en cajas principales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Puntos</p>
            <p className="text-2xl font-bold tabular-nums">{puntos.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">cajas principales</p>
          </CardContent>
        </Card>
        <Card className={sinApertura > 0 ? 'border-amber-300' : 'border-border'}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sin apertura</p>
            <p className={cn('text-2xl font-bold tabular-nums', sinApertura > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
              {sinApertura}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">esperan asignación inicial</p>
          </CardContent>
        </Card>
      </div>

      {movimientos.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <ScrollText className="size-4 text-muted-foreground" />
              Últimos movimientos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="rounded-lg border overflow-hidden">
              {movimientos.map((m, i) => (
                <div key={m.id} className={cn('flex items-center justify-between gap-2 px-3 py-2 text-[11px]', i > 0 && 'border-t')}>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.puntoNombre}</p>
                    <p className="text-muted-foreground truncate">{m.codigoAprobacion}</p>
                  </div>
                  <span className={cn(
                    'font-semibold tabular-nums shrink-0',
                    m.tipo === 'egreso' ? 'text-red-600' : m.tipo === 'ingreso' ? 'text-emerald-600' : '',
                  )}>
                    {m.tipo === 'egreso' ? '−' : m.tipo === 'ingreso' ? '+' : ''}{fmt(m.monto)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/tesoreria/cajas-principales" icon={Vault}      title="Cajas principales"       description="Apertura, ingresos y egresos por punto" />
        <QuickCard to="/tesoreria/movimientos"       icon={ScrollText} title="Historial de movimientos" description="Todo lo girado del comercio a las regionales" />
      </div>
    </div>
  )
}

function Administrativo({ user }: { user: User }) {
  return (
    <div className="p-6 max-w-md">
      <Header user={user} subtitle="Gestión administrativa" />
      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/clientes" icon={UserRound} title="Clientes"  description="Directorio de clientes" />
        <QuickCard to="/reportes" icon={BarChart2} title="Reportes"  description="Reportes administrativos" />
      </div>
    </div>
  )
}

function Inventarios({ user }: { user: User }) {
  const sucursalId = user.sucursal_id ?? undefined
  const { data: alertasStock = [] }   = useAlertasStock()
  const { data: ordenesPend = [] }    = useOrdenesPendientes(sucursalId)

  const stockFiltrado  = sucursalId ? alertasStock.filter(s => s.sucursalId === sucursalId) : alertasStock
  const totalBajo      = stockFiltrado.reduce((n, s) => n + s.bajo, 0)
  const totalCritico   = stockFiltrado.reduce((n, s) => n + s.critico, 0)

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <Header user={user} subtitle="Control de inventario" />

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className={totalCritico > 0 ? 'border-red-300' : 'border-border'}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sin stock</p>
            <p className={cn('text-2xl font-bold', totalCritico > 0 ? 'text-red-600' : 'text-muted-foreground')}>{totalCritico}</p>
            <p className="text-[11px] text-muted-foreground mt-1">productos agotados</p>
          </CardContent>
        </Card>
        <Card className={totalBajo > 0 ? 'border-orange-300' : 'border-border'}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Stock bajo</p>
            <p className={cn('text-2xl font-bold', totalBajo > 0 ? 'text-orange-500' : 'text-muted-foreground')}>{totalBajo}</p>
            <p className="text-[11px] text-muted-foreground mt-1">bajo mínimo</p>
          </CardContent>
        </Card>
        <Card className={ordenesPend.length > 0 ? 'border-blue-300' : 'border-border'}>
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Órdenes</p>
            <p className={cn('text-2xl font-bold', ordenesPend.length > 0 ? 'text-blue-600' : 'text-muted-foreground')}>{ordenesPend.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">pendientes confirmación</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle órdenes pendientes */}
      {ordenesPend.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <ClipboardList className="size-4 text-blue-500" />
              Órdenes pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="rounded-lg border overflow-hidden">
              {ordenesPend.slice(0, 5).map((o, i) => (
                <div key={o.id} className={cn('flex items-center justify-between px-3 py-2 text-[11px]', i > 0 && 'border-t')}>
                  <span className="font-medium truncate">{o.sucursalNombre ?? `Sucursal ${o.sucursalId}`}</span>
                  <span className="text-muted-foreground ml-2">{o.items.length} ítem{o.items.length !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/inventario" icon={Package}   title="Inventario" description="Stock y ajustes físicos" />
        <QuickCard to="/reportes"   icon={BarChart2} title="Reportes"   description="Movimientos y stock" />
      </div>
    </div>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useSessionStore((s) => s.user)
  if (!user) return null

  switch (user.rol) {
    case 'ADMIN_SISTEMA':       return <AdminSistema    user={user} />
    case 'ADMIN_NACIONAL':      return <AdminNacional   user={user} />
    case 'SUPERVISOR_REGIONAL': return <Supervisor      user={user} />
    case 'CAJERO':              return <Cajero          user={user} />
    case 'TESORERIA':           return <Tesoreria       user={user} />
    case 'ADMINISTRATIVO':      return <Administrativo  user={user} />
    case 'INVENTARIOS':         return <Inventarios     user={user} />
    default:                    return <AdminSistema    user={user} />
  }
}
