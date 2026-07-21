import { useNavigate } from 'react-router-dom'
import { ShoppingCart, ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import { useStatusPunto, type CardAuxiliar } from '@/queries/cajas.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string | null | undefined) => (v ? COP.format(Number(v)) : '$0')

// ── CajaCard ──────────────────────────────────────────────────────────────────

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
      {/* Header: nombre + codigo + badge */}
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

      {/* Saldo */}
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{fmt(card.saldoActual)}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Saldo actual</p>
      </div>

      {/* Footer: ir a caja */}
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

// ── Página principal ──────────────────────────────────────────────────────────

export default function PuntoVentas() {
  const navigate   = useNavigate()
  const user       = useSessionStore(s => s.user)
  const sucursalId = user?.sucursal_id ?? null

  const { data, isLoading, isError, refetch, isFetching } = useStatusPunto(
    sucursalId ?? 0,
  )

  const cajasAbiertas = data?.cajas.filter(c => c.estado === 'abierta' && c.tipo === 'pos') ?? []

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
          <div className="py-20 text-center text-sm text-muted-foreground">
            No hay cajas con sesión activa en este momento
          </div>
        )}
      </div>
    </div>
  )
}
