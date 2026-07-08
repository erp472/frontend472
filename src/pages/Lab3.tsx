/**
 * Lab3 — Mockups Sprints 1-4: Caja · Giros · Ventas · Despacho
 *
 * Pantallas estáticas para validar UX con el cliente.
 * Sin conexión a API — datos y flujos hardcodeados.
 */

import { useState, Fragment } from 'react'
import {
  Banknote, CheckCircle2, XCircle, Loader2, Fingerprint,
  Search, ChevronRight, ChevronLeft, ArrowRight,
  BadgeCheck, AlertTriangle, Printer, ReceiptText,
  TrendingUp, ArrowDownLeft, ArrowUpRight, Clock,
  CircleDollarSign, User, Globe, Package, Trash2,
  ShoppingCart, Plus, Send, BoxSelect, ScanBarcode,
  FileText, Weight,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

// ── Helpers ────────────────────────────────────────────────────────────────────

function cop(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

type StepStatus = 'done' | 'active' | 'pending'

function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-0 w-full mb-6">
      {steps.map((label, i) => {
        const status: StepStatus = i < current ? 'done' : i === current ? 'active' : 'pending'
        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                status === 'done' ? 'bg-primary border-primary text-primary-foreground' : '',
                status === 'active' ? 'border-primary text-primary bg-background' : '',
                status === 'pending' ? 'border-muted-foreground/30 text-muted-foreground/40 bg-background' : '',
              ].join(' ')}>
                {status === 'done' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={[
                'text-[10px] whitespace-nowrap font-medium',
                status === 'active' ? 'text-primary' : 'text-muted-foreground/60',
              ].join(' ')}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={[
                'h-0.5 flex-1 mx-1 mb-4 rounded',
                i < current ? 'bg-primary' : 'bg-muted',
              ].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function WizardNav({
  step, total, onBack, onNext, nextLabel = 'Continuar', nextDisabled = false, loading = false,
}: {
  step: number; total: number; onBack: () => void; onNext: () => void
  nextLabel?: string; nextDisabled?: boolean; loading?: boolean
}) {
  return (
    <div className="flex justify-between items-center pt-4 border-t mt-6">
      <Button variant="ghost" onClick={onBack} disabled={step === 0}>
        <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
      </Button>
      <span className="text-xs text-muted-foreground">{step + 1} / {total}</span>
      <Button onClick={onNext} disabled={nextDisabled || loading}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {nextLabel} {!loading && step < total - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
      </Button>
    </div>
  )
}

// ── Pantalla 1: Caja – Apertura ───────────────────────────────────────────────

const BILLETES = [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000]
const MONEDAS  = [500, 200, 100, 50]

function CajaApertura({ onDone }: { onDone: () => void }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [confirmed, setConfirmed] = useState(false)

  const set = (denom: number, val: string) => {
    const n = parseInt(val) || 0
    setCantidades(prev => ({ ...prev, [denom]: n }))
  }

  const total = [...BILLETES, ...MONEDAS].reduce((acc, d) => acc + d * (cantidades[d] ?? 0), 0)

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Caja abierta correctamente</h2>
        <p className="text-muted-foreground text-sm">Saldo inicial: <strong>{cop(total)}</strong></p>
        <p className="text-xs text-muted-foreground">24/04/2026 – 08:00 a.m. · Cajero: Lida Guerrero</p>
        <Button className="mt-4" onClick={onDone}>Ir al dashboard de caja <ArrowRight className="ml-2 w-4 h-4" /></Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" /> Apertura de Caja
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Punto: <strong>P.V. Principal · Bogotá</strong> &nbsp;·&nbsp; Cajero: <strong>Lida Guerrero</strong>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conteo de billetes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_100px_110px] gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-muted-foreground">Denominación</span>
            <span className="font-medium text-muted-foreground text-right">Cantidad</span>
            <span className="font-medium text-muted-foreground text-right">Subtotal</span>
            <Separator className="col-span-3" />
            {BILLETES.map(d => (
              <Fragment key={d}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary/40" />
                  {cop(d)}
                </span>
                <Input
                  type="number" min={0} placeholder="0"
                  className="h-7 text-right text-sm"
                  value={cantidades[d] ?? ''}
                  onChange={e => set(d, e.target.value)}
                />
                <span className="text-right text-muted-foreground">
                  {cantidades[d] ? cop(d * cantidades[d]) : '—'}
                </span>
              </Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conteo de monedas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_100px_110px] gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-muted-foreground">Denominación</span>
            <span className="font-medium text-muted-foreground text-right">Cantidad</span>
            <span className="font-medium text-muted-foreground text-right">Subtotal</span>
            <Separator className="col-span-3" />
            {MONEDAS.map(d => (
              <Fragment key={d}>
                <span>{cop(d)}</span>
                <Input
                  type="number" min={0} placeholder="0"
                  className="h-7 text-right text-sm"
                  value={cantidades[d] ?? ''}
                  onChange={e => set(d, e.target.value)}
                />
                <span className="text-right text-muted-foreground">
                  {cantidades[d] ? cop(d * cantidades[d]) : '—'}
                </span>
              </Fragment>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between bg-muted/30 rounded-b-xl">
          <span className="font-semibold">Total saldo inicial</span>
          <span className="text-xl font-bold text-primary">{cop(total)}</span>
        </CardFooter>
      </Card>

      <Button className="w-full" size="lg" disabled={total === 0} onClick={() => setConfirmed(true)}>
        Confirmar apertura de caja
      </Button>
    </div>
  )
}

// ── Pantalla 2: Caja – Dashboard ──────────────────────────────────────────────

const MOCK_TRANSACCIONES = [
  { hora: '08:12', tipo: 'Apertura de caja',          ref: '00006428', valor: 2_000_000,  signo: 1  },
  { hora: '08:47', tipo: 'Emisión Giro Nacional',     ref: '224-5029940', valor: 375_000, signo: 1  },
  { hora: '09:15', tipo: 'Emisión Giro Nacional',     ref: '224-5029938', valor: 310_000, signo: 1  },
  { hora: '09:53', tipo: 'Pago Giro Nacional',        ref: '224-5029937', valor: 516_000, signo: -1 },
  { hora: '10:22', tipo: 'Venta Servicios Físicos',   ref: '00006583',  valor: 40_000,   signo: 1  },
  { hora: '11:08', tipo: 'Emisión MoneyGram',         ref: 'MG-890231', valor: 515_000,  signo: 1  },
  { hora: '11:44', tipo: 'Recaudo DIAL',              ref: 'REC-00341', valor: 148_750,  signo: 1  },
]

function CajaDashboard() {
  const totalEntradas = MOCK_TRANSACCIONES.filter(t => t.signo > 0).reduce((a, t) => a + t.valor, 0)
  const totalSalidas  = MOCK_TRANSACCIONES.filter(t => t.signo < 0).reduce((a, t) => a + t.valor, 0)
  const saldoInicial  = 2_000_000
  const saldoActual   = saldoInicial + totalEntradas - totalSalidas

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Caja — P.V. Principal Bogotá</h2>
          <p className="text-sm text-muted-foreground">Cajero: Lida Guerrero &nbsp;·&nbsp; 24/04/2026 &nbsp;·&nbsp; Caja #1113</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Abierta</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50"><CircleDollarSign className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo inicial</p>
                <p className="text-lg font-bold">{cop(saldoInicial)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Transacciones hoy</p>
                <p className="text-lg font-bold">{MOCK_TRANSACCIONES.length - 1}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Banknote className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo actual (sistema)</p>
                <p className="text-lg font-bold text-primary">{cop(saldoActual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" /> Movimientos del día
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_TRANSACCIONES.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground text-sm">{t.hora}</TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1.5">
                      {t.signo > 0
                        ? <ArrowUpRight className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        : <ArrowDownLeft className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      {t.tipo}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">{t.ref}</TableCell>
                  <TableCell className={['text-right font-medium text-sm',
                    t.signo > 0 ? 'text-green-600' : 'text-red-500'].join(' ')}>
                    {t.signo > 0 ? '+' : '−'}{cop(t.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm"><Banknote className="w-4 h-4 mr-1.5" />Consignación</Button>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
          Cerrar caja
        </Button>
      </div>
    </div>
  )
}

// ── Pantalla 3: Caja – Cierre ─────────────────────────────────────────────────

function CajaCierre() {
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [confirmed, setConfirmed] = useState(false)

  const set = (denom: number, val: string) => {
    const n = parseInt(val) || 0
    setCantidades(prev => ({ ...prev, [denom]: n }))
  }

  const conteoFisico = [...BILLETES, ...MONEDAS].reduce((acc, d) => acc + d * (cantidades[d] ?? 0), 0)
  const saldoSistema = 2_888_750
  const diferencia   = conteoFisico - saldoSistema

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Cierre de caja registrado</h2>
        <p className="text-muted-foreground text-sm">Saldo final: <strong>{cop(conteoFisico)}</strong></p>
        {diferencia !== 0 && (
          <Badge variant={diferencia < 0 ? 'destructive' : 'outline'} className="text-sm px-3 py-1">
            Diferencia: {diferencia > 0 ? '+' : ''}{cop(diferencia)}
          </Badge>
        )}
        <p className="text-xs text-muted-foreground">24/04/2026 – 06:00 p.m. · Cajero: Lida Guerrero</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Cierre de Caja</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Punto: <strong>P.V. Principal · Bogotá</strong> &nbsp;·&nbsp; Saldo sistema: <strong className="text-primary">{cop(saldoSistema)}</strong>
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conteo físico final</CardTitle>
          <CardDescription>Cuenta el dinero en caja y registra las cantidades.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_100px_110px] gap-x-4 gap-y-2 text-sm">
            <span className="font-medium text-muted-foreground">Denominación</span>
            <span className="font-medium text-muted-foreground text-right">Cantidad</span>
            <span className="font-medium text-muted-foreground text-right">Subtotal</span>
            <Separator className="col-span-3" />
            {[...BILLETES, ...MONEDAS].map(d => (
              <Fragment key={d}>
                <span>{cop(d)}</span>
                <Input
                  type="number" min={0} placeholder="0"
                  className="h-7 text-right text-sm"
                  value={cantidades[d] ?? ''}
                  onChange={e => set(d, e.target.value)}
                />
                <span className="text-right text-muted-foreground">
                  {cantidades[d] ? cop(d * cantidades[d]) : '—'}
                </span>
              </Fragment>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 bg-muted/30 rounded-b-xl">
          <div className="flex justify-between w-full">
            <span className="text-sm text-muted-foreground">Conteo físico</span>
            <span className="font-bold">{cop(conteoFisico)}</span>
          </div>
          <div className="flex justify-between w-full">
            <span className="text-sm text-muted-foreground">Saldo sistema</span>
            <span className="font-bold">{cop(saldoSistema)}</span>
          </div>
          <Separator />
          <div className="flex justify-between w-full">
            <span className="font-semibold">Diferencia</span>
            <span className={['font-bold text-lg',
              diferencia === 0 ? 'text-green-600' : 'text-destructive'].join(' ')}>
              {diferencia === 0 ? '± 0' : (diferencia > 0 ? '+' : '') + cop(diferencia)}
            </span>
          </div>
          {conteoFisico > 0 && diferencia !== 0 && (
            <Alert variant="destructive" className="mt-1 py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Hay una diferencia de {cop(Math.abs(diferencia))}. Verifica el conteo antes de confirmar.
              </AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>

      <Button className="w-full" size="lg" disabled={conteoFisico === 0} onClick={() => setConfirmed(true)}>
        Confirmar cierre de caja
      </Button>
    </div>
  )
}

// ── Pantalla 4: Giro Nacional – Emitir ───────────────────────────────────────

type HuellaState = 'idle' | 'capturing' | 'ok' | 'fail'
type ListaState  = 'idle' | 'checking' | 'ok' | 'alert'

function HuellaWidget({ label }: { label: string }) {
  const [state, setState] = useState<HuellaState>('idle')

  const capture = () => {
    setState('capturing')
    setTimeout(() => setState('ok'), 2000)
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-xl bg-muted/20">
      <div className={[
        'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
        state === 'idle'      ? 'bg-muted text-muted-foreground' : '',
        state === 'capturing' ? 'bg-blue-100 text-blue-600 animate-pulse' : '',
        state === 'ok'        ? 'bg-green-100 text-green-600' : '',
        state === 'fail'      ? 'bg-red-100 text-red-600' : '',
      ].join(' ')}>
        {state === 'capturing'
          ? <Loader2 className="w-8 h-8 animate-spin" />
          : state === 'ok'
          ? <CheckCircle2 className="w-8 h-8" />
          : state === 'fail'
          ? <XCircle className="w-8 h-8" />
          : <Fingerprint className="w-8 h-8" />}
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground text-center leading-tight">
        {state === 'idle'      ? 'Pide al cliente que coloque la huella en el lector.' : ''}
        {state === 'capturing' ? 'Capturando huella...' : ''}
        {state === 'ok'        ? 'Huella autenticada correctamente.' : ''}
        {state === 'fail'      ? 'No autenticado. Intente de nuevo.' : ''}
      </p>
      {(state === 'idle' || state === 'fail') && (
        <Button size="sm" variant="outline" onClick={capture}>
          <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Iniciar captura
        </Button>
      )}
      {state === 'ok' && (
        <Badge className="bg-green-100 text-green-700 border-green-300">Autenticado</Badge>
      )}
    </div>
  )
}

function ListaBadge() {
  const [state, setState] = useState<ListaState>('idle')

  const check = () => {
    setState('checking')
    setTimeout(() => setState('ok'), 1500)
  }

  return (
    <div className="flex items-center gap-2">
      {state === 'idle' && (
        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={check}>
          Verificar listas restrictivas
        </Button>
      )}
      {state === 'checking' && (
        <Badge variant="outline" className="text-blue-600 border-blue-300 gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Consultando...
        </Badge>
      )}
      {state === 'ok' && (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 gap-1">
          <BadgeCheck className="w-3 h-3" /> Sin alertas en listas restrictivas
        </Badge>
      )}
      {state === 'alert' && (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" /> Alerta en lista
        </Badge>
      )}
    </div>
  )
}

function GiroNacionalEmitir() {
  const [step, setStep] = useState(0)
  const [monto, setMonto]   = useState('')
  const [flete, setFlete]   = useState(false)
  const [docType, setDocType] = useState('CC')
  const [docNum, setDocNum] = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [destDocNum, setDestDocNum] = useState('')
  const [destEncontrado, setDestEncontrado] = useState(false)
  const [done, setDone] = useState(false)

  const valorGiro  = parseInt(monto.replace(/\D/g, '')) || 0
  const valorFlete = flete ? 5_000 : 0
  const totalPagar = valorGiro + valorFlete

  const buscarCliente = () => {
    if (docNum.length >= 5) setClienteEncontrado(true)
  }
  const buscarDest = () => {
    if (destDocNum.length >= 5) setDestEncontrado(true)
  }

  const STEPS = ['Valor', 'Remitente', 'Destinatario', 'Confirmación']

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 max-w-sm mx-auto text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Giro emitido exitosamente</h2>
        <Card className="w-full text-left">
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">PIN del giro</span><span className="font-bold font-mono text-lg tracking-widest">482-936</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Remitente</span><span>José Vicente Cabrera</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Destinatario</span><span>Ana Guerrero López</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor giro</span><span>{cop(valorGiro)}</span></div>
            {flete && <div className="flex justify-between"><span className="text-muted-foreground">Flete</span><span>{cop(valorFlete)}</span></div>}
            <Separator />
            <div className="flex justify-between font-bold"><span>Total cobrado</span><span className="text-primary">{cop(totalPagar)}</span></div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">El cliente debe firmar y colocar huella en el recibo.</p>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1"><Printer className="w-4 h-4 mr-1.5" />Imprimir recibo</Button>
          <Button className="flex-1" onClick={() => { setStep(0); setDone(false); setMonto(''); setDocNum(''); setClienteEncontrado(false); setDestDocNum(''); setDestEncontrado(false) }}>
            Nuevo giro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ReceiptText className="w-5 h-5 text-primary" /> Emitir Giro Nacional
      </h2>
      <StepBar steps={STEPS} current={step} />

      {/* Paso 0 — Valor */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">¿Cuánto va a enviar el cliente?</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Valor del giro (COP)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  className="pl-6" placeholder="0"
                  value={monto}
                  onChange={e => setMonto(e.target.value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.'))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">¿Incluir flete?</p>
                <p className="text-xs text-muted-foreground">El remitente paga {cop(5_000)} adicionales.</p>
              </div>
              <Switch checked={flete} onCheckedChange={setFlete} />
            </div>
            {valorGiro > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Valor giro</span><span>{cop(valorGiro)}</span></div>
                {flete && <div className="flex justify-between text-muted-foreground"><span>Flete</span><span>{cop(valorFlete)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold"><span>Total a cobrar</span><span className="text-primary">{cop(totalPagar)}</span></div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={4} onBack={() => {}} onNext={() => setStep(1)} nextDisabled={valorGiro < 1000} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 1 — Remitente */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del remitente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">C.C.</SelectItem>
                  <SelectItem value="CE">C.E.</SelectItem>
                  <SelectItem value="PA">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Número de documento"
                value={docNum}
                onChange={e => { setDocNum(e.target.value); setClienteEncontrado(false) }}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={buscarCliente}><Search className="w-4 h-4" /></Button>
            </div>

            {clienteEncontrado && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-600 font-medium text-xs mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cliente encontrado en el sistema
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Nombre</span><span className="font-medium">José Vicente Cabrera</span>
                  <span className="text-muted-foreground">Teléfono</span><span>323 113 1323</span>
                  <span className="text-muted-foreground">Email</span><span>jvicente@gmail.com</span>
                </div>
                <ListaBadge />
              </div>
            )}

            {!clienteEncontrado && docNum.length > 0 && (
              <p className="text-xs text-muted-foreground">Ingresa el número completo y presiona <Search className="w-3 h-3 inline" /> para buscar.</p>
            )}

            {clienteEncontrado && (
              <HuellaWidget label="Huella índice izquierdo – Remitente" />
            )}
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={4} onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!clienteEncontrado} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 2 — Destinatario */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del destinatario</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select defaultValue="CC">
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">C.C.</SelectItem>
                  <SelectItem value="CE">C.E.</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Número de documento"
                value={destDocNum}
                onChange={e => { setDestDocNum(e.target.value); setDestEncontrado(false) }}
                className="flex-1"
              />
              <Button variant="outline" size="icon" onClick={buscarDest}><Search className="w-4 h-4" /></Button>
            </div>

            {destEncontrado && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-green-600 font-medium text-xs mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Destinatario encontrado
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Nombre</span><span className="font-medium">Ana Guerrero López</span>
                  <span className="text-muted-foreground">Teléfono</span><span>315 890 4421</span>
                </div>
                <ListaBadge />
              </div>
            )}

            <Alert className="py-2 text-xs">
              <AlertDescription>
                El giro solo puede ser cobrado en puntos propios 4-72. No aplica para puntos aliados.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={4} onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!destEncontrado} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 3 — Resumen */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Confirmar y cobrar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex items-center gap-3 p-3">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Remitente</p>
                  <p className="font-medium">José Vicente Cabrera · {docType} {docNum}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Destinatario</p>
                  <p className="font-medium">Ana Guerrero López · CC {destDocNum}</p>
                </div>
              </div>
              <div className="p-3 space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor giro</span><span>{cop(valorGiro)}</span></div>
                {flete && <div className="flex justify-between"><span className="text-muted-foreground">Flete</span><span>{cop(valorFlete)}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total a cobrar</span>
                  <span className="text-primary">{cop(totalPagar)}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Al confirmar se genera el PIN del giro y se descuenta de la caja. El cliente deberá firmar y colocar huella en el recibo físico.
            </p>
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={4} onBack={() => setStep(2)} onNext={() => setDone(true)} nextLabel="Finalizar y cobrar" />
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

// ── Pantalla 5: Giro Nacional – Pagar ─────────────────────────────────────────

function GiroNacionalPagar() {
  const [step, setStep] = useState(0)
  const [pin, setPin]   = useState('')
  const [giroFound, setGiroFound] = useState(false)
  const [docBenef, setDocBenef]   = useState('')
  const [done, setDone] = useState(false)

  const buscarGiro = () => {
    if (pin.replace(/\D/g, '').length >= 6) setGiroFound(true)
  }

  const STEPS = ['PIN', 'Verificar identidad', 'Recibo']

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 max-w-sm mx-auto text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Giro pagado</h2>
        <Card className="w-full text-left">
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Cajero</span><span>Lida Guerrero</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Beneficiario</span><span>Ana Guerrero López</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cédula</span><span>{docBenef}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Valor pagado</span><span className="text-primary">{cop(375_000)}</span></div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">El cliente debe firmar y colocar huella en el soporte.</p>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1"><Printer className="w-4 h-4 mr-1.5" />Imprimir recibo</Button>
          <Button className="flex-1" onClick={() => { setStep(0); setDone(false); setPin(''); setGiroFound(false); setDocBenef('') }}>
            Nuevo pago
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ArrowDownLeft className="w-5 h-5 text-primary" /> Pagar Giro Nacional
      </h2>
      <StepBar steps={STEPS} current={step} />

      {/* Paso 0 — PIN */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Número de PIN del giro</CardTitle>
            <CardDescription>El remitente entregó un PIN de 6 dígitos al beneficiario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="000-000"
                value={pin}
                maxLength={7}
                className="text-center text-lg tracking-widest font-mono flex-1"
                onChange={e => { setPin(e.target.value); setGiroFound(false) }}
              />
              <Button variant="outline" onClick={buscarGiro}><Search className="w-4 h-4 mr-1.5" /> Consultar</Button>
            </div>

            {giroFound && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Giro encontrado
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Remitente</span><span>José Vicente Cabrera</span>
                  <span className="text-muted-foreground">Beneficiario</span><span>Ana Guerrero López</span>
                  <span className="text-muted-foreground">Valor</span><span className="font-bold text-primary">{cop(375_000)}</span>
                  <span className="text-muted-foreground">Estado</span><Badge variant="outline" className="text-green-600 border-green-300 text-xs">Disponible</Badge>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={3} onBack={() => {}} onNext={() => setStep(1)} nextDisabled={!giroFound} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 1 — Verificar identidad */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verificar identidad del beneficiario</CardTitle>
            <CardDescription>Valida la cédula física y captura la huella.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Número de cédula del beneficiario</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Número de cédula"
                  value={docBenef}
                  onChange={e => setDocBenef(e.target.value)}
                  className="flex-1"
                />
              </div>
              {docBenef.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Verifica que coincida con la cédula física: <strong>Ana Guerrero López</strong>
                </p>
              )}
            </div>

            <HuellaWidget label="Huella índice derecho – Beneficiario" />

            <ListaBadge />
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={3} onBack={() => setStep(0)} onNext={() => setDone(true)} nextLabel="Pagar giro" nextDisabled={docBenef.length < 5} />
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

// ── Pantalla 6: Venta de Servicios Físicos ────────────────────────────────────

type CartItem = { id: number; nombre: string; precio: number; qty: number }

const PRODUCTOS_CATALOGO = [
  { id: 1, nombre: 'Estampilla Colombia-Canadá 75 años',     precio: 3_000  },
  { id: 2, nombre: 'Estampilla Navidad 2025',                precio: 5_000  },
  { id: 3, nombre: 'Cobre NO PRIORITARIA – 1 und',           precio: 9_500  },
  { id: 4, nombre: 'Sobre tamaño carta',                     precio: 1_200  },
  { id: 5, nombre: 'Caja pequeña 4-72',                      precio: 4_800  },
]

const SERVICIOS_ENVIO = [
  { codigo: 'NP', label: 'Correo No Prioritario', precio: 9_500   },
  { codigo: 'PR', label: 'Correo Prioritario',     precio: 14_200  },
  { codigo: 'CE', label: 'Certificado',             precio: 19_800  },
  { codigo: 'EX', label: 'Expreso',                 precio: 38_000  },
]

function AddressModal({ open, onClose, onSave, title }: {
  open: boolean; onClose: () => void; onSave: (dir: string) => void; title: string
}) {
  const [normalizada, setNormalizada] = useState(true)
  const [via, setVia]         = useState('Calle')
  const [num1, setNum1]       = useState('')
  const [num2, setNum2]       = useState('')
  const [num3, setNum3]       = useState('')
  const [dpto, setDpto]       = useState('')
  const [ciudad, setCiudad]   = useState('')
  const [libre, setLibre]     = useState('')

  const dirPreview = normalizada
    ? [via, num1, num2 ? `# ${num2}` : '', num3 ? `- ${num3}` : ''].filter(Boolean).join(' ')
    : libre

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Switch checked={normalizada} onCheckedChange={setNormalizada} />
            <span className="text-sm">{normalizada ? 'Dirección normalizada' : 'Sin normalizar (texto libre)'}</span>
          </div>
          {normalizada ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Select value={via} onValueChange={setVia}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Calle','Carrera','Avenida','Diagonal','Transversal','Circular'].map(v =>
                      <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Nro principal" value={num1} onChange={e => setNum1(e.target.value)} className="flex-1" />
                <Input placeholder="# Nro" value={num2} onChange={e => setNum2(e.target.value)} className="w-24" />
                <Input placeholder="- Nro" value={num3} onChange={e => setNum3(e.target.value)} className="w-24" />
              </div>
              <div className="flex gap-2">
                <Select value={dpto} onValueChange={setDpto}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Departamento" /></SelectTrigger>
                  <SelectContent>
                    {['Bogotá D.C.','Antioquia','Valle del Cauca','Atlántico','Santander'].map(d =>
                      <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={ciudad} onValueChange={setCiudad}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Ciudad" /></SelectTrigger>
                  <SelectContent>
                    {['Bogotá','Medellín','Cali','Barranquilla','Bucaramanga'].map(c =>
                      <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {dirPreview && (
                <p className="text-xs bg-muted rounded px-3 py-2 font-mono">{dirPreview}, {ciudad}, {dpto}</p>
              )}
            </div>
          ) : (
            <Textarea
              placeholder="Ej: Vereda El Rosal, Finca Los Pinos, municipio de Tabio, Cundinamarca"
              value={libre} onChange={e => setLibre(e.target.value)} rows={3}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave(dirPreview || libre); onClose() }}
            disabled={normalizada ? !num1 : !libre}>
            Guardar dirección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function VentaNueva() {
  const [clienteDoc, setClienteDoc]       = useState('')
  const [clienteEncontrado, setClienteEncontrado] = useState(false)
  const [tabProducto, setTabProducto]     = useState<'producto'|'envio'|'buzon'>('producto')
  const [prodSelId, setProdSelId]         = useState<number|null>(null)
  const [cart, setCart]                   = useState<CartItem[]>([])
  const [servicio, setServicio]           = useState('')
  const [dirOrigen, setDirOrigen]         = useState('')
  const [dirDestino, setDirDestino]       = useState('')
  const [peso, setPeso]                   = useState('')
  const [modalDir, setModalDir]           = useState<'origen'|'destino'|null>(null)
  const [medioPago, setMedioPago]         = useState('efectivo')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [confirmed, setConfirmed]         = useState(false)
  const [buzonTam, setBuzonTam]           = useState('')
  const [buzonMeses, setBuzonMeses]       = useState('1')

  const buscarCliente = () => { if (clienteDoc.length >= 5) setClienteEncontrado(true) }

  const addProduct = () => {
    if (!prodSelId) return
    const p = PRODUCTOS_CATALOGO.find(x => x.id === prodSelId)!
    setCart(c => {
      const ex = c.find(x => x.id === prodSelId)
      if (ex) return c.map(x => x.id === prodSelId ? { ...x, qty: x.qty + 1 } : x)
      return [...c, { id: p.id, nombre: p.nombre, precio: p.precio, qty: 1 }]
    })
    setProdSelId(null)
  }

  const addEnvio = () => {
    const svc = SERVICIOS_ENVIO.find(s => s.codigo === servicio)
    if (!svc || !dirOrigen || !dirDestino) return
    const nombre = `Envío ${svc.label} — ${dirDestino.slice(0, 30)}...`
    setCart(c => [...c, { id: Date.now(), nombre, precio: svc.precio, qty: 1 }])
  }

  const addBuzon = () => {
    if (!buzonTam) return
    const precios: Record<string,number> = { P: 45_000, M: 70_000, G: 95_000 }
    const nombres: Record<string,string> = { P: 'Pequeño', M: 'Mediano', G: 'Grande' }
    const precio = (precios[buzonTam] ?? 0) * parseInt(buzonMeses)
    setCart(c => [...c, { id: Date.now(), nombre: `Buzón ${nombres[buzonTam]} — ${buzonMeses} mes(es)`, precio, qty: 1 }])
  }

  const removeItem = (id: number) => setCart(c => c.filter(x => x.id !== id))
  const total = cart.reduce((a, i) => a + i.precio * i.qty, 0)
  const vueltas = Math.max(0, (parseInt(efectivoRecibido.replace(/\D/g,'')) || 0) - total)

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 max-w-sm mx-auto text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Venta confirmada</h2>
        <Card className="w-full text-left">
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span>Lida Guerrero M.</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Productos</span><span>{cart.length} ítem(s)</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total cobrado</span><span className="text-primary">{cop(total)}</span></div>
            {medioPago === 'efectivo' && vueltas > 0 && (
              <div className="flex justify-between text-green-600"><span>Vueltas</span><span>{cop(vueltas)}</span></div>
            )}
          </CardContent>
        </Card>
        <Alert className="py-2 text-left">
          <AlertDescription className="text-xs">Recuerde colocar papel en la impresora antes de imprimir la guía.</AlertDescription>
        </Alert>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1"><Printer className="w-4 h-4 mr-1.5" />Guía + Recibo</Button>
          <Button className="flex-1" onClick={() => { setCart([]); setConfirmed(false); setClienteDoc(''); setClienteEncontrado(false) }}>
            Nueva venta
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" /> Nueva Venta de Servicios Físicos
      </h2>

      {/* Cliente */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Select defaultValue="CC">
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">C.C.</SelectItem>
                <SelectItem value="CE">C.E.</SelectItem>
                <SelectItem value="PA">Pasaporte</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Número de documento" value={clienteDoc}
              onChange={e => { setClienteDoc(e.target.value); setClienteEncontrado(false) }} className="flex-1" />
            <Button variant="outline" size="icon" onClick={buscarCliente}><Search className="w-4 h-4" /></Button>
          </div>
          {clienteEncontrado && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-sm bg-muted/30 rounded-lg p-3">
              <span className="text-muted-foreground">Nombre</span><span className="font-medium col-span-3">Lida Guerrero Morales</span>
              <span className="text-muted-foreground">Email</span><span className="col-span-3">lida.guerrero@gmail.com</span>
              <span className="text-muted-foreground">Teléfono</span><span>313 102 3455</span>
            </div>
          )}
          {!clienteEncontrado && (
            <p className="text-xs text-muted-foreground">Si el cliente no está registrado, ingresa sus datos manualmente.</p>
          )}
        </CardContent>
      </Card>

      {/* Agregar productos */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Agregar artículos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tabProducto} onValueChange={v => setTabProducto(v as typeof tabProducto)}>
            <TabsList className="h-8">
              <TabsTrigger value="producto" className="text-xs">Productos</TabsTrigger>
              <TabsTrigger value="envio"    className="text-xs">Envío postal</TabsTrigger>
              <TabsTrigger value="buzon"    className="text-xs">Buzón</TabsTrigger>
            </TabsList>

            {/* Tab Productos */}
            <TabsContent value="producto" className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Select value={prodSelId?.toString() ?? ''} onValueChange={v => setProdSelId(Number(v))}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Seleccionar producto..." /></SelectTrigger>
                  <SelectContent>
                    {PRODUCTOS_CATALOGO.map(p =>
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre} — {cop(p.precio)}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={addProduct} disabled={!prodSelId}><Plus className="w-4 h-4 mr-1" />Agregar</Button>
              </div>
            </TabsContent>

            {/* Tab Envío */}
            <TabsContent value="envio" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Servicio</Label>
                  <Select value={servicio} onValueChange={setServicio}>
                    <SelectTrigger><SelectValue placeholder="Tipo de servicio" /></SelectTrigger>
                    <SelectContent>
                      {SERVICIOS_ENVIO.map(s =>
                        <SelectItem key={s.codigo} value={s.codigo}>{s.label} — {cop(s.precio)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Peso aproximado (g)</Label>
                  <Input type="number" placeholder="ej. 250" value={peso} onChange={e => setPeso(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Origen</Label>
                  <Button variant="outline" className="w-full justify-start text-sm font-normal truncate"
                    onClick={() => setModalDir('origen')}>
                    {dirOrigen || <span className="text-muted-foreground">Ingresar dirección de origen...</span>}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Destino</Label>
                  <Button variant="outline" className="w-full justify-start text-sm font-normal truncate"
                    onClick={() => setModalDir('destino')}>
                    {dirDestino || <span className="text-muted-foreground">Ingresar dirección de destino...</span>}
                  </Button>
                </div>
              </div>
              <Button onClick={addEnvio} disabled={!servicio || !dirOrigen || !dirDestino} className="w-full">
                <Send className="w-4 h-4 mr-1.5" /> Agregar envío al carrito
              </Button>
            </TabsContent>

            {/* Tab Buzón */}
            <TabsContent value="buzon" className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[{k:'P',label:'Pequeño',precio:'$45.000/mes'},{k:'M',label:'Mediano',precio:'$70.000/mes'},{k:'G',label:'Grande',precio:'$95.000/mes'}].map(b => (
                  <button key={b.k} onClick={() => setBuzonTam(b.k)}
                    className={['rounded-xl border-2 p-3 text-center text-sm transition-colors',
                      buzonTam === b.k ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'].join(' ')}>
                    <BoxSelect className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="font-medium">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.precio}</p>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm shrink-0">Duración:</Label>
                <Select value={buzonMeses} onValueChange={setBuzonMeses}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['1','2','3','6','12'].map(m => <SelectItem key={m} value={m}>{m} mes{m !== '1' ? 'es' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
                {buzonTam && (
                  <span className="text-sm font-medium text-primary ml-2">
                    = {cop(({P:45_000,M:70_000,G:95_000}[buzonTam] ?? 0) * parseInt(buzonMeses))}
                  </span>
                )}
              </div>
              <Button onClick={addBuzon} disabled={!buzonTam} className="w-full">
                <Plus className="w-4 h-4 mr-1" /> Agregar buzón al carrito
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Carrito */}
      {cart.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Carrito</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead className="w-20 text-right">Precio</TableHead>
                  <TableHead className="w-12 text-center">Qty</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">{item.nombre}</TableCell>
                    <TableCell className="text-right text-sm">{cop(item.precio)}</TableCell>
                    <TableCell className="text-center text-sm">{item.qty}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{cop(item.precio * item.qty)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-between bg-muted/20 rounded-b-xl py-3">
            <span className="font-semibold">Total a pagar</span>
            <span className="text-xl font-bold text-primary">{cop(total)}</span>
          </CardFooter>
        </Card>
      )}

      {/* Pago */}
      {cart.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Medio de pago</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={medioPago} onValueChange={setMedioPago} className="flex flex-wrap gap-3">
              {[
                { v:'efectivo',      label:'Efectivo'     },
                { v:'tarjeta',       label:'Tarjeta'      },
                { v:'transferencia', label:'Transferencia'},
                { v:'consignacion',  label:'Consignación' },
              ].map(m => (
                <div key={m.v} className="flex items-center gap-2">
                  <RadioGroupItem value={m.v} id={`mp-${m.v}`} />
                  <Label htmlFor={`mp-${m.v}`} className="text-sm cursor-pointer">{m.label}</Label>
                </div>
              ))}
            </RadioGroup>

            {medioPago === 'efectivo' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs">Efectivo recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input className="pl-6" placeholder="0"
                      value={efectivoRecibido}
                      onChange={e => setEfectivoRecibido(e.target.value.replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.'))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Vueltas</Label>
                  <div className={['flex items-center h-10 px-3 rounded-md border text-sm font-medium',
                    vueltas > 0 ? 'text-green-600 bg-green-50 border-green-200' : 'bg-muted text-muted-foreground'].join(' ')}>
                    {efectivoRecibido ? cop(vueltas) : '—'}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Email para factura electrónica</Label>
              <Input type="email" placeholder="cliente@correo.com" defaultValue={clienteEncontrado ? 'lida.guerrero@gmail.com' : ''} />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" size="lg" onClick={() => setConfirmed(true)}
              disabled={medioPago === 'efectivo' && (!efectivoRecibido || vueltas < 0)}>
              Confirmar venta — {cop(total)}
            </Button>
          </CardFooter>
        </Card>
      )}

      {cart.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-20" />
          Agrega productos, envíos o servicios de buzón para continuar.
        </div>
      )}

      <AddressModal
        open={modalDir !== null}
        title={modalDir === 'origen' ? 'Dirección de origen' : 'Dirección de destino'}
        onClose={() => setModalDir(null)}
        onSave={dir => { if (modalDir === 'origen') setDirOrigen(dir); else setDirDestino(dir) }}
      />
    </div>
  )
}

// ── Pantalla 7: Giro MoneyGram – Emitir ──────────────────────────────────────

const PAISES_MG = ['Estados Unidos','España','Italia','Francia','Alemania','México','Ecuador',
  'Venezuela','Chile','Argentina','Perú','Bolivia','Senegal','Marruecos','China']

const ORIGENES_FONDOS = [
  'Salario / Nómina', 'Ahorros personales', 'Venta de activos', 'Pensión / Jubilación',
  'Negocio propio', 'Herencia / Donación', 'Otro',
]

function GiroMoneyGramEmitir() {
  const [step, setStep]               = useState(0)
  const [pais, setPais]               = useState('')
  const [monto, setMonto]             = useState('')
  const [flete, setFlete]             = useState(false)
  const [cotizado, setCotizado]       = useState(false)
  const [remDocNum, setRemDocNum]     = useState('')
  const [remFound, setRemFound]       = useState(false)
  const [dirRem, setDirRem]           = useState('')
  const [modalDir, setModalDir]       = useState(false)
  const [destDocNum, setDestDocNum]   = useState('')
  const [destDocTipo, setDestDocTipo] = useState('passport')
  const [origen, setOrigen]           = useState('')
  const [fechaNac, setFechaNac]       = useState('')
  const [efectivo, setEfectivo]       = useState('')
  const [done, setDone]               = useState(false)

  const valorCOP   = parseInt(monto.replace(/\D/g,'')) || 0
  const comision   = valorCOP > 0 ? 15_000 : 0
  const totalCOP   = valorCOP + comision + (flete ? 5_000 : 0)
  const valorUSD   = valorCOP > 0 ? (valorCOP / 3_800).toFixed(2) : '0.00'
  const vueltas    = Math.max(0, (parseInt(efectivo.replace(/\D/g,'')) || 0) - totalCOP)

  const STEPS = ['Cotización','Remitente','Destinatario','Declaración','Pago']

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 max-w-sm mx-auto text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Giro MoneyGram emitido</h2>
        <Card className="w-full text-left">
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Referencia</span><span className="font-mono font-bold">MG-{Math.floor(100000+Math.random()*900000)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Destino</span><span>{pais}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monto enviado</span><span>{cop(valorCOP)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Le llegan</span><span className="font-bold text-primary">${valorUSD} USD</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total cobrado</span><span>{cop(totalCOP)}</span></div>
          </CardContent>
        </Card>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left w-full">
          <p className="text-xs font-semibold text-amber-700 mb-2">Documentos requeridos</p>
          <ul className="text-xs text-amber-600 space-y-1">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> Formulario 5 (generado por sistema)</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> Declaración de origen de fondos</li>
            <li className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Fotocopia de cédula del remitente</li>
          </ul>
        </div>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1"><FileText className="w-4 h-4 mr-1.5" />Imprimir Formulario 5</Button>
          <Button className="flex-1" onClick={() => { setStep(0); setDone(false); setMonto(''); setPais(''); setRemDocNum(''); setRemFound(false); setDestDocNum(''); setOrigen(''); setFechaNac('') }}>
            Nuevo giro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary" /> Emitir Giro MoneyGram
      </h2>
      <StepBar steps={STEPS} current={step} />

      {/* Paso 0 — Cotización */}
      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cotización del giro</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>País de destino</Label>
              <Select value={pais} onValueChange={v => { setPais(v); setCotizado(false) }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar país..." /></SelectTrigger>
                <SelectContent>
                  {PAISES_MG.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Monto a enviar (COP)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input className="pl-6" placeholder="0" value={monto}
                  onChange={e => { setMonto(e.target.value.replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')); setCotizado(false) }} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">¿El remitente paga el flete?</p>
                <p className="text-xs text-muted-foreground">Costo adicional de {cop(5_000)}</p>
              </div>
              <Switch checked={flete} onCheckedChange={v => { setFlete(v); setCotizado(false) }} />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setCotizado(true)} disabled={!pais || valorCOP < 1000}>
              <Search className="w-4 h-4 mr-1.5" /> Calcular cotización
            </Button>
            {cotizado && valorCOP > 0 && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Monto giro</span><span>{cop(valorCOP)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Comisión MoneyGram</span><span>{cop(comision)}</span></div>
                {flete && <div className="flex justify-between"><span className="text-muted-foreground">Flete</span><span>{cop(5_000)}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total a cobrar (COP)</span><span className="text-primary">{cop(totalCOP)}</span></div>
                <div className="flex justify-between font-bold text-green-700 mt-1">
                  <span>Le llegan al beneficiario</span>
                  <span>${valorUSD} USD</span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={5} onBack={() => {}} onNext={() => setStep(1)} nextDisabled={!cotizado} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 1 — Remitente */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del remitente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select defaultValue="CC">
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">C.C.</SelectItem>
                  <SelectItem value="CE">C.E.</SelectItem>
                  <SelectItem value="PA">Pasaporte</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Número de documento" value={remDocNum}
                onChange={e => { setRemDocNum(e.target.value); setRemFound(false) }} className="flex-1" />
              <Button variant="outline" size="icon" onClick={() => { if (remDocNum.length >= 5) setRemFound(true) }}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
            {remFound && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
                <div className="flex items-center gap-2 text-green-600 text-xs font-medium mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cliente encontrado
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <span className="text-muted-foreground">Nombre</span><span className="font-medium">José Vicente Cabrera M.</span>
                  <span className="text-muted-foreground">Teléfono</span><span>323 113 1323</span>
                  <span className="text-muted-foreground">Email</span><span>jvcm@gmail.com</span>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Dirección del remitente</Label>
              <Button variant="outline" className="w-full justify-start text-sm font-normal"
                onClick={() => setModalDir(true)}>
                {dirRem || <span className="text-muted-foreground">Ingresar o seleccionar dirección...</span>}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono (confirmar)</Label>
                <Input placeholder="Celular" defaultValue={remFound ? '3231131323' : ''} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Código postal</Label>
                <Input placeholder="110111" defaultValue={dirRem ? '110111' : ''} />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={5} onBack={() => setStep(0)} onNext={() => setStep(2)} nextDisabled={!remFound || !dirRem} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 2 — Destinatario */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del destinatario</CardTitle>
            <CardDescription>País: <strong>{pais}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo de documento en destino</Label>
              <Select value={destDocTipo} onValueChange={setDestDocTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passport">Pasaporte</SelectItem>
                  <SelectItem value="license">Licencia de conducción</SelectItem>
                  <SelectItem value="national_id">Documento nacional de identidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Número de documento" value={destDocNum}
                onChange={e => setDestDocNum(e.target.value)} className="flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primer nombre</Label>
                <Input placeholder="Nombre" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Primer apellido</Label>
                <Input placeholder="Apellido" />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={5} onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={destDocNum.length < 4} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 3 — Declaración */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Declaración de origen de fondos</CardTitle>
            <CardDescription>Requerido por regulación financiera para giros internacionales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Fecha de nacimiento del remitente</Label>
              <Input type="date" value={fechaNac} onChange={e => setFechaNac(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Origen de los fondos</Label>
              <Select value={origen} onValueChange={setOrigen}>
                <SelectTrigger><SelectValue placeholder="Seleccionar origen..." /></SelectTrigger>
                <SelectContent>
                  {ORIGENES_FONDOS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Alert className="py-2">
              <AlertDescription className="text-xs">
                El cliente debe firmar y colocar huella en la declaración física. Solicitar fotocopia de cédula.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={5} onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!origen || !fechaNac} />
          </CardFooter>
        </Card>
      )}

      {/* Paso 4 — Pago */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Cobro y emisión</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Monto giro</span><span>{cop(valorCOP)}</span></div>
              <div className="flex justify-between p-3"><span className="text-muted-foreground">Comisión</span><span>{cop(comision)}</span></div>
              {flete && <div className="flex justify-between p-3"><span className="text-muted-foreground">Flete</span><span>{cop(5_000)}</span></div>}
              <div className="flex justify-between p-3 font-bold"><span>Total a cobrar</span><span className="text-primary">{cop(totalCOP)}</span></div>
              <div className="flex justify-between p-3 text-green-700"><span>Beneficiario recibe</span><span className="font-bold">${valorUSD} USD</span></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Efectivo recibido</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input className="pl-6" placeholder="0" value={efectivo}
                  onChange={e => setEfectivo(e.target.value.replace(/\D/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.'))} />
              </div>
            </div>
            {efectivo && (
              <div className={['flex justify-between rounded-lg px-3 py-2 text-sm font-medium',
                vueltas >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'].join(' ')}>
                <span>Vueltas</span>
                <span>{cop(vueltas)}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Email del remitente (recibo)</Label>
              <Input type="email" placeholder="remitente@correo.com" defaultValue="jvcm@gmail.com" />
            </div>
          </CardContent>
          <CardFooter>
            <WizardNav step={step} total={5} onBack={() => setStep(3)} onNext={() => setDone(true)}
              nextLabel="Emitir giro"
              nextDisabled={!efectivo || vueltas < 0} />
          </CardFooter>
        </Card>
      )}

      <AddressModal open={modalDir} title="Dirección del remitente"
        onClose={() => setModalDir(false)} onSave={dir => setDirRem(dir)} />
    </div>
  )
}

// ── Pantalla 8: Despacho – Gestión de sacas ───────────────────────────────────

type SacaEstado = 'abierta' | 'cerrada'
type Saca = { id: string; precinto: string; cobertura: string; envios: string[]; estado: SacaEstado; peso?: number }
type AlertaSaca = { tipo: 'ya_incluido' | 'no_encontrado'; guia: string } | null

const GUIAS_MOCK = ['COL001234567CO','COL001234568CO','COL001234569CO','COL001234570CO','COL001234571CO']

function Despacho() {
  const [sacas, setSacas]             = useState<Saca[]>([])
  const [sacaActiva, setSacaActiva]   = useState<string|null>(null)
  const [modalNueva, setModalNueva]   = useState(false)
  const [modalCierre, setModalCierre] = useState(false)
  const [precinto, setPrecinto]       = useState('')
  const [cobertura, setCobertura]     = useState('nacional')
  const [scanInput, setScanInput]     = useState('')
  const [alerta, setAlerta]           = useState<AlertaSaca>(null)
  const [pesoCierre, setPesoCierre]   = useState('')
  const [cerrado, setCerrado]         = useState(false)

  const saca = sacas.find(s => s.id === sacaActiva) ?? null

  const crearSaca = () => {
    if (!precinto) return
    const nueva: Saca = { id: Date.now().toString(), precinto, cobertura, envios: [], estado: 'abierta' }
    setSacas(s => [...s, nueva])
    setSacaActiva(nueva.id)
    setPrecinto('')
    setModalNueva(false)
  }

  const ingresarEnvio = () => {
    const guia = scanInput.trim().toUpperCase()
    if (!guia || !saca) return
    setScanInput('')
    if (saca.envios.includes(guia)) {
      setAlerta({ tipo: 'ya_incluido', guia }); return
    }
    if (!GUIAS_MOCK.includes(guia) && guia.length < 10) {
      setAlerta({ tipo: 'no_encontrado', guia }); return
    }
    setAlerta(null)
    setSacas(s => s.map(x => x.id === sacaActiva ? { ...x, envios: [...x.envios, guia] } : x))
  }

  const cerrarSaca = () => {
    setSacas(s => s.map(x => x.id === sacaActiva ? { ...x, estado: 'cerrada', peso: parseFloat(pesoCierre)||0 } : x))
    setCerrado(true)
  }

  if (cerrado) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 max-w-sm mx-auto text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <h2 className="text-xl font-semibold">Saca cerrada</h2>
        <Card className="w-full text-left">
          <CardContent className="pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Precinto</span><span className="font-mono font-bold">{saca?.precinto}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Envíos</span><span>{saca?.envios.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Peso</span><span>{pesoCierre} kg</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cobertura</span><span className="capitalize">{saca?.cobertura}</span></div>
          </CardContent>
        </Card>
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1"><FileText className="w-4 h-4 mr-1.5" />Manifiesto</Button>
          <Button variant="outline" className="flex-1"><ScanBarcode className="w-4 h-4 mr-1.5" />Marbete</Button>
        </div>
        <Button className="w-full" onClick={() => { setSacaActiva(null); setCerrado(false); setPesoCierre(''); setModalCierre(false) }}>
          Volver al panel
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> Despacho postal — Sacas
        </h2>
        <Button size="sm" onClick={() => setModalNueva(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Nueva saca
        </Button>
      </div>

      {sacas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
          No hay sacas activas. Crea una nueva saca para comenzar el despacho.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Lista de sacas */}
        {sacas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sacas del día</p>
            {sacas.map(s => (
              <button key={s.id}
                onClick={() => setSacaActiva(s.id)}
                className={['w-full text-left rounded-xl border p-3 transition-colors',
                  sacaActiva === s.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'].join(' ')}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-bold">{s.precinto}</span>
                  <Badge variant={s.estado === 'abierta' ? 'outline' : 'secondary'}
                    className={s.estado === 'abierta' ? 'text-green-600 border-green-300 text-xs' : 'text-xs'}>
                    {s.estado}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground capitalize">{s.cobertura} · {s.envios.length} envío(s)</p>
              </button>
            ))}
          </div>
        )}

        {/* Detalle de saca activa */}
        {saca && (
          <div className={['space-y-4', sacas.length > 0 ? 'md:col-span-2' : 'col-span-3'].join(' ')}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Saca {saca.precinto}</CardTitle>
                  <Badge variant="outline" className="text-green-600 border-green-300">Abierta</Badge>
                </div>
                <CardDescription className="capitalize">{saca.cobertura} · Centro A · Saca consolidada</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Ingresar envío */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Ingresar guía (escanear o escribir)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9 font-mono" placeholder="COL000000000CO"
                        value={scanInput}
                        onChange={e => { setScanInput(e.target.value.toUpperCase()); setAlerta(null) }}
                        onKeyDown={e => e.key === 'Enter' && ingresarEnvio()} />
                    </div>
                    <Button variant="outline" onClick={ingresarEnvio} disabled={!scanInput}>
                      Ingresar
                    </Button>
                  </div>
                  {alerta?.tipo === 'ya_incluido' && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      La guía <strong>{alerta.guia}</strong> ya está incluida en esta saca.
                    </p>
                  )}
                  {alerta?.tipo === 'no_encontrado' && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      La guía <strong>{alerta.guia}</strong> no se encontró en el sistema.
                    </p>
                  )}
                </div>

                {/* Lista de envíos */}
                {saca.envios.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-3 py-2 text-xs font-semibold flex justify-between">
                      <span>Envíos en saca</span><span>{saca.envios.length} ítem(s)</span>
                    </div>
                    <div className="divide-y max-h-48 overflow-y-auto">
                      {saca.envios.map((g, i) => (
                        <div key={g} className="flex items-center justify-between px-3 py-2 text-xs font-mono">
                          <span className="text-muted-foreground w-6">{i+1}</span>
                          <span className="flex-1">{g}</span>
                          <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                            onClick={() => setSacas(s => s.map(x => x.id === sacaActiva ? { ...x, envios: x.envios.filter(e => e !== g) } : x))}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed rounded-lg">
                    Todavía no hay envíos en esta saca.
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Tip: pulsa <kbd className="px-1 rounded border text-[10px]">Enter</kbd> después de escanear para agregar rápidamente.
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button variant="outline" size="sm" disabled={saca.envios.length === 0}>
                  <Printer className="w-4 h-4 mr-1.5" />Relación envíos
                </Button>
                <Button size="sm" className="ml-auto" disabled={saca.envios.length === 0}
                  onClick={() => setModalCierre(true)}>
                  Cerrar saca
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Modal nueva saca */}
      <Dialog open={modalNueva} onOpenChange={v => !v && setModalNueva(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva saca</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Número de precinto</Label>
              <Input placeholder="ej. 00038271" value={precinto} onChange={e => setPrecinto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Cobertura</Label>
              <RadioGroup value={cobertura} onValueChange={setCobertura} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nacional" id="cob-nac" />
                  <Label htmlFor="cob-nac" className="cursor-pointer">Nacional</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="internacional" id="cob-int" />
                  <Label htmlFor="cob-int" className="cursor-pointer">Internacional</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              <span>Centro operativo</span><span className="font-medium text-foreground">Principal Bogotá</span>
              <span>Centro destino</span><span className="font-medium text-foreground">Centro A</span>
              <span>Tipo despacho</span><span className="font-medium text-foreground">Directo</span>
              <span>Tipo saca</span><span className="font-medium text-foreground">Consolidada</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalNueva(false)}>Cancelar</Button>
            <Button onClick={crearSaca} disabled={!precinto}>Crear saca</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal cierre de saca */}
      <Dialog open={modalCierre} onOpenChange={v => !v && setModalCierre(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cerrar saca {saca?.precinto}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm space-y-1 bg-muted/30 rounded-lg p-3">
              <div className="flex justify-between"><span className="text-muted-foreground">Total envíos</span><span className="font-bold">{saca?.envios.length}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Weight className="w-4 h-4" /> Peso de la saca (kg)
              </Label>
              <Input type="number" step="0.1" placeholder="ej. 4.5"
                value={pesoCierre} onChange={e => setPesoCierre(e.target.value)} />
              <p className="text-xs text-muted-foreground">Coloca la saca en la báscula y registra el peso.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCierre(false)}>Cancelar</Button>
            <Button onClick={cerrarSaca} disabled={!pesoCierre}>Confirmar cierre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

const SCREENS = [
  { id: 'caja-apertura',  label: 'Apertura caja'  },
  { id: 'caja-dashboard', label: 'Dashboard caja' },
  { id: 'caja-cierre',    label: 'Cierre caja'    },
  { id: 'giro-emitir',    label: 'Giro: Emitir'   },
  { id: 'giro-pagar',     label: 'Giro: Pagar'    },
  { id: 'ventas-nueva',   label: 'Ventas'         },
  { id: 'mg-emitir',      label: 'MoneyGram'      },
  { id: 'despacho',       label: 'Despacho'       },
]

export default function Lab3() {
  const [activeTab, setActiveTab] = useState('caja-apertura')

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="mb-6 overflow-x-auto">
            <TabsList className="inline-flex gap-1 h-auto p-1">
              {SCREENS.map(s => (
                <TabsTrigger key={s.id} value={s.id} className="text-xs px-3 py-1.5 whitespace-nowrap">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="caja-apertura">
            <CajaApertura onDone={() => setActiveTab('caja-dashboard')} />
          </TabsContent>
          <TabsContent value="caja-dashboard">
            <CajaDashboard />
          </TabsContent>
          <TabsContent value="caja-cierre">
            <CajaCierre />
          </TabsContent>
          <TabsContent value="giro-emitir">
            <GiroNacionalEmitir />
          </TabsContent>
          <TabsContent value="giro-pagar">
            <GiroNacionalPagar />
          </TabsContent>
          <TabsContent value="ventas-nueva">
            <VentaNueva />
          </TabsContent>
          <TabsContent value="mg-emitir">
            <GiroMoneyGramEmitir />
          </TabsContent>
          <TabsContent value="despacho">
            <Despacho />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
