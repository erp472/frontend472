import { useState, useEffect } from 'react'
import { FileText, Printer, Clock, BarChart3, Download, ChevronLeft, ChevronRight, Pencil, Loader2 } from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useSessionStore }           from '@/stores/useSessionStore'
import { useStatusPunto, useMovimientos, useBalancePagos, esCajaOperativa, useSesionesHistorico, type CardAuxiliar } from '@/queries/cajas.queries'
import { useSucursales }             from '@/queries/sucursales.queries'
import {
  useVentasHistorico, abrirGuiaEnvioPdf,
  useEnvioDetalle, useActualizarDireccionEnvio,
  type ActualizarDireccionEnvioPayload,
} from '@/queries/ventas.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})
const fmt = (v: string | number | null | undefined) =>
  v != null ? COP.format(Number(v)) : '$0'

const TIPOS_VENTA = new Set([
  'venta_producto', 'venta_servicio', 'venta_estampilla',
  'apartado_postal', 'giro_pago', 'giro_emision_cobro', 'recaudo',
])

const TIPO_LABEL: Record<string, string> = {
  venta_producto:     'Venta producto',
  venta_servicio:     'Venta servicio',
  venta_estampilla:   'Estampilla',
  apartado_postal:    'Apartado postal',
  giro_pago:          'Pago giro',
  giro_emision_cobro: 'Emisión giro',
  recaudo:            'Recaudo',
  anulacion:          'Anulación',
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo:          'Efectivo',
  cheque:            'Cheque',
  tarjeta_debito:    'T. débito',
  tarjeta_credito:   'T. crédito',
  transferencia:     'Transferencia',
  consignacion:      'Consignación',
  preporteado:       'Preporteado',
  mixto_preporteado: 'Mixto prep.',
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function fmtFechaLarga(d: Date) {
  return d.toLocaleDateString('es-CO', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
}

function hoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── EditarDireccionDialog ─────────────────────────────────────────────────────

function EditarDireccionDialog({
  envioId,
  numeroGuia,
  open,
  onClose,
}: {
  envioId:    number
  numeroGuia: string
  open:       boolean
  onClose:    () => void
}) {
  const { data: envio, isLoading } = useEnvioDetalle(open ? envioId : null)
  const actualizar = useActualizarDireccionEnvio()

  const [form, setForm] = useState<ActualizarDireccionEnvioPayload>({})

  useEffect(() => {
    if (!envio) return
    setForm({
      destinatarioNombre:       envio.destinatario_nombreenvios        ?? undefined,
      destinatarioDocumento:    envio.destinatario_documentoenvios     ?? undefined,
      destinatarioTelefono:     envio.destinatario_telefonoenvios      ?? undefined,
      destinatarioEmail:        envio.destinatario_emailenvios         ?? undefined,
      destinatarioDireccion:    envio.destinatario_direccionenvios     ?? undefined,
      destinatarioCiudad:       envio.destinatario_ciudadenvios        ?? undefined,
      destinatarioDepartamento: envio.destinatario_departamentoenvios  ?? undefined,
      destinatarioCodigoPostal: envio.destinatario_codigo_postalenvios ?? undefined,
      destinatarioPais:         envio.destinatario_paisenvios          ?? 'CO',
    })
  }, [envio])

  const set = (k: keyof ActualizarDireccionEnvioPayload, v: string) =>
    setForm(p => ({ ...p, [k]: v || null }))

  const handleGuardar = () => {
    if (!form.destinatarioNombre?.trim()) {
      toast.error('El nombre del destinatario es requerido')
      return
    }
    actualizar.mutate({ envioId, datos: form }, {
      onSuccess: () => {
        toast.success(`Dirección de ${numeroGuia} actualizada`)
        onClose()
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar'),
    })
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Corregir dirección — {numeroGuia}</DialogTitle>
          <DialogDescription>
            Modifica los datos del destinatario antes del despacho. El PDF de guía se regenerará con la nueva dirección.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={form.destinatarioNombre ?? ''}
                onChange={e => set('destinatarioNombre', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Documento</Label>
              <Input
                value={form.destinatarioDocumento ?? ''}
                onChange={e => set('destinatarioDocumento', e.target.value)}
                className="h-8 text-sm"
                placeholder="CC / NIT"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Teléfono</Label>
              <Input
                value={form.destinatarioTelefono ?? ''}
                onChange={e => set('destinatarioTelefono', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.destinatarioEmail ?? ''}
                onChange={e => set('destinatarioEmail', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Dirección</Label>
              <Input
                value={form.destinatarioDireccion ?? ''}
                onChange={e => set('destinatarioDireccion', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ciudad</Label>
              <Input
                value={form.destinatarioCiudad ?? ''}
                onChange={e => set('destinatarioCiudad', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Input
                value={form.destinatarioDepartamento ?? ''}
                onChange={e => set('destinatarioDepartamento', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código postal</Label>
              <Input
                value={form.destinatarioCodigoPostal ?? ''}
                onChange={e => set('destinatarioCodigoPostal', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">País</Label>
              <Input
                maxLength={2}
                value={form.destinatarioPais ?? 'CO'}
                onChange={e => set('destinatarioPais', e.target.value.toUpperCase())}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={actualizar.isPending || isLoading}>
            {actualizar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── ReporteContent ────────────────────────────────────────────────────────────

function ReporteContent({
  sesionId, cajaNombre, sucursalLabel,
}: {
  sesionId:      number
  cajaNombre:    string
  sucursalLabel: string
}) {
  const { data: movimientos, isLoading } = useMovimientos(sesionId)

  const ventas      = movimientos?.filter(m => TIPOS_VENTA.has(m.tipo))    ?? []
  const anulaciones = movimientos?.filter(m => m.tipo === 'anulacion')     ?? []
  const todas       = movimientos?.filter(
    m => TIPOS_VENTA.has(m.tipo) || m.tipo === 'anulacion',
  ) ?? []

  const totalVentas  = ventas.reduce((s, m) => s + Number(m.monto), 0)
  const totalAnulado = anulaciones.reduce((s, m) => s + Math.abs(Number(m.monto)), 0)
  const neto         = totalVentas - totalAnulado

  const fechaLabel = fmtFechaLarga(new Date())

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <p className="font-semibold">{cajaNombre}</p>
          <p className="text-sm text-muted-foreground">
            {sucursalLabel} · {fechaLabel}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4 mr-1.5" />
          Imprimir
        </Button>
      </div>

      <div className="hidden print:block text-center mb-6">
        <p className="text-lg font-bold">Reporte de Ventas del Día</p>
        <p className="text-sm">{sucursalLabel} — {cajaNombre}</p>
        <p className="text-sm">{fechaLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Impreso: {new Date().toLocaleString('es-CO')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        {[
          { label: 'Transacciones', value: isLoading ? null : String(todas.length), cls: '' },
          { label: 'Total ventas',  value: isLoading ? null : fmt(totalVentas), cls: '' },
          {
            label: 'Anulaciones',
            value: isLoading ? null : anulaciones.length > 0 ? `(${fmt(totalAnulado)})` : '—',
            cls:   anulaciones.length > 0 ? 'text-destructive' : '',
          },
          { label: 'Neto del turno', value: isLoading ? null : fmt(neto), cls: 'text-emerald-600' },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {value === null
                ? <Skeleton className="h-7 w-20" />
                : <p className={`text-2xl font-bold tabular-nums ${cls}`}>{value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center text-xs">#</TableHead>
              <TableHead className="w-20 text-xs">Hora</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Medio de pago</TableHead>
              <TableHead className="text-right text-xs">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : todas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Clock className="size-8 opacity-30" />
                    <p className="text-sm">No hay ventas registradas en este turno.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              todas.map((m, i) => {
                const esAnulacion = m.tipo === 'anulacion'
                return (
                  <TableRow key={m.id} className={esAnulacion ? 'bg-destructive/5' : undefined}>
                    <TableCell className="text-center text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                    <TableCell className="text-xs tabular-nums">{fmtHora(m.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={esAnulacion ? 'destructive' : 'secondary'} className="text-[10px]">
                        {TIPO_LABEL[m.tipo] ?? m.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.medioPago ? (MEDIO_LABEL[m.medioPago] ?? m.medioPago) : '—'}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums text-sm font-medium ${esAnulacion ? 'text-destructive' : ''}`}>
                      {esAnulacion ? `(${fmt(Math.abs(Number(m.monto)))})` : fmt(m.monto)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {!isLoading && todas.length > 0 && (
          <>
            <Separator />
            <div className="flex justify-end px-4 py-3 bg-muted/20">
              <div className="text-right space-y-0.5 min-w-[200px]">
                <div className="flex justify-between gap-8 text-xs text-muted-foreground">
                  <span>Ventas ({ventas.length})</span>
                  <span className="font-medium text-foreground tabular-nums">{fmt(totalVentas)}</span>
                </div>
                {anulaciones.length > 0 && (
                  <div className="flex justify-between gap-8 text-xs text-muted-foreground">
                    <span>Anulaciones ({anulaciones.length})</span>
                    <span className="font-medium text-destructive tabular-nums">({fmt(totalAnulado)})</span>
                  </div>
                )}
                <Separator className="my-1" />
                <div className="flex justify-between gap-8 text-sm font-semibold">
                  <span>Total neto</span>
                  <span className="tabular-nums text-emerald-600">{fmt(neto)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── CajaSelector ──────────────────────────────────────────────────────────────

function CajaSelector({
  cajas, value, onChange,
}: {
  cajas:    CardAuxiliar[]
  value:    number
  onChange: (id: number) => void
}) {
  if (cajas.length <= 1) return null
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Seleccionar caja" />
      </SelectTrigger>
      <SelectContent>
        {cajas.map(c => (
          <SelectItem key={c.cajaId} value={String(c.cajaId)}>
            {c.nombre} — {c.codigo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ── BalancePagosSection ───────────────────────────────────────────────────────

function BalancePagosSection() {
  const todayStr    = hoy()
  const [fechaInicio, setFechaInicio] = useState(todayStr)
  const [fechaFin,    setFechaFin]    = useState(todayStr)

  // fechaFin exclusive: add 1 day for the API call
  const fechaFinExclusive = fechaFin
    ? (() => {
        const d = new Date(`${fechaFin}T00:00:00Z`)
        d.setUTCDate(d.getUTCDate() + 1)
        return d.toISOString().slice(0, 10)
      })()
    : ''

  const { data, isLoading, error } = useBalancePagos(fechaInicio, fechaFinExclusive)

  const totals = data?.reduce(
    (acc, r) => ({
      banco:           acc.banco + Number(r.reposicionBanco),
      transportadora:  acc.transportadora + Number(r.reposicionTransportadora),
      cheque:          acc.cheque + Number(r.reposicionCheque),
      colpensiones:    acc.colpensiones + r.cantidadColpensiones,
    }),
    { banco: 0, transportadora: 0, cheque: 0, colpensiones: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">Fecha inicio</Label>
          <Input
            type="date"
            className="w-40"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha fin</Label>
          <Input
            type="date"
            className="w-40"
            value={fechaFin}
            min={fechaInicio}
            onChange={e => setFechaFin(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4 mr-1.5" />
          Imprimir
        </Button>
      </div>

      {/* Totales */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Rep. Banco',          value: fmt(totals.banco) },
            { label: 'Rep. Transportadora', value: fmt(totals.transportadora) },
            { label: 'Rep. Cheque',         value: fmt(totals.cheque) },
            { label: 'Colpensiones',        value: String(totals.colpensiones) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <p className="text-xl font-bold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Regional</TableHead>
              <TableHead className="text-xs">Punto</TableHead>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-right text-xs">Rep. Banco</TableHead>
              <TableHead className="text-right text-xs">Rep. Transportadora</TableHead>
              <TableHead className="text-right text-xs">Rep. Cheque</TableHead>
              <TableHead className="text-right text-xs">Colpensiones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                  Error al cargar el reporte.
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart3 className="size-8 opacity-30" />
                    <p className="text-sm">Sin datos para el rango seleccionado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{row.regional}</TableCell>
                  <TableCell className="text-xs">{row.punto}</TableCell>
                  <TableCell className="text-xs tabular-nums">{row.fecha}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(row.reposicionBanco)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(row.reposicionTransportadora)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{fmt(row.reposicionCheque)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums font-medium">
                    {row.cantidadColpensiones > 0 ? row.cantidadColpensiones : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {data && data.length > 0 && totals && (
          <>
            <Separator />
            <div className="flex justify-end px-4 py-3 bg-muted/20">
              <div className="text-right space-y-0.5 min-w-[320px]">
                {[
                  ['Reposición Banco',          fmt(totals.banco)],
                  ['Reposición Transportadora', fmt(totals.transportadora)],
                  ['Reposición Cheque',         fmt(totals.cheque)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-8 text-xs text-muted-foreground">
                    <span>{label}</span>
                    <span className="font-medium text-foreground tabular-nums">{value}</span>
                  </div>
                ))}
                <Separator className="my-1" />
                <div className="flex justify-between gap-8 text-sm font-semibold">
                  <span>Total reposiciones</span>
                  <span className="tabular-nums text-emerald-600">
                    {fmt(totals.banco + totals.transportadora + totals.cheque)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── VentasSection ─────────────────────────────────────────────────────────────

function VentasSection() {
  const user      = useSessionStore(s => s.user)
  const isAdmin   = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL'
  const userSucId = user?.sucursal_id ?? 0

  const [adminSucId,     setAdminSucId]     = useState(0)
  const [selectedCajaId, setSelectedCajaId] = useState(0)

  const sucursalId = isAdmin && !userSucId ? adminSucId : userSucId

  const { data: sucursales }                      = useSucursales({ limite: 200 })
  const { data: status, isLoading: loadingPunto } = useStatusPunto(sucursalId)

  const cajasPos = status?.cajas.filter(
    c => esCajaOperativa(c.tipo) && c.sesionId != null,
  ) ?? []

  const caja = cajasPos.find(c => c.cajaId === selectedCajaId) ?? cajasPos[0] ?? null

  const sucursalNombre =
    sucursales?.datos?.find(s => s.id === sucursalId)?.nombre ?? `Sucursal ${sucursalId}`

  return (
    <div className="space-y-6">
      {isAdmin && !userSucId && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">Sucursal:</span>
          <Select
            value={String(adminSucId)}
            onValueChange={(v) => {
              setAdminSucId(Number(v))
              setSelectedCajaId(0)
            }}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Seleccionar sucursal…" />
            </SelectTrigger>
            <SelectContent>
              {sucursales?.datos?.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!sucursalId && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Selecciona una sucursal para ver el reporte.' : 'Tu cuenta no tiene sucursal asignada.'}
          </p>
        </div>
      )}

      {sucursalId > 0 && (
        <>
          {loadingPunto ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-56" />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          ) : cajasPos.length === 0 ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="text-center space-y-2">
                <Clock className="size-10 mx-auto text-muted-foreground/30" />
                <p className="font-medium text-sm">Sin cajas POS activas</p>
                <p className="text-xs text-muted-foreground">
                  No hay cajas POS con sesión abierta en esta sucursal.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 print:hidden">
                <span className="text-sm font-medium">Caja:</span>
                {cajasPos.length === 1 ? (
                  <Badge variant="secondary">{caja?.nombre} · {caja?.codigo}</Badge>
                ) : (
                  <CajaSelector
                    cajas={cajasPos}
                    value={caja?.cajaId ?? 0}
                    onChange={(id) => setSelectedCajaId(id)}
                  />
                )}
              </div>

              {caja?.sesionId && (
                <ReporteContent
                  sesionId={caja.sesionId}
                  cajaNombre={caja.nombre}
                  sucursalLabel={sucursalNombre}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── HistoricoSection ──────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, { label: string; variant: 'secondary' | 'destructive' | 'outline' }> = {
  confirmada: { label: 'Confirmada', variant: 'secondary' },
  anulada:    { label: 'Anulada',    variant: 'destructive' },
}

function HistoricoSection() {
  const user    = useSessionStore(s => s.user)
  const isAdmin      = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL' || user?.rol === 'TESORERIA'
  const isSupervisor = user?.rol === 'SUPERVISOR_REGIONAL'
  const userSucId    = user?.sucursal_id ?? 0

  const todayStr = hoy()
  const [fechaInicio, setFechaInicio] = useState(todayStr)
  const [fechaFin,    setFechaFin]    = useState(todayStr)
  const [adminSucId,  setAdminSucId]  = useState(0)
  const [cajaId,      setCajaId]      = useState(0)
  const [page,        setPage]        = useState(1)
  const [descargando, setDescargando] = useState<number | null>(null)
  const [editandoEnvio, setEditandoEnvio] = useState<{ id: number; numeroGuia: string } | null>(null)

  const canEditDireccion = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL' || isSupervisor

  // ADMIN, TESORERIA pueden elegir cualquier sucursal; SUPERVISOR usa la suya
  const sucursalId = isAdmin ? (adminSucId || undefined) : (userSucId || undefined)
  const sucursalIdParaCajas = sucursalId ?? 0

  const { data: sucursales }    = useSucursales({ limite: 200 })
  const { data: statusPunto }   = useStatusPunto(sucursalIdParaCajas, 0)

  const cajasDisponibles = statusPunto?.cajas.filter(c => esCajaOperativa(c.tipo)) ?? []

  const { data, isLoading, error } = useVentasHistorico({
    fechaInicio,
    fechaFin,
    sucursalId,
    cajaId: cajaId || undefined,
    page,
    limit: 20,
  })

  async function handleDescargarGuia(envioId: number) {
    setDescargando(envioId)
    try { await abrirGuiaEnvioPdf(envioId) } finally { setDescargando(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Fecha inicio</Label>
          <Input
            type="date"
            className="w-40"
            value={fechaInicio}
            onChange={e => { setFechaInicio(e.target.value); setPage(1) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha fin</Label>
          <Input
            type="date"
            className="w-40"
            value={fechaFin}
            min={fechaInicio}
            onChange={e => { setFechaFin(e.target.value); setPage(1) }}
          />
        </div>
        {isAdmin && (
          <div className="space-y-1">
            <Label className="text-xs">Sucursal</Label>
            <Select
              value={String(adminSucId)}
              onValueChange={v => { setAdminSucId(Number(v)); setCajaId(0); setPage(1) }}
            >
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas</SelectItem>
                {sucursales?.datos?.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isSupervisor && (
          <div className="flex items-end pb-0.5">
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Viendo tu regional
            </Badge>
          </div>
        )}
        {sucursalId && cajasDisponibles.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs">Caja</Label>
            <Select
              value={String(cajaId)}
              onValueChange={v => { setCajaId(Number(v)); setPage(1) }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas las cajas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas</SelectItem>
                {cajasDisponibles.map(c => (
                  <SelectItem key={c.cajaId} value={String(c.cajaId)}>
                    {c.nombre} · {c.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {data && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{data.total} venta{data.total !== 1 ? 's' : ''} encontrada{data.total !== 1 ? 's' : ''}</span>
          {data.totalPaginas > 1 && (
            <span>· Página {data.pagina} de {data.totalPaginas}</span>
          )}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-xs">ID</TableHead>
              <TableHead className="w-36 text-xs">Fecha / Hora</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Medio de pago</TableHead>
              <TableHead className="text-right text-xs">Total</TableHead>
              <TableHead className="text-xs">Guías</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">
                  Error al cargar el reporte.
                </TableCell>
              </TableRow>
            ) : !data || data.datos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart3 className="size-8 opacity-30" />
                    <p className="text-sm">Sin ventas en el rango seleccionado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.datos.map(v => {
                const estadoInfo = ESTADO_LABEL[v.estado] ?? { label: v.estado, variant: 'outline' as const }
                const fecha = new Date(v.createdAt)
                const guiasFacturadas = v.envios.filter(e => e.estado === 'facturado')
                return (
                  <TableRow key={v.id} className={v.estado === 'anulada' ? 'bg-destructive/5' : undefined}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{v.id}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <div>{fecha.toLocaleDateString('es-CO')}</div>
                      <div className="text-muted-foreground">{fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoInfo.variant} className="text-[10px]">
                        {estadoInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {MEDIO_LABEL[v.medioPago] ?? v.medioPago}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums text-sm font-medium ${v.estado === 'anulada' ? 'text-destructive line-through' : ''}`}>
                      {fmt(v.total)}
                    </TableCell>
                    <TableCell>
                      {guiasFacturadas.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {guiasFacturadas.map(e => (
                            <div key={e.id} className="flex items-center gap-0.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[10px]"
                                disabled={descargando === e.id}
                                onClick={() => handleDescargarGuia(e.id)}
                              >
                                <Download className="size-3 mr-1" />
                                {e.numeroGuia}
                              </Button>
                              {canEditDireccion && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  title="Corregir dirección"
                                  onClick={() => setEditandoEnvio({ id: e.id, numeroGuia: e.numeroGuia })}
                                >
                                  <Pencil className="size-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {data.totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPaginas}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {editandoEnvio && (
        <EditarDireccionDialog
          envioId={editandoEnvio.id}
          numeroGuia={editandoEnvio.numeroGuia}
          open={true}
          onClose={() => setEditandoEnvio(null)}
        />
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

// ── SesionesCajaSection ───────────────────────────────────────────────────────

const SESION_ESTADO: Record<string, { label: string; variant: 'secondary' | 'outline' | 'destructive' }> = {
  abierta:  { label: 'Abierta',  variant: 'outline' },
  cerrada:  { label: 'Cerrada',  variant: 'secondary' },
  forzada:  { label: 'Forzada',  variant: 'destructive' },
}

function SesionesCajaSection() {
  const user       = useSessionStore(s => s.user)
  const isAdmin    = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL' || user?.rol === 'TESORERIA'
  const isSupervisor = user?.rol === 'SUPERVISOR_REGIONAL'

  const todayStr = hoy()
  const [desde,       setDesde]       = useState(todayStr)
  const [hasta,       setHasta]       = useState(todayStr)
  const [adminSucId,  setAdminSucId]  = useState(0)
  const [cajaId,      setCajaId]      = useState(0)
  const [page,        setPage]        = useState(1)

  const sucursalId = isAdmin ? (adminSucId || undefined) : undefined
  const sucursalIdParaCajas = sucursalId ?? 0

  const { data: sucursales }  = useSucursales({ limite: 200 })
  const { data: statusPunto } = useStatusPunto(sucursalIdParaCajas, 0)
  const cajasDisponibles = statusPunto?.cajas ?? []

  const { data, isLoading, error } = useSesionesHistorico({
    sucursalId,
    cajaId: cajaId || undefined,
    desde,
    hasta,
    pagina: page,
    limite: 50,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Fecha inicio</Label>
          <Input
            type="date"
            className="w-40"
            value={desde}
            onChange={e => { setDesde(e.target.value); setPage(1) }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha fin</Label>
          <Input
            type="date"
            className="w-40"
            value={hasta}
            min={desde}
            onChange={e => { setHasta(e.target.value); setPage(1) }}
          />
        </div>
        {isAdmin && (
          <div className="space-y-1">
            <Label className="text-xs">Sucursal</Label>
            <Select
              value={String(adminSucId)}
              onValueChange={v => { setAdminSucId(Number(v)); setCajaId(0); setPage(1) }}
            >
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Todas las sucursales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas</SelectItem>
                {sucursales?.datos?.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {sucursalId && cajasDisponibles.length > 1 && (
          <div className="space-y-1">
            <Label className="text-xs">Caja</Label>
            <Select
              value={String(cajaId)}
              onValueChange={v => { setCajaId(Number(v)); setPage(1) }}
            >
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Todas las cajas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todas</SelectItem>
                {cajasDisponibles.map(c => (
                  <SelectItem key={c.cajaId} value={String(c.cajaId)}>
                    {c.nombre} · {c.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {isSupervisor && (
          <div className="flex items-end pb-0.5">
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Viendo tu regional
            </Badge>
          </div>
        )}
      </div>

      {data && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{data.total} sesión{data.total !== 1 ? 'es' : ''} encontrada{data.total !== 1 ? 's' : ''}</span>
          {data.totalPaginas > 1 && (
            <span>· Página {data.pagina} de {data.totalPaginas}</span>
          )}
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-xs">ID</TableHead>
              <TableHead className="text-xs">Caja · Sucursal</TableHead>
              <TableHead className="text-xs">Regional</TableHead>
              <TableHead className="text-xs">Apertura</TableHead>
              <TableHead className="text-xs">Cierre</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-right text-xs">Monto apertura</TableHead>
              <TableHead className="text-right text-xs">Monto cierre</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}><Skeleton className="h-4 w-full" /></TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                  Error al cargar el reporte.
                </TableCell>
              </TableRow>
            ) : !data || data.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <BarChart3 className="size-8 opacity-30" />
                    <p className="text-sm">Sin sesiones en el rango seleccionado.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.items.map(s => {
                const estadoInfo = SESION_ESTADO[s.estado] ?? { label: s.estado, variant: 'outline' as const }
                const fechaAp = new Date(s.fechaApertura)
                const fechaCi = s.fechaCierre ? new Date(s.fechaCierre) : null
                return (
                  <TableRow key={s.id} className={s.estado === 'forzada' ? 'bg-destructive/5' : undefined}>
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{s.id}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{s.cajaNombre}</div>
                      <div className="text-muted-foreground">{s.sucursalNombre}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.regionalNombre}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      <div>{fechaAp.toLocaleDateString('es-CO')}</div>
                      <div className="text-muted-foreground">{fechaAp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {fechaCi ? (
                        <>
                          <div>{fechaCi.toLocaleDateString('es-CO')}</div>
                          <div className="text-muted-foreground">{fechaCi.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoInfo.variant} className="text-[10px]">
                        {estadoInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-medium">{fmt(s.montoApertura)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-medium">
                      {s.montoCierre ? fmt(s.montoCierre) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {data.totalPaginas}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.totalPaginas}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Reportes() {
  const user    = useSessionStore(s => s.user)
  const canSeeBalance = user?.rol === 'TESORERIA'
    || user?.rol === 'SUPERVISOR_REGIONAL'
    || user?.rol === 'ADMIN_SISTEMA'
    || user?.rol === 'ADMIN_NACIONAL'

  const canSeeHistorico = user?.rol === 'SUPERVISOR_REGIONAL'
    || user?.rol === 'ADMIN_SISTEMA'
    || user?.rol === 'ADMIN_NACIONAL'
    || user?.rol === 'TESORERIA'

  const canSeeSesiones = user?.rol === 'SUPERVISOR_REGIONAL'
    || user?.rol === 'ADMIN_SISTEMA'
    || user?.rol === 'ADMIN_NACIONAL'
    || user?.rol === 'TESORERIA'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 print:p-0 print:max-w-full">
      <div className="flex items-center gap-3 print:hidden">
        <FileText className="size-6 text-muted-foreground shrink-0" />
        <div>
          <h1 className="text-xl font-semibold leading-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Historial de ventas · Sesiones de caja · Balance de pagos
          </p>
        </div>
      </div>

      <Tabs defaultValue="ventas">
        <TabsList className="print:hidden">
          <TabsTrigger value="ventas">Ventas del día</TabsTrigger>
          {canSeeHistorico && (
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          )}
          {canSeeSesiones && (
            <TabsTrigger value="sesiones">Aperturas/Cierres</TabsTrigger>
          )}
          {canSeeBalance && (
            <TabsTrigger value="balance">Balance de Pagos</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="ventas" className="mt-4">
          <VentasSection />
        </TabsContent>

        {canSeeHistorico && (
          <TabsContent value="historico" className="mt-4">
            <HistoricoSection />
          </TabsContent>
        )}

        {canSeeSesiones && (
          <TabsContent value="sesiones" className="mt-4">
            <SesionesCajaSection />
          </TabsContent>
        )}

        {canSeeBalance && (
          <TabsContent value="balance" className="mt-4">
            <BalancePagosSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
