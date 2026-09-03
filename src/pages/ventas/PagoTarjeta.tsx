import { CreditCard } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useFranquicias } from '@/queries/franquicias.queries'

export type TipoTarjeta = 'tarjeta_debito' | 'tarjeta_credito'

export interface DatosTarjeta {
  tipo: TipoTarjeta
  /** Valor cargado al datáfono. Vacío = cubre el total */
  valor: string
  franquiciaId: string
  codigoVoucher: string
}

export const TARJETA_VACIA: DatosTarjeta = {
  tipo: 'tarjeta_credito',
  valor: '',
  franquiciaId: '',
  codigoVoucher: '',
}

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0,
})

/** Porción del total cargada a la tarjeta; el resto se cobra en efectivo. */
export function montoTarjeta(datos: DatosTarjeta, total: number): number {
  const v = Number(datos.valor)
  return v > 0 ? Math.min(v, total) : total
}

/** Mensaje de error listo para toast, o null si los datos son válidos. */
export function validarTarjeta(datos: DatosTarjeta, total: number): string | null {
  const v = Number(datos.valor)
  if (datos.valor.trim() && (!Number.isFinite(v) || v <= 0)) {
    return 'El valor de la tarjeta debe ser mayor a cero'
  }
  if (v > total) return `El valor de la tarjeta (${COP.format(v)}) supera el total a pagar`
  if (!datos.codigoVoucher.trim()) return 'Ingresa el código del baucher'
  if (datos.tipo === 'tarjeta_credito' && !datos.franquiciaId) {
    return 'Selecciona la franquicia de la tarjeta de crédito'
  }
  return null
}

/**
 * Campos del payload de pago. El backend reparte el movimiento: la porción en
 * `montoEfectivo` entra al cajón y la de tarjeta conserva franquicia y baucher.
 */
export function payloadTarjeta(datos: DatosTarjeta, total: number) {
  const enTarjeta = montoTarjeta(datos, total)
  const enEfectivo = Math.max(0, total - enTarjeta)
  return {
    medioPago: datos.tipo,
    codigoVoucher: datos.codigoVoucher.trim(),
    ...(datos.tipo === 'tarjeta_credito' ? { franquiciaId: Number(datos.franquiciaId) } : {}),
    ...(enEfectivo > 0 ? { montoEfectivo: enEfectivo } : {}),
  }
}

export function PagoTarjetaFields({
  datos,
  onChange,
  sucursalId,
  total,
}: {
  datos: DatosTarjeta
  onChange: (datos: DatosTarjeta) => void
  sucursalId?: number | null
  total: number
}) {
  const { data: franquicias = [], isLoading } = useFranquicias(
    sucursalId,
    datos.tipo === 'tarjeta_credito',
  )

  const enTarjeta = montoTarjeta(datos, total)
  const enEfectivo = Math.max(0, total - enTarjeta)

  const set = (patch: Partial<DatosTarjeta>) => onChange({ ...datos, ...patch })

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/40 dark:border-sky-800 dark:bg-sky-950/20 px-3 py-2.5 space-y-2.5">
      <div className="flex items-center gap-2">
        <CreditCard className="size-3.5 text-sky-500 shrink-0" />
        <span className="text-xs font-medium text-sky-700 dark:text-sky-400">Datos del datáfono</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Valor</Label>
          <Input
            type="number"
            inputMode="numeric"
            placeholder={String(total)}
            className="h-8 text-xs tabular-nums"
            value={datos.valor}
            onChange={(e) => set({ valor: e.target.value })}
            min={1}
            max={total}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Tipo</Label>
          <Select
            value={datos.tipo}
            onValueChange={(v) =>
              set({ tipo: v as TipoTarjeta, ...(v === 'tarjeta_debito' ? { franquiciaId: '' } : {}) })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tarjeta_credito">Crédito</SelectItem>
              <SelectItem value="tarjeta_debito">Débito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {datos.tipo === 'tarjeta_credito' && (
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Franquicia</Label>
            <Select value={datos.franquiciaId} onValueChange={(v) => set({ franquiciaId: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={isLoading ? 'Cargando…' : 'Seleccionar'} />
              </SelectTrigger>
              <SelectContent>
                {franquicias.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>{f.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className={datos.tipo === 'tarjeta_credito' ? 'space-y-1' : 'space-y-1 col-span-2'}>
          <Label className="text-[10px] text-muted-foreground">Código baucher</Label>
          <Input
            placeholder="Aprobación"
            className="h-8 text-xs font-mono"
            value={datos.codigoVoucher}
            onChange={(e) => set({ codigoVoucher: e.target.value })}
            autoComplete="off"
            maxLength={30}
          />
        </div>
      </div>

      {enEfectivo > 0 && (
        <div className="rounded-md border px-2.5 py-1.5 space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tarjeta</span>
            <span className="font-semibold tabular-nums">{COP.format(enTarjeta)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pendiente efectivo</span>
            <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {COP.format(enEfectivo)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
