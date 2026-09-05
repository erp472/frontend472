import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronLeft, Send, Download, Ban,
  CheckCircle2, AlertTriangle, Loader2,
  ArrowRightLeft, Globe,
} from 'lucide-react'
import { Button }     from '@/components/ui/button'
import { Input }      from '@/components/ui/input'
import { Label }      from '@/components/ui/label'
import { Badge }      from '@/components/ui/badge'
import { Separator }  from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn }  from '@/lib/utils'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api'
import { useSessionStore } from '@/stores/useSessionStore'
import { useStatusPunto, useServiciosCaja } from '@/queries/cajas.queries'
import {
  EmitirNacionalSchema,
  PagarNacionalSchema,
  EmitirInternacionalSchema,
  PagarInternacionalSchema,
  useGirosBySesion,
  useEmitirGiroNacional,
  usePagarGiroNacional,
  useEmitirGiroInternacional,
  usePagarGiroInternacional,
  useAnularGiro,
  type EmitirNacionalDto,
  type PagarNacionalDto,
  type EmitirInternacionalDto,
  type PagarInternacionalDto,
  type GiroResumen,
  type EstadoGiro,
} from '@/queries/giros.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

function fmtCOP(v: number | string | null | undefined): string {
  if (v == null) return '—'
  const n = typeof v === 'string' ? parseFloat(v) : v
  return isNaN(n) ? '—' : COP.format(n)
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ESTADO_LABEL: Record<EstadoGiro, string> = {
  pendiente:  'Pendiente',
  aprobado:   'Aprobado',
  pagado:     'Pagado',
  anulado:    'Anulado',
  rechazado:  'Rechazado',
}

const ESTADO_VARIANT: Record<EstadoGiro, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente:  'default',
  aprobado:   'default',
  pagado:     'secondary',
  anulado:    'destructive',
  rechazado:  'destructive',
}

function EstadoBadge({ estado }: { estado: EstadoGiro }) {
  return <Badge variant={ESTADO_VARIANT[estado]}>{ESTADO_LABEL[estado]}</Badge>
}

// ── Campo de texto reutilizable ───────────────────────────────────────────────

function Field({
  label, error, children, className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// ── Resultado exitoso ─────────────────────────────────────────────────────────

function ResultadoExito({
  titulo,
  giro,
  pin,
  saldo,
  onNuevo,
}: {
  titulo:  string
  giro:    GiroResumen
  pin?:    string
  saldo?:  number
  onNuevo: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      <CheckCircle2 className="size-12 text-green-500" />
      <h3 className="text-lg font-semibold">{titulo}</h3>
      <div className="w-full max-w-sm rounded-lg border bg-muted/50 p-4 text-left space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Giro #</span>
          <span className="font-mono font-medium">{giro.id}</span>
        </div>
        {pin && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">PIN</span>
            <span className="font-mono text-xl font-bold tracking-widest text-primary">{pin}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Beneficiario</span>
          <span className="font-medium">{giro.beneficiarioNombre ?? '—'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Monto</span>
          <span className="font-medium">{fmtCOP(giro.montoCop)}</span>
        </div>
        {giro.fleteCop > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Flete</span>
            <span className="font-medium">{fmtCOP(giro.fleteCop)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between text-sm font-semibold">
          <span>Total cobrado</span>
          <span>{fmtCOP(giro.montoTotalCop)}</span>
        </div>
        {saldo != null && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Saldo caja</span>
            <span>{fmtCOP(saldo)}</span>
          </div>
        )}
      </div>
      <Button onClick={onNuevo} className="w-full max-w-sm">
        Nueva operación
      </Button>
    </div>
  )
}

// ── Formulario Emitir Giro Nacional ──────────────────────────────────────────

function EmitirNacionalForm({ cajaId }: { cajaId: number }) {
  type Result = { giro: GiroResumen; pin: string; saldo: number }
  const [result, setResult] = useState<Result | null>(null)
  const [showRemitente, setShowRemitente] = useState(false)

  const emitir = useEmitirGiroNacional(cajaId)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmitirNacionalDto>({
    resolver: zodResolver(EmitirNacionalSchema),
    defaultValues: { montoCop: undefined, beneficiario: { numeroDoc: '', nombre: '' } },
  })

  const onSubmit = async (data: EmitirNacionalDto) => {
    try {
      const r = await emitir.mutateAsync(data)
      setResult({ giro: r.giro, pin: r.pin, saldo: r.saldoActual })
      toast.success(`Giro emitido — PIN: ${r.pin}`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al emitir el giro')
    }
  }

  if (result) {
    return (
      <ResultadoExito
        titulo="Giro Nacional emitido"
        giro={result.giro}
        pin={result.pin}
        saldo={result.saldo}
        onNuevo={() => { setResult(null); reset() }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Monto a enviar (COP)" error={errors.montoCop?.message}>
        <Input
          type="number"
          min={1}
          placeholder="Ej: 500000"
          {...register('montoCop', { valueAsNumber: true })}
        />
      </Field>

      <Separator />
      <p className="text-sm font-medium">Beneficiario</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo doc." error={errors.beneficiario?.tipoDoc?.message}>
          <Input placeholder="CC / CE / TI" {...register('beneficiario.tipoDoc')} />
        </Field>
        <Field label="Nro. documento *" error={errors.beneficiario?.numeroDoc?.message}>
          <Input placeholder="Número de documento" {...register('beneficiario.numeroDoc')} />
        </Field>
      </div>
      <Field label="Nombre completo *" error={errors.beneficiario?.nombre?.message}>
        <Input placeholder="Nombres y apellidos" {...register('beneficiario.nombre')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ciudad" error={errors.beneficiario?.ciudad?.message}>
          <Input placeholder="Ciudad destino" {...register('beneficiario.ciudad')} />
        </Field>
        <Field label="Teléfono" error={errors.beneficiario?.telefono?.message}>
          <Input placeholder="Teléfono" {...register('beneficiario.telefono')} />
        </Field>
      </div>
      <Field label="Mensaje (opcional)" error={errors.beneficiario?.mensaje?.message}>
        <Input placeholder="Mensaje para el beneficiario" {...register('beneficiario.mensaje')} />
      </Field>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowRemitente(v => !v)}
        className="text-muted-foreground"
      >
        {showRemitente ? '— Ocultar remitente' : '+ Agregar datos del remitente'}
      </Button>

      {showRemitente && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Remitente</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo doc." error={errors.remitente?.tipoDoc?.message}>
              <Input placeholder="CC / CE" {...register('remitente.tipoDoc')} />
            </Field>
            <Field label="Nro. documento" error={errors.remitente?.numeroDoc?.message}>
              <Input placeholder="Número" {...register('remitente.numeroDoc')} />
            </Field>
          </div>
          <Field label="Nombre" error={errors.remitente?.nombre?.message}>
            <Input placeholder="Nombres y apellidos" {...register('remitente.nombre')} />
          </Field>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={emitir.isPending}>
        {emitir.isPending
          ? <><Loader2 className="mr-2 size-4 animate-spin" /> Emitiendo...</>
          : <><Send className="mr-2 size-4" /> Emitir giro nacional</>
        }
      </Button>
    </form>
  )
}

// ── Formulario Pagar Giro Nacional ────────────────────────────────────────────

function PagarNacionalForm({ cajaId }: { cajaId: number }) {
  type Result = { giro: GiroResumen; saldo: number }
  const [result, setResult] = useState<Result | null>(null)

  const pagar = usePagarGiroNacional(cajaId)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PagarNacionalDto>({
    resolver: zodResolver(PagarNacionalSchema),
  })

  const onSubmit = async (data: PagarNacionalDto) => {
    try {
      const r = await pagar.mutateAsync(data)
      setResult({ giro: r.giro, saldo: r.saldoActual })
      toast.success('Giro pagado exitosamente')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al pagar el giro')
    }
  }

  if (result) {
    return (
      <ResultadoExito
        titulo="Giro Nacional pagado"
        giro={result.giro}
        saldo={result.saldo}
        onNuevo={() => { setResult(null); reset() }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="PIN (6 dígitos) *" error={errors.pin?.message}>
        <Input
          placeholder="000000"
          maxLength={6}
          className="font-mono text-lg tracking-widest text-center"
          {...register('pin')}
        />
      </Field>
      <Field label="Nombre del beneficiario *" error={errors.nombreBeneficiario?.message}>
        <Input placeholder="Nombre como aparece en el documento" {...register('nombreBeneficiario')} />
      </Field>
      <Field label="Nro. documento del beneficiario *" error={errors.numeroDocBeneficiario?.message}>
        <Input placeholder="Número de documento" {...register('numeroDocBeneficiario')} />
      </Field>

      <Button type="submit" className="w-full" disabled={pagar.isPending}>
        {pagar.isPending
          ? <><Loader2 className="mr-2 size-4 animate-spin" /> Pagando...</>
          : <><Download className="mr-2 size-4" /> Pagar giro nacional</>
        }
      </Button>
    </form>
  )
}

// ── Formulario Emitir Giro Internacional ─────────────────────────────────────

function EmitirInternacionalForm({ cajaId }: { cajaId: number }) {
  type Result = { giro: GiroResumen; saldo: number }
  const [result, setResult] = useState<Result | null>(null)
  const [showRemitente, setShowRemitente] = useState(false)

  const emitir = useEmitirGiroInternacional(cajaId)

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<EmitirInternacionalDto>({
    resolver: zodResolver(EmitirInternacionalSchema),
    defaultValues: {
      operador: 'moneygram',
      monedaDestino: 'USD',
      beneficiario: { numeroDoc: '', nombre: '' },
    },
  })

  const onSubmit = async (data: EmitirInternacionalDto) => {
    try {
      const r = await emitir.mutateAsync(data)
      setResult({ giro: r.giro, saldo: r.saldoActual })
      toast.success('Giro internacional emitido')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al emitir el giro internacional')
    }
  }

  if (result) {
    return (
      <ResultadoExito
        titulo="Giro Internacional emitido"
        giro={result.giro}
        saldo={result.saldo}
        onNuevo={() => { setResult(null); reset() }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto (COP) *" error={errors.montoCop?.message}>
          <Input type="number" min={1} placeholder="Ej: 2000000" {...register('montoCop', { valueAsNumber: true })} />
        </Field>
        <Field label="TRM del día *" error={errors.trmDia?.message}>
          <Input type="number" min={1} placeholder="Ej: 4200" {...register('trmDia', { valueAsNumber: true })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Operador" error={errors.operador?.message}>
          <Controller
            name="operador"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? 'moneygram'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moneygram">MoneyGram</SelectItem>
                  <SelectItem value="ria">Ria</SelectItem>
                  <SelectItem value="ifs">IFS</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field label="Moneda destino" error={errors.monedaDestino?.message}>
          <Input placeholder="USD" {...register('monedaDestino')} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="PIN (si aplica)" error={errors.pin?.message}>
          <Input placeholder="PIN del operador" {...register('pin')} />
        </Field>
        <Field label="Nro. referencia" error={errors.numeroReferencia?.message}>
          <Input placeholder="Referencia" {...register('numeroReferencia')} />
        </Field>
      </div>

      <Separator />
      <p className="text-sm font-medium">Beneficiario</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo doc." error={errors.beneficiario?.tipoDoc?.message}>
          <Input placeholder="Passport / ID" {...register('beneficiario.tipoDoc')} />
        </Field>
        <Field label="Nro. documento *" error={errors.beneficiario?.numeroDoc?.message}>
          <Input placeholder="Número" {...register('beneficiario.numeroDoc')} />
        </Field>
      </div>
      <Field label="Nombre completo *" error={errors.beneficiario?.nombre?.message}>
        <Input placeholder="Nombres y apellidos" {...register('beneficiario.nombre')} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="País (código 2-3 letras)" error={errors.beneficiario?.pais?.message}>
          <Input placeholder="US / MX / VE" {...register('beneficiario.pais')} />
        </Field>
        <Field label="Fecha de nacimiento" error={errors.beneficiario?.fechaNac?.message}>
          <Input type="date" {...register('beneficiario.fechaNac')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Estado / Provincia" error={errors.beneficiario?.estado?.message}>
          <Input placeholder="Estado" {...register('beneficiario.estado')} />
        </Field>
        <Field label="Ciudad" error={errors.beneficiario?.ciudad?.message}>
          <Input placeholder="Ciudad" {...register('beneficiario.ciudad')} />
        </Field>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShowRemitente(v => !v)}
        className="text-muted-foreground"
      >
        {showRemitente ? '— Ocultar remitente' : '+ Agregar datos del remitente'}
      </Button>

      {showRemitente && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">Remitente</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo doc." error={errors.remitente?.tipoDoc?.message}>
              <Input placeholder="CC / CE" {...register('remitente.tipoDoc')} />
            </Field>
            <Field label="Nro. documento" error={errors.remitente?.numeroDoc?.message}>
              <Input placeholder="Número" {...register('remitente.numeroDoc')} />
            </Field>
          </div>
          <Field label="Nombre" error={errors.remitente?.nombre?.message}>
            <Input placeholder="Nombres y apellidos" {...register('remitente.nombre')} />
          </Field>
          <Field label="Email" error={errors.remitente?.email?.message}>
            <Input type="email" placeholder="correo@ejemplo.com" {...register('remitente.email')} />
          </Field>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={emitir.isPending}>
        {emitir.isPending
          ? <><Loader2 className="mr-2 size-4 animate-spin" /> Emitiendo...</>
          : <><Globe className="mr-2 size-4" /> Emitir giro internacional</>
        }
      </Button>
    </form>
  )
}

// ── Formulario Pagar Giro Internacional ──────────────────────────────────────

function PagarInternacionalForm({ cajaId }: { cajaId: number }) {
  type Result = { giro: GiroResumen; saldo: number }
  const [result, setResult] = useState<Result | null>(null)

  const pagar = usePagarGiroInternacional(cajaId)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PagarInternacionalDto>({
    resolver: zodResolver(PagarInternacionalSchema),
  })

  const onSubmit = async (data: PagarInternacionalDto) => {
    try {
      const r = await pagar.mutateAsync(data)
      setResult({ giro: r.giro, saldo: r.saldoActual })
      toast.success('Giro internacional pagado')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al pagar el giro internacional')
    }
  }

  if (result) {
    return (
      <ResultadoExito
        titulo="Giro Internacional pagado"
        giro={result.giro}
        saldo={result.saldo}
        onNuevo={() => { setResult(null); reset() }}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="PIN *" error={errors.pin?.message}>
        <Input
          placeholder="PIN del operador"
          className="font-mono tracking-widest"
          {...register('pin')}
        />
      </Field>
      <Field label="Nombre del beneficiario *" error={errors.nombreBeneficiario?.message}>
        <Input placeholder="Nombre completo" {...register('nombreBeneficiario')} />
      </Field>
      <Field label="Nro. documento del beneficiario *" error={errors.numeroDocBeneficiario?.message}>
        <Input placeholder="Número de documento" {...register('numeroDocBeneficiario')} />
      </Field>
      <Field label="Fecha de nacimiento del beneficiario *" error={errors.fechaNacBeneficiario?.message}>
        <Input type="date" {...register('fechaNacBeneficiario')} />
      </Field>

      <Button type="submit" className="w-full" disabled={pagar.isPending}>
        {pagar.isPending
          ? <><Loader2 className="mr-2 size-4 animate-spin" /> Pagando...</>
          : <><Download className="mr-2 size-4" /> Pagar giro internacional</>
        }
      </Button>
    </form>
  )
}

// ── Lista de giros en sesión ──────────────────────────────────────────────────

function ListaGiros({ sesionId, puedeAnular }: { sesionId: number | null; puedeAnular: boolean }) {
  const [anularId, setAnularId] = useState<number | null>(null)
  const { data: giros, isLoading } = useGirosBySesion(sesionId ?? undefined)
  const anular = useAnularGiro()

  const confirmarAnulacion = async () => {
    if (!anularId) return
    try {
      await anular.mutateAsync(anularId)
      toast.success('Giro anulado')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo anular el giro')
    } finally {
      setAnularId(null)
    }
  }

  if (!sesionId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <AlertTriangle className="size-8 opacity-40" />
        <p className="text-sm">No hay sesión activa en esta caja</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!giros?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
        <ArrowRightLeft className="size-8 opacity-40" />
        <p className="text-sm">Sin giros en esta sesión</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {giros.map(g => (
          <div
            key={g.id}
            className="rounded-lg border bg-card p-3 flex items-start justify-between gap-2"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{g.id}</span>
                <EstadoBadge estado={g.estado} />
                <Badge variant="outline" className="text-xs capitalize">
                  {g.tipo} — {g.operacion}
                </Badge>
              </div>
              <p className="text-sm font-medium truncate">{g.beneficiarioNombre ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{fmtFecha(g.createdAt)}</p>
              {g.pin && (
                <p className="text-xs font-mono">PIN: <span className="font-bold">{g.pin}</span></p>
              )}
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p className="text-sm font-semibold">{fmtCOP(g.montoTotalCop)}</p>
              {g.estado === 'pendiente' && puedeAnular && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => setAnularId(g.id)}
                >
                  <Ban className="size-3 mr-1" />
                  Anular
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!anularId} onOpenChange={open => !open && setAnularId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular giro #{anularId}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El monto será revertido en la caja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarAnulacion}
              disabled={anular.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {anular.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Anular giro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function GirosPage() {
  const { cajaId: cajaIdStr } = useParams<{ cajaId: string }>()
  const navigate    = useNavigate()
  const user        = useSessionStore(s => s.user)
  const cajaId      = Number(cajaIdStr) || 0
  const sucursalId  = user?.sucursal_id ?? 0

  const { data: statusPunto } = useStatusPunto(sucursalId)
  const cajaCard = statusPunto?.cajas.find(c => c.cajaId === cajaId)
  const sesionId = cajaCard?.sesionId ?? null

  const { servicioActivo } = useServiciosCaja(cajaId)
  const opsGiro = ([
    { value: 'emitir-nacional', label: 'Emitir Nal.',  codigo: 'giro_nacional_emision' },
    { value: 'pagar-nacional',  label: 'Pagar Nal.',   codigo: 'giro_nacional_pago' },
    { value: 'emitir-intl',     label: 'Emitir Intl.', codigo: 'giro_internacional_emision' },
    { value: 'pagar-intl',      label: 'Pagar Intl.',  codigo: 'giro_internacional_pago' },
  ] as const).filter(o => servicioActivo(o.codigo))

  if (opsGiro.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Ban className="size-8 opacity-30" />
        <p className="text-sm">El supervisor inhabilitó los giros en esta caja</p>
        <Button variant="outline" size="sm" onClick={() => navigate(`/ventas/caja/${cajaId}`)}>
          Volver al punto de venta
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/ventas/caja/${cajaId}`)}
          className="shrink-0"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold leading-none">Giros</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cajaCard?.nombre ?? `Caja ${cajaId}`}
            {sesionId && (
              <span className="ml-1.5 text-green-600 dark:text-green-400">· Sesión activa</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Panel izquierdo — operaciones */}
        <div className="flex w-full max-w-md flex-col border-r">
          <Tabs defaultValue={opsGiro[0].value} className="flex flex-col flex-1 overflow-hidden">
            <TabsList
              className="mx-4 mt-3 grid shrink-0"
              style={{ gridTemplateColumns: `repeat(${opsGiro.length}, minmax(0, 1fr))` }}
            >
              {opsGiro.map(o => (
                <TabsTrigger key={o.value} value={o.value} className="text-xs">{o.label}</TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="flex-1 px-4 pb-4">
              <TabsContent value="emitir-nacional" className="mt-4 space-y-2">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Send className="size-4" /> Emitir giro nacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <EmitirNacionalForm cajaId={cajaId} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pagar-nacional" className="mt-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Download className="size-4" /> Pagar giro nacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <PagarNacionalForm cajaId={cajaId} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="emitir-intl" className="mt-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="size-4" /> Emitir giro internacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <EmitirInternacionalForm cajaId={cajaId} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pagar-intl" className="mt-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Download className="size-4" /> Pagar giro internacional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <PagarInternacionalForm cajaId={cajaId} />
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Panel derecho — historial de giros */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b px-4 py-2.5 shrink-0">
            <p className="text-sm font-medium">Giros de la sesión</p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <ListaGiros sesionId={sesionId} puedeAnular={servicioActivo('giro_nacional_anulacion')} />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
