import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Trash2, ChevronLeft, RefreshCw,
  Search, CheckCircle2, AlertTriangle, Loader2,
  Package, MailOpen, Plus, ChevronRight, Tag, Pencil,
  Truck, X, UserRound,
} from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Badge }       from '@/components/ui/badge'
import { Label }       from '@/components/ui/label'
import { Separator }   from '@/components/ui/separator'
import { ScrollArea }  from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useSessionStore } from '@/stores/useSessionStore'
import { useAcceso } from '@/hooks/useAcceso'
import { ApiError } from '@/lib/api'
import { useCliente, useUpdateCliente, useCreateCliente, type TipoDocumento } from '@/queries/clientes.queries'
import {
  useCatalogoProductos,
  useTarifasEspecial,
  useCarrito,
  useResumenTurno,
  useVentasTurno,
  useApartadosDisponibles,
  useServiciosPostales,
  useCotizarEnvio,
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
  type Envio,
} from '@/queries/ventas.queries'

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
  { value: 'efectivo',          label: 'Efectivo' },
  { value: 'cheque',            label: 'Cheque' },
  { value: 'tarjeta_debito',    label: 'Tarjeta Débito' },
  { value: 'tarjeta_credito',   label: 'Tarjeta Crédito' },
  { value: 'transferencia',     label: 'Transferencia' },
  { value: 'consignacion',      label: 'Consignación' },
  { value: 'preporteado',       label: 'Preporteado' },
  { value: 'mixto_preporteado', label: 'Mixto-Preporteado' },
]

type MedioPagoEnvio = Exclude<MedioPagoVenta, 'cheque'>

const MEDIOS_PAGO_ENVIO: { value: MedioPagoEnvio; label: string }[] = [
  { value: 'efectivo',          label: 'Efectivo' },
  { value: 'tarjeta_debito',    label: 'Tarjeta Débito' },
  { value: 'tarjeta_credito',   label: 'Tarjeta Crédito' },
  { value: 'transferencia',     label: 'Transferencia' },
  { value: 'consignacion',      label: 'Consignación' },
  { value: 'preporteado',       label: 'Preporteado' },
  { value: 'mixto_preporteado', label: 'Mixto-Preporteado' },
]

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
      } else {
        toast.error('Error al buscar cliente')
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
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setEditOpen(true)}
              title="Editar datos del cliente"
            >
              <ChevronRight className="size-4" />
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
        {noEncontrado ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">No encontrado.</span>
            <button
              type="button"
              onClick={() => setCrearOpen(true)}
              className="flex items-center gap-0.5 font-medium text-primary hover:underline"
            >
              <Plus className="size-3" /> Crear cliente
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground hidden sm:block">
            Busca el cliente por documento para iniciar la venta
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
      <div className="flex gap-1.5 px-3 py-2 flex-wrap border-b shrink-0">
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
      <ScrollArea className="flex-1">
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
              const iva       = Math.round(p.precio * p.porcentajeTax / 100)
              const total     = p.precio + iva
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
        <div className="px-2.5 py-2 border-b shrink-0">
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

        <div className="px-2 py-1.5 shrink-0">
          <p className="text-[10px] text-muted-foreground font-medium">No. Apartado Postal</p>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : !filtrados.length ? (
            <p className="px-2 py-4 text-[11px] text-center text-muted-foreground">
              Sin disponibles
            </p>
          ) : (
            <div className="px-1.5 pb-2 space-y-0.5">
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
        <div className="p-3 space-y-3">

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

function TabProductosEspeciales({
  sucursalId, ventaId, cajaId,
}: { sucursalId: number; ventaId: number | null; cajaId: number }) {
  const [productoId, setProductoId] = useState(0)
  const [cantidad,   setCantidad]   = useState(1)
  const [calculado,  setCalculado]  = useState<{ precio: number; tarifaId: number | null } | null>(null)

  const { data: catalogo, isLoading: loadingCatalogo } = useCatalogoProductos(sucursalId, 'otro')
  const { data: tarifas,  isLoading: loadingTarifas }  = useTarifasEspecial(productoId)
  const agregar = useAgregarProducto(ventaId ?? 0, cajaId)

  const productoSeleccionado = catalogo?.find(p => p.id === productoId) ?? null
  const valorTotal = calculado ? calculado.precio * cantidad : 0

  const handleCambiarProducto = (v: string) => {
    setProductoId(Number(v))
    setCantidad(1)
    setCalculado(null)
  }

  const handleCalcular = () => {
    if (!productoSeleccionado) return
    if (tarifas && tarifas.length > 0) {
      const tarifa = tarifas.find(t =>
        cantidad >= t.minCantidad && (t.maxCantidad === null || cantidad <= t.maxCantidad)
      )
      if (!tarifa) { toast.error('La cantidad está fuera del rango de tarifas'); return }
      setCalculado({ precio: tarifa.precio, tarifaId: tarifa.id })
    } else {
      setCalculado({ precio: productoSeleccionado.precio, tarifaId: null })
    }
  }

  const handleAgregar = async () => {
    if (!ventaId)              { toast.error('Busca un cliente primero'); return }
    if (!productoSeleccionado) { toast.error('Selecciona un servicio');   return }
    if (!calculado)            { toast.error('Haz clic en Calcular primero'); return }
    try {
      await agregar.mutateAsync({ productoId: productoSeleccionado.id, cantidad })
      toast.success(`${productoSeleccionado.nombre} ×${cantidad} agregado`)
      setProductoId(0)
      setCantidad(1)
      setCalculado(null)
    } catch {
      toast.error('No se pudo agregar el servicio')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b shrink-0 space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Servicios especiales
        </p>

        {loadingCatalogo ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="size-3.5 animate-spin" /> Cargando catálogo...
          </div>
        ) : (
          <>
            {/* Selector único de servicio */}
            <div className="space-y-1">
              <Label className="text-xs">Servicio especial</Label>
              <Select value={productoId ? String(productoId) : ''} onValueChange={handleCambiarProducto}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Seleccionar servicio..." />
                </SelectTrigger>
                <SelectContent>
                  {(catalogo ?? []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {productoSeleccionado && (
              <>
                {/* Cantidad + Calcular */}
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Cantidad</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-8 text-sm w-24"
                      value={cantidad}
                      onChange={e => { setCantidad(Math.max(1, Number(e.target.value) || 1)); setCalculado(null) }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0"
                    onClick={handleCalcular}
                    disabled={loadingTarifas}
                  >
                    {loadingTarifas ? <Loader2 className="size-3.5 animate-spin" /> : 'Calcular'}
                  </Button>
                </div>

                {/* Tabla de tarifas */}
                {tarifas && tarifas.length > 0 && (
                  <div className="space-y-2">
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
                            <tr
                              key={t.id}
                              className={cn(
                                'border-t transition-colors',
                                calculado?.tarifaId === t.id
                                  ? 'bg-primary/10 font-semibold'
                                  : 'hover:bg-muted/30',
                              )}
                            >
                              <td className="px-2 py-1 tabular-nums">{t.minCantidad.toLocaleString('es-CO')}</td>
                              <td className="px-2 py-1 tabular-nums">
                                {t.maxCantidad !== null ? t.maxCantidad.toLocaleString('es-CO') : '∞'}
                              </td>
                              <td className="px-2 py-1 text-right tabular-nums">{fmt(t.precio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Valor unitario + Valor Total */}
                    {calculado && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Valor unitario</Label>
                          <div className="h-8 flex items-center px-3 rounded border bg-muted/40 text-sm tabular-nums font-medium">
                            {fmt(calculado.precio)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Valor Total</Label>
                          <div className="h-8 flex items-center px-3 rounded border bg-muted/40 text-sm tabular-nums font-bold text-primary">
                            {fmt(valorTotal)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Servicios sin tarifas configuradas */}
                {tarifas && tarifas.length === 0 && productoSeleccionado.precio === 0 && (
                  <p className="text-amber-600 text-[10px]">
                    Precio pendiente — actualizar en Administración
                  </p>
                )}

                {/* Agregar al carrito */}
                <Button
                  className="w-full"
                  disabled={!ventaId || agregar.isPending || !calculado}
                  onClick={handleAgregar}
                >
                  {agregar.isPending && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                  <Plus className="size-3.5 mr-1.5" />
                  Agregar al carrito
                </Button>

                {!ventaId && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    Busca un cliente para continuar
                  </p>
                )}
              </>
            )}

            {!catalogo?.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay servicios disponibles en este punto
              </p>
            )}
          </>
        )}
      </div>
      <ScrollArea className="flex-1" />
    </div>
  )
}

// ── TabServiciosPostales ──────────────────────────────────────────────────────

interface PersonaEnvioForm {
  nombre: string; empresa: string; documento: string; email: string
  telefono: string; direccion: string; ciudad: string; pais: string; cp: string
}

interface EnvioLocal {
  guia: string; servicioNombre: string; destinatario: string; ciudad: string
  cantidad: number; pesoFisico: number; pesoVolumetrico: number | null; pesoFacturado: number
  valorServicio: number; valorTotal: number
}

const personaVacia = (): PersonaEnvioForm => ({
  nombre: '', empresa: '', documento: '', email: '', telefono: '',
  direccion: '', ciudad: '', pais: 'CO', cp: '',
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
  // Compartido
  departamento: string
  ciudad:       string
  adicion:      string
}

const dirVacia = (): DirState => ({
  modo: 'normalizada',
  tipoVia: 'CLL', numVia: '', letraVia: '', bis: false, cuadrante1: '',
  numGen: '', letraGen: '', cuadrante2: '', placa: '',
  textoLibre: '', departamento: '', ciudad: '', adicion: '',
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

function DireccionInput({ value, onChange }: { value: DirState; onChange: (s: DirState) => void }) {
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

      {/* Geografía (compartido) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Departamento</Label>
          <Input
            className="h-7 text-xs"
            placeholder="Cundinamarca"
            value={value.departamento}
            onChange={e => set('departamento', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ciudad <span className="text-destructive">*</span></Label>
          <Input
            className="h-7 text-xs"
            placeholder="Bogotá"
            value={value.ciudad}
            onChange={e => set('ciudad', e.target.value)}
          />
        </div>
      </div>

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

function TabServiciosPostales({
  sucursalId, cajaId, clienteId, ventaId,
}: { sucursalId: number; cajaId: number; clienteId: number | null; ventaId: number | null }) {
  const [servicioId,     setServicioId]     = useState(0)
  const [cantidadPiezas, setCantidadPiezas] = useState(1)
  const [pesoKg,         setPesoKg]         = useState('')
  const [altoCm,         setAltoCm]         = useState('')
  const [anchoCm,        setAnchoCm]        = useState('')
  const [largoCm,        setLargoCm]        = useState('')
  const [valorDeclarado, setValorDeclarado] = useState('')
  const [contenido,      setContenido]      = useState('')
  const [remitente,      setRemitente]      = useState<PersonaEnvioForm>(personaVacia())
  const [destinatario,   setDestinatario]   = useState<PersonaEnvioForm>(personaVacia())
  const [dirDest,        setDirDest]        = useState<DirState>(dirVacia())
  const [dirSaved,       setDirSaved]       = useState<{ dir: DirState; obs: string }[]>([])
  const [lote,           setLote]           = useState('')
  const [observaciones,  setObservaciones]  = useState('')
  const [medioPago,      setMedioPago]      = useState<MedioPagoEnvio>('efectivo')
  const [enviosGenerados, setEnviosGenerados] = useState<EnvioLocal[]>([])
  const [seguroPostal,   setSeguroPostal]   = useState(false)
  const [ecoComercial,   setEcoComercial]   = useState(false)
  const [cajaDlgOpen,    setCajaDlgOpen]    = useState(false)
  const [cajaSeleccion,  setCajaSeleccion]  = useState<number>(7)
  const [cajaCantidad,   setCajaCantidad]   = useState(1)

  const { data: servicios, isLoading: loadingServicios } = useServiciosPostales(sucursalId)
  // Filtrar apartado_postal: tiene su propio tab
  const serviciosFiltrados = servicios?.filter((s: ServicioCatalogo) => s.tipo !== 'apartado_postal')
  const selectedService = serviciosFiltrados?.find((s: ServicioCatalogo) => s.id === servicioId)
  const esInternacional = !!selectedService?.tipo?.includes('internacional')

  const pesoNum = Number(pesoKg) || 0

  const { data: cotizacion, isLoading: cotizando } = useCotizarEnvio({
    servicioId,
    pesoFisicoKg: pesoNum,
    ...(altoCm  ? { altoCm:  Number(altoCm)  } : {}),
    ...(anchoCm ? { anchoCm: Number(anchoCm) } : {}),
    ...(largoCm ? { largoCm: Number(largoCm) } : {}),
  })

  const crearEnvio  = useCrearEnvio(cajaId)
  const agregarProd = useAgregarProducto(ventaId ?? 0, cajaId)

  const puedeGuardar = servicioId > 0 && pesoNum > 0 && !!cotizacion
    && remitente.nombre.trim() !== '' && destinatario.nombre.trim() !== ''

  const resetForm = () => {
    setServicioId(0); setCantidadPiezas(1)
    setPesoKg(''); setAltoCm(''); setAnchoCm(''); setLargoCm('')
    setValorDeclarado(''); setContenido('')
    setRemitente(personaVacia()); setDestinatario(personaVacia()); setDirDest(dirVacia())
    setLote(''); setObservaciones(''); setMedioPago('efectivo')
    setSeguroPostal(false); setEcoComercial(false)
    setCajaCantidad(1); setCajaSeleccion(7)
  }

  const ejecutarGenerar = async () => {
    const dirTexto = composeAddress(dirDest)
    const body: Record<string, unknown> = {
      servicioId, sucursalId, pesoFisicoKg: pesoNum, medioPago, cantidadPiezas,
      remitente: {
        nombre:    remitente.nombre.trim(),
        empresa:   remitente.empresa.trim() || undefined,
        documento: remitente.documento.trim() || undefined,
        email:     remitente.email.trim() || undefined,
        telefono:  remitente.telefono.trim() || undefined,
        ciudad:    remitente.ciudad.trim() || undefined,
        pais:      remitente.pais || 'CO',
      },
      destinatario: {
        nombre:       destinatario.nombre.trim(),
        empresa:      destinatario.empresa.trim() || undefined,
        documento:    destinatario.documento.trim() || undefined,
        email:        destinatario.email.trim() || undefined,
        telefono:     destinatario.telefono.trim() || undefined,
        direccion:    dirTexto || undefined,
        ciudad:       dirDest.ciudad.trim() || undefined,
        departamento: dirDest.departamento.trim() || undefined,
        pais:         destinatario.pais || 'CO',
        codigoPostal: destinatario.cp.trim() || undefined,
      },
    }
    if (altoCm)               body.altoCm          = Number(altoCm)
    if (anchoCm)              body.anchoCm         = Number(anchoCm)
    if (largoCm)              body.largoCm         = Number(largoCm)
    if (valorDeclarado)       body.valorDeclarado  = Number(valorDeclarado)
    if (contenido.trim())     body.contenido       = contenido.trim()
    if (lote.trim())          body.lote            = lote.trim()
    if (observaciones.trim()) body.observaciones   = observaciones.trim()
    if (seguroPostal)         body.seguroPostal    = true
    if (ecoComercial)         body.ecoComercial    = true

    const result: Envio = await crearEnvio.mutateAsync(body)
    setEnviosGenerados(prev => [...prev, {
      guia:            result.numeroGuia,
      servicioNombre:  selectedService?.nombre ?? '—',
      destinatario:    result.destinatarioNombre ?? destinatario.nombre.trim(),
      ciudad:          result.destinatarioCiudad ?? dirDest.ciudad.trim(),
      cantidad:        cantidadPiezas,
      pesoFisico:      result.pesoFisicoKg,
      pesoVolumetrico: cotizacion?.pesoVolumetricoKg ?? null,
      pesoFacturado:   result.pesoTarificadoKg,
      valorServicio:   result.valorServicio,
      valorTotal:      result.valorTotal,
    }])
    // Guardar dirección en historial de sesión si tiene ciudad
    if (dirDest.ciudad.trim()) {
      const compuesta = composeAddress(dirDest)
      setDirSaved(prev => {
        const yaExiste = prev.some(
          d => composeAddress(d.dir) === compuesta && d.dir.ciudad === dirDest.ciudad,
        )
        return yaExiste ? prev : [...prev, { dir: { ...dirDest }, obs: '' }]
      })
    }
    toast.success(`Guía ${result.numeroGuia} generada`)
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
    } catch {
      toast.error('No se pudo completar la operación')
    }
  }

  const handleCajaNo = async () => {
    setCajaDlgOpen(false)
    try {
      await ejecutarGenerar()
    } catch {
      toast.error('No se pudo generar la guía')
    }
  }

  const totalEnvios = enviosGenerados.reduce((s, e) => s + e.valorTotal, 0)

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Panel izquierdo: Formulario ──────────────────────────────────── */}
      <div className="w-72 xl:w-80 shrink-0 border-r flex flex-col">
        <div className="px-3 py-2 border-b shrink-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Nuevo envío</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">

            {/* Servicio */}
            <div className="space-y-1.5">
              <Label className="text-xs">Servicio <span className="text-destructive">*</span></Label>
              {loadingServicios ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Select value={servicioId ? String(servicioId) : ''} onValueChange={v => setServicioId(Number(v))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Seleccionar servicio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviciosFiltrados?.map((s: ServicioCatalogo) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nombre} — {s.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Peso + Cantidad piezas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Peso físico (kg) <span className="text-destructive">*</span></Label>
                <Input
                  type="number" step="0.1" min="0.1"
                  className="h-8 text-sm" placeholder="0.5"
                  value={pesoKg}
                  onChange={e => setPesoKg(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad piezas</Label>
                <Input
                  type="number" min="1"
                  className="h-8 text-sm"
                  value={cantidadPiezas}
                  onChange={e => setCantidadPiezas(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>

            {/* Dimensiones */}
            {selectedService?.requiereDimensiones && (
              <div className="space-y-1">
                <Label className="text-xs">Dimensiones (cm)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" className="h-8 text-sm" placeholder="Alto"  value={altoCm}  onChange={e => setAltoCm(e.target.value)}  />
                  <Input type="number" className="h-8 text-sm" placeholder="Ancho" value={anchoCm} onChange={e => setAnchoCm(e.target.value)} />
                  <Input type="number" className="h-8 text-sm" placeholder="Largo" value={largoCm} onChange={e => setLargoCm(e.target.value)} />
                </div>
              </div>
            )}

            {/* Valor declarado */}
            {selectedService?.requiereValorDeclarado && (
              <div className="space-y-1">
                <Label className="text-xs">Valor declarado (COP)</Label>
                <Input type="number" className="h-8 text-sm" placeholder="0" value={valorDeclarado} onChange={e => setValorDeclarado(e.target.value)} />
              </div>
            )}

            {/* Contenido */}
            <div className="space-y-1">
              <Label className="text-xs">Contenido / descripción</Label>
              <Input className="h-8 text-sm" placeholder="Descripción del contenido" value={contenido} onChange={e => setContenido(e.target.value)} />
            </div>

            {/* Cotización inline */}
            {servicioId > 0 && pesoNum > 0 && (
              <div className="rounded-lg bg-muted/40 border p-2.5">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Cotización</p>
                {cotizando ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Calculando...
                  </div>
                ) : cotizacion ? (
                  <div className="space-y-0.5 text-xs">
                    {cotizacion.pesoVolumetricoKg != null && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Peso vol.:</span><span>{cotizacion.pesoVolumetricoKg} kg</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span>Valor:</span>
                      <span className="text-primary">{fmt(cotizacion.valorServicio)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Ingresa el peso para cotizar</p>
                )}
              </div>
            )}

            <Separator />

            {/* Remitente */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Remitente</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                  <Input className="h-8 text-sm" value={remitente.nombre} onChange={e => setRemitente(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Empresa</Label>
                  <Input className="h-8 text-sm" value={remitente.empresa} onChange={e => setRemitente(p => ({ ...p, empresa: e.target.value }))} placeholder="Razón social (opcional)" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input className="h-8 text-sm" value={remitente.telefono} onChange={e => setRemitente(p => ({ ...p, telefono: e.target.value }))} placeholder="3001234567" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ciudad</Label>
                  <Input className="h-8 text-sm" value={remitente.ciudad} onChange={e => setRemitente(p => ({ ...p, ciudad: e.target.value }))} placeholder="Bogotá" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Destinatario */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Destinatario</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Nombre <span className="text-destructive">*</span></Label>
                  <Input className="h-8 text-sm" value={destinatario.nombre} onChange={e => setDestinatario(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Empresa</Label>
                  <Input className="h-8 text-sm" value={destinatario.empresa} onChange={e => setDestinatario(p => ({ ...p, empresa: e.target.value }))} placeholder="Razón social (opcional)" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Documento</Label>
                  <Input className="h-8 text-sm" value={destinatario.documento} onChange={e => setDestinatario(p => ({ ...p, documento: e.target.value }))} placeholder="CC / NIT" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input className="h-8 text-sm" value={destinatario.telefono} onChange={e => setDestinatario(p => ({ ...p, telefono: e.target.value }))} placeholder="3001234567" />
                </div>
              </div>

              {/* Lista de direcciones de esta sesión */}
              {dirSaved.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Direcciones de esta sesión
                    </p>
                    <button
                      type="button"
                      onClick={() => setDirDest(dirVacia())}
                      className="text-[9px] text-primary hover:underline"
                    >
                      + Nueva
                    </button>
                  </div>
                  <div className="rounded-md border overflow-hidden text-[10px]">
                    {/* Column headers */}
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-1.5 px-2 py-1 bg-muted/50 border-b font-medium text-muted-foreground">
                      <span className="w-3" />
                      <span>Dirección</span>
                      <span>Obs.</span>
                    </div>
                    {dirSaved.map((item, i) => {
                      const addr    = composeAddress(item.dir)
                      const current = composeAddress(dirDest) === addr && dirDest.ciudad === item.dir.ciudad
                      return (
                        <div
                          key={i}
                          className={cn(
                            'grid grid-cols-[auto_1fr_auto] items-start gap-x-1.5 px-2 py-1.5 border-b last:border-b-0 transition-colors',
                            current ? 'bg-primary/5' : 'hover:bg-muted/30',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setDirDest(item.dir)}
                            className="mt-1 shrink-0"
                          >
                            <span className={cn(
                              'block size-2.5 rounded-full border-2 transition-colors',
                              current ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                            )} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDirDest(item.dir)}
                            className="text-left min-w-0"
                          >
                            <p className={cn(
                              'font-mono leading-tight truncate',
                              current && 'text-primary font-semibold',
                            )}>
                              {addr || '—'}
                            </p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {[item.dir.ciudad, item.dir.departamento].filter(Boolean).join(', ')}
                            </p>
                          </button>
                          <div className="flex items-start gap-1 min-w-0">
                            <input
                              type="text"
                              value={item.obs}
                              onClick={e => e.stopPropagation()}
                              onChange={e => setDirSaved(prev =>
                                prev.map((d, idx) => idx === i ? { ...d, obs: e.target.value } : d)
                              )}
                              placeholder="Obs."
                              className="w-14 h-5 text-[9px] rounded border border-border bg-background px-1 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setDirSaved(prev => prev.filter((_, idx) => idx !== i))
                                if (current) setDirDest(dirVacia())
                              }}
                              className="mt-0.5 text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Dirección normalizada */}
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Dirección de entrega</p>
                  {dirSaved.length === 0 && (
                    <span className="text-[9px] text-muted-foreground">Nueva dirección</span>
                  )}
                </div>
                <DireccionInput value={dirDest} onChange={setDirDest} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {esInternacional ? (
                  <div className="space-y-1">
                    <Label className="text-xs">País (ISO-2)</Label>
                    <Input className="h-8 text-sm" maxLength={2} value={destinatario.pais} onChange={e => setDestinatario(p => ({ ...p, pais: e.target.value.toUpperCase() }))} placeholder="US" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs">Código postal</Label>
                    <Input className="h-8 text-sm" value={destinatario.cp} onChange={e => setDestinatario(p => ({ ...p, cp: e.target.value }))} placeholder="111011" />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" className="h-8 text-sm" value={destinatario.email} onChange={e => setDestinatario(p => ({ ...p, email: e.target.value }))} placeholder="dest@correo.com" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Lote */}
            <div className="space-y-1">
              <Label className="text-xs">Lote</Label>
              <Input className="h-8 text-sm" placeholder="N° de lote (opcional)" value={lote} onChange={e => setLote(e.target.value)} />
            </div>

            {/* Observaciones */}
            <div className="space-y-1">
              <Label className="text-xs">Observaciones</Label>
              <Input className="h-8 text-sm" placeholder="Opcional" value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>

            {/* Seguro postal + Eco comercial */}
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={seguroPostal}
                  onChange={e => setSeguroPostal(e.target.checked)}
                  className="size-3.5 accent-primary"
                />
                <span className="text-xs">Seguro postal</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ecoComercial}
                  onChange={e => setEcoComercial(e.target.checked)}
                  className="size-3.5 accent-primary"
                />
                <span className="text-xs">Eco comercial</span>
              </label>
            </div>

            {/* Medio de pago */}
            <div className="space-y-1.5">
              <Label className="text-xs">Medio de pago</Label>
              <div className="grid grid-cols-2 gap-1.5">
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

        <div className="border-t p-3 space-y-2 shrink-0">
          <Button
            className="w-full"
            disabled={!puedeGuardar || !clienteId || crearEnvio.isPending || agregarProd.isPending}
            onClick={handleGuardar}
          >
            {(crearEnvio.isPending || agregarProd.isPending) && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
            Generar guía
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
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

      {/* ── Panel derecho: Envíos generados ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 border-b shrink-0 text-xs">
          <span className="font-semibold">
            Cant. envíos (Pantalla actual): <span className="text-primary">{enviosGenerados.length}</span>
          </span>
          <Separator orientation="vertical" className="h-3.5" />
          <span className="font-semibold">
            Total envíos: <span className="text-primary">{fmt(totalEnvios)}</span>
          </span>
        </div>

        <div className="flex-1 overflow-auto">
          {enviosGenerados.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 h-full text-muted-foreground">
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
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Peso Físico</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Peso Vol.</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Peso Tar.</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Valor Flete</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  <th className="px-2 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Desc.</th>
                </tr>
              </thead>
              <tbody>
                {enviosGenerados.map((e, i) => (
                  <tr key={`${e.guia}-${i}`} className="border-b hover:bg-muted/30">
                    <td className="px-2 py-2 font-mono font-semibold whitespace-nowrap">{e.guia}</td>
                    <td className="px-2 py-2 max-w-[120px] truncate">{e.servicioNombre}</td>
                    <td className="px-2 py-2 max-w-[100px] truncate">{e.ciudad || e.destinatario}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{e.cantidad}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{e.pesoFisico} kg</td>
                    <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                      {e.pesoVolumetrico != null ? `${e.pesoVolumetrico} kg` : '—'}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{e.pesoFacturado} kg</td>
                    <td className="px-2 py-2 text-right tabular-nums">{fmt(e.valorServicio)}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmt(e.valorTotal)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                <Label className="text-xs">¿En cuántas adquirió?</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  className="h-8 text-sm w-24"
                  value={cajaCantidad}
                  onChange={e => setCajaCantidad(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={handleCajaNo} disabled={crearEnvio.isPending || agregarProd.isPending}>
              No
            </Button>
            <Button onClick={handleCajaSi} disabled={crearEnvio.isPending || agregarProd.isPending}>
              {(crearEnvio.isPending || agregarProd.isPending) && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
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
  const [medioPago,        setMedioPago]        = useState<MedioPagoVenta>('efectivo')
  const [email,            setEmail]            = useState(cliente?.email ?? '')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const confirmar = useConfirmarVenta(ventaId, cajaId)

  const sellosTotal   = carrito?.detalle.filter(d => d.tipoProducto === 'estampilla').reduce((s, d) => s + d.subtotal, 0) ?? 0
  const showEfectivo  = medioPago === 'efectivo' || medioPago === 'mixto_preporteado'
  const efectivo      = Number(efectivoRecibido) || 0
  const total         = carrito?.total ?? 0
  const cambio        = showEfectivo ? Math.max(0, efectivo - total) : 0
  const faltante      = showEfectivo ? Math.max(0, total - efectivo) : 0

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
        ...(showEfectivo && efectivo > 0 ? { efectivoRecibido: efectivo } : {}),
      })
      toast.success('Pago confirmado')
      onExito()
    } catch {
      toast.error('No se pudo confirmar el pago')
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
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-8">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Producto / Servicio</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-12">Cant.</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-20">Impuesto</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-20">Desc.</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap w-24">Valor</th>
            </tr>
          </thead>
          <tbody>
            {carrito.detalle.map((d, i) => (
              <tr key={d.id} className="border-b hover:bg-muted/20">
                <td className="px-3 py-2 text-center text-muted-foreground">{i + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium leading-tight">{d.nombreProducto ?? `Producto #${d.productoId}`}</p>
                  {d.tipoProducto && (
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {d.tipoProducto.replace('_', ' ')}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{d.cantidad}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">—</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {d.descuento > 0
                    ? <span className="text-emerald-600">−{fmt(d.descuento)}</span>
                    : <span className="text-muted-foreground/30">—</span>
                  }
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(d.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 5-column totals bar */}
      <div className="grid grid-cols-5 divide-x border-b bg-muted/30 text-xs shrink-0">
        {[
          { label: 'Estampillas', value: fmt(sellosTotal) },
          { label: 'IVA',         value: fmt(carrito.iva) },
          { label: 'Descuento',   value: carrito.descuento > 0 ? `−${fmt(carrito.descuento)}` : '—' },
          { label: 'Subtotal',    value: fmt(carrito.subtotal) },
          { label: 'Total',       value: fmt(carrito.total), primary: true },
        ].map(col => (
          <div key={col.label} className="px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{col.label}</p>
            <p className={cn('font-semibold tabular-nums mt-0.5', col.primary && 'text-primary text-sm')}>{col.value}</p>
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
          <Label className="text-xs">Medio de pago</Label>
          <div className="flex flex-wrap gap-1.5">
            {MEDIOS_PAGO.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMedioPago(m.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
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

        {/* Efectivo sub-fields */}
        {showEfectivo && (
          <div className="flex items-center gap-4 rounded-lg border px-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Efectivo recibido</Label>
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
          <Button variant="destructive" size="sm" disabled={confirmar.isPending} onClick={() => {/* anulación pendiente */}}>
            Anular
          </Button>
        </div>
      </div>
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
            <div className="flex justify-between text-muted-foreground">
              <span>IVA</span>
              <span className="tabular-nums">{fmt(carrito.iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm pt-1 border-t">
              <span>TOTAL</span>
              <span className="tabular-nums text-primary">{fmt(carrito.total)}</span>
            </div>
          </div>
        )}
        <Button
          className="w-full"
          onClick={onPagar}
          disabled={!ventaId || !detalle.length}
        >
          Confirmar pago
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
        ...(showEfectivo && efectivo > 0 ? { efectivoRecibido: efectivo } : {}),
      })
      toast.success('Pago confirmado')
      onSuccess()
      onOpenChange(false)
    } catch {
      toast.error('No se pudo confirmar el pago')
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
          <Label className="text-xs">Medio de pago</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {MEDIOS_PAGO.map(m => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMedioPago(m.value)}
                className={cn(
                  'rounded-md border px-2.5 py-1.5 text-xs font-medium text-left transition-colors',
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
  { value: 'historial',  label: 'Historial' },
  { value: 'pagar',      label: 'Pagar',      primary: true },
]

export default function CarritoVenta() {
  const { cajaId: cajaIdStr } = useParams<{ cajaId: string }>()
  const navigate   = useNavigate()
  const user       = useSessionStore(s => s.user)
  const cajaId     = Number(cajaIdStr) || 0
  const sucursalId = user?.sucursal_id ?? 0

  const { flagActivo } = useAcceso()
  const tabs = useMemo(
    () => ALL_TABS.filter(t => !t.flag || flagActivo(t.flag)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flagActivo],
  )

  const [ventaId,   setVentaId]   = useState<number | null>(null)
  const [cliente,   setCliente]   = useState<ClienteResumen | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const first = ALL_TABS.find(t => t.value !== 'historial' && t.value !== 'pagar')
    return first?.value ?? 'historial'
  })
  const [pagarOpen, setPagarOpen] = useState(false)

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
          <h1 className="text-sm font-bold leading-tight">Caja #{cajaId}</h1>
          <p className="text-[11px] text-muted-foreground">
            {user?.nombre} · {new Date().toLocaleDateString('es-CO')}
          </p>
        </div>
      </header>

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
          {/* Tab bar */}
          <div className="flex border-b shrink-0">
            {tabs.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
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
                clienteId={cliente?.id ?? null}
              />
            )}
            {activeTab === 'servicios' && (
              <TabServiciosPostales
                sucursalId={sucursalId}
                cajaId={cajaId}
                clienteId={cliente?.id ?? null}
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
        </div>

        {/* Right: cart */}
        <div className="w-80 xl:w-96 flex flex-col overflow-hidden shrink-0">
          <CarritoPanel
            ventaId={ventaId}
            cajaId={cajaId}
            onPagar={() => setActiveTab('pagar')}
          />
        </div>
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
