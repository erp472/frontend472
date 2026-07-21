import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, User, ChevronRight, Loader2,
  Tag, ShieldCheck, AlertCircle, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Switch }    from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/useSessionStore'
import {
  useSearchClientes, useCreateCliente, useTiposCliente, useCreateTipoCliente,
  type Cliente, type TipoDocumento,
} from '@/queries/clientes.queries'

// ── Badge de canal ────────────────────────────────────────────────────────────

function CanalBadge({ canal }: { canal: string }) {
  if (canal === 'retail')
    return <Badge variant="secondary" className="text-[10px]">Retail</Badge>
  return (
    <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
      <Tag className="size-2.5 mr-1" />{canal}
    </Badge>
  )
}

// ── Fila de cliente ───────────────────────────────────────────────────────────

function ClienteRow({ c, onClick }: { c: Cliente; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/40 transition-colors text-left"
    >
      <div className="flex items-center justify-center size-9 rounded-full bg-primary/10 shrink-0">
        <User className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{c.nombreCompleto}</span>
          <CanalBadge canal={c.canal} />
          {!c.activo && <Badge variant="destructive" className="text-[10px]">Inactivo</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">{c.tipoDocumento.replace(/_/g, ' ')}: {c.numeroDocumento}</span>
          {c.telefono && <span className="text-xs text-muted-foreground">{c.telefono}</span>}
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  )
}

// ── Formulario de nuevo cliente ───────────────────────────────────────────────

interface NuevoClienteForm {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  tipoClienteId: string
  nivelSisben: string
}

const EMPTY_FORM: NuevoClienteForm = {
  tipoDocumento: 'cedula', numeroDocumento: '', nombre: '', apellido: '',
  email: '', telefono: '', tipoClienteId: '', nivelSisben: '',
}

// ── Inline creator de tipo (solo ADMIN_SISTEMA) ───────────────────────────────

interface NuevoTipoInlineForm {
  codigo: string; nombre: string; descuentoPorcentaje: string
  aplicaEstampillas: boolean; aplicaGirosSisben: boolean
}

const EMPTY_TIPO: NuevoTipoInlineForm = {
  codigo: '', nombre: '', descuentoPorcentaje: '0',
  aplicaEstampillas: false, aplicaGirosSisben: false,
}

function NuevoTipoInline({ onCreado, onCancel }: {
  onCreado: (id: number) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<NuevoTipoInlineForm>(EMPTY_TIPO)
  const crear = useCreateTipoCliente()
  const set = (k: keyof NuevoTipoInlineForm) => (v: string | boolean) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son obligatorios')
      return
    }
    try {
      const t = await crear.mutateAsync({
        codigo:             form.codigo.trim().toUpperCase(),
        nombre:             form.nombre.trim(),
        descuentoPorcentaje: form.descuentoPorcentaje || '0',
        aplicaEstampillas:  form.aplicaEstampillas,
        aplicaGirosSisben:  form.aplicaGirosSisben,
      })
      toast.success(`Beneficio "${t.nombre}" creado`)
      onCreado(t.id)
    } catch {
      toast.error('No se pudo crear el tipo de cliente')
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">Nuevo beneficio</span>
        <Button variant="ghost" size="icon" className="size-5" onClick={onCancel}>
          <X className="size-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Código</Label>
          <Input
            className="h-7 text-xs uppercase"
            value={form.codigo}
            onChange={e => set('codigo')(e.target.value)}
            placeholder="POSTAL_RED"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descuento (%)</Label>
          <Input
            className="h-7 text-xs"
            type="number" min="0" max="100" step="0.5"
            value={form.descuentoPorcentaje}
            onChange={e => set('descuentoPorcentaje')(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nombre</Label>
        <Input
          className="h-7 text-xs"
          value={form.nombre}
          onChange={e => set('nombre')(e.target.value)}
          placeholder="Tarifa Postal Reducida"
        />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Switch
            id="est" checked={form.aplicaEstampillas}
            onCheckedChange={v => set('aplicaEstampillas')(v)}
            className="scale-75"
          />
          <label htmlFor="est" className="text-xs text-muted-foreground cursor-pointer">Estampillas</label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            id="sis" checked={form.aplicaGirosSisben}
            onCheckedChange={v => set('aplicaGirosSisben')(v)}
            className="scale-75"
          />
          <label htmlFor="sis" className="text-xs text-muted-foreground cursor-pointer">Giros SISBEN</label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onCancel} disabled={crear.isPending}>
          Cancelar
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSubmit} disabled={crear.isPending}>
          {crear.isPending && <Loader2 className="size-3 animate-spin" />}
          Crear beneficio
        </Button>
      </div>
    </div>
  )
}

// ── Diálogo de nuevo cliente ──────────────────────────────────────────────────

function NuevoClienteDialog({ open, onClose, onCreado }: {
  open: boolean; onClose: () => void; onCreado: (c: Cliente) => void
}) {
  const [form, setForm] = useState<NuevoClienteForm>(EMPTY_FORM)
  const [creandoTipo, setCreandoTipo] = useState(false)
  const { data: tipos = [] } = useTiposCliente(true)
  const crear = useCreateCliente()
  const rol = useSessionStore(s => s.user?.rol)
  const esSuperadmin = rol === 'ADMIN_SISTEMA'

  const set = (k: keyof NuevoClienteForm) => (v: string) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.numeroDocumento.trim() || !form.nombre.trim()) {
      toast.error('Número de documento y nombre son obligatorios')
      return
    }
    try {
      const c = await crear.mutateAsync({
        tipoDocumento:   form.tipoDocumento,
        numeroDocumento: form.numeroDocumento.trim(),
        nombre:          form.nombre.trim(),
        apellido:        form.apellido.trim() || undefined,
        email:           form.email.trim()    || undefined,
        telefono:        form.telefono.trim() || undefined,
        tipoClienteId:   form.tipoClienteId ? Number(form.tipoClienteId) : null,
        nivelSisben:     form.nivelSisben    ? Number(form.nivelSisben)   : null,
      })
      toast.success('Cliente creado')
      setForm(EMPTY_FORM)
      onCreado(c)
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el cliente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de documento</Label>
              <Select value={form.tipoDocumento} onValueChange={set('tipoDocumento')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cedula">Cédula</SelectItem>
                  <SelectItem value="pasaporte">Pasaporte</SelectItem>
                  <SelectItem value="tarjeta_identidad">Tarjeta identidad</SelectItem>
                  <SelectItem value="cedula_extranjeria">Cédula extranjería</SelectItem>
                  <SelectItem value="nit">NIT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Número de documento</Label>
              <Input
                value={form.numeroDocumento}
                onChange={e => set('numeroDocumento')(e.target.value)}
                placeholder="123456789"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input value={form.nombre} onChange={e => set('nombre')(e.target.value)} placeholder="Juan" />
            </div>
            <div className="space-y-1.5">
              <Label>Apellido</Label>
              <Input value={form.apellido} onChange={e => set('apellido')(e.target.value)} placeholder="Pérez" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={e => set('telefono')(e.target.value)} placeholder="3001234567" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="cliente@email.com" />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Tipo de cliente</Label>
                {esSuperadmin && !creandoTipo && (
                  <button
                    type="button"
                    onClick={() => setCreandoTipo(true)}
                    className="flex items-center gap-0.5 text-[11px] text-primary hover:underline"
                  >
                    <Plus className="size-3" /> Crear
                  </button>
                )}
              </div>
              <Select value={form.tipoClienteId} onValueChange={set('tipoClienteId')}>
                <SelectTrigger><SelectValue placeholder="Canal retail" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Canal retail (sin beneficios)</SelectItem>
                  {tipos.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre} ({t.descuentoPorcentaje}% dto)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nivel SISBEN</Label>
              <Select value={form.nivelSisben} onValueChange={set('nivelSisben')}>
                <SelectTrigger><SelectValue placeholder="No aplica" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No aplica</SelectItem>
                  <SelectItem value="1">Nivel 1</SelectItem>
                  <SelectItem value="2">Nivel 2</SelectItem>
                  <SelectItem value="3">Nivel 3</SelectItem>
                  <SelectItem value="4">Nivel 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {creandoTipo && (
            <NuevoTipoInline
              onCreado={id => {
                set('tipoClienteId')(String(id))
                setCreandoTipo(false)
              }}
              onCancel={() => setCreandoTipo(false)}
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={crear.isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Crear cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Panel de detalle ──────────────────────────────────────────────────────────

function ClienteDetalle({ c, onClose }: { c: Cliente; onClose: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col h-full border-l bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center size-10 rounded-full bg-primary/10">
            <User className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">{c.nombreCompleto}</p>
            <p className="text-xs text-muted-foreground">{c.tipoDocumento.replace(/_/g, ' ')}: {c.numeroDocumento}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Canal</p>
          <div className="flex items-center gap-2">
            <CanalBadge canal={c.canal} />
            {c.tipoCliente && (
              <span className="text-sm text-muted-foreground">{c.tipoCliente.descuentoPorcentaje}% de descuento</span>
            )}
          </div>
          {c.tipoCliente?.aplicaEstampillas && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 mt-1">
              <ShieldCheck className="size-3.5" /> Descuento aplica en estampillas
            </p>
          )}
          {c.tipoCliente?.aplicaGirosSisben && (
            <p className="flex items-center gap-1.5 text-xs text-emerald-700 mt-1">
              <ShieldCheck className="size-3.5" /> Descuento aplica en giros SISBEN
            </p>
          )}
        </div>
        <Separator />
        <div className="grid grid-cols-1 gap-3 text-sm">
          {c.email && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Email</p>
              <p>{c.email}</p>
            </div>
          )}
          {c.telefono && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Teléfono</p>
              <p>{c.telefono}</p>
            </div>
          )}
          {c.ciudad && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Ciudad</p>
              <p>{c.ciudad}{c.codigoPostal ? ` (${c.codigoPostal})` : ''}</p>
            </div>
          )}
          {c.nivelSisben && (
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Nivel SISBEN</p>
              <p>Nivel {c.nivelSisben} — {c.enviosSisbenAno} envíos este año</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-t">
        <Button
          variant="outline" size="sm" className="w-full gap-1.5"
          onClick={() => navigate(`/clientes/${c.id}`)}
        >
          Ver perfil completo <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [q, setQ]           = useState('')
  const [params, setParams] = useState({ nombre: '', offset: 0, limit: 30 })
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isFetching } = useSearchClientes(params)

  const search = useCallback(() => {
    setParams(p => ({ ...p, nombre: q.trim(), offset: 0 }))
    setSelected(null)
  }, [q])

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') search() }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Lista */}
      <div className={cn('flex flex-col h-full overflow-hidden', selected ? 'w-[55%]' : 'w-full')}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div>
            <h1 className="text-lg font-semibold">Clientes</h1>
            <p className="text-xs text-muted-foreground">
              Los clientes más recientes aparecen al abrir. Busca por nombre o documento.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" /> Nuevo
          </Button>
        </div>

        {/* Buscador */}
        <div className="px-5 py-3 border-b bg-muted/20">
          <div className="flex gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                className="pl-8 h-8 text-sm"
                placeholder="Nombre, apellido o número de documento…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={handleKey}
              />
            </div>
            <Button size="sm" onClick={search} disabled={isFetching} className="h-8">
              {isFetching ? <Loader2 className="size-3.5 animate-spin" /> : 'Buscar'}
            </Button>
          </div>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <Search className="size-8 opacity-30" />
              No hay clientes registrados aún
            </div>
          ) : data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
              <AlertCircle className="size-8 opacity-30" />
              No se encontraron clientes
            </div>
          ) : (
            <div>
              <p className="px-5 py-2 text-[11px] text-muted-foreground border-b">
                {params.nombre
                  ? `${data.total} resultado${data.total !== 1 ? 's' : ''}`
                  : `${data.total} cliente${data.total !== 1 ? 's' : ''} · más recientes primero`}
              </p>
              {data.items.map(c => (
                <ClienteRow
                  key={c.id} c={c}
                  onClick={() => setSelected(s => s?.id === c.id ? null : c)}
                />
              ))}
              {data.total > data.items.length && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setParams(p => ({ ...p, offset: p.offset + p.limit }))}
                  >
                    Ver más
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detalle */}
      {selected && (
        <div className="flex-1 overflow-hidden">
          <ClienteDetalle c={selected} onClose={() => setSelected(null)} />
        </div>
      )}

      <NuevoClienteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreado={c => { setDialogOpen(false); setSelected(c) }}
      />
    </div>
  )
}
