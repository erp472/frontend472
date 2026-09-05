import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Ban, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button }   from '@/components/ui/button'
import { Badge }    from '@/components/ui/badge'
import { Input }    from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  useHistoricoMovimientos,
  type CategoriaHistorico,
  type HistoricoMovimiento,
} from '@/queries/cajas.queries'
import { useAnularVentaDesdeHistorico } from '@/queries/ventas.queries'

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string) => COP.format(Number(v))

const CATEGORIAS: { valor: CategoriaHistorico | 'todas'; label: string }[] = [
  { valor: 'todas',       label: 'Todas' },
  { valor: 'recaudos',    label: 'Recaudos' },
  { valor: 'facturacion', label: 'Facturación' },
  { valor: 'anulaciones', label: 'Anulaciones' },
  { valor: 'ajustes',     label: 'Ajustes' },
]

const CATEGORIA_COLOR: Record<CategoriaHistorico, string> = {
  recaudos:    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  facturacion: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  anulaciones: 'bg-red-500/10 text-red-700 dark:text-red-400',
  ajustes:     'bg-amber-500/10 text-amber-700 dark:text-amber-400',
}

const hora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

function AnularDialog({
  movimiento,
  onClose,
}: {
  movimiento: HistoricoMovimiento | null
  onClose: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const anular = useAnularVentaDesdeHistorico()

  const confirmar = async () => {
    if (!movimiento?.ventaId) return
    try {
      await anular.mutateAsync({
        ventaId: movimiento.ventaId,
        cajaId:  movimiento.cajaId,
        motivo:  motivo.trim(),
      })
      toast.success(`Venta ${movimiento.ventaId} anulada`)
      setMotivo('')
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo anular la venta')
    }
  }

  return (
    <Dialog open={!!movimiento} onOpenChange={open => { if (!open) { setMotivo(''); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anular venta {movimiento?.ventaId}</DialogTitle>
          <DialogDescription>
            {movimiento && (
              <>
                {fmt(movimiento.monto)} en {movimiento.cajaNombre} · {movimiento.sucursalNombre}.
                Se revierte el movimiento en la caja y se devuelve el inventario.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          placeholder="Motivo de la anulación"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={motivo.trim().length < 5 || anular.isPending}
            onClick={confirmar}
          >
            {anular.isPending && <Loader2 className="size-4 animate-spin" />}
            Anular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function HistoricoMovimientos() {
  const [categoria, setCategoria] = useState<CategoriaHistorico | 'todas'>('todas')
  const [pagina, setPagina]       = useState(1)
  const [aAnular, setAAnular]     = useState<HistoricoMovimiento | null>(null)

  const { data, isLoading, isError, refetch } = useHistoricoMovimientos({
    categoria: categoria === 'todas' ? undefined : categoria,
    pagina,
    limite: 25,
  })

  const cambiarCategoria = (v: CategoriaHistorico | 'todas') => {
    setCategoria(v)
    setPagina(1)
  }

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIAS.map(c => (
          <Button
            key={c.valor}
            size="sm"
            variant={categoria === c.valor ? 'default' : 'outline'}
            onClick={() => cambiarCategoria(c.valor)}
          >
            {c.label}
          </Button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
          <AlertTriangle className="mx-auto size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No se pudo cargar el histórico</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Sin movimientos en esta categoría
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map(m => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={`text-[10px] ${CATEGORIA_COLOR[m.categoria]}`}>
                    {m.tipo.replace(/_/g, ' ')}
                  </Badge>
                  {m.ventaEstado === 'anulada' && (
                    <Badge variant="outline" className="text-[10px]">Anulada</Badge>
                  )}
                  {m.sesionAbierta && (
                    <span className="size-1.5 rounded-full bg-emerald-500" title="Sesión abierta" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {m.cajaNombre} · {m.sucursalNombre} · {m.regionalNombre}
                  {m.cajero && ` · ${m.cajero}`}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums">{fmt(m.monto)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {hora.format(new Date(m.fecha))}{m.medioPago && ` · ${m.medioPago.replace(/_/g, ' ')}`}
                </p>
              </div>

              {m.puedeAnular && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  title="Anular venta"
                  onClick={() => setAAnular(m)}
                >
                  <Ban className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            size="icon" variant="outline"
            disabled={pagina <= 1}
            onClick={() => setPagina(p => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {data.pagina} / {data.totalPaginas} · {data.total} movimientos
          </span>
          <Button
            size="icon" variant="outline"
            disabled={pagina >= data.totalPaginas}
            onClick={() => setPagina(p => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <AnularDialog movimiento={aAnular} onClose={() => setAAnular(null)} />
    </div>
  )
}
