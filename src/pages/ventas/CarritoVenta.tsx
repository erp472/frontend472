import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Trash2, ChevronLeft, RefreshCw,
  Search, CheckCircle2, AlertTriangle, Loader2,
  Package, MailOpen, Plus, Tag, Pencil,
  Truck, X, UserRound, Eye, EyeOff, ArrowRightLeft,
  ChevronsUpDown, Check,
} from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Badge }       from '@/components/ui/badge'
import { Label }       from '@/components/ui/label'
import { Separator }   from '@/components/ui/separator'
import { ScrollArea }  from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { useSessionStore } from '@/stores/useSessionStore'
import { useAcceso } from '@/hooks/useAcceso'
import { ApiError } from '@/lib/api'
import { useCliente, useUpdateCliente, useCreateCliente, type TipoDocumento } from '@/queries/clientes.queries'
import { useUser, useCreateUser, useUpdateUser } from '@/queries/users.queries'
import {
  useCaja, useStatusPunto, useAsignarCajero,
} from '@/queries/cajas.queries'
import {
  useCatalogoProductos,
  useTarifasEspecial,
  useCarrito,
  useResumenTurno,
  useVentasTurno,
  useApartadosDisponibles,
  useServiciosPostales,
  useIniciarVenta,
  useAgregarProducto,
  useEliminarProducto,
  useConfirmarVenta,
  useAnularVenta,
  useContratarApartado,
  useCrearEnvio,
  type ClienteResumen,
  type MedioPagoVenta,
  type TipoProducto,
  type ServicioCatalogo,
  type GuiaEnvio,
} from '@/queries/ventas.queries'
import { GuiaPostal } from '@/components/GuiaPostal'
import { usePaises, useDepartamentos, useCiudades } from '@/queries/geo.queries'

// ── Validación de email ───────────────────────────────────────────────────────

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/

function validarEmail(v: string): string | null {
  if (!v.trim()) return 'El email es obligatorio'
  if (v.length > 200) return 'Máximo 200 caracteres'
  if (!EMAIL_RE.test(v.trim())) return 'Formato inválido (ej: nombre@dominio.com)'
  const [local, domain] = v.trim().split('@')
  if (local.length > 64) return 'La parte antes del @ es demasiado larga'
  if (domain.length > 255) return 'El dominio es demasiado largo'
  if (domain.startsWith('.') || domain.endsWith('.')) return 'Dominio inválido'
  return null
}

// ── Modal editar cliente (desde ventas) ───────────────────────────────────────

function EditarClienteModal({ clienteId, open, onClose, onActualizado }: {
  clienteId: number
  open:      boolean
  onClose:   () => void
  onActualizado: (email: string | null, telefono: string | null) => void
}) {
  const { data: cliente, isLoading } = useCliente(clienteId)
  const update = useUpdateCliente(clienteId)

  const [nombre,   setNombre]   = useState('')
  const [apellido, setApellido] = useState('')
  const [email,    setEmail]    = useState('')
  const [telefono, setTelefono] = useState('')
  const [emailErr, setEmailErr] = useState<string | null>(null)

  useEffect(() => {
    if (cliente) {
      setNombre(cliente.nombre)
      setApellido(cliente.apellido ?? '')
      setEmail(cliente.email ?? '')
      setTelefono(cliente.telefono ?? '')
      setEmailErr(null)
    }
  }, [cliente])

  const handleEmailChange = (v: string) => {
    setEmail(v)
    setEmailErr(v ? validarEmail(v) : null)
  }

  const handleSave = async () => {
    const err = validarEmail(email)
    if (err) { setEmailErr(err); return }
    try {
      const updated = await update.mutateAsync({
        nombre:   nombre.trim()   || undefined,
        apellido: apellido.trim() || null,
        email:    email.trim()    || null,
        telefono: telefono.trim() || null,
      })
      toast.success('Datos actualizados')
      onActualizado(updated.email, updated.telefono)
      onClose()
    } catch {
      toast.error('No se pudo actualizar el cliente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" /> Editar datos del cliente
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {/* Documento (solo lectura) */}
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {cliente?.tipoDocumento?.replace(/_/g, ' ')} · {cliente?.numeroDocumento}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input className="h-8 text-sm" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Apellido</Label>
                <Input className="h-8 text-sm" value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Opcional" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Email <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MailOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  type="email"
                  className={cn(
                    'pl-8 h-8 text-sm',
                    emailErr && 'border-destructive focus-visible:ring-destructive',
                  )}
                  value={email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="cliente@correo.com"
                />
              </div>
              {emailErr && (
                <p className="text-[11px] text-destructive flex items-center gap-1">
                  <AlertTriangle className="size-3 shrink-0" /> {emailErr}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Teléfono</Label>
              <Input
                className="h-8 text-sm"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="3001234567"
              />
            </div>

            {/* Canal/beneficio solo lectura */}
            {cliente?.tipoCliente && (
              <div className="flex items-center gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-1.5">
                <Tag className="size-3.5 text-primary shrink-0" />
                <span className="text-xs text-primary font-medium">{cliente.tipoCliente.nombre}</span>
                <span className="text-xs text-muted-foreground ml-auto">{cliente.tipoCliente.descuentoPorcentaje}% dto</span>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={update.isPending}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={update.isPending || !!emailErr || isLoading}>
            {update.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})
const fmt = (v: number | undefined | null) => (v != null ? COP.format(v) : '$0')

const TIPO_DOC_OPTIONS: { value: string; label: string }[] = [
  { value: 'cedula',            label: 'CC — Cédula' },
  { value: 'nit',               label: 'NIT' },
  { value: 'extranjeria',       label: 'CE — Extranjería' },
  { value: 'tarjeta_identidad', label: 'TI — Tarjeta Identidad' },
  { value: 'pasaporte',         label: 'PP — Pasaporte' },
]

const TIPOS_PRODUCTO: { value: TipoProducto | ''; label: string }[] = [
  { value: '',                label: 'Todos' },
  { value: 'estampilla',      label: 'Estampillas' },
  { value: 'empaque',         label: 'Empaques' },
  { value: 'material_oficina', label: 'Material' },
  { value: 'paquete',         label: 'Paquetes' },
  { value: 'otro',            label: 'Otro' },
]

const MEDIOS_PAGO: { value: MedioPagoVenta; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
]

type MedioPagoEnvio = Exclude<MedioPagoVenta, 'cheque'>

const MEDIOS_PAGO_ENVIO: { value: MedioPagoEnvio; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
]

// ── Tipos de documento ────────────────────────────────────────────────────────

const TIPOS_DOCUMENTO = [
  { value: 'cedula',            label: 'Cédula de Ciudadanía' },
  { value: 'pasaporte',         label: 'Pasaporte' },
  { value: 'tarjeta_identidad', label: 'Tarjeta de Identidad' },
  { value: 'extranjeria',       label: 'Cédula de Extranjería' },
  { value: 'nit',               label: 'NIT' },
]

// ── Crear cajero dialog ───────────────────────────────────────────────────────

function CrearCajeroDialog({ open, onClose, sucursalId, sesionId, onCreado }: {
  open:       boolean
  onClose:    () => void
  sucursalId: number
  sesionId:   number | null
  onCreado:   () => void
}) {
  const crear        = useCreateUser()
  const asignar      = useAsignarCajero()

  const [nombre,          setNombre]          = useState('')
  const [tipoDocumento,   setTipoDocumento]   = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [showPwd,         setShowPwd]         = useState(false)
  const [confirmando,     setConfirmando]     = useState(false)

  function reset() {
    setNombre(''); setTipoDocumento(''); setNumeroDocumento('')
    setEmail(''); setPassword(''); setShowPwd(false); setConfirmando(false)
  }

  function handleClose() { reset(); onClose() }

  function handleContinuar() {
    if (!nombre.trim())          { toast.error('El nombre completo es obligatorio'); return }
    if (!tipoDocumento)          { toast.error('El tipo de documento es obligatorio'); return }
    if (!numeroDocumento.trim()) { toast.error('El número de documento es obligatorio'); return }
    if (!email.trim())           { toast.error('El correo electrónico es obligatorio'); return }
    if (password.length < 8)    { toast.error('La contraseña debe tener al menos 8 caracteres'); return }
    setConfirmando(true)
  }

  async function handleConfirmar() {
    try {
      const usuario = await crear.mutateAsync({
        nombre:           nombre.trim(),
        email:            email.trim().toLowerCase(),
        password,
        rol:              'CAJERO',
        sucursal_id:      sucursalId,
        tipo_documento:   tipoDocumento,
        numero_documento: numeroDocumento.trim(),
      })
      if (sesionId) {
        await asignar.mutateAsync({ sesionId, cajeroId: usuario.id })
      }
      toast.success(`Cajero ${nombre.trim()} creado y asignado correctamente`)
      reset()
      onCreado()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al crear el cajero')
      setConfirmando(false)
    }
  }

  const tipoLabel = TIPOS_DOCUMENTO.find(t => t.value === tipoDocumento)?.label ?? tipoDocumento

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {confirmando ? 'Confirmar datos del cajero' : 'Crear cajero'}
          </DialogTitle>
        </DialogHeader>

        {!confirmando ? (
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="cj-nombre" className="text-xs">Nombre completo *</Label>
              <Input id="cj-nombre" placeholder="Ej. María González"
                value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de documento *</Label>
                <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cj-doc" className="text-xs">Número *</Label>
                <Input id="cj-doc" placeholder="Número de doc."
                  value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cj-email" className="text-xs">Correo electrónico *</Label>
              <Input id="cj-email" type="email" placeholder="cajero@4-72.com.co"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cj-pwd" className="text-xs">Contraseña *</Label>
              <div className="relative">
                <Input id="cj-pwd" type={showPwd ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres" value={password}
                  onChange={e => setPassword(e.target.value)} className="pr-9" />
                <button type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-snug">
                  Verifique estos datos. Una vez creado, el <strong>nombre completo</strong>{' '}
                  y el <strong>documento</strong> no podrán modificarse.
                </p>
              </div>
              <div className="text-sm space-y-1.5 border-t border-amber-200 dark:border-amber-800 pt-3">
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Nombre completo:</span>
                  <span className="font-semibold text-right">{nombre}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Documento:</span>
                  <span className="font-semibold text-right">{tipoLabel} · {numeroDocumento}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!confirmando ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleContinuar}>Continuar</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setConfirmando(false)}>Volver</Button>
              <Button onClick={handleConfirmar} disabled={crear.isPending || asignar.isPending}>
                {(crear.isPending || asignar.isPending) && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Confirmar y crear
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Editar cajero dialog ──────────────────────────────────────────────────────

function EditarCajeroDialog({ cajeroId, open, onClose }: {
  cajeroId: number
  open:     boolean
  onClose:  () => void
}) {
  const { data: cajero, isLoading } = useUser(cajeroId)
  const update = useUpdateUser()

  const [email,    setEmail]    = useState('')
  const [telefono, setTelefono] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  useEffect(() => {
    if (cajero) {
      setEmail(cajero.email)
      setTelefono(cajero.telefono ?? '')
      setPassword('')
    }
  }, [cajero])

  const tipoLabel = TIPOS_DOCUMENTO.find(t => t.value === cajero?.tipoDocumento)?.label
    ?? cajero?.tipoDocumento ?? '—'

  async function handleSave() {
    if (!email.trim()) { toast.error('El correo es obligatorio'); return }
    if (password && password.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    try {
      await update.mutateAsync({
        id: cajeroId,
        data: {
          email:    email.trim().toLowerCase(),
          telefono: telefono.trim() || null,
          ...(password && { password }),
        },
      })
      toast.success('Datos del cajero actualizados')
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al actualizar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar cajero</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <div className="rounded-lg bg-muted/40 border px-3 py-2.5 space-y-1.5 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Datos no modificables
              </p>
              <div className="flex justify-between gap-2">
                <span className="text-xs text-muted-foreground">Nombre completo:</span>
                <span className="font-medium text-right">{cajero?.nombre ?? '—'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-xs text-muted-foreground">Documento:</span>
                <span className="font-medium text-right">
                  {cajero?.numeroDocumento ? `${tipoLabel} · ${cajero.numeroDocumento}` : '—'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ej-email" className="text-xs">Correo electrónico</Label>
              <Input id="ej-email" type="email" value={email}
                onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ej-tel" className="text-xs">Teléfono</Label>
              <Input id="ej-tel" type="tel" placeholder="Opcional"
                value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ej-pwd" className="text-xs">Nueva contraseña (opcional)</Label>
              <div className="relative">
                <Input id="ej-pwd" type={showPwd ? 'text' : 'password'}
                  placeholder="Dejar vacío para no cambiar" value={password}
                  onChange={e => setPassword(e.target.value)} className="pr-9" />
                <button type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd(v => !v)}
                >
                  {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading || update.isPending}>
            {update.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── ResumenBanner ─────────────────────────────────────────────────────────────

function ResumenBanner({ cajaId }: { cajaId: number }) {
  const { data, isFetching, refetch } = useResumenTurno(cajaId)

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/30 border-b text-xs overflow-x-auto shrink-0">
      {[
        { label: 'Sellos',    val: data?.sellos.total,    qty: data?.sellos.cantidad },
        { label: 'Productos', val: data?.productos.total, qty: data?.productos.cantidad },
        { label: 'Apartados', val: data?.apartados.total, qty: data?.apartados.cantidad },
        { label: 'Servicios', val: data?.servicios.total, qty: data?.servicios.cantidad },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-1 shrink-0">
          <span className="text-muted-foreground">{s.label}:</span>
          <span className="font-semibold tabular-nums">{fmt(s.val)}</span>
          {!!s.qty && <Badge variant="secondary" className="text-[10px] h-4 px-1 py-0">{s.qty}</Badge>}
        </div>
      ))}
      <Separator orientation="vertical" className="h-3.5 shrink-0" />
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-muted-foreground font-medium">Total:</span>
        <span className="font-bold tabular-nums text-primary">{fmt(data?.totalGeneral)}</span>
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        className="ml-auto text-muted-foreground hover:text-foreground shrink-0"
      >
        <RefreshCw className={cn('size-3', isFetching && 'animate-spin')} />
      </button>
    </div>
  )
}

// ── Crear cliente rápido (desde ventas, sin beneficios) ───────────────────────

function CrearClienteRapidoDialog({ open, onClose, tipoDocumento, numeroDocumento, onCreado }: {
  open:            boolean
  onClose:         () => void
  tipoDocumento:   string
  numeroDocumento: string
  onCreado:        (nombre: string) => void
}) {
  const [nombre,   setNombre]   = useState('')
  const [apellido, setApellido] = useState('')
  const [email,    setEmail]    = useState('')
  const [telefono, setTelefono] = useState('')
  const crear = useCreateCliente()

  const handleSubmit = async () => {
    if (!nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    try {
      await crear.mutateAsync({
        tipoDocumento:   tipoDocumento as TipoDocumento,
        numeroDocumento: numeroDocumento,
        nombre:          nombre.trim(),
        apellido:        apellido.trim() || undefined,
        email:           email.trim()    || undefined,
        telefono:        telefono.trim() || undefined,
        tipoClienteId:   null,
      })
      toast.success('Cliente creado')
      onCreado(nombre.trim())
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el cliente')
    }
  }

  const handleOpen = (v: boolean) => {
    if (!v) { setNombre(''); setApellido(''); setEmail(''); setTelefono(''); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crear cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {tipoDocumento.replace(/_/g, ' ')} · {numeroDocumento}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
              <Input
                className="h-8 text-sm"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Juan"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Apellido</Label>
              <Input
                className="h-8 text-sm"
                value={apellido}
                onChange={e => setApellido(e.target.value)}
                placeholder="Pérez"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                className="h-8 text-sm"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Teléfono</Label>
              <Input
                className="h-8 text-sm"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="3001234567"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <Tag className="size-3 shrink-0" />
            Se creará como canal retail (sin beneficios)
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={crear.isPending}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={crear.isPending || !nombre.trim()}>
            {crear.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Crear e iniciar venta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── ClientBar ─────────────────────────────────────────────────────────────────

interface ClientBarProps {
  cajaId:          number
  cliente:         ClienteResumen | null
  ventaId:         number | null
  onVentaIniciada: (ventaId: number, cliente: ClienteResumen) => void
  onNuevaVenta:    () => void
  onClienteUpdate: (email: string | null, telefono: string | null) => void
}

function ClientBar({ cajaId, cliente, ventaId, onVentaIniciada, onNuevaVenta, onClienteUpdate }: ClientBarProps) {
  const [docTipo,       setDocTipo]       = useState('cedula')
  const [docNumero,     setDocNumero]     = useState('')
  const [editOpen,      setEditOpen]      = useState(false)
  const [noEncontrado,  setNoEncontrado]  = useState(false)
  const [crearOpen,     setCrearOpen]     = useState(false)
  const iniciar = useIniciarVenta(cajaId)

  // Cargamos el perfil completo del cliente para mostrar canal/beneficio
  const { data: clienteCompleto } = useCliente(cliente?.id ?? 0)

  const buscarConDoc = async (tipo: string, numero: string) => {
    const result = await iniciar.mutateAsync({
      tipoDocumento:   tipo,
      numeroDocumento: numero,
    })
    if (result.cliente) {
      onVentaIniciada(result.venta.id, result.cliente)
      return true
    }
    return false
  }

  const handleBuscar = async () => {
    if (!docNumero.trim()) return
    setNoEncontrado(false)
    try {
      const found = await buscarConDoc(docTipo, docNumero.trim())
      if (found) {
        toast.success('Cliente encontrado')
      } else {
        setNoEncontrado(true)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNoEncontrado(true)
      } else if (err instanceof ApiError && err.status === 409) {
        toast.error('Esta caja no tiene una sesión activa. Contacta al supervisor.')
      } else if (err instanceof ApiError && err.status === 403) {
        toast.error(err.message ?? 'Esta caja está asignada a otro cajero')
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Error al buscar cliente')
      }
    }
  }

  const handleClienteCreado = async (nombre: string) => {
    setCrearOpen(false)
    setNoEncontrado(false)
    try {
      const found = await buscarConDoc(docTipo, docNumero.trim())
      if (found) toast.success(`Venta iniciada para ${nombre}`)
      else toast.error('El cliente fue creado pero no se pudo iniciar la venta')
    } catch {
      toast.error('Error al iniciar la venta')
    }
  }

  if (ventaId && cliente) {
    const canal = clienteCompleto?.canal
    const tipoNombre = clienteCompleto?.tipoCliente?.nombre

    return (
      <>
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-emerald-50/60 dark:bg-emerald-950/20 shrink-0">
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{cliente.nombre}{cliente.apellido ? ` ${cliente.apellido}` : ''}</span>
              <span className="text-xs text-muted-foreground">{cliente.tipoDocumento} {cliente.numeroDocumento}</span>
              {canal && canal !== 'retail' && tipoNombre ? (
                <Badge className="text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                  <Tag className="size-2.5 mr-0.5" />{tipoNombre}
                </Badge>
              ) : canal === 'retail' ? (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Retail</Badge>
              ) : null}
              {cliente.email && (
                <span className="text-xs text-muted-foreground hidden md:block">· {cliente.email}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setEditOpen(true)}
              title="Editar datos del cliente"
            >
              <Pencil className="size-3" /> Editar
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onNuevaVenta}>
              Nueva venta
            </Button>
          </div>
        </div>

        <EditarClienteModal
          clienteId={cliente.id}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onActualizado={(email, telefono) => {
            onClienteUpdate(email, telefono)
            setEditOpen(false)
          }}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <Select value={docTipo} onValueChange={v => { setDocTipo(v); setNoEncontrado(false) }}>
          <SelectTrigger className="w-[90px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIPO_DOC_OPTIONS.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="h-8 text-sm max-w-[200px]"
          placeholder="N° documento"
          value={docNumero}
          onChange={e => { setDocNumero(e.target.value); setNoEncontrado(false) }}
          onKeyDown={e => e.key === 'Enter' && handleBuscar()}
        />
        <Button
          size="sm"
          className="h-8"
          onClick={handleBuscar}
          disabled={iniciar.isPending || !docNumero.trim()}
        >
          {iniciar.isPending
            ? <Loader2 className="size-3.5 animate-spin" />
            : <Search className="size-3.5" />}
          <span className="ml-1.5">Buscar</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs shrink-0"
          onClick={() => setCrearOpen(true)}
        >
          <Plus className="size-3" /> Crear cliente
        </Button>
        {noEncontrado && (
          <span className="text-xs text-amber-600 font-medium shrink-0">
            No encontrado
          </span>
        )}
      </div>

      <CrearClienteRapidoDialog
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        tipoDocumento={docTipo}
        numeroDocumento={docNumero}
        onCreado={handleClienteCreado}
      />
    </>
  )
}

// ── StockBadge ────────────────────────────────────────────────────────────────

function StockBadge({ stock, minimo }: { stock: number | null; minimo: number | null }) {
  if (stock === null) return null
  if (stock === 0)    return <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5">Sin stock</Badge>
  if (minimo !== null && stock <= minimo)
    return <Badge className="text-[9px] px-1 py-0 h-3.5 bg-amber-500 hover:bg-amber-500">Stock: {stock}</Badge>
  return <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">Stock: {stock}</Badge>
}

// ── TabProductos ──────────────────────────────────────────────────────────────

function TabProductos({
  sucursalId, ventaId, cajaId,
}: { sucursalId: number; ventaId: number | null; cajaId: number }) {
  const [tipoFiltro, setTipoFiltro] = useState<TipoProducto | ''>('')
  const [busqueda,   setBusqueda]   = useState('')
  const { data: catalogo, isLoading } = useCatalogoProductos(sucursalId, tipoFiltro || undefined)
  const agregar = useAgregarProducto(ventaId ?? 0, cajaId)

  const filtrado = catalogo?.filter(p =>
    !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  ) ?? []

  const handleAgregar = async (productoId: number, nombre: string) => {
    if (!ventaId) {
      toast.error('Busca un cliente primero')
      return
    }
    try {
      await agregar.mutateAsync({ productoId, cantidad: 1 })
      toast.success(`${nombre} agregado`)
    } catch {
      toast.error('No se pudo agregar el producto')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Búsqueda */}
      <div className="px-3 pt-2 pb-1 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
      </div>
      {/* Tipo filter */}
      <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b shrink-0 scrollbar-none">
        {TIPOS_PRODUCTO.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTipoFiltro(t.value as TipoProducto | '')}
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
              tipoFiltro === t.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Catalog grid */}
      <ScrollArea className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !filtrado.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {busqueda ? 'Sin resultados' : 'No hay productos disponibles'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-3">
            {filtrado.map(p => {
              // p.precio es bruto (incluye IVA) — extraer en lugar de añadir
              const iva       = Math.round(p.precio * p.porcentajeTax / (100 + p.porcentajeTax))
              const total     = p.precio
              const sinStock  = p.stockActual !== null && p.stockActual === 0
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!ventaId || agregar.isPending || sinStock}
                  onClick={() => handleAgregar(p.id, p.nombre)}
                  className={cn(
                    'group rounded-lg border p-3 text-left flex flex-col gap-2 transition-all',
                    sinStock
                      ? 'border-dashed border-muted-foreground/30 opacity-50 cursor-not-allowed'
                      : 'hover:border-primary/60 hover:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    'disabled:cursor-not-allowed',
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-semibold leading-tight line-clamp-2">{p.nombre}</span>
                    <Package className="size-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-end justify-between mt-auto gap-1">
                    <div className="space-y-0.5">
                      <span className="text-sm font-bold tabular-nums">{fmt(p.precio)}</span>
                      {iva > 0 ? (
                        <>
                          <div className="text-[10px] text-amber-600 tabular-nums">
                            IVA {p.porcentajeTax}%: {fmt(iva)}
                          </div>
                          <div className="text-[10px] font-semibold tabular-nums">
                            Total: {fmt(total)}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-emerald-600">Sin IVA</div>
                      )}
                      <StockBadge stock={p.stockActual} minimo={p.stockMinimo} />
                    </div>
                    {!sinStock && (
                      <Plus className={cn(
                        'size-5 rounded-full bg-primary text-primary-foreground p-0.5 shrink-0',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                      )} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ── TabApartado ───────────────────────────────────────────────────────────────

const TAMANO_LABEL: Record<string, string> = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande' }
const IVA_RATE = 0.19

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function TabApartado({
  sucursalId, cajaId, clienteId,
}: { sucursalId: number; cajaId: number; clienteId: number | null }) {
  const today = new Date().toISOString().split('T')[0]

  const [tamanoFiltro,   setTamanoFiltro]   = useState<string>('')
  const [selectedId,     setSelectedId]     = useState<number | null>(null)
  const [duracionMeses,  setDuracionMeses]  = useState(12)
  const [fechaInicio,    setFechaInicio]    = useState(today)
  const [comentarios,    setComentarios]    = useState('')

  const { data: apartados, isLoading } = useApartadosDisponibles(sucursalId, tamanoFiltro || undefined)
  const contratar = useContratarApartado(cajaId)

  const filtrados = apartados ?? []
  const selected  = filtrados.find(a => a.id === selectedId) ?? null

  const fechaFin = addMonths(fechaInicio, duracionMeses)

  const PRECIO = 87_500
  const base   = Math.round(PRECIO / (1 + IVA_RATE))
  const iva    = PRECIO - base

  const handleContratar = async () => {
    if (!clienteId) { toast.error('Busca un cliente primero'); return }
    if (!selected)  { toast.error('Selecciona un apartado');   return }
    try {
      await contratar.mutateAsync({
        clienteId,
        sucursalId:     selected.sucursalId,
        numeroApartado: selected.numero,
        tamano:         selected.tamano,
        meses:          Math.max(1, duracionMeses),
        fechaInicio,
        ...(comentarios.trim() ? { comentarios: comentarios.trim() } : {}),
      })
      toast.success(`Apartado #${selected.numero} contratado`)
      setSelectedId(null)
      setComentarios('')
      setDuracionMeses(12)
      setFechaInicio(today)
    } catch {
      toast.error('No se pudo contratar el apartado')
    }
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Panel izquierdo: Nuevo Contrato ────────────────────────────────── */}
      <div className="w-44 shrink-0 flex flex-col border-r">
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Nuevo contrato
          </p>
          <Select value={tamanoFiltro} onValueChange={v => { setTamanoFiltro(v); setSelectedId(null) }}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Tamaño" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="pequeno">Pequeño</SelectItem>
              <SelectItem value="mediano">Mediano</SelectItem>
              <SelectItem value="grande">Grande</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="px-3 py-1.5 shrink-0">
          <p className="text-[10px] text-muted-foreground font-medium">No. Apartado Postal</p>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !filtrados.length ? (
            <p className="px-3 py-4 text-[11px] text-center text-muted-foreground">
              Sin disponibles
            </p>
          ) : (
            <div className="px-2 pb-2 space-y-0.5">
              {filtrados.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    'w-full text-left rounded-md px-2 py-1.5 transition-colors',
                    selectedId === a.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  <p className="text-xs font-bold leading-none">#{a.numero}</p>
                  <p className={cn(
                    'text-[10px] mt-0.5',
                    selectedId === a.id ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}>
                    {TAMANO_LABEL[a.tamano] ?? a.tamano}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Panel derecho: Formulario ───────────────────────────────────────── */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-3">

          {/* Apartado seleccionado */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2 min-h-[40px] flex items-center">
            {selected ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">#{selected.numero}</span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {TAMANO_LABEL[selected.tamano] ?? selected.tamano}
                </Badge>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Selecciona un apartado de la lista
              </p>
            )}
          </div>

          {/* Duración */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Duración
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Tiempo (meses)</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  className="h-8 text-sm"
                  value={duracionMeses}
                  onChange={e => setDuracionMeses(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha de inicio</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha final</Label>
                <Input
                  type="date"
                  className="h-8 text-xs bg-muted/40"
                  value={fechaFin}
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precio</Label>
                <div className="h-8 flex items-center px-3 rounded-md border bg-muted/40">
                  <span className="text-sm font-bold tabular-nums text-primary">{fmt(PRECIO)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Denominación Tarifas IVA */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Denominación Tarifas IVA
            </p>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Tarifa</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Compras</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">IVA</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Base Imp.</th>
                  </tr>
                </thead>
                <tbody>
                  {selected ? (
                    <tr>
                      <td className="px-2 py-2 tabular-nums">{(IVA_RATE * 100).toFixed(0)}%</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(PRECIO)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-amber-600">{fmt(iva)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(base)}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-2 py-3 text-center text-muted-foreground">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comentarios */}
          <div className="space-y-1">
            <Label className="text-xs">Comentarios</Label>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={2}
              placeholder="Observaciones opcionales..."
              value={comentarios}
              onChange={e => setComentarios(e.target.value)}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!selectedId || !clienteId || contratar.isPending}
              onClick={handleContratar}
            >
              {contratar.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              Contratar
            </Button>
            <Button
              variant="outline"
              disabled={!selectedId || contratar.isPending}
              onClick={() => { setSelectedId(null); setComentarios(''); setDuracionMeses(12); setFechaInicio(today) }}
            >
              Cancelar
            </Button>
          </div>

          {!clienteId && (
            <p className="text-[11px] text-center text-muted-foreground">
              Busca un cliente para poder contratar
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── TabProductosEspeciales ────────────────────────────────────────────────────

const TIPOS_ESPECIALES: { value: TipoProducto; label: string }[] = [
  { value: 'estampilla',       label: 'Estampillas'    },
  { value: 'filatelia',        label: 'Filatelia'      },
  { value: 'empaque',          label: 'Empaque'        },
  { value: 'material_oficina', label: 'Oficina'        },
  { value: 'giro',             label: 'Giro'           },
  { value: 'paquete',          label: 'Paquete'        },
  { value: 'otro',             label: 'Otro'           },
]

function TabProductosEspeciales({
  sucursalId, ventaId, cajaId,
}: { sucursalId: number; ventaId: number | null; cajaId: number }) {
  const [tipoProducto, setTipoProducto] = useState<TipoProducto>('estampilla')
  const [productoId,   setProductoId]   = useState(0)
  const [cantidad,     setCantidad]     = useState(1)

  const { data: catalogo, isLoading: loadingCatalogo } = useCatalogoProductos(sucursalId, tipoProducto)
  const { data: tarifas,  isLoading: loadingTarifas }  = useTarifasEspecial(productoId)
  const { data: carrito }                               = useCarrito(ventaId ?? 0)
  const agregar  = useAgregarProducto(ventaId ?? 0, cajaId)
  const eliminar = useEliminarProducto(ventaId ?? 0, cajaId)

  const productoSeleccionado = catalogo?.find(p => p.id === productoId) ?? null
  const listado = (carrito?.detalle ?? []).filter(d => d.tipoProducto === tipoProducto)
  const totalListado = listado.reduce((s, d) => s + d.subtotal, 0)

  const handleCambiarTipo = (v: string) => {
    setTipoProducto(v as TipoProducto)
    setProductoId(0)
    setCantidad(1)
  }

  const handleCambiarProducto = (v: string) => {
    setProductoId(Number(v))
    setCantidad(1)
  }

  const handleAgregar = async () => {
    if (!ventaId)              { toast.error('Busca un cliente primero'); return }
    if (!productoSeleccionado) { toast.error('Selecciona un producto');   return }
    try {
      await agregar.mutateAsync({ productoId: productoSeleccionado.id, cantidad })
      toast.success(`${productoSeleccionado.nombre} ×${cantidad} agregado`)
      setProductoId(0)
      setCantidad(1)
    } catch {
      toast.error('No se pudo agregar el producto')
    }
  }

  const handleEliminar = async (detalleId: number) => {
    try { await eliminar.mutateAsync(detalleId) }
    catch { toast.error('No se pudo eliminar') }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Form */}
      <div className="px-4 py-3 border-b shrink-0 space-y-3">

        {/* Tipo de Producto */}
        <div className="space-y-1">
          <Label className="text-xs">Tipo de Producto</Label>
          <Select value={tipoProducto} onValueChange={handleCambiarTipo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_ESPECIALES.map(t => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Producto */}
        <div className="space-y-1">
          <Label className="text-xs">Producto</Label>
          {loadingCatalogo ? (
            <div className="flex items-center gap-1.5 h-8 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Cargando...
            </div>
          ) : (
            <Select value={productoId ? String(productoId) : ''} onValueChange={handleCambiarProducto}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {(catalogo ?? []).map(p => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.nombre}{p.precio > 0 ? ` — ${fmt(p.precio)}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!catalogo?.length && !loadingCatalogo && (
            <p className="text-[11px] text-muted-foreground">
              Sin productos de este tipo en este punto
            </p>
          )}
        </div>

        {productoSeleccionado && (
          <>
            {/* Información */}
            <div className="grid grid-cols-3 gap-2 rounded border bg-muted/20 px-3 py-2 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Impuesto</p>
                <p className="font-medium">{productoSeleccionado.porcentajeTax}%</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Precio</p>
                <p className="font-semibold tabular-nums">{fmt(productoSeleccionado.precio)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Código</p>
                <p className="font-mono">{productoSeleccionado.codigo}</p>
              </div>
            </div>

            {/* Tarifas por cantidad */}
            {!loadingTarifas && tarifas && tarifas.length > 0 && (
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Mínimo</th>
                      <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Máximo</th>
                      <th className="text-right px-2 py-1.5 font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tarifas.map(t => (
                      <tr key={t.id} className="border-t hover:bg-muted/30">
                        <td className="px-2 py-1 tabular-nums">{t.minCantidad.toLocaleString('es-CO')}</td>
                        <td className="px-2 py-1 tabular-nums">{t.maxCantidad != null ? t.maxCantidad.toLocaleString('es-CO') : '∞'}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{fmt(t.precio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Precio + Cantidad */}
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Precio</Label>
                <div className="h-8 flex items-center px-3 rounded border bg-muted/40 text-sm tabular-nums font-medium">
                  {fmt(productoSeleccionado.precio)}
                </div>
              </div>
              <div className="space-y-1 w-24">
                <Label className="text-xs">Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  className="h-8 text-sm"
                  value={cantidad}
                  onChange={e => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Agregar */}
            <Button
              className="w-full"
              disabled={!ventaId || agregar.isPending}
              onClick={handleAgregar}
            >
              {agregar.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              <Plus className="size-3.5 mr-1.5" />
              Agregar al carrito
            </Button>
            {!ventaId && (
              <p className="text-[11px] text-center text-muted-foreground">Busca un cliente para continuar</p>
            )}
          </>
        )}
      </div>

      {/* Listado — ítems del carrito de este tipo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b bg-muted/10 shrink-0">
          Listado
        </div>
        {listado.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
            Sin ítems de {TIPOS_ESPECIALES.find(t => t.value === tipoProducto)?.label ?? tipoProducto}
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 sticky top-0 z-10">
                    <th className="w-8" />
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Producto</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground whitespace-nowrap w-20">Precio</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground whitespace-nowrap w-12">Cant.</th>
                    <th className="px-2 py-1.5 text-right font-medium text-muted-foreground whitespace-nowrap w-20">Impuesto</th>
                  </tr>
                </thead>
                <tbody>
                  {listado.map(d => {
                    const iva = d.porcentajeTax > 0
                      ? Math.round((d.subtotal + d.descuento) * d.porcentajeTax / (100 + d.porcentajeTax))
                      : 0
                    return (
                      <tr key={d.id} className="border-b hover:bg-muted/20">
                        <td className="px-1.5 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleEliminar(d.id)}
                            className="text-destructive hover:text-destructive/70 transition-colors"
                          >
                            <X className="size-3.5" />
                          </button>
                        </td>
                        <td className="px-2 py-1.5 font-medium leading-tight">
                          {d.nombreProducto ?? `Producto #${d.productoId}`}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmt(d.precioUnitario)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{d.cantidad}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-amber-700 dark:text-amber-500">
                          {iva > 0 ? fmt(iva) : <span className="text-muted-foreground/30">0.00</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollArea>
            <div className="border-t px-4 py-2 flex justify-end items-center gap-3 bg-muted/20 shrink-0">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-base font-bold tabular-nums text-primary">
                $ {totalListado.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── PaisCombobox ──────────────────────────────────────────────────────────────

function PaisCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const { data: paises = [], isLoading } = usePaises()

  const selected = paises.find(p => (p.iso2 ?? '') === value)
  const label = selected?.nombre ?? (value === 'CO' ? 'Colombia' : value || 'Seleccionar país…')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar país…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
              {isLoading ? 'Cargando…' : 'Sin resultados'}
            </CommandEmpty>
            <CommandGroup>
              {paises.map(p => (
                <CommandItem
                  key={p.id}
                  value={p.nombre}
                  onSelect={() => { onChange(p.iso2 ?? p.nombre); setOpen(false) }}
                  className="text-xs"
                >
                  <Check className={cn('mr-1.5 size-3', (p.iso2 ?? '') === value ? 'opacity-100' : 'opacity-0')} />
                  {p.nombre}
                  {p.iso2 && <span className="ml-auto font-mono text-muted-foreground text-[10px]">{p.iso2}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ── TabServiciosPostales ──────────────────────────────────────────────────────

interface PersonaDir {
  nombre: string; empresa: string; documento: string; email: string
  pais: string; cp: string; dir: DirState; telefono: string
}

interface AddressEntry { dir: DirState; obs: string }
interface PhoneEntry   { tipo: string;  numero: string }

interface EnvioLocal {
  guia: string; servicioNombre: string; destinatario: string; ciudad: string
  cantidad: number; pesoFisico: number; pesoVolumetrico: number | null; pesoFacturado: number
  valorServicio: number; valorTotal: number
  guiaData: GuiaEnvio
}

const personaDirVacia = (): PersonaDir => ({
  nombre: '', empresa: '', documento: '', email: '',
  pais: 'CO', cp: '', dir: dirVacia(), telefono: '',
})

const CAJAS_ENVIO = [
  { productoId: 7, nombre: 'Caja Pequeña 4-72',  precio: 1500 },
  { productoId: 8, nombre: 'Caja Mediana 4-72',  precio: 2500 },
  { productoId: 9, nombre: 'Caja Grande 4-72',   precio: 3500 },
] as const

// ── Dirección normalizada / libre ─────────────────────────────────────────────

const TIPOS_VIA = [
  { value: 'CLL', label: 'Calle' },
  { value: 'KR',  label: 'Carrera' },
  { value: 'DG',  label: 'Diagonal' },
  { value: 'TV',  label: 'Transversal' },
  { value: 'AV',  label: 'Avenida' },
  { value: 'AC',  label: 'Autopista' },
  { value: 'CI',  label: 'Circular' },
  { value: 'VR',  label: 'Variante' },
  { value: 'MZ',  label: 'Manzana' },
  { value: 'LT',  label: 'Lote' },
] as const

const CUADRANTES = [
  { value: 'N',  label: 'N – Norte' },
  { value: 'S',  label: 'S – Sur' },
  { value: 'E',  label: 'E – Este' },
  { value: 'O',  label: 'O – Oeste' },
] as const

interface DirState {
  modo:         'normalizada' | 'libre'
  // Normalizada — vía principal
  tipoVia:     string
  numVia:      string
  letraVia:    string
  bis:         boolean
  cuadrante1:  string
  // Normalizada — generadora + placa
  numGen:      string
  letraGen:    string
  cuadrante2:  string
  placa:       string
  // Libre
  textoLibre:  string
  // Compartido — strings (para composición y envío al backend)
  departamento:   string
  ciudad:         string
  adicion:        string
  // Compartido — IDs de BD para los selects cascada
  departamentoId: number | null
  ciudadId:       number | null
}

const dirVacia = (): DirState => ({
  modo: 'normalizada',
  tipoVia: 'CLL', numVia: '', letraVia: '', bis: false, cuadrante1: '',
  numGen: '', letraGen: '', cuadrante2: '', placa: '',
  textoLibre: '', departamento: '', ciudad: '', adicion: '',
  departamentoId: null, ciudadId: null,
})

function composeAddress(d: DirState): string {
  if (d.modo === 'libre') {
    return [d.textoLibre.trim(), d.adicion.trim()].filter(Boolean).join(', ')
  }
  const viaParts = [d.tipoVia, d.numVia, d.letraVia, d.bis ? 'BIS' : '', d.cuadrante1]
    .filter(Boolean).join(' ')
  const genParts = [d.numGen, d.letraGen, d.cuadrante2].filter(Boolean).join(' ')
  const main = [viaParts, '#', genParts && d.placa ? `${genParts} - ${d.placa}` : genParts || (d.placa ? `- ${d.placa}` : '')]
    .filter(Boolean).join(' ')
  return [main, d.adicion.trim()].filter(Boolean).join(', ')
}

const COLOMBIA_PAIS_ID = 82

function GeoSelectsCascade({
  paisId,
  departamentoId,
  ciudadId,
  onDeptChange,
  onCityChange,
}: {
  paisId: number | null
  departamentoId: number | null
  ciudadId: number | null
  onDeptChange: (id: number | null, nombre: string) => void
  onCityChange: (id: number | null, nombre: string) => void
}) {
  const { data: deptos, isLoading: loadingDeptos } = useDepartamentos(paisId)
  const { data: ciudades, isLoading: loadingCiudades } = useCiudades(departamentoId)

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">
          Departamento {loadingDeptos && <Loader2 className="inline size-2.5 animate-spin ml-1" />}
        </Label>
        <Select
          value={departamentoId ? String(departamentoId) : ''}
          onValueChange={v => {
            const id = Number(v) || null
            const nombre = deptos?.find(d => d.id === id)?.nombre ?? ''
            onDeptChange(id, nombre)
            // no llamar onCityChange aquí: onDeptChange ya limpia ciudadId
          }}
          disabled={!deptos?.length}
        >
          <SelectTrigger className="h-7 text-xs px-2">
            <SelectValue placeholder={loadingDeptos ? 'Cargando...' : 'Seleccionar...'} />
          </SelectTrigger>
          <SelectContent className="max-h-52">
            {deptos?.map(d => (
              <SelectItem key={d.id} value={String(d.id)} className="text-xs">{d.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">
          Ciudad <span className="text-destructive">*</span>
          {loadingCiudades && <Loader2 className="inline size-2.5 animate-spin ml-1" />}
        </Label>
        <Select
          value={ciudadId ? String(ciudadId) : ''}
          onValueChange={v => {
            const id = Number(v) || null
            const nombre = ciudades?.find(c => c.id === id)?.nombre ?? ''
            onCityChange(id, nombre)
          }}
          disabled={!ciudades?.length}
        >
          <SelectTrigger className="h-7 text-xs px-2">
            <SelectValue placeholder={!departamentoId ? 'Primero depto.' : loadingCiudades ? 'Cargando...' : 'Seleccionar...'} />
          </SelectTrigger>
          <SelectContent className="max-h-52">
            {ciudades?.map(c => (
              <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function DireccionInput({
  value, onChange, paisId = COLOMBIA_PAIS_ID,
}: {
  value: DirState
  onChange: (s: DirState) => void
  paisId?: number | null
}) {
  const set = <K extends keyof DirState>(k: K, v: DirState[K]) => onChange({ ...value, [k]: v })
  const preview = composeAddress(value)

  return (
    <div className="space-y-2">
      {/* Selector de modo */}
      <div className="flex rounded-md border overflow-hidden divide-x text-[11px] font-medium">
        <button
          type="button"
          onClick={() => set('modo', 'normalizada')}
          className={cn(
            'flex-1 py-1 text-center transition-colors',
            value.modo === 'normalizada'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted/60',
          )}
        >
          Normalizada
        </button>
        <button
          type="button"
          onClick={() => set('modo', 'libre')}
          className={cn(
            'flex-1 py-1 text-center transition-colors',
            value.modo === 'libre'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted/60',
          )}
        >
          Sin normalizar
        </button>
      </div>

      {value.modo === 'normalizada' ? (
        <div className="rounded-md border p-2 space-y-2">
          {/* Vía principal */}
          <div className="space-y-1">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Vía principal</p>
            <div className="flex gap-1 items-center flex-wrap">
              <Select value={value.tipoVia} onValueChange={v => set('tipoVia', v)}>
                <SelectTrigger className="h-7 w-[62px] text-xs px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_VIA.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      <span className="font-mono font-semibold">{t.value}</span>
                      <span className="text-muted-foreground ml-1.5">{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-7 text-xs w-10 text-center px-1"
                placeholder="Nº"
                value={value.numVia}
                onChange={e => set('numVia', e.target.value.replace(/\D/g, ''))}
                maxLength={4}
              />
              <Input
                className="h-7 text-xs w-8 text-center px-1 uppercase"
                placeholder="Ltr"
                value={value.letraVia}
                onChange={e => set('letraVia', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                maxLength={2}
              />
              <label className="flex items-center gap-1 text-[10px] cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={value.bis}
                  onChange={e => set('bis', e.target.checked)}
                  className="size-3 accent-primary"
                />
                <span className="font-semibold">BIS</span>
              </label>
              <Select value={value.cuadrante1} onValueChange={v => set('cuadrante1', v)}>
                <SelectTrigger className="h-7 w-[62px] text-xs px-1.5">
                  <SelectValue placeholder="Cuad." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-muted-foreground">—</SelectItem>
                  {CUADRANTES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vía generadora + placa */}
          <div className="space-y-1">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Vía generadora y placa</p>
            <div className="flex gap-1 items-center flex-wrap">
              <span className="text-xs font-bold text-muted-foreground shrink-0">#</span>
              <Input
                className="h-7 text-xs w-10 text-center px-1"
                placeholder="Nº"
                value={value.numGen}
                onChange={e => set('numGen', e.target.value.replace(/\D/g, ''))}
                maxLength={4}
              />
              <Input
                className="h-7 text-xs w-8 text-center px-1 uppercase"
                placeholder="Ltr"
                value={value.letraGen}
                onChange={e => set('letraGen', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                maxLength={2}
              />
              <Select value={value.cuadrante2} onValueChange={v => set('cuadrante2', v)}>
                <SelectTrigger className="h-7 w-[62px] text-xs px-1.5">
                  <SelectValue placeholder="Cuad." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-muted-foreground">—</SelectItem>
                  {CUADRANTES.map(c => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs font-bold text-muted-foreground shrink-0">–</span>
              <Input
                className="h-7 text-xs w-12 text-center px-1"
                placeholder="Placa"
                value={value.placa}
                onChange={e => set('placa', e.target.value.replace(/\D/g, ''))}
                maxLength={5}
              />
            </div>
          </div>

          {/* Preview compuesto */}
          {preview && (
            <p className="text-[11px] font-mono bg-muted/60 rounded px-2 py-1 text-center tracking-wide text-foreground">
              {preview}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Label className="text-xs">Dirección</Label>
          <Input
            className="h-8 text-sm"
            placeholder="Ej. Diagonal 5 B # 76-43"
            value={value.textoLibre}
            onChange={e => set('textoLibre', e.target.value)}
          />
        </div>
      )}

      {/* Geografía cascada: Departamento → Ciudad */}
      {paisId != null ? (
        <GeoSelectsCascade
          paisId={paisId}
          departamentoId={value.departamentoId}
          ciudadId={value.ciudadId}
          onDeptChange={(id, nombre) => onChange({ ...value, departamentoId: id, departamento: nombre, ciudadId: null, ciudad: '' })}
          onCityChange={(id, nombre) => onChange({ ...value, ciudadId: id, ciudad: nombre })}
        />
      ) : (
        /* Internacional sin datos BD — texto libre */
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Departamento / Estado</Label>
            <Input
              className="h-7 text-xs"
              placeholder="Estado / Región"
              value={value.departamento}
              onChange={e => set('departamento', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ciudad <span className="text-destructive">*</span></Label>
            <Input
              className="h-7 text-xs"
              placeholder="Ciudad"
              value={value.ciudad}
              onChange={e => set('ciudad', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Adición */}
      <div className="space-y-1">
        <Label className="text-xs">Adición de dirección</Label>
        <Input
          className="h-7 text-xs"
          placeholder="Apto 301, Torre A, Interior 2..."
          value={value.adicion}
          onChange={e => set('adicion', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── AddressModal ───────────────────────────────────────────────────────────────

function hasAddressData(d: DirState): boolean {
  return d.modo === 'normalizada' ? d.numVia.trim() !== '' : d.textoLibre.trim() !== ''
}

function AddressModal({ open, onClose, onSave, title, initial, paisContexto = 'CO' }: {
  open: boolean
  onClose: () => void
  onSave: (p: PersonaDir) => void
  title: string
  initial: PersonaDir
  paisContexto?: string
}) {
  const [nombre,    setNombre]    = useState('')
  const [empresa,   setEmpresa]   = useState('')
  const [documento, setDocumento] = useState('')
  const [email,     setEmail]     = useState('')
  const [cp,        setCp]        = useState('')
  const [addresses, setAddresses] = useState<AddressEntry[]>([])
  const [selDirIdx, setSelDirIdx] = useState<number | null>(null)
  const [draftDir,  setDraftDir]  = useState<DirState>(dirVacia())
  const [phones,    setPhones]    = useState<PhoneEntry[]>([])
  const [selPhIdx,  setSelPhIdx]  = useState<number | null>(null)
  const [phTipo,    setPhTipo]    = useState('CELULAR')
  const [phNum,     setPhNum]     = useState('')

  // Colombia siempre tiene departamentos/ciudades en BD; otros países usan texto libre
  const paisId = paisContexto === 'CO' ? COLOMBIA_PAIS_ID : null

  useEffect(() => {
    if (!open) return
    setNombre(initial.nombre)
    setEmpresa(initial.empresa)
    setDocumento(initial.documento)
    setEmail(initial.email)
    setCp(initial.cp)
    setDraftDir({ ...initial.dir })
    const hasDir = hasAddressData(initial.dir)
    setAddresses(hasDir ? [{ dir: initial.dir, obs: '' }] : [])
    setSelDirIdx(hasDir ? 0 : null)
    setPhones(initial.telefono ? [{ tipo: 'CELULAR', numero: initial.telefono }] : [])
    setSelPhIdx(initial.telefono ? 0 : null)
    setPhNum('')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddDir = () => {
    if (!hasAddressData(draftDir)) return
    const next = [...addresses, { dir: { ...draftDir }, obs: '' }]
    setAddresses(next)
    setSelDirIdx(next.length - 1)
    setDraftDir(dirVacia())
  }

  const handleAddPhone = () => {
    if (!phNum.trim()) return
    const next = [...phones, { tipo: phTipo, numero: phNum.trim() }]
    setPhones(next)
    if (selPhIdx === null) setSelPhIdx(0)
    setPhNum('')
  }

  const handleOk = () => {
    const dir      = selDirIdx !== null ? addresses[selDirIdx].dir : draftDir
    const telefono = selPhIdx  !== null ? phones[selPhIdx].numero  : phones[0]?.numero ?? ''
    onSave({ nombre, empresa, documento, email, cp, pais: paisContexto || 'CO', dir, telefono })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle className="text-sm">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="space-y-4 py-4">
          {/* Datos de la persona */}
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
              <Input className="h-7 text-xs" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Documento</Label>
              <Input className="h-7 text-xs" value={documento} onChange={e => setDocumento(e.target.value)} placeholder="CC / NIT" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Empresa</Label>
              <Input className="h-7 text-xs" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Razón social" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" className="h-7 text-xs" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Código postal</Label>
              <Input className="h-7 text-xs" value={cp} onChange={e => setCp(e.target.value)} placeholder="111011" />
            </div>
            {paisContexto !== 'CO' && (
              <div className="col-span-2 rounded bg-muted/50 border px-2 py-1 text-[10px] text-muted-foreground">
                País destino: <span className="font-medium text-foreground">{paisContexto}</span> — departamento y ciudad en texto libre
              </div>
            )}
          </div>

          <Separator />

          {/* Lista de direcciones guardadas */}
          {addresses.length > 0 && (
            <div className="rounded-md border overflow-hidden">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 px-2 py-1 bg-muted/50 border-b text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                <span className="w-3" /><span>Dirección</span><span>Obs.</span>
              </div>
              {addresses.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-[auto_1fr_auto] items-center gap-x-2 px-2 py-1.5 border-b last:border-0',
                    selDirIdx === i ? 'bg-primary/5' : 'hover:bg-muted/30',
                  )}
                >
                  <button type="button" onClick={() => setSelDirIdx(i)} className="mt-0.5 shrink-0">
                    <span className={cn(
                      'block size-3 rounded-full border-2 transition-colors',
                      selDirIdx === i ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                    )} />
                  </button>
                  <button type="button" onClick={() => setSelDirIdx(i)} className="text-left min-w-0">
                    <p className={cn('text-xs font-mono truncate', selDirIdx === i && 'text-primary font-semibold')}>
                      {composeAddress(a.dir) || '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {[a.dir.ciudad, a.dir.departamento].filter(Boolean).join(', ')}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <input
                      type="text" value={a.obs} placeholder="Obs."
                      onClick={e => e.stopPropagation()}
                      onChange={e => setAddresses(prev =>
                        prev.map((d, idx) => idx === i ? { ...d, obs: e.target.value } : d)
                      )}
                      className="w-14 h-5 text-[10px] rounded border border-border bg-background px-1 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = addresses.filter((_, idx) => idx !== i)
                        setAddresses(next)
                        setSelDirIdx(prev => {
                          if (prev === null || prev !== i) return prev === null ? null : prev > i ? prev - 1 : prev
                          return next.length > 0 ? Math.min(i, next.length - 1) : null
                        })
                      }}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario nueva dirección */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              {addresses.length === 0 ? 'Dirección' : 'Agregar otra dirección'}
            </p>
            <DireccionInput value={draftDir} onChange={setDraftDir} paisId={paisId} />
            <Button
              type="button" variant="outline" size="sm"
              onClick={handleAddDir}
              className="h-7 text-xs"
              disabled={!hasAddressData(draftDir)}
            >
              <Plus className="size-3 mr-1" />
              Agregar a la lista
            </Button>
          </div>

          <Separator />

          {/* Teléfonos */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Teléfonos</p>
            <div className="flex gap-1.5">
              <Select value={phTipo} onValueChange={setPhTipo}>
                <SelectTrigger className="h-7 w-24 text-xs px-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['CELULAR', 'FIJO', 'OTRO'] as const).map(t => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-7 text-xs flex-1" placeholder="Número"
                value={phNum} onChange={e => setPhNum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPhone()}
              />
              <Button
                type="button" variant="outline" size="sm"
                onClick={handleAddPhone} className="h-7 px-2.5"
                disabled={!phNum.trim()}
              >
                <Plus className="size-3" />
              </Button>
            </div>
            {phones.length > 0 && (
              <div className="rounded-md border overflow-hidden text-xs">
                {phones.map((ph, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 border-b last:border-0',
                      selPhIdx === i ? 'bg-primary/5' : 'hover:bg-muted/30',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        const next = phones.filter((_, idx) => idx !== i)
                        setPhones(next)
                        setSelPhIdx(prev => {
                          if (prev === null || prev !== i) return prev === null ? null : prev > i ? prev - 1 : prev
                          return next.length > 0 ? Math.min(i, next.length - 1) : null
                        })
                      }}
                      className="text-muted-foreground/40 hover:text-destructive shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                    <span className="text-muted-foreground w-14 shrink-0">{ph.tipo}</span>
                    <span className="flex-1 font-mono">{ph.numero}</span>
                    <button type="button" onClick={() => setSelPhIdx(i)} className="shrink-0">
                      <span className={cn(
                        'block size-3 rounded-full border-2 transition-colors',
                        selPhIdx === i ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        <DialogFooter className="px-6 pb-6 shrink-0 border-t pt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleOk} disabled={!nombre.trim()}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TabServiciosPostales({
  sucursalId, cajaId, clienteId, ventaId,
}: { sucursalId: number; cajaId: number; clienteId: number | null; ventaId: number | null }) {
  const [pais,          setPais]          = useState('CO')
  const [servicioId,    setServicioId]    = useState(0)
  const [apartadoP,     setApartadoP]     = useState('')
  const [remitente,     setRemitente]     = useState<PersonaDir>(personaDirVacia())
  const [destinatario,  setDestinatario]  = useState<PersonaDir>(personaDirVacia())
  const [esCorrespondencia, setEsCorrespondencia] = useState(false)
  const [pesoGramos,    setPesoGramos]    = useState('')
  const [altoCm,        setAltoCm]        = useState('')
  const [anchoCm,       setAnchoCm]       = useState('')
  const [largoCm,       setLargoCm]       = useState('')
  const [valorDeclarado,setValorDeclarado]= useState('')
  const [seguroAdicional,setSeguroAdicional]=useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [consecutivo,   setConsecutivo]   = useState('')
  const [diceContener,  setDiceContener]  = useState('')
  const [cantidadPiezas,setCantidadPiezas]= useState(1)
  const [medioPago,     setMedioPago]     = useState<MedioPagoEnvio>('efectivo')
  const [enviosGenerados, setEnviosGenerados] = useState<EnvioLocal[]>([])
  const [guiaActual,    setGuiaActual]    = useState<GuiaEnvio | null>(null)
  const [modalPersona,  setModalPersona]  = useState<'remitente'|'destinatario'|null>(null)
  const [cajaDlgOpen,   setCajaDlgOpen]   = useState(false)
  const [cajaSeleccion, setCajaSeleccion] = useState<number>(7)
  const [cajaCantidad,  setCajaCantidad]  = useState(1)
  const [activeTab,     setActiveTab]     = useState('formulario')

  const pesoKg = Number(pesoGramos) / 1000

  const { data: servicios, isLoading: loadingServicios } = useServiciosPostales(sucursalId)
  const serviciosFiltrados = servicios?.filter((s: ServicioCatalogo) => s.tipo !== 'apartado_postal')
  const selectedService    = serviciosFiltrados?.find((s: ServicioCatalogo) => s.id === servicioId)
  const esInternacional    = pais !== 'CO'

  const { data: clienteData } = useCliente(clienteId ?? 0)
  useEffect(() => {
    if (!clienteData) return
    setRemitente(prev =>
      prev.nombre !== '' ? prev : {
        nombre:    clienteData.nombreCompleto,
        empresa:   '',
        documento: clienteData.numeroDocumento,
        email:     clienteData.email     ?? '',
        telefono:  clienteData.telefono  ?? '',
        pais:      'CO',
        cp:        clienteData.codigoPostal ?? '',
        dir: { ...dirVacia(), modo: 'libre', textoLibre: clienteData.direccion ?? '', ciudad: clienteData.ciudad ?? '' },
      },
    )
  }, [clienteData])

  const crearEnvio  = useCrearEnvio(cajaId)
  const agregarProd = useAgregarProducto(ventaId ?? 0, cajaId)

  const puedeGuardar = servicioId > 0 && pesoKg > 0
    && remitente.nombre.trim() !== '' && destinatario.nombre.trim() !== ''

  const resetForm = () => {
    setServicioId(0); setPais('CO'); setApartadoP('')
    setPesoGramos(''); setAltoCm(''); setAnchoCm(''); setLargoCm('')
    setValorDeclarado(''); setDiceContener(''); setConsecutivo('')
    setRemitente(personaDirVacia()); setDestinatario(personaDirVacia())
    setObservaciones(''); setMedioPago('efectivo')
    setSeguroAdicional(false); setCantidadPiezas(1)
    setCajaCantidad(1); setCajaSeleccion(7)
    setEsCorrespondencia(false)
  }

  const ejecutarGenerar = async () => {
    const dirTexto = composeAddress(destinatario.dir)
    const body: Record<string, unknown> = {
      servicioId, sucursalId, pesoFisicoKg: pesoKg, medioPago, cantidadPiezas,
      remitente: {
        nombre:    remitente.nombre.trim(),
        empresa:   remitente.empresa.trim()    || undefined,
        documento: remitente.documento.trim()  || undefined,
        email:     remitente.email.trim()      || undefined,
        telefono:  remitente.telefono.trim()   || undefined,
        ciudad:    remitente.dir.ciudad.trim() || undefined,
        pais:      remitente.pais || 'CO',
      },
      destinatario: {
        nombre:       destinatario.nombre.trim(),
        empresa:      destinatario.empresa.trim()           || undefined,
        documento:    destinatario.documento.trim()         || undefined,
        email:        destinatario.email.trim()             || undefined,
        telefono:     destinatario.telefono.trim()          || undefined,
        direccion:    dirTexto                              || undefined,
        ciudad:       destinatario.dir.ciudad.trim()       || undefined,
        departamento: destinatario.dir.departamento.trim() || undefined,
        pais:         esInternacional ? destinatario.pais : 'CO',
        codigoPostal: destinatario.cp.trim()               || undefined,
      },
    }
    if (esCorrespondencia)         body.esCorrespondencia = true
    if (!esCorrespondencia && altoCm)   body.altoCm    = Number(altoCm)
    if (!esCorrespondencia && anchoCm)  body.anchoCm   = Number(anchoCm)
    if (!esCorrespondencia && largoCm)  body.largoCm   = Number(largoCm)
    if (valorDeclarado)            body.valorDeclarado = Number(valorDeclarado)
    if (diceContener.trim())       body.contenido      = diceContener.trim()
    if (seguroAdicional)           body.seguroPostal   = true
    const obsPartes = [
      observaciones.trim(),
      consecutivo.trim() ? `Consecutivo: ${consecutivo.trim()}` : '',
      apartadoP.length === 6 ? `Apartado: ${apartadoP}` : '',
    ].filter(Boolean)
    if (obsPartes.length) body.observaciones = obsPartes.join(' | ')

    const result = await crearEnvio.mutateAsync(body)
    setGuiaActual(result.guia)
    setActiveTab('envios')
    setEnviosGenerados(prev => [...prev, {
      guia:            result.envio.numeroGuia,
      servicioNombre:  selectedService?.nombre ?? '—',
      destinatario:    result.envio.destinatarioNombre ?? destinatario.nombre.trim(),
      ciudad:          result.envio.destinatarioCiudad ?? destinatario.dir.ciudad.trim(),
      cantidad:        cantidadPiezas,
      pesoFisico:      result.envio.pesoFisicoKg,
      pesoVolumetrico: result.envio.pesoVolumetricoKg ?? null,
      pesoFacturado:   result.envio.pesoTarificadoKg,
      valorServicio:   result.envio.valorServicio,
      valorTotal:      result.envio.valorTotal,
      guiaData:        result.guia,
    }])
    toast.success(`Guía ${result.envio.numeroGuia} generada`)
    if (result.alertas?.length) {
      result.alertas.forEach(a => toast.warning(a, { duration: 8000 }))
    }
    resetForm()
  }

  const handleGuardar = () => {
    if (!clienteId) { toast.error('Busca un cliente primero'); return }
    setCajaDlgOpen(true)
  }

  const handleCajaSi = async () => {
    setCajaDlgOpen(false)
    try {
      if (ventaId) await agregarProd.mutateAsync({ productoId: cajaSeleccion, cantidad: cajaCantidad })
      await ejecutarGenerar()
    } catch { toast.error('No se pudo completar la operación') }
  }

  const handleCajaNo = async () => {
    setCajaDlgOpen(false)
    try { await ejecutarGenerar() }
    catch { toast.error('No se pudo generar la guía') }
  }

  const totalEnvios = enviosGenerados.reduce((s, e) => s + e.valorTotal, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="shrink-0 mx-3 mt-2 mb-0 w-auto self-start">
          <TabsTrigger value="formulario" className="text-xs">Formulario</TabsTrigger>
          <TabsTrigger value="envios" className="text-xs">
            Envíos
            {enviosGenerados.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-px font-medium">
                {enviosGenerados.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Formulario ─────────────────────────────────────────── */}
        <TabsContent value="formulario" className="flex flex-col flex-1 overflow-hidden m-0 border-t">
        <div className="flex flex-col flex-1 overflow-hidden">

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-3 space-y-2.5">

            {/* 1. País */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">1.</span> País destino
              </Label>
              <PaisCombobox value={pais} onChange={setPais} />
            </div>

            {/* 2. Servicio */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">2.</span> Servicio
              </Label>
              {loadingServicios ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={servicioId ? String(servicioId) : ''} onValueChange={v => setServicioId(Number(v))}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Seleccionar servicio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const noPrior  = serviciosFiltrados?.filter((s: ServicioCatalogo) => s.codigo.startsWith('NP-')) ?? []
                      const prior    = serviciosFiltrados?.filter((s: ServicioCatalogo) => s.codigo.startsWith('P-'))  ?? []
                      const otros    = serviciosFiltrados?.filter((s: ServicioCatalogo) => !s.codigo.startsWith('NP-') && !s.codigo.startsWith('P-')) ?? []
                      const item = (s: ServicioCatalogo) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                          {s.nombre}
                        </SelectItem>
                      )
                      return (
                        <>
                          {noPrior.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">No Prioritaria</SelectLabel>
                              {noPrior.map(item)}
                            </SelectGroup>
                          )}
                          {prior.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Prioritaria</SelectLabel>
                              {prior.map(item)}
                            </SelectGroup>
                          )}
                          {otros.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Otros</SelectLabel>
                              {otros.map(item)}
                            </SelectGroup>
                          )}
                        </>
                      )
                    })()}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Apartado postal */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Apartado postal
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  className="h-7 text-xs font-mono tracking-[0.3em] w-28 text-center"
                  placeholder="000000"
                  maxLength={6}
                  value={apartadoP}
                  onChange={e => setApartadoP(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                {apartadoP.length > 0 && apartadoP.length < 6 && (
                  <span className="text-[10px] text-destructive">{6 - apartadoP.length} dígito(s) faltantes</span>
                )}
                {apartadoP.length === 6 && (
                  <span className="text-[10px] text-green-600 font-medium">✓ válido</span>
                )}
              </div>
            </div>

            {/* 3. Remitente */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">3.</span> Remitente
              </Label>
              <button
                type="button"
                onClick={() => setModalPersona('remitente')}
                className={cn(
                  'w-full text-left rounded-md border px-2.5 py-2 text-xs transition-colors min-h-[48px]',
                  remitente.nombre
                    ? 'border-border hover:border-primary/40'
                    : 'border-dashed border-muted-foreground/30 hover:border-primary/50',
                )}
              >
                {remitente.nombre ? (
                  <div>
                    <p className="font-medium text-foreground truncate">{remitente.nombre}</p>
                    {composeAddress(remitente.dir) && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        {composeAddress(remitente.dir)}
                      </p>
                    )}
                    {(remitente.dir.ciudad || remitente.telefono) && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[remitente.dir.ciudad, remitente.telefono].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Clic para ingresar remitente...</p>
                )}
              </button>
            </div>

            {/* 4. Destinatario */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">4.</span> Destinatario
              </Label>
              <button
                type="button"
                onClick={() => setModalPersona('destinatario')}
                className={cn(
                  'w-full text-left rounded-md border px-2.5 py-2 text-xs transition-colors min-h-[48px]',
                  destinatario.nombre
                    ? 'border-border hover:border-primary/40'
                    : 'border-dashed border-muted-foreground/30 hover:border-primary/50',
                )}
              >
                {destinatario.nombre ? (
                  <div>
                    <p className="font-medium text-foreground truncate">{destinatario.nombre}</p>
                    {composeAddress(destinatario.dir) && (
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        {composeAddress(destinatario.dir)}
                      </p>
                    )}
                    {(destinatario.dir.ciudad || destinatario.telefono) && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {[destinatario.dir.ciudad, destinatario.telefono].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Clic para ingresar destinatario...</p>
                )}
              </button>
            </div>

            {/* Correspondencia */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={esCorrespondencia}
                onChange={e => setEsCorrespondencia(e.target.checked)}
                className="size-3.5 accent-primary"
              />
              <span className="text-xs">Es correspondencia (máx. 5 kg, sin volumétrico)</span>
            </label>

            {/* 5. Peso físico (gramos) */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">5.</span> Peso físico (gramos)
                {esCorrespondencia && <span className="ml-1 text-amber-600">máx. 5000 g</span>}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="1" min="1" max={esCorrespondencia ? 5000 : undefined}
                  className="h-7 text-xs w-28"
                  placeholder="500"
                  value={pesoGramos}
                  onChange={e => setPesoGramos(e.target.value)}
                />
                {pesoGramos && Number(pesoGramos) > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    = {(Number(pesoGramos) / 1000).toFixed(3)} kg
                  </span>
                )}
                {esCorrespondencia && pesoGramos && Number(pesoGramos) > 5000 && (
                  <span className="text-[10px] text-red-500">Excede 5 kg</span>
                )}
              </div>
            </div>

            {/* 6. Peso volumétrico — oculto para correspondencia */}
            {!esCorrespondencia && (
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="text-primary mr-1">6.</span> Peso volumétrico (cm)
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground text-center">Alto</p>
                    <Input type="number" className="h-7 text-xs text-center px-1" placeholder="—" value={altoCm}  onChange={e => setAltoCm(e.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground text-center">Ancho</p>
                    <Input type="number" className="h-7 text-xs text-center px-1" placeholder="—" value={anchoCm} onChange={e => setAnchoCm(e.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] text-muted-foreground text-center">Largo</p>
                    <Input type="number" className="h-7 text-xs text-center px-1" placeholder="—" value={largoCm} onChange={e => setLargoCm(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* 7. Valor declarado */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">7.</span> Valor declarado (COP)
              </Label>
              <Input
                type="number" className="h-7 text-xs"
                placeholder="0"
                value={valorDeclarado}
                onChange={e => setValorDeclarado(e.target.value)}
              />
            </div>

            {/* Seguro adicional */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={seguroAdicional}
                onChange={e => setSeguroAdicional(e.target.checked)}
                className="size-3.5 accent-primary"
              />
              <span className="text-xs">Seguro adicional</span>
            </label>

            {/* 8. Observaciones */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span className="text-primary mr-1">8.</span> Observaciones
              </Label>
              <Input
                className="h-7 text-xs" placeholder="Opcional"
                value={observaciones} onChange={e => setObservaciones(e.target.value)}
              />
            </div>

            {/* 9. Consecutivo + Dice contener */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="text-primary mr-1">9.</span> Consecutivo
                </Label>
                <Input
                  className="h-7 text-xs" placeholder="Nro."
                  value={consecutivo} onChange={e => setConsecutivo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Dice contener
                </Label>
                <Input
                  className="h-7 text-xs" placeholder="Contenido"
                  value={diceContener} onChange={e => setDiceContener(e.target.value)}
                />
              </div>
            </div>

            {/* Cantidad piezas */}
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Cantidad piezas
              </Label>
              <Input
                type="number" min="1" className="h-7 text-xs w-20"
                value={cantidadPiezas}
                onChange={e => setCantidadPiezas(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>


            {/* Medio de pago */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Medio de pago
              </Label>
              <div className="grid grid-cols-2 gap-1">
                {MEDIOS_PAGO_ENVIO.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMedioPago(m.value)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs font-medium text-left transition-colors',
                      medioPago === m.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </ScrollArea>

        {/* Botones de acción */}
        <div className="border-t p-3 space-y-2 shrink-0">
          <Button
            className="w-full"
            disabled={!puedeGuardar || !clienteId || crearEnvio.isPending || agregarProd.isPending}
            onClick={handleGuardar}
          >
            {(crearEnvio.isPending || agregarProd.isPending) && (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            )}
            Validar y generar guía
          </Button>
          <Button
            variant="outline" size="sm" className="w-full"
            onClick={resetForm}
            disabled={crearEnvio.isPending || agregarProd.isPending}
          >
            Cancelar
          </Button>
          {!clienteId && (
            <p className="text-[11px] text-center text-muted-foreground">Busca un cliente para continuar</p>
          )}
        </div>
      </div>
        </TabsContent>

        {/* ── Tab 2: Envíos generados ───────────────────────────────────── */}
        <TabsContent value="envios" className="flex flex-col flex-1 overflow-hidden m-0 border-t">
          <div className="flex items-center gap-3 px-3 py-2 border-b shrink-0 text-xs">
            <span className="font-semibold">
              Cant. envíos: <span className="text-primary">{enviosGenerados.length}</span>
            </span>
            <Separator orientation="vertical" className="h-3.5" />
            <span className="font-semibold">
              Total: <span className="text-primary">{fmt(totalEnvios)}</span>
            </span>
          </div>

          <ScrollArea className="flex-1">
            {enviosGenerados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
                <Truck className="size-8 opacity-20" />
                <p className="text-xs">No hay envíos generados en esta sesión</p>
              </div>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 sticky top-0 z-10">
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Guía</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Servicio</th>
                    <th className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Destino</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Cant.</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Peso Fís.</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Peso Vol.</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Peso Tar.</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Valor Flete</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                    <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Guía</th>
                  </tr>
                </thead>
                <tbody>
                  {enviosGenerados.map((e, i) => (
                    <tr key={`${e.guia}-${i}`} className="border-b hover:bg-muted/30">
                      <td className="px-2 py-2 font-mono font-semibold whitespace-nowrap">{e.guia}</td>
                      <td className="px-2 py-2 max-w-[120px] truncate">{e.servicioNombre}</td>
                      <td className="px-2 py-2 max-w-[100px] truncate">{e.ciudad || e.destinatario}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{e.cantidad}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{(e.pesoFisico * 1000).toFixed(0)} g</td>
                      <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                        {e.pesoVolumetrico != null ? `${e.pesoVolumetrico} kg` : '—'}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{e.pesoFacturado} kg</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmt(e.valorServicio)}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(e.valorTotal)}</td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          className={cn(
                            'text-[10px] underline-offset-2 hover:underline',
                            guiaActual?.numeroGuia === e.guiaData.numeroGuia
                              ? 'text-primary font-semibold'
                              : 'text-muted-foreground',
                          )}
                          onClick={() => setGuiaActual(
                            guiaActual?.numeroGuia === e.guiaData.numeroGuia ? null : e.guiaData,
                          )}
                        >
                          {guiaActual?.numeroGuia === e.guiaData.numeroGuia ? 'Ocultar' : 'Ver guía'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Preview de guía postal seleccionada */}
            {guiaActual && (
              <div className="flex flex-col items-center gap-3 py-4 border-t mt-2">
                <div className="flex items-center gap-2 w-full max-w-[380px] px-2">
                  <p className="text-sm font-semibold flex-1">
                    Guía <span className="font-mono text-primary">{guiaActual.numeroGuia}</span>
                  </p>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    Imprimir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setGuiaActual(null)}>
                    <X className="size-4" />
                  </Button>
                </div>
                <GuiaPostal guia={guiaActual} />
              </div>
            )}
          </ScrollArea>
        </TabsContent>

      </Tabs>

      {/* ── Modal: Remitente / Destinatario ──────────────────────────────── */}
      <AddressModal
        open={modalPersona !== null}
        onClose={() => setModalPersona(null)}
        title={modalPersona === 'remitente' ? 'Remitente' : 'Destinatario'}
        initial={modalPersona === 'remitente' ? remitente : destinatario}
        paisContexto={modalPersona === 'remitente' ? 'CO' : pais}
        onSave={p => {
          if (modalPersona === 'remitente') setRemitente(p)
          else setDestinatario(p)
        }}
      />

      {/* ── Diálogo: ¿adquirió la caja? ──────────────────────────────────── */}
      <Dialog open={cajaDlgOpen} onOpenChange={setCajaDlgOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">¿Adquirió la caja 4-72?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿El cliente adquirió la caja de empaque en este punto de venta 4-72?
          </p>

          {ventaId && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de caja</Label>
                <div className="space-y-1">
                  {CAJAS_ENVIO.map(c => (
                    <button
                      key={c.productoId}
                      type="button"
                      onClick={() => setCajaSeleccion(c.productoId)}
                      className={cn(
                        'w-full text-left rounded-md border px-3 py-2 text-xs transition-colors',
                        cajaSeleccion === c.productoId
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      <span className="ml-2 text-muted-foreground">{fmt(c.precio)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">¿Cuántas?</Label>
                <Input
                  type="number" min="1" max="20"
                  className="h-8 text-sm w-24"
                  value={cajaCantidad}
                  onChange={e => setCajaCantidad(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCajaNo}
              disabled={crearEnvio.isPending || agregarProd.isPending}
            >
              No
            </Button>
            <Button
              onClick={handleCajaSi}
              disabled={crearEnvio.isPending || agregarProd.isPending}
            >
              {(crearEnvio.isPending || agregarProd.isPending) && (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              )}
              {ventaId ? 'Sí, agregar y generar' : 'Sí'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// ── TabHistorial ──────────────────────────────────────────────────────────────

function TabHistorial({
  cajaId, userRol,
}: { cajaId: number; userRol: string }) {
  const { data: ventas, isLoading, refetch, isFetching } = useVentasTurno(cajaId)
  const [anularId, setAnularId] = useState<number | null>(null)
  const [motivo, setMotivo]     = useState('')
  const anular    = useAnularVenta(anularId ?? 0, cajaId)
  const canAnular = ['SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA'].includes(userRol)

  const handleAnular = async () => {
    if (!anularId || !motivo.trim()) return
    try {
      await anular.mutateAsync({ motivo: motivo.trim() })
      toast.success('Venta anulada')
      setAnularId(null)
      setMotivo('')
    } catch {
      toast.error('No se pudo anular la venta')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs text-muted-foreground">{ventas?.length ?? 0} movimiento(s)</span>
        <button type="button" onClick={() => refetch()} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className={cn('size-3', isFetching && 'animate-spin')} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1.5">
            {!ventas?.length && (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos en este turno</p>
            )}
            {ventas?.map(v => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">#{v.id}</span>
                    <Badge
                      variant={v.tipo === 'anulacion' ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1 py-0 h-4"
                    >
                      {v.tipo}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">{fmt(Number(v.monto))}</span>
                    {v.medioPago && <span>{v.medioPago}</span>}
                    <span>
                      {new Date(v.createdAt).toLocaleTimeString('es-CO', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                {canAnular && v.tipo !== 'anulacion' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => { setAnularId(v.referenciaId ?? v.id); setMotivo('') }}
                  >
                    Anular
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog open={!!anularId} onOpenChange={open => !open && setAnularId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Anular movimiento #{anularId}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label className="text-xs">Motivo <span className="text-destructive">*</span></Label>
            <Input
              placeholder="Describe el motivo..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnularId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!motivo.trim() || anular.isPending}
              onClick={handleAnular}
            >
              {anular.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── TabResumenPago ────────────────────────────────────────────────────────────

function TabResumenPago({
  carrito, cliente, ventaId, cajaId, onExito,
}: {
  carrito: Venta | null
  cliente: ClienteResumen | null
  ventaId: number
  cajaId: number
  onExito: () => void
}) {
  const { user } = useSessionStore()
  const canAnular = ['SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA'].includes(user?.rol ?? '')

  const [medioPago,        setMedioPago]        = useState<MedioPagoVenta>('efectivo')
  const [email,            setEmail]            = useState(cliente?.email ?? '')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [preporteadoMonto, setPreporteadoMonto] = useState('')
  const [anularOpen,       setAnularOpen]       = useState(false)
  const [motivoAnular,     setMotivoAnular]     = useState('')

  const confirmar = useConfirmarVenta(ventaId, cajaId)
  const anular    = useAnularVenta(ventaId, cajaId)

  const handleAnular = async () => {
    if (!motivoAnular.trim()) return
    try {
      await anular.mutateAsync({ motivo: motivoAnular.trim() })
      toast.success('Venta anulada')
      setAnularOpen(false)
      onExito()
    } catch {
      toast.error('No se pudo anular la venta')
    }
  }

  const isMixto      = medioPago === 'mixto_preporteado'
  const showEfectivo = medioPago === 'efectivo' || isMixto
  const efectivo     = Number(efectivoRecibido) || 0
  const preporteado  = Number(preporteadoMonto) || 0
  const total        = carrito?.total ?? 0
  const enEc         = isMixto ? Math.max(0, total - preporteado) : 0
  const cambio       = showEfectivo ? Math.max(0, efectivo - (isMixto ? enEc : total)) : 0
  const faltante     = showEfectivo ? Math.max(0, (isMixto ? enEc : total) - efectivo) : 0

  const sellosTotal  = carrito?.detalle.filter(d => d.tipoProducto === 'estampilla').reduce((s, d) => s + d.subtotal, 0) ?? 0

  const ivaLinea = (d: { subtotal: number; descuento: number; porcentajeTax: number }) => {
    const t = d.porcentajeTax
    if (t === 0) return 0
    return Math.round((d.subtotal + d.descuento) * t / (100 + t))
  }

  const handleConfirmar = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Ingresa un email válido para la factura')
      return
    }
    if (isMixto && preporteado <= 0) {
      toast.error('Ingresa el monto en estampillas preporteadas')
      return
    }
    if (isMixto && preporteado >= total) {
      toast.error('El monto preporteado no puede cubrir el total completo — usa "Preporteado" directamente')
      return
    }
    if (showEfectivo && efectivo > 0 && efectivo < (isMixto ? enEc : total)) {
      toast.error('El efectivo recibido no cubre el valor a pagar')
      return
    }
    try {
      await confirmar.mutateAsync({
        medioPago,
        emailFactura: email.trim(),
        // Si no ingresó monto, se asume pago exacto (cambio = 0)
        ...(showEfectivo ? { efectivoRecibido: efectivo > 0 ? efectivo : (isMixto ? enEc : total) } : {}),
      })
      toast.success('Pago confirmado')
      onExito()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo confirmar el pago')
    }
  }

  if (!carrito || !carrito.detalle.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
        <ShoppingCart className="size-8 opacity-20" />
        <p className="text-xs">El carrito está vacío</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">

      {/* Prefactura header */}
      <div className="px-4 py-2.5 border-b bg-muted/20 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          {cliente ? (
            <>
              <UserRound className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold">
                {cliente.nombre}{cliente.apellido ? ` ${cliente.apellido}` : ''}
              </span>
              <span className="text-xs text-muted-foreground">
                {cliente.tipoDocumento}: {cliente.numeroDocumento}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">Sin cliente asociado</span>
          )}
          <p className="ml-auto text-[10px] text-muted-foreground">
            Usted está procesando una venta de productos de 4-72
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-muted-foreground">IVA a pagar: </span>
            <span className="font-semibold tabular-nums">{fmt(carrito.iva)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total a pagar: </span>
            <span className="font-bold text-primary tabular-nums text-sm">{fmt(carrito.total)}</span>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="flex-1 overflow-auto border-b">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 sticky top-0 z-10">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-14">Cantidad</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-20">Descuento</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-20">Impuesto</th>
              <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {carrito.detalle.map((d) => {
              const iva = ivaLinea(d)
              const nombre = d.nombreProducto ?? `Producto #${d.productoId}`
              const label  = d.codigoProducto ? `${d.codigoProducto} - ${nombre}` : nombre
              return (
                <tr key={d.id} className="border-b hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <p className="font-medium leading-tight">{label}</p>
                    {d.tipoProducto && (
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {d.tipoProducto.replace('_', ' ')}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{d.cantidad}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {d.descuento > 0
                      ? <span className="text-emerald-600">−{fmt(d.descuento)}</span>
                      : <span className="text-muted-foreground/30">—</span>
                    }
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-amber-700 dark:text-amber-500">
                    {iva > 0 ? fmt(iva) : <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(d.subtotal)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 6-column totals bar — matches real 4-72 system */}
      <div className="grid grid-cols-6 divide-x border-b bg-muted/30 text-xs shrink-0">
        {[
          { label: 'Estampillas',  value: sellosTotal > 0 ? fmt(sellosTotal) : '—' },
          { label: 'IVA',          value: carrito.iva > 0 ? fmt(carrito.iva) : '—' },
          { label: 'Preporteado',  value: isMixto && preporteado > 0 ? fmt(preporteado) : '—' },
          { label: 'En EC',        value: isMixto ? fmt(enEc) : '—' },
          { label: 'Descuento',    value: carrito.descuento > 0 ? `−${fmt(carrito.descuento)}` : '—' },
          { label: 'Total',        value: fmt(carrito.total), primary: true },
        ].map(col => (
          <div key={col.label} className="px-2 py-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{col.label}</p>
            <p className={cn('font-semibold tabular-nums mt-0.5', (col as { primary?: boolean }).primary && 'text-primary text-sm')}>
              {col.value}
            </p>
          </div>
        ))}
      </div>

      {/* Payment fields */}
      <div className="px-4 py-3 space-y-3 shrink-0 bg-card">
        {/* Email */}
        <div className="space-y-0.5">
          <div className="relative">
            <MailOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="email"
              className="pl-8 h-8 text-sm"
              placeholder="Email para factura electrónica *"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <p className="text-[10px] text-muted-foreground px-0.5">
            Este campo es obligatorio. Solo se usará para facturación electrónica.
          </p>
        </div>

        {/* Medio de pago */}
        <div className="space-y-1.5">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Medio de pago
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {MEDIOS_PAGO.map(m => (
              <label
                key={m.value}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-colors',
                  medioPago === m.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="medioPago"
                  value={m.value}
                  checked={medioPago === m.value}
                  onChange={() => setMedioPago(m.value)}
                  className="sr-only"
                />
                <span className={cn(
                  'size-3 rounded-full border-2 shrink-0 transition-colors',
                  medioPago === m.value ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                )} />
                <span className="text-xs font-medium leading-none">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Mixto preporteado: split estampillas / efectivo */}
        {isMixto && (
          <div className="rounded-lg border px-3 py-2 space-y-2">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Estampillas preporteadas</Label>
                <Input
                  type="number"
                  className="h-8 text-sm w-36"
                  placeholder="0"
                  value={preporteadoMonto}
                  onChange={e => setPreporteadoMonto(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">En efectivo (EC)</Label>
                <div className="h-8 flex items-center px-3 rounded border bg-muted/40 text-sm tabular-nums font-semibold text-primary w-32">
                  {fmt(enEc)}
                </div>
              </div>
            </div>
            {preporteado > 0 && preporteado < total && (
              <p className="text-[10px] text-muted-foreground">
                Preporteado {fmt(preporteado)} + efectivo {fmt(enEc)} = {fmt(total)}
              </p>
            )}
          </div>
        )}

        {/* Efectivo sub-fields */}
        {showEfectivo && (
          <div className="flex items-center gap-4 rounded-lg border px-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">{isMixto ? 'Efectivo recibido (EC)' : 'Efectivo recibido'}</Label>
              <Input
                type="number"
                className="h-8 text-sm w-32"
                placeholder="0"
                value={efectivoRecibido}
                onChange={e => setEfectivoRecibido(e.target.value)}
              />
            </div>
            {efectivo > 0 && (
              <div className="space-y-0.5">
                <p className={cn('text-[11px]', faltante > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {faltante > 0 ? 'Faltante' : 'Cambio'}
                </p>
                <p className={cn('font-semibold tabular-nums text-sm', faltante > 0 ? 'text-destructive' : 'text-emerald-600')}>
                  {fmt(faltante > 0 ? faltante : cambio)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleConfirmar}
            disabled={confirmar.isPending || !email.trim()}
          >
            {confirmar.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Confirmar pago — {fmt(carrito.total)}
          </Button>
          {canAnular && (
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmar.isPending || anular.isPending}
              onClick={() => { setAnularOpen(true); setMotivoAnular('') }}
            >
              Anular
            </Button>
          )}
        </div>
      </div>

      <Dialog open={anularOpen} onOpenChange={open => !open && setAnularOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Anular venta #{ventaId}</DialogTitle>
            <DialogDescription>
              Se revertirá el carrito y el saldo de la caja será ajustado. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo</Label>
            <Textarea
              placeholder="Ingresa el motivo de la anulación"
              value={motivoAnular}
              onChange={e => setMotivoAnular(e.target.value)}
              className="resize-none h-20 text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnularOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!motivoAnular.trim() || anular.isPending}
              onClick={handleAnular}
            >
              {anular.isPending && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Confirmar anulación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── CarritoPanel ──────────────────────────────────────────────────────────────

function CarritoPanel({
  ventaId, cajaId, onPagar,
}: { ventaId: number | null; cajaId: number; onPagar: () => void }) {
  const { data: carrito, isLoading } = useCarrito(ventaId ?? 0)
  const eliminar = useEliminarProducto(ventaId ?? 0, cajaId)

  const detalle = carrito?.detalle ?? []

  const handleEliminar = async (detalleId: number) => {
    try { await eliminar.mutateAsync(detalleId) }
    catch { toast.error('No se pudo eliminar') }
  }

  return (
    <div className="flex flex-col h-full border-l">
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <ShoppingCart className="size-4 text-primary" />
        <span className="text-xs font-semibold flex-1">Carrito</span>
        {detalle.length > 0 && (
          <Badge className="text-[10px] h-5 px-1.5">{detalle.length}</Badge>
        )}
      </div>

      {detalle.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 px-2.5 py-1 border-b bg-muted/40 text-[10px] text-muted-foreground font-medium shrink-0">
          <span>Artículo</span>
          <span className="text-right w-7">Cant.</span>
          <span className="text-right w-14">Desc.</span>
          <span className="text-right w-16">Total</span>
          <span className="w-4" />
        </div>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !ventaId || !detalle.length ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <ShoppingCart className="size-8 opacity-20" />
            <p className="text-xs">El carrito está vacío</p>
          </div>
        ) : (
          <div className="divide-y">
            {detalle.map(d => (
              <div
                key={d.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 items-center px-2.5 py-2 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-tight line-clamp-2">
                    {d.nombreProducto ?? `Producto #${d.productoId}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {fmt(d.precioUnitario)} c/u
                  </p>
                </div>
                <span className="text-xs tabular-nums text-right w-7">{d.cantidad}</span>
                <span className={cn(
                  'text-xs tabular-nums text-right w-14',
                  d.descuento > 0 ? 'text-emerald-600' : 'text-muted-foreground/30',
                )}>
                  {d.descuento > 0 ? `−${fmt(d.descuento)}` : '—'}
                </span>
                <span className="text-xs font-semibold tabular-nums text-right w-16">
                  {fmt(d.subtotal)}
                </span>
                <button
                  type="button"
                  onClick={() => handleEliminar(d.id)}
                  disabled={eliminar.isPending}
                  className="flex justify-center w-4 text-muted-foreground/30 hover:text-destructive transition-colors"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-3 space-y-2 shrink-0">
        {carrito && (
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmt(carrito.subtotal)}</span>
            </div>
            {carrito.descuento > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Descuento</span>
                <span className="tabular-nums">−{fmt(carrito.descuento)}</span>
              </div>
            )}
            {carrito.iva > 0 && (
              <div className="flex justify-between text-amber-700 dark:text-amber-500">
                <span>IVA</span>
                <span className="tabular-nums">{fmt(carrito.iva)}</span>
              </div>
            )}
            {(() => {
              const sellosTot = carrito.detalle.filter(d => d.tipoProducto === 'estampilla').reduce((s, d) => s + d.subtotal, 0)
              return sellosTot > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>Estampillas</span>
                  <span className="tabular-nums">{fmt(sellosTot)}</span>
                </div>
              ) : null
            })()}
            <div className="flex justify-between font-bold text-sm pt-1 border-t">
              <span>TOTAL</span>
              <span className="tabular-nums text-primary">{fmt(carrito.total)}</span>
            </div>
          </div>
        )}
        <Button
          className="w-full h-10 text-sm font-semibold"
          onClick={onPagar}
          disabled={!ventaId || !detalle.length}
        >
          {detalle.length > 0 && carrito
            ? <>Ir a pagar — {fmt(carrito.total)}</>
            : 'Confirmar pago'}
        </Button>
      </div>
    </div>
  )
}

// ── PagarDialog ───────────────────────────────────────────────────────────────

interface PagarDialogProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  ventaId:       number
  cajaId:        number
  total:         number
  iva:           number
  sellosTotal:   number
  clienteEmail:  string | null
  onSuccess:     () => void
}

function PagarDialog({
  open, onOpenChange, ventaId, cajaId, total, iva, sellosTotal, clienteEmail, onSuccess,
}: PagarDialogProps) {
  const [medioPago,         setMedioPago]         = useState<MedioPagoVenta>('efectivo')
  const [efectivoRecibido,  setEfectivoRecibido]  = useState('')
  const [email,             setEmail]             = useState(clienteEmail ?? '')
  const confirmar = useConfirmarVenta(ventaId, cajaId)

  const showEfectivo = medioPago === 'efectivo' || medioPago === 'mixto_preporteado'
  const efectivo     = Number(efectivoRecibido) || 0
  const cambio       = showEfectivo ? Math.max(0, efectivo - total) : 0
  const faltante     = showEfectivo ? Math.max(0, total - efectivo) : 0

  const handleConfirmar = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Ingresa un email válido para la factura')
      return
    }
    if (showEfectivo && efectivo > 0 && efectivo < total) {
      toast.error('El efectivo recibido no cubre el total')
      return
    }
    try {
      await confirmar.mutateAsync({
        medioPago,
        emailFactura: email.trim(),
        // Si no ingresó monto, se asume pago exacto (cambio = 0)
        ...(showEfectivo ? { efectivoRecibido: efectivo > 0 ? efectivo : total } : {}),
      })
      toast.success('Pago confirmado')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo confirmar el pago')
    }
  }

  const handleOpen = (v: boolean) => {
    if (v) {
      setMedioPago('efectivo')
      setEfectivoRecibido('')
      setEmail(clienteEmail ?? '')
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar pago</DialogTitle>
        </DialogHeader>

        {/* Totals bar */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Estampillas</p>
            <p className="font-bold tabular-nums">{fmt(sellosTotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">IVA</p>
            <p className="font-bold tabular-nums">{fmt(iva)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">TOTAL</p>
            <p className="font-bold text-sm tabular-nums text-primary">{fmt(total)}</p>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Email para factura <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <MailOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="email"
              className="pl-8 h-8 text-sm"
              placeholder="cliente@correo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Medio de pago */}
        <div className="space-y-2">
          <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Medio de pago
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {MEDIOS_PAGO.map(m => (
              <label
                key={m.value}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-2.5 py-2 cursor-pointer transition-colors',
                  medioPago === m.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="medioPagoDialog"
                  value={m.value}
                  checked={medioPago === m.value}
                  onChange={() => setMedioPago(m.value)}
                  className="sr-only"
                />
                <span className={cn(
                  'size-3 rounded-full border-2 shrink-0 transition-colors',
                  medioPago === m.value ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                )} />
                <span className="text-xs font-medium leading-none">{m.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Efectivo sub-fields */}
        {showEfectivo && (
          <div className="rounded-lg border p-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Efectivo recibido</Label>
              <Input
                type="number"
                className="h-8 text-sm"
                placeholder="0"
                value={efectivoRecibido}
                onChange={e => setEfectivoRecibido(e.target.value)}
              />
            </div>
            {efectivo > 0 && (
              <div className="grid grid-cols-2 gap-x-4 text-xs pt-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="tabular-nums font-medium">{fmt(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={cn(faltante > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {faltante > 0 ? 'Faltante:' : 'Cambio:'}
                  </span>
                  <span className={cn(
                    'tabular-nums font-medium',
                    faltante > 0 ? 'text-destructive' : 'text-emerald-600',
                  )}>
                    {fmt(faltante > 0 ? faltante : cambio)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={confirmar.isPending || !email.trim()}
          >
            {confirmar.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Confirmar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'productos' | 'especiales' | 'apartado' | 'servicios' | 'historial' | 'pagar'

const ALL_TABS: { value: Tab; label: string; flag?: string; primary?: boolean }[] = [
  { value: 'productos',  label: 'Productos',  flag: 'ventas:tab_productos'  },
  { value: 'especiales', label: 'Especiales', flag: 'ventas:tab_especiales' },
  { value: 'apartado',   label: 'Apartado',   flag: 'ventas:tab_apartado'   },
  { value: 'servicios',  label: 'Servicios',  flag: 'ventas:tab_servicios'  },
  { value: 'historial',  label: 'Historial',  flag: 'ventas:tab_historial'  },
  { value: 'pagar',      label: 'Pagar',      primary: true },
]

export default function CarritoVenta() {
  const { cajaId: cajaIdStr } = useParams<{ cajaId: string }>()
  const navigate   = useNavigate()
  const user       = useSessionStore(s => s.user)
  const cajaId     = Number(cajaIdStr) || 0
  const sucursalId = user?.sucursal_id ?? 0

  const { flags, flagsLoading } = useAcceso()
  const tabs = useMemo(
    () => flagsLoading
      ? []
      : ALL_TABS.filter(t => !t.flag || (flags?.some(f => f.codigo === t.flag) ?? false)),
    [flags, flagsLoading],
  )

  const { data: caja }        = useCaja(cajaId)
  const { data: statusPunto } = useStatusPunto(sucursalId)

  const cajaCard = statusPunto?.cajas.find(c => c.cajaId === cajaId)
  const sesionId = cajaCard?.sesionId ?? null
  const cajeroId = cajaCard?.cajeroId ?? null

  const [crearCajeroOpen,  setCrearCajeroOpen]  = useState(false)
  const [editarCajeroOpen, setEditarCajeroOpen] = useState(false)
  const [ventaId,          setVentaId]          = useState<number | null>(null)
  const [cliente,          setCliente]          = useState<ClienteResumen | null>(null)
  const [carritoVisible,   setCarritoVisible]   = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const first = ALL_TABS.find(t => t.value !== 'historial' && t.value !== 'pagar')
    return first?.value ?? 'historial'
  })
  const [pagarOpen, setPagarOpen] = useState(false)
  const prevTabRef = useRef<Tab>('productos')

  const handleTabClick = (value: Tab) => {
    if (value === 'pagar') {
      if (activeTab === 'pagar') {
        setActiveTab(prevTabRef.current)
      } else {
        prevTabRef.current = activeTab
        setActiveTab('pagar')
      }
    } else {
      setActiveTab(value)
    }
  }

  const { data: carrito }  = useCarrito(ventaId ?? 0)
  const { data: resumen }  = useResumenTurno(cajaId)

  const handleVentaIniciada = (id: number, c: ClienteResumen) => {
    setVentaId(id)
    setCliente(c)
  }

  const handleNuevaVenta = () => {
    setVentaId(null)
    setCliente(null)
  }

  const handleClienteUpdate = (email: string | null, telefono: string | null) => {
    setCliente(prev => prev ? { ...prev, email, telefono } : prev)
  }

  const handlePagoExitoso = () => {
    setVentaId(null)
    setCliente(null)
    const first = tabs.find(t => t.value !== 'historial' && t.value !== 'pagar')
    setActiveTab(first?.value ?? 'historial')
  }

  // Si la tab activa queda deshabilitada por un cambio de flag, ir a la primera visible
  useEffect(() => {
    if (!tabs.find(t => t.value === activeTab)) {
      const first = tabs.find(t => t.value !== 'historial' && t.value !== 'pagar')
      setActiveTab(first?.value ?? 'historial')
    }
  }, [tabs, activeTab])

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Page header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b bg-card shrink-0">
        <button
          type="button"
          onClick={() => navigate('/ventas')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <ShoppingCart className="size-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold leading-tight">
            {caja?.codigo ?? `Caja #${cajaId}`}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {user?.nombre} · {new Date().toLocaleDateString('es-CO')}
          </p>
        </div>

        {/* Giros */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5 shrink-0"
          onClick={() => navigate(`/ventas/caja/${cajaId}/giros`)}
        >
          <ArrowRightLeft className="size-3.5" />
          Giros
        </Button>

        {/* Gestión del cajero asignado */}
        <div className="shrink-0 flex items-center gap-1.5">
          {cajeroId == null ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={() => setCrearCajeroOpen(true)}
            >
              <UserRound className="size-3.5" />
              Crear cajero
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5"
              onClick={() => setEditarCajeroOpen(true)}
            >
              <Pencil className="size-3.5" />
              Editar cajero
            </Button>
          )}
        </div>
      </header>

      {/* Diálogos de gestión de cajero */}
      <CrearCajeroDialog
        open={crearCajeroOpen}
        onClose={() => setCrearCajeroOpen(false)}
        sucursalId={sucursalId}
        sesionId={sesionId}
        onCreado={() => setCrearCajeroOpen(false)}
      />
      {cajeroId != null && (
        <EditarCajeroDialog
          cajeroId={cajeroId}
          open={editarCajeroOpen}
          onClose={() => setEditarCajeroOpen(false)}
        />
      )}

      {/* Resumen del turno */}
      <ResumenBanner cajaId={cajaId} />

      {/* Client search bar */}
      <ClientBar
        cajaId={cajaId}
        cliente={cliente}
        ventaId={ventaId}
        onVentaIniciada={handleVentaIniciada}
        onNuevaVenta={handleNuevaVenta}
        onClienteUpdate={handleClienteUpdate}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: catalog */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!cliente ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground select-none px-6">
              <Search className="size-10 opacity-10" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Busca o crea un cliente para comenzar</p>
                <p className="text-xs opacity-60">Ingresa el número de documento en la barra de arriba y presiona Buscar.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex border-b shrink-0 items-stretch">
                <div className="flex flex-1 overflow-x-auto">
                  {tabs.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTabClick(t.value)}
                      className={cn(
                        'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                        activeTab === t.value
                          ? t.primary
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-primary text-primary'
                          : t.primary
                            ? 'border-transparent text-primary/70 hover:text-primary hover:bg-primary/5'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Toggle carrito */}
                <button
                  type="button"
                  onClick={() => setCarritoVisible(v => !v)}
                  title={carritoVisible ? 'Ocultar carrito' : 'Mostrar carrito'}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 border-l -mb-px border-b-2 transition-colors',
                    carritoVisible
                      ? 'border-b-primary text-primary bg-primary/5'
                      : 'border-b-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  <ShoppingCart className="size-3.5" />
                  {(carrito?.detalle?.length ?? 0) > 0 && (
                    <span className="min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] px-1 flex items-center justify-center font-bold leading-none">
                      {carrito?.detalle?.length ?? 0}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'productos' && (
                  <TabProductos
                    sucursalId={sucursalId}
                    ventaId={ventaId}
                    cajaId={cajaId}
                  />
                )}
                {activeTab === 'especiales' && (
                  <TabProductosEspeciales
                    sucursalId={sucursalId}
                    ventaId={ventaId}
                    cajaId={cajaId}
                  />
                )}
                {activeTab === 'apartado' && (
                  <TabApartado
                    sucursalId={sucursalId}
                    cajaId={cajaId}
                    clienteId={cliente.id}
                  />
                )}
                {activeTab === 'servicios' && (
                  <TabServiciosPostales
                    sucursalId={sucursalId}
                    cajaId={cajaId}
                    clienteId={cliente.id}
                    ventaId={ventaId}
                  />
                )}
                {activeTab === 'historial' && (
                  <TabHistorial
                    cajaId={cajaId}
                    userRol={user?.rol ?? ''}
                  />
                )}
                {activeTab === 'pagar' && ventaId != null && (
                  <TabResumenPago
                    carrito={carrito ?? null}
                    cliente={cliente}
                    ventaId={ventaId}
                    cajaId={cajaId}
                    onExito={handlePagoExitoso}
                  />
                )}
                {activeTab === 'pagar' && ventaId == null && (
                  <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
                    <ShoppingCart className="size-8 opacity-20" />
                    <p className="text-xs">El carrito está vacío</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: cart — solo visible con cliente activo y carritoVisible */}
        {cliente && carritoVisible && (
          <div className="w-80 xl:w-96 flex flex-col overflow-hidden shrink-0 border-l">
            <CarritoPanel
              ventaId={ventaId}
              cajaId={cajaId}
              onPagar={() => handleTabClick('pagar')}
            />
          </div>
        )}
      </div>

      {/* Pagar dialog */}
      {ventaId != null && carrito != null && (
        <PagarDialog
          open={pagarOpen}
          onOpenChange={setPagarOpen}
          ventaId={ventaId}
          cajaId={cajaId}
          total={carrito.total}
          iva={carrito.iva}
          sellosTotal={resumen?.sellos.total ?? 0}
          clienteEmail={cliente?.email ?? null}
          onSuccess={handlePagoExitoso}
        />
      )}
    </div>
  )
}
