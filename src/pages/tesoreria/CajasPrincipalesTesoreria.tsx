import { useState } from 'react'
import { toast } from 'sonner'
import {
  Vault, UserRound, Store, PlusCircle, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import {
  useCajasPrincipalesTesoreria,
  useRegistrarMovimientoTesoreria,
  type CajaPrincipalTesoreria,
  type TipoMovimientoTesoreria,
} from '@/queries/tesoreria.queries'

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string | null | undefined) => v ? COP.format(Number(v)) : '$0'

const ACCION: Record<TipoMovimientoTesoreria, { titulo: string; verbo: string; ayuda: string }> = {
  apertura: {
    titulo: 'Apertura de caja principal',
    verbo:  'Registrar apertura',
    ayuda:  'Asignación inicial del comercio al supervisor. Solo se puede registrar una vez.',
  },
  ingreso: {
    titulo: 'Ingreso a caja principal',
    verbo:  'Registrar ingreso',
    ayuda:  'Suma dinero a la asignación del punto por cambio de custodio.',
  },
  egreso: {
    titulo: 'Egreso de caja principal',
    verbo:  'Registrar egreso',
    ayuda:  'Resta dinero de la asignación del punto. No puede dejarla por debajo del efectivo custodiado.',
  },
}

function MovimientoDialog({
  punto, tipo, onClose,
}: {
  punto: CajaPrincipalTesoreria
  tipo:  TipoMovimientoTesoreria
  onClose: () => void
}) {
  const [monto, setMonto]       = useState('')
  const [codigo, setCodigo]     = useState('')
  const [descripcion, setDesc]  = useState('')
  const registrar = useRegistrarMovimientoTesoreria()

  const meta  = ACCION[tipo]
  const base  = Number(punto.baseAsignada)
  const valor = Number(monto)
  const resultante =
    !valor || Number.isNaN(valor) ? base :
    tipo === 'apertura' ? valor :
    tipo === 'ingreso'  ? base + valor :
                          base - valor

  const submit = () => {
    if (!valor || valor <= 0)          return toast.error('El monto debe ser mayor a cero')
    if (codigo.trim().length < 4)      return toast.error('El código de aprobación debe tener al menos 4 caracteres')
    if (descripcion.trim().length < 10) return toast.error('Describe de dónde proviene el dinero y por qué se establece el giro')
    if (resultante < 0)                return toast.error('El egreso supera lo asignado al punto')
    const comprometido = Number(punto.efectivoEnPunto)
    if (tipo === 'egreso' && comprometido > 0 && resultante < comprometido) {
      return toast.error(
        `El punto custodia ${fmt(punto.efectivoEnPunto)} en cajas abiertas; el egreso dejaría la asignación en ${fmt(resultante.toFixed(2))}`,
      )
    }

    registrar.mutate(
      { cajaPadreId: punto.cajaPadreId, tipo, monto: valor.toFixed(2), codigoAprobacion: codigo.trim(), descripcion: descripcion.trim() },
      {
        onSuccess: () => { toast.success(`${meta.verbo} — ${fmt(valor.toFixed(2))}`); onClose() },
        onError:   (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar el movimiento'),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{meta.titulo}</DialogTitle>
          <DialogDescription className="text-xs">
            {punto.nombre} · {punto.sucursalNombre}
            {punto.supervisorNombre && <> · {punto.supervisorNombre}</>}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">{meta.ayuda}</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Valor</Label>
            <Input
              type="number"
              inputMode="numeric"
              className="tabular-nums"
              placeholder="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              min={1}
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Código de baucher o aprobación</Label>
            <Input
              className="font-mono"
              placeholder="Ej. GIRO-2026-0041"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              autoComplete="off"
              maxLength={40}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descripción</Label>
            <Textarea
              className="text-xs min-h-20"
              placeholder="De dónde proviene el dinero y por qué se establece este giro"
              value={descripcion}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={500}
            />
          </div>

          <div className="rounded-md border px-3 py-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asignación actual</span>
              <span className="tabular-nums">{fmt(punto.baseAsignada)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-muted-foreground">Queda asignado</span>
              <span className={`tabular-nums ${resultante < 0 ? 'text-red-600' : ''}`}>
                {fmt(resultante.toFixed(2))}
              </span>
            </div>
            {Number(punto.efectivoEnPunto) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custodiado en cajas abiertas</span>
                <span className="tabular-nums text-amber-600 dark:text-amber-400">{fmt(punto.efectivoEnPunto)}</span>
              </div>
            )}
          </div>

          <div className="rounded-md border px-3 py-2 space-y-1 text-xs">
            <p className="text-muted-foreground">Operando el dinero del punto ahora</p>
            {punto.cajerosActivos.length === 0 ? (
              <p>Ninguna caja abierta en este momento</p>
            ) : (
              punto.cajerosActivos.map((c) => (
                <div key={c.sesionId} className="flex justify-between gap-3">
                  <span className="truncate">{c.cajero} · {c.cajaNombre}</span>
                  <span className="tabular-nums shrink-0">{fmt(c.saldo)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={submit} disabled={registrar.isPending}>
            {registrar.isPending ? 'Registrando…' : meta.verbo}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PuntoRow({ punto, onAccion }: {
  punto: CajaPrincipalTesoreria
  onAccion: (tipo: TipoMovimientoTesoreria) => void
}) {
  const sinSupervisor = !punto.supervisorId

  return (
    <div className="border rounded-xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Vault className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{punto.nombre}</p>
            {!punto.tieneApertura && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-400 text-amber-600">
                Sin apertura
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <Store className="size-3 shrink-0" />
            {punto.sucursalNombre} · {punto.regionalNombre}
          </p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <UserRound className="size-3 shrink-0" />
            {punto.supervisorNombre ?? <span className="text-amber-600">Sin supervisor asignado</span>}
          </p>
        </div>
      </div>

      <div className="text-right shrink-0 sm:w-40">
        <p className="text-sm font-bold tabular-nums">{fmt(punto.baseAsignada)}</p>
        <p className="text-[10px] text-muted-foreground">asignado al punto</p>
        {Number(punto.efectivoEnPunto) > 0 && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 tabular-nums">
            {fmt(punto.efectivoEnPunto)} custodiado
          </p>
        )}
      </div>

      <div className="flex gap-1.5 shrink-0">
        {!punto.tieneApertura ? (
          <Button size="sm" variant="outline" disabled={sinSupervisor} onClick={() => onAccion('apertura')}>
            <PlusCircle className="size-3.5 mr-1" /> Apertura
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" disabled={sinSupervisor} onClick={() => onAccion('ingreso')}>
              <ArrowDownCircle className="size-3.5 mr-1 text-emerald-500" /> Ingreso
            </Button>
            <Button size="sm" variant="outline" disabled={sinSupervisor} onClick={() => onAccion('egreso')}>
              <ArrowUpCircle className="size-3.5 mr-1 text-red-500" /> Egreso
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CajasPrincipalesTesoreria() {
  const { data: puntos = [], isLoading, isFetching, refetch } = useCajasPrincipalesTesoreria()
  const [accion, setAccion] = useState<{ punto: CajaPrincipalTesoreria; tipo: TipoMovimientoTesoreria } | null>(null)

  const totalAsignado = puntos.reduce((n, p) => n + Number(p.baseAsignada), 0)
  const sinApertura   = puntos.filter(p => !p.tieneApertura).length

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Cajas principales</h1>
          <p className="text-sm text-muted-foreground">
            Dinero que el comercio asigna a cada regional
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total asignado</p>
          <p className="text-xl font-bold tabular-nums">{fmt(totalAsignado.toFixed(2))}</p>
        </div>
        <div className="rounded-xl border px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Puntos</p>
          <p className="text-xl font-bold tabular-nums">{puntos.length}</p>
        </div>
        <div className={`rounded-xl border px-4 py-3 ${sinApertura > 0 ? 'border-amber-300' : ''}`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Sin apertura</p>
          <p className={`text-xl font-bold tabular-nums ${sinApertura > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {sinApertura}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : puntos.length === 0 ? (
        <div className="border rounded-xl px-4 py-10 text-center">
          <AlertTriangle className="size-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay cajas principales registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {puntos.map(p => (
            <PuntoRow key={p.cajaPadreId} punto={p} onAccion={(tipo) => setAccion({ punto: p, tipo })} />
          ))}
        </div>
      )}

      {accion && (
        <MovimientoDialog
          punto={accion.punto}
          tipo={accion.tipo}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  )
}
