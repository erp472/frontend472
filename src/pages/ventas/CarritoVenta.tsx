import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Trash2, ChevronLeft, RefreshCw,
  Search, CheckCircle2, AlertTriangle, Loader2,
  Package, MailOpen, Plus, ChevronRight, Tag, Pencil,
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
import { ApiError } from '@/lib/api'
import { useCliente, useUpdateCliente, useCreateCliente, type TipoDocumento } from '@/queries/clientes.queries'
import {
  useCatalogoProductos,
  useCarrito,
  useResumenTurno,
  useVentasTurno,
  useApartadosDisponibles,
  useIniciarVenta,
  useAgregarProducto,
  useEliminarProducto,
  useConfirmarVenta,
  useAnularVenta,
  useContratarApartado,
  type ClienteResumen,
  type MedioPagoVenta,
  type TipoProducto,
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
  { value: 'filatelia',       label: 'Filatelia' },
  { value: 'empaque',         label: 'Empaques' },
  { value: 'material_oficina', label: 'Material' },
  { value: 'giro',            label: 'Giros' },
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

// ── TabProductos ──────────────────────────────────────────────────────────────

function TabProductos({
  sucursalId, ventaId, cajaId,
}: { sucursalId: number; ventaId: number | null; cajaId: number }) {
  const [tipoFiltro, setTipoFiltro] = useState<TipoProducto | ''>('')
  const { data: catalogo, isLoading } = useCatalogoProductos(sucursalId, tipoFiltro || undefined)
  const agregar = useAgregarProducto(ventaId ?? 0, cajaId)

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
        ) : !catalogo?.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No hay productos disponibles
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3 xl:grid-cols-3">
            {catalogo.map(p => (
              <button
                key={p.id}
                type="button"
                disabled={!ventaId || agregar.isPending}
                onClick={() => handleAgregar(p.id, p.nombre)}
                className={cn(
                  'group rounded-lg border p-3 text-left flex flex-col gap-2 transition-all',
                  'hover:border-primary/60 hover:shadow-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-semibold leading-tight line-clamp-2">{p.nombre}</span>
                  <Package className="size-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                </div>
                <div className="flex items-end justify-between mt-auto gap-1">
                  <div>
                    <span className="text-sm font-bold tabular-nums">{fmt(p.precio)}</span>
                    {p.porcentajeTax > 0 && (
                      <span className="block text-[10px] text-muted-foreground">+{p.porcentajeTax}% IVA</span>
                    )}
                  </div>
                  <Plus className={cn(
                    'size-5 rounded-full bg-primary text-primary-foreground p-0.5 shrink-0',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                  )} />
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// ── TabApartado ───────────────────────────────────────────────────────────────

function TabApartado({
  sucursalId, cajaId, clienteId,
}: { sucursalId: number; cajaId: number; clienteId: number | null }) {
  const { data: apartados, isLoading } = useApartadosDisponibles(sucursalId)
  const contratar = useContratarApartado(cajaId)

  const handleContratar = async (apartadoId: number, numero: string) => {
    if (!clienteId) { toast.error('Busca un cliente primero'); return }
    try {
      await contratar.mutateAsync({ clienteId, apartadoId, duracionMeses: 12 })
      toast.success(`Apartado #${numero} contratado`)
    } catch {
      toast.error('No se pudo contratar el apartado')
    }
  }

  const TAMANO: Record<string, string> = { pequeno: 'Pequeño', mediano: 'Mediano', grande: 'Grande' }

  if (isLoading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  )

  if (!apartados?.length) return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      No hay apartados disponibles en esta sucursal
    </div>
  )

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-1.5">
        {apartados.map(a => (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">#{a.numero}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0">
                  {TAMANO[a.tamano] ?? a.tamano}
                </Badge>
              </div>
              {a.valor != null && (
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(a.valor)} / año</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs shrink-0"
              disabled={!clienteId || contratar.isPending}
              onClick={() => handleContratar(a.id, a.numero)}
            >
              Contratar
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
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
          <div className="p-2 space-y-1">
            {detalle.map(d => (
              <div key={d.id} className="flex items-start gap-2 rounded-md border px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight line-clamp-2">
                    {d.nombreProducto ?? `Producto #${d.productoId}`}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {d.cantidad}× {fmt(d.precioUnitario)}
                    {d.descuento > 0 && (
                      <span className="text-emerald-600 ml-1">−{fmt(d.descuento)}</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold tabular-nums">{fmt(d.subtotal)}</p>
                  <button
                    type="button"
                    onClick={() => handleEliminar(d.id)}
                    disabled={eliminar.isPending}
                    className="mt-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
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

type Tab = 'productos' | 'apartado' | 'servicios' | 'historial'

const TABS: { value: Tab; label: string }[] = [
  { value: 'productos', label: 'Productos' },
  { value: 'apartado',  label: 'Apartado Postal' },
  { value: 'servicios', label: 'Servicios Postales' },
  { value: 'historial', label: 'Historial' },
]

export default function CarritoVenta() {
  const { cajaId: cajaIdStr } = useParams<{ cajaId: string }>()
  const navigate   = useNavigate()
  const user       = useSessionStore(s => s.user)
  const cajaId     = Number(cajaIdStr) || 0
  const sucursalId = user?.sucursal_id ?? 0

  const [ventaId,   setVentaId]   = useState<number | null>(null)
  const [cliente,   setCliente]   = useState<ClienteResumen | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('productos')
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
    setActiveTab('historial')
  }

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
            {TABS.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  'px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                  activeTab === t.value
                    ? 'border-primary text-primary'
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
            {activeTab === 'apartado' && (
              <TabApartado
                sucursalId={sucursalId}
                cajaId={cajaId}
                clienteId={cliente?.id ?? null}
              />
            )}
            {activeTab === 'servicios' && (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center text-muted-foreground">
                <AlertTriangle className="size-8 opacity-30" />
                <p className="text-sm font-medium">Servicios Postales</p>
                <p className="text-xs max-w-xs">
                  El módulo de guías postales (cotización, remitente/destinatario, generación de guía)
                  está en desarrollo.
                </p>
              </div>
            )}
            {activeTab === 'historial' && (
              <TabHistorial
                cajaId={cajaId}
                userRol={user?.rol ?? ''}
              />
            )}
          </div>
        </div>

        {/* Right: cart */}
        <div className="w-80 xl:w-96 flex flex-col overflow-hidden shrink-0">
          <CarritoPanel
            ventaId={ventaId}
            cajaId={cajaId}
            onPagar={() => setPagarOpen(true)}
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
