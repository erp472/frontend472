import { BarChart2 } from 'lucide-react'

export default function Reportes() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <div className="max-w-sm space-y-4">
        <div className="flex justify-center">
          <BarChart2 className="h-16 w-16 text-muted-foreground/40" />
        </div>
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="text-muted-foreground text-sm">
          El módulo de reportes está en desarrollo. Pronto podrás generar y exportar
          reportes de operaciones, ventas y caja.
        </p>
      </div>
    </div>
  )
}
