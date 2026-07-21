import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Loader2, Printer, Lock,
  AlertTriangle, ChevronRight, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import { Badge }    from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useSaldoSesion, useMovimientos, useCerrarAuxiliar,
  useRegistrarDiferencia, useCaja,
  type Movimiento,
} from '@/queries/cajas.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP  = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt  = (v: string | number | null | undefined) => COP.format(Number(v ?? 0))
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

const BILLETES = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000]
const MONEDAS  = [1_000, 500, 200, 100, 50]

const CAUSAS_DIF = [
  'Error en cobro', 'Billete falso', 'Cambio incorrecto',
  'Error en pago giro', 'Error en recaudo', 'Otro',
]

const TIPO_LABELS: Record<string, string> = {
  apertura:             'Apertura',
  cierre:               'Cierre',
  venta_producto:       'Venta producto',
  venta_servicio:       'Venta servicio',
  venta_estampilla:     'Estampilla',
  apartado_postal:      'Apartado postal',
  giro_pago:            'Pago giro',
  giro_emision_cobro:   'Emisión giro',
  consignacion:         'Consignación',
  reposicion:           'Reposición',
  cambio_custodia_in:   'Custodia recibida',
  cambio_custodia_out:  'Custodia entregada',
  diferencia_faltante:  'Faltante',
  diferencia_sobrante:  'Sobrante',
  anulacion:            'Anulación',
  recaudo:              'Recaudo',
  moneda_circulante:    'Moneda circulante',
  pago_administrativo:  'Pago administrativo',
}

const TIPOS_EFECTIVO = new Set([
  'apertura', 'reposicion', 'venta_producto', 'venta_servicio',
  'venta_estampilla', 'giro_emision_cobro', 'recaudo',
  'moneda_circulante', 'apartado_postal', 'cambio_custodia_in',
])

// ── Tab types ─────────────────────────────────────────────────────────────────

const MODULE_TABS = [
  { id: 'giros',      label: 'Giros Nacionales',          ext: true  },
  { id: 'moneygram',  label: 'Giros MoneyGram',           ext: true  },
  { id: 'venta',      label: 'Venta Servicios Físicos',   ext: true  },
  { id: 'ria',        label: 'RIA',                       ext: true  },
  { id: 'recaudo',    label: 'Recaudo',                   ext: true  },
  { id: 'admin',      label: 'Transacciones Admin',       ext: false },
] as const

type ModuleId  = typeof MODULE_TABS[number]['id']
type AdminTab  = 'cierre' | 'diferencias' | 'reportes' | 'custodia' | 'medios'

const ADMIN_SUBTABS: { id: AdminTab; label: string }[] = [
  { id: 'cierre',       label: 'Cierre' },
  { id: 'diferencias',  label: 'Diferencias' },
  { id: 'reportes',     label: 'Reportes' },
  { id: 'custodia',     label: 'Cambio de Custodia' },
  { id: 'medios',       label: 'Medios de Pago' },
]

// ── Panel derecho — resumen en vivo ───────────────────────────────────────────

function PanelResumen({
  sesion, movs,
}: {
  sesion: { saldoActual: string | null; alertas: string[]; montoApertura: string }
  movs: Movimiento[]
}) {
  const resumen = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>()
    for (const m of movs) {
      const prev = map.get(m.tipo) ?? { count: 0, total: 0 }
      map.set(m.tipo, { count: prev.count + 1, total: prev.total + Number(m.monto) })
    }
    return Array.from(map.entries())
      .map(([tipo, v]) => ({ tipo, label: TIPO_LABELS[tipo] ?? tipo, ...v }))
      .sort((a, b) => b.total - a.total)
  }, [movs])

  const totalEfectivo = movs
    .filter(m => TIPOS_EFECTIVO.has(m.tipo) && (!m.medioPago || m.medioPago === 'efectivo'))
    .reduce((s, m) => s + Number(m.monto), 0)

  const totalCredito = movs
    .filter(m => m.medioPago === 'tarjeta_credito')
    .reduce((s, m) => s + Number(m.monto), 0)

  const tieneAlertas = sesion.alertas.length > 0

  return (
    <div className="flex flex-col gap-0 text-xs">

      {/* Saldo */}
      <div className="rounded-lg border p-3 bg-card text-center mb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo del turno</p>
        <p className="text-2xl font-bold tabular-nums mt-0.5">{fmt(sesion.saldoActual)}</p>
      </div>

      {/* Resumen de operaciones */}
      <div className="border rounded-t-lg overflow-hidden">
        <div className="bg-blue-900 dark:bg-blue-950 text-white px-3 py-1.5 font-semibold text-[11px] uppercase tracking-wide">
          Resumen de Operaciones
        </div>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-blue-50 dark:bg-blue-950/40">
              <th className="text-left px-2 py-1 font-semibold text-muted-foreground">Operación</th>
              <th className="text-right px-2 py-1 font-semibold text-muted-foreground w-8">Cant</th>
              <th className="text-right px-2 py-1 font-semibold text-muted-foreground">Valor total</th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 py-3 text-center text-muted-foreground italic">
                  Sin operaciones
                </td>
              </tr>
            ) : (
              resumen.map(r => (
                <tr key={r.tipo} className="border-t hover:bg-muted/20">
                  <td className="px-2 py-1 max-w-[110px] truncate">{r.label}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{r.count}</td>
                  <td className="px-2 py-1 text-right tabular-nums font-medium">{fmt(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Entradas Efectivo / T.Crédito */}
      <div className="border border-t-0 overflow-hidden">
        <div className="bg-blue-800 dark:bg-blue-950 text-white px-3 py-1 text-[10px] uppercase tracking-wide font-semibold">
          Entradas
        </div>
        <div className="grid grid-cols-2 divide-x text-center">
          <div className="px-2 py-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Efectivo</p>
            <p className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {COP.format(totalEfectivo)}
            </p>
          </div>
          <div className="px-2 py-2">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">T. Crédito</p>
            <p className="font-bold tabular-nums">{COP.format(totalCredito)}</p>
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className={cn(
        'border border-t-0 px-3 py-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white',
        tieneAlertas ? 'bg-red-600' : 'bg-emerald-600',
      )}>
        <AlertTriangle className="size-3" />
        ALERTAS ({sesion.alertas.length})
      </div>

      {/* Tabla conceptos */}
      <div className="border border-t-0 rounded-b-lg overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-2 py-1 font-semibold text-muted-foreground">Concepto</th>
              <th className="text-left px-2 py-1 font-semibold text-muted-foreground">Observación</th>
            </tr>
          </thead>
          <tbody>
            {sesion.alertas.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-2 py-3 text-center text-muted-foreground italic">
                  Sin alertas
                </td>
              </tr>
            ) : (
              sesion.alertas.map((a, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1 text-red-600 font-medium">
                    {a === 'limite_efectivo_caja' ? 'Exceso efectivo' : 'Saldo bajo base'}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Imprimir recibo */}
      <Button variant="outline" size="sm" className="mt-3 w-full text-xs gap-1.5" disabled>
        <Printer className="size-3.5" /> Imprimir último recibo
      </Button>
    </div>
  )
}

// ── Tab: Cierre ───────────────────────────────────────────────────────────────

function TabCierre({ sesionId, saldoEsperado }: { sesionId: number; saldoEsperado: string | null }) {
  const cerrar = useCerrarAuxiliar(sesionId)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})
  const [showDenom, setShowDenom] = useState(true)

  const totalBilletes = BILLETES.reduce((s, b) => s + b * (cantidades[`b${b}`] ?? 0), 0)
  const totalMonedas  = MONEDAS.reduce((s, m) => s + m * (cantidades[`m${m}`] ?? 0), 0)
  const totalArqueo   = totalBilletes + totalMonedas
  const diferencia    = saldoEsperado != null ? totalArqueo - Number(saldoEsperado) : null

  const setVal = (k: string, v: string) => setCantidades(p => ({ ...p, [k]: Number(v) || 0 }))

  function handleCierre() {
    cerrar.mutate(
      { totalArqueo: String(totalArqueo) },
      {
        onSuccess: () => toast.success('Caja cerrada correctamente'),
        onError:   e => toast.error(e.message),
      },
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        Usted está realizando un cierre parcial. Realice Arqueo
      </p>

      <Button
        variant="ghost" size="sm" className="w-full justify-between text-xs border"
        onClick={() => setShowDenom(p => !p)}
      >
        Detalle por denominaciones
        {showDenom ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </Button>

      {showDenom && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Billetes */}
          <div className="rounded border overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 font-semibold text-[10px] uppercase tracking-wide border-b">
              Denominación BILLETES
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20 text-[10px] text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium w-6">#</th>
                  <th className="px-2 py-1 text-left font-medium">Denominación</th>
                  <th className="px-2 py-1 text-left font-medium">Cantidad</th>
                  <th className="px-2 py-1 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {BILLETES.map((b, i) => (
                  <tr key={b} className="border-t">
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1 tabular-nums">{COP.format(b)}</td>
                    <td className="px-2 py-1">
                      <Input
                        type="number" min="0"
                        className="h-6 w-16 text-xs px-1.5"
                        value={cantidades[`b${b}`] ?? ''}
                        onChange={e => setVal(`b${b}`, e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {COP.format(b * (cantidades[`b${b}`] ?? 0))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={3} className="px-2 py-1">TOTAL BILLETES</td>
                  <td className="px-2 py-1 text-right tabular-nums">{COP.format(totalBilletes)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Monedas */}
          <div className="rounded border overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 font-semibold text-[10px] uppercase tracking-wide border-b">
              Denominación MONEDAS
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20 text-[10px] text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium w-6">#</th>
                  <th className="px-2 py-1 text-left font-medium">Denominación</th>
                  <th className="px-2 py-1 text-left font-medium">Cantidad</th>
                  <th className="px-2 py-1 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {MONEDAS.map((m, i) => (
                  <tr key={m} className="border-t">
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1 tabular-nums">{COP.format(m)}</td>
                    <td className="px-2 py-1">
                      <Input
                        type="number" min="0"
                        className="h-6 w-16 text-xs px-1.5"
                        value={cantidades[`m${m}`] ?? ''}
                        onChange={e => setVal(`m${m}`, e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {COP.format(m * (cantidades[`m${m}`] ?? 0))}
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={3} className="px-2 py-1">TOTAL MONEDAS</td>
                  <td className="px-2 py-1 text-right tabular-nums">{COP.format(totalMonedas)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen arqueo */}
      <div className="rounded border bg-muted/20 p-3 text-sm space-y-2 max-w-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Arqueo:</span>
          <span className="font-bold tabular-nums">{COP.format(totalArqueo)}</span>
        </div>
        {saldoEsperado && (
          <>
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>Saldo esperado (sistema):</span>
              <span className="tabular-nums">{fmt(saldoEsperado)}</span>
            </div>
            {diferencia !== null && (
              <div className={cn(
                'flex justify-between font-semibold text-sm pt-1 border-t',
                diferencia === 0 ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-red-600',
              )}>
                <span>{diferencia === 0 ? 'Sin diferencia ✓' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
                {diferencia !== 0 && (
                  <span className="tabular-nums">{COP.format(Math.abs(diferencia))}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          disabled={totalArqueo === 0 || cerrar.isPending}
          onClick={handleCierre}
          variant={diferencia !== 0 ? 'destructive' : 'default'}
          className="gap-1.5"
        >
          {cerrar.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {diferencia !== 0 ? 'Cerrar con diferencia' : 'Aceptar'}
        </Button>
        <Button variant="outline" disabled className="gap-1.5">
          <Printer className="size-3.5" /> Imprimir
        </Button>
        <Button variant="outline" onClick={() => setCantidades({})}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ── Tab: Diferencias ──────────────────────────────────────────────────────────

function TabDiferencias({ sesionId }: { sesionId: number }) {
  const diferencia = useRegistrarDiferencia(sesionId)
  const user = useSessionStore(s => s.user)

  const [tipo,     setTipo]     = useState<'diferencia_sobrante' | 'diferencia_faltante'>('diferencia_faltante')
  const [causa,    setCausa]    = useState('')
  const [obs,      setObs]      = useState('')
  const [valor,    setValor]    = useState('')
  const [confirmar,setConfirmar]= useState('')

  const mismatch = confirmar !== '' && valor !== confirmar

  function handleSubmit() {
    if (!valor || !causa || mismatch) return
    diferencia.mutate(
      { tipo, valor, causa, observacion: obs || undefined },
      {
        onSuccess: () => {
          toast.success('Diferencia registrada')
          setValor(''); setConfirmar(''); setCausa(''); setObs('')
        },
        onError: e => toast.error(e.message),
      },
    )
  }

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">Usted está registrando una Diferencia</p>

      <div className="rounded border p-4 space-y-4">
        <p className="font-semibold text-sm">Registrar Diferencia</p>

        {/* Sobrante / Faltante */}
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio" name="tipoDif"
              checked={tipo === 'diferencia_sobrante'}
              onChange={() => setTipo('diferencia_sobrante')}
            />
            Sobrante
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio" name="tipoDif"
              checked={tipo === 'diferencia_faltante'}
              onChange={() => setTipo('diferencia_faltante')}
            />
            Faltante
          </label>
        </div>

        <div className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 items-center text-sm">
          <Label className="text-xs">Causa:</Label>
          <Select value={causa} onValueChange={setCausa}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {CAUSAS_DIF.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Label className="text-xs self-start pt-1">Observaciones:</Label>
          <Textarea
            className="h-16 text-sm resize-none"
            value={obs}
            onChange={e => setObs(e.target.value)}
          />

          <Label className="text-xs">Responsable:</Label>
          <span className="text-sm font-medium">{user?.nombre ?? '—'}</span>

          <Label className="text-xs">Valor:</Label>
          <Input
            type="number" min="0" step="1000"
            className="h-8 w-40 text-sm tabular-nums"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />

          <Label className="text-xs">Confirmar valor:</Label>
          <div>
            <Input
              type="number" min="0" step="1000"
              className={cn('h-8 w-40 text-sm tabular-nums', mismatch && 'border-red-400')}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">Los valores no coinciden</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            disabled={!valor || !causa || mismatch || diferencia.isPending}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {diferencia.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Registrar Diferencia
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => { setValor(''); setConfirmar(''); setCausa(''); setObs('') }}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Reportes ─────────────────────────────────────────────────────────────

function TabReportes({ movs }: { movs: Movimiento[] }) {
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const tiposUnicos = useMemo(
    () => Array.from(new Set(movs.map(m => m.tipo))),
    [movs],
  )

  const filtered = filtroTipo === 'todos' ? movs : movs.filter(m => m.tipo === filtroTipo)

  const totalGeneral = filtered.reduce((s, m) => s + Number(m.monto), 0)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Reporte Operación</p>

      {/* Filtros */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Operación:</Label>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-7 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {tiposUnicos.map(t => (
                <SelectItem key={t} value={t}>{TIPO_LABELS[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs shrink-0">Fecha:</Label>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs">Consultar</Button>
      </div>

      {/* Tabla */}
      <div className="rounded border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Hora</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Operación</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Descripción</th>
              <th className="text-left px-3 py-1.5 font-semibold text-muted-foreground">Medio</th>
              <th className="text-right px-3 py-1.5 font-semibold text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center text-muted-foreground italic">
                  Sin registros para los filtros seleccionados
                </td>
              </tr>
            ) : (
              filtered.map(m => (
                <tr key={m.id} className="border-t hover:bg-muted/20">
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{hora(m.createdAt)}</td>
                  <td className="px-3 py-1.5">{TIPO_LABELS[m.tipo] ?? m.tipo}</td>
                  <td className="px-3 py-1.5 text-muted-foreground max-w-[180px] truncate">{m.descripcion ?? '—'}</td>
                  <td className="px-3 py-1.5">{m.medioPago ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(m.monto)}</td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td colSpan={4} className="px-3 py-1.5 text-muted-foreground">
                  Total ({filtered.length} registros)
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{COP.format(totalGeneral)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled>
          Exportar a Excel
        </Button>
      </div>
    </div>
  )
}

// ── Tab: Cambio de Custodia ───────────────────────────────────────────────────

function TabCustodia() {
  const user = useSessionStore(s => s.user)
  const [valor,     setValor]     = useState('')
  const [confirmar, setConfirmar] = useState('')

  const mismatch = confirmar !== '' && valor !== confirmar

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">Cambio de Custodia</p>

      <div className="rounded border p-4 space-y-4">
        <div className="rounded bg-muted/30 px-3 py-2 text-sm font-medium">
          {user?.nombre ?? '—'}
        </div>

        <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-3 items-center text-sm">
          <Label className="text-xs">Valor:</Label>
          <Input
            type="number" min="0" step="1000"
            className="h-8 w-40 text-sm tabular-nums"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />

          <Label className="text-xs">Confirmar valor:</Label>
          <div>
            <Input
              type="number" min="0" step="1000"
              className={cn('h-8 w-40 text-sm tabular-nums', mismatch && 'border-red-400')}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">Los valores no coinciden</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            disabled={!valor || mismatch}
            onClick={() => toast.info('Funcionalidad en desarrollo')}
          >
            Registrar Cambio de Custodia
          </Button>
          <Button size="sm" variant="outline"
            onClick={() => { setValor(''); setConfirmar('') }}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Medios de Pago ───────────────────────────────────────────────────────

function TabMedios() {
  const [modo, setModo] = useState<'transferencia' | 'cheque'>('transferencia')

  return (
    <div className="space-y-4 max-w-lg">
      <p className="text-sm text-muted-foreground">
        Usted está realizando una solicitud por: {modo === 'transferencia' ? 'Transferencia / Consignación' : 'Cheque'}
      </p>

      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="medioModo" checked={modo === 'transferencia'} onChange={() => setModo('transferencia')} />
          Transferencia / Consignación
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name="medioModo" checked={modo === 'cheque'} onChange={() => setModo('cheque')} />
          Cheques
        </label>
      </div>

      <div className="rounded border p-6 text-center text-sm text-muted-foreground">
        Funcionalidad disponible próximamente
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DetalleCaja() {
  const { sesionId } = useParams<{ sesionId: string }>()
  const id           = Number(sesionId)
  const navigate     = useNavigate()
  const user         = useSessionStore(s => s.user)

  const { data: sesion, isLoading: loadingSesion, refetch: refetchSesion } = useSaldoSesion(id)
  const { data: movs = [], isLoading: loadingMovs, refetch: refetchMovs }  = useMovimientos(id)
  const { data: caja }                                                      = useCaja(sesion?.cajaId ?? 0)

  const [moduleTab, setModuleTab] = useState<ModuleId>('admin')
  const [adminTab,  setAdminTab]  = useState<AdminTab>('cierre')

  function reload() { refetchSesion(); refetchMovs() }

  if (loadingSesion) {
    return (
      <div className="p-5 space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded" />
        <div className="grid grid-cols-[1fr_272px] gap-4 mt-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!sesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="size-10 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground">Sesión no encontrada</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Volver</Button>
        </div>
      </div>
    )
  }

  const isClosed = sesion.estado !== 'abierta'

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b bg-card px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {caja ? `Caja ${caja.codigo}` : `Sesión #${id}`}
              {caja && <span className="font-normal text-muted-foreground ml-2">{caja.nombre}</span>}
            </p>
          </div>
          {isClosed
            ? <Badge variant="secondary" className="shrink-0">Turno {sesion.estado}</Badge>
            : <Badge className="bg-emerald-600 hover:bg-emerald-600 shrink-0">Abierta</Badge>
          }
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="text-right text-xs">
            <p className="font-medium">{user?.nombre ?? '—'}</p>
            <p className="text-muted-foreground">
              {new Date().toLocaleString('es-CO', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="size-7" onClick={reload}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </header>

      {/* ── Módulos tab bar ──────────────────────────────────────────────────── */}
      <nav className="shrink-0 border-b bg-card px-2 flex items-end overflow-x-auto">
        {MODULE_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => !tab.ext && setModuleTab(tab.id)}
            title={tab.ext ? 'Disponible en SIPOST' : undefined}
            className={cn(
              'px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 shrink-0',
              moduleTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground',
              tab.ext
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:text-foreground hover:border-muted-foreground/30',
            )}
          >
            {tab.ext && <Lock className="size-2.5" />}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Área principal: dos columnas ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Columna izquierda — contenido */}
        <div className="flex-1 overflow-auto">

          {/* Módulo externo */}
          {moduleTab !== 'admin' && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-8">
              <Lock className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Este módulo está disponible en SIPOST</p>
              <p className="text-xs text-muted-foreground/60">
                Acceda al sistema externo para procesar estas transacciones
              </p>
            </div>
          )}

          {/* Transacciones Admin */}
          {moduleTab === 'admin' && (
            <>
              {/* Sub-menú admin — sticky */}
              <nav className="sticky top-0 z-10 border-b bg-card px-4 flex items-end">
                {ADMIN_SUBTABS.map(t => {
                  const disabledWhenClosed = isClosed && t.id !== 'reportes'
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => !disabledWhenClosed && setAdminTab(t.id)}
                      className={cn(
                        'px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                        adminTab === t.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground',
                        disabledWhenClosed
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:text-foreground hover:border-muted-foreground/30',
                      )}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </nav>

              {/* Contenido del sub-tab */}
              <div className="p-5">
                {adminTab === 'cierre' && (
                  isClosed
                    ? <p className="text-sm text-muted-foreground">Esta caja ya está cerrada.</p>
                    : <TabCierre sesionId={id} saldoEsperado={sesion.saldoActual} />
                )}
                {adminTab === 'diferencias' && (
                  isClosed
                    ? <p className="text-sm text-muted-foreground">La caja está cerrada — no se pueden registrar diferencias.</p>
                    : <TabDiferencias sesionId={id} />
                )}
                {adminTab === 'reportes' && (
                  loadingMovs
                    ? <Skeleton className="h-40 w-full" />
                    : <TabReportes movs={movs} />
                )}
                {adminTab === 'custodia' && (
                  isClosed
                    ? <p className="text-sm text-muted-foreground">La caja está cerrada.</p>
                    : <TabCustodia />
                )}
                {adminTab === 'medios' && (
                  isClosed
                    ? <p className="text-sm text-muted-foreground">La caja está cerrada.</p>
                    : <TabMedios />
                )}
              </div>
            </>
          )}
        </div>

        {/* Columna derecha — panel resumen */}
        <div className="w-72 shrink-0 border-l overflow-auto p-3 bg-muted/10">
          {loadingMovs ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : (
            <PanelResumen sesion={sesion} movs={movs} />
          )}
        </div>
      </div>
    </div>
  )
}
