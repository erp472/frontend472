import { Link } from 'react-router-dom'
import {
  MapPin, Store, ReceiptText, Monitor, Package, Truck,
  BarChart2, Vault, ShoppingCart, Users, ShieldCheck,
  ToggleLeft, ScrollText, UserRound, ArrowRight, MailOpen,
  AlertTriangle, TrendingUp, TrendingDown, RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { type User, useSessionStore } from '@/stores/useSessionStore'
import { useStatusPunto, type CardAuxiliar } from '@/queries/cajas.queries'

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
        <QuickCard to="/admin/regionales"   icon={MapPin}      title="Regionales"      description="Ver y administrar regionales" />
        <QuickCard to="/admin/branches"     icon={Store}       title="Sucursales"      description="Sucursales del país" />
        <QuickCard to="/admin/puntos-venta" icon={ReceiptText} title="Cajas auxiliares" description="Cajas auxiliares por sucursal" />
        <QuickCard to="/admin/devices"      icon={Monitor}     title="Equipos"         description="Equipos autorizados" />
        <QuickCard to="/admin/productos"    icon={Package}     title="Productos"       description="Administrar catálogo" />
        <QuickCard to="/admin/servicios"    icon={Truck}       title="Servicios"       description="Servicios postales" />
        <QuickCard to="/admin/apartados"    icon={MailOpen}    title="Apartados"       description="Apartados postales" />
        <QuickCard to="/reportes"           icon={BarChart2}   title="Reportes"        description="Reportes nacionales" />
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
  if (card.alertas.includes('limite_efectivo_caja')) return 'bg-red-500 animate-pulse'
  if (card.alertas.includes('reposicion_caja'))      return 'bg-amber-500 animate-pulse'
  return 'bg-emerald-500'
}

const TIPO_LABEL: Record<string, string> = { pos: 'POS', general: 'Caja Fuerte', menor: 'Menor', pagos: 'Pagos' }

// ── Dashboard Supervisor ──────────────────────────────────────────────────────

function Supervisor({ user }: { user: User }) {
  const sucursalId = user.sucursal_id ?? 0
  const { data, isLoading, refetch, isFetching } = useStatusPunto(sucursalId)

  const cajas        = data?.cajas ?? []
  const abiertas     = cajas.filter(c => c.estado === 'abierta').length
  const totalAlertas = cajas.reduce((n, c) => n + c.alertas.length, 0)
  const panel        = data?.panel

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
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cajas operando</p>
              <p className={cn('text-xl font-bold leading-none', abiertas > 0 ? 'text-emerald-600' : 'text-muted-foreground')}>
                {abiertas} <span className="text-sm font-normal text-muted-foreground">/ {cajas.length}</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {cajas.filter(c => c.estado === 'sin_sesion').length} disponible{cajas.filter(c => c.estado === 'sin_sesion').length !== 1 ? 's' : ''}
              </p>
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
      {!isLoading && cajas.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Estado de cajas</p>
          <div className="rounded-xl border overflow-hidden">
            {cajas.map((c, i) => (
              <div
                key={c.cajaId}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm',
                  i > 0 && 'border-t',
                )}
              >
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
                  <Badge variant="outline" className="text-[10px] shrink-0">Disponible</Badge>
                )}
                {c.estado === 'cerrada' && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Cerrada</Badge>
                )}
                {c.alertas.length > 0 && (
                  <AlertTriangle className="size-3.5 text-red-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
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

function Cajero({ user }: { user: User }) {
  return (
    <div className="p-6 max-w-md">
      <Header user={user} subtitle="Mi caja" />
      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/ventas"   icon={ShoppingCart} title="Ventas"   description="Iniciar venta en mi caja" />
        <QuickCard to="/clientes" icon={UserRound}    title="Clientes" description="Buscar cliente" />
        <QuickCard to="/reportes" icon={BarChart2}    title="Reportes" description="Resumen de mi turno" />
      </div>
    </div>
  )
}

function Tesoreria({ user }: { user: User }) {
  return (
    <div className="p-6 max-w-md">
      <Header user={user} subtitle="Gestión financiera y consignaciones" />
      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/cajas"    icon={Vault}     title="Cajas"    description="Ver estado de cajas" />
        <QuickCard to="/reportes" icon={BarChart2} title="Reportes" description="Reportes financieros" />
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
  return (
    <div className="p-6 max-w-md">
      <Header user={user} subtitle="Control de inventario" />
      <div className="grid grid-cols-2 gap-3">
        <QuickCard to="/inventario" icon={Package} title="Inventario" description="Stock y ajustes físicos" />
        <QuickCard to="/reportes"   icon={BarChart2} title="Reportes" description="Movimientos y stock" />
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
