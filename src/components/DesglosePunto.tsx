import type { DiagnosticoPunto } from '@/queries/cajas.queries'
import { cn } from '@/lib/utils'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})

// Las cifras están contenidas una dentro de otra, no sumadas: la base autorizada es el
// techo, la Caja Fuerte custodia ese dinero y las cajas del punto reparten lo que sale
// de la Fuerte. Presentarlas en una fila plana invita a sumarlas y a leer un efectivo
// que el punto no tiene, así que se rinden indentadas bajo lo que las contiene.
export function DesglosePunto({ data, className }: { data: DiagnosticoPunto; className?: string }) {
  const filas = [
    { nivel: 0, label: 'Base autorizada al punto', valor: data.baseGeneral },
    { nivel: 1, label: 'Custodia la Caja Fuerte',  valor: data.baseFuerte },
    { nivel: 2, label: 'Repartido a las cajas',    valor: data.sumaRepartida },
    { nivel: 3, label: 'Cajas operativas',         valor: data.sumaOperativas },
    { nivel: 3, label: 'Caja Menor',               valor: data.baseMenor },
    { nivel: 2, label: 'Sin repartir en la Fuerte',valor: data.disponible },
  ]

  return (
    <dl className={cn('space-y-0.5', className)}>
      {filas.map((f) => (
        <div
          key={f.label}
          className={cn(
            'flex items-baseline justify-between gap-3 text-xs',
            f.nivel > 0 && 'border-l border-border/60',
          )}
          style={{ marginLeft: `${Math.max(0, f.nivel - 1) * 0.6}rem`, paddingLeft: f.nivel > 0 ? '0.6rem' : 0 }}
        >
          <dt className={cn('text-muted-foreground', f.nivel === 0 && 'text-foreground font-medium')}>
            {f.label}
          </dt>
          <dd className="tabular-nums font-medium">{COP.format(Number(f.valor))}</dd>
        </div>
      ))}
    </dl>
  )
}
