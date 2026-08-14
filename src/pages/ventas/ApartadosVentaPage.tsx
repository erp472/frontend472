import { useState } from 'react'
import { AlertCircle, Loader2, MailOpen, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useApartadosDisponibles, type TamanoApartado } from '@/queries/ventas.queries'
import { useSessionStore } from '@/stores/useSessionStore'

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const TAMANO_LABEL: Record<TamanoApartado, string> = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande:  'Grande',
}

const TAMANO_BADGE: Record<TamanoApartado, string> = {
  pequeno: 'bg-sky-500/10 text-sky-700 border-sky-300',
  mediano: 'bg-violet-500/10 text-violet-700 border-violet-300',
  grande:  'bg-amber-500/10 text-amber-700 border-amber-300',
}

function RowSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 4 }).map((_, j) => (
        <TableCell key={j}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}

export default function ApartadosVentaPage() {
  const user       = useSessionStore((s) => s.user)
  const sucursalId = user?.sucursal_id ?? 0

  const [filtroTamano, setFiltroTamano] = useState('')
  const [buscar,       setBuscar]       = useState('')

  const { data, isLoading, isError, refetch, isFetching } = useApartadosDisponibles(
    sucursalId,
    filtroTamano || undefined,
  )

  const lista = (data?.lista ?? []).filter(
    (a) => !buscar || a.numero.toLowerCase().includes(buscar.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Apartados Postales</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? 'Cargando...'
              : `${data?.totalDisponibles ?? 0} disponibles en tu sucursal`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching
            ? <Loader2 className="size-4 animate-spin" />
            : <RefreshCw className="size-4" />}
          <span className="ml-1.5">Actualizar</span>
        </Button>
      </div>

      {/* Resumen por tamaño */}
      {!isLoading && data && (
        <div className="grid grid-cols-3 gap-3">
          {(['pequeno', 'mediano', 'grande'] as TamanoApartado[]).map((t) => {
            const count    = data.lista.filter((a) => a.tamano === t).length
            const selected = filtroTamano === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setFiltroTamano(selected ? '' : t)}
                className={[
                  'rounded-xl border p-4 text-left transition-colors hover:bg-muted/50',
                  selected ? 'border-primary bg-primary/5' : '',
                ].join(' ')}
              >
                <p className="text-2xl font-bold tabular-nums">{count}</p>
                <p className="text-sm text-muted-foreground">{TAMANO_LABEL[t]}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar número..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        <Select value={filtroTamano} onValueChange={setFiltroTamano}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos los tamaños" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los tamaños</SelectItem>
            <SelectItem value="pequeno">Pequeño</SelectItem>
            <SelectItem value="mediano">Mediano</SelectItem>
            <SelectItem value="grande">Grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">N° Apartado</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Días alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <RowSkeleton />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar los apartados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MailOpen className="size-8 opacity-30" />
                    <p className="text-sm">
                      {buscar || filtroTamano
                        ? 'Sin resultados para los filtros aplicados'
                        : 'No hay apartados disponibles en tu sucursal'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              lista.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-semibold">{a.numero}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={TAMANO_BADGE[a.tamano as TamanoApartado] ?? ''}
                    >
                      {TAMANO_LABEL[a.tamano as TamanoApartado] ?? a.tamano}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {a.valor != null ? COP.format(a.valor) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.diasAlertaVencimiento} días antes del vencimiento
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && !isError && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground tabular-nums">
            {lista.length} de {data?.totalDisponibles ?? 0} apartados disponibles
          </div>
        )}
      </div>
    </div>
  )
}
