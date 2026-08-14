import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search, MapPin, Building2, Loader2, AlertCircle, CheckCircle2,
  CircleDashed, Settings, Unlock, Plus, UserPlus, Eye, EyeOff,
} from 'lucide-react'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Badge }        from '@/components/ui/badge'
import { Skeleton }     from '@/components/ui/skeleton'
import { Switch }       from '@/components/ui/switch'
import { Label }        from '@/components/ui/label'
import { Separator }    from '@/components/ui/separator'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  usePanelAdmin, useToggleServicioSucursal, useAbrirCajaDirecta,
  useCreateCajaPadre, useCreateCaja,
  type SucursalPanelItem,
} from '@/queries/cajas.queries'
import { useCreateUser } from '@/queries/users.queries'
import { ApiError } from '@/lib/api'

// ── Apertura dialog ───────────────────────────────────────────────────────────

function AperturaDialog({
  sucursal, open, onClose,
}: { sucursal: SucursalPanelItem | null; open: boolean; onClose: () => void }) {
  const [base, setBase] = useState('')
  const cajaId = sucursal?.cajaPos?.id ?? 0
  const abrir  = useAbrirCajaDirecta(cajaId)

  async function handleAbrir() {
    if (!base || isNaN(Number(base)) || Number(base) < 0) {
      toast.error('Ingresa un monto de base válido')
      return
    }
    try {
      await abrir.mutateAsync({ baseAsignada: base })
      toast.success(`Caja ${sucursal?.cajaPos?.codigo} aperturada`)
      setBase('')
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al aperturar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setBase(''); onClose() } }}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Aperturar caja</DialogTitle>
          <DialogDescription>
            {sucursal?.nombre} · Caja {sucursal?.cajaPos?.codigo}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label htmlFor="base">Base asignada ($)</Label>
          <Input
            id="base"
            type="number"
            min="0"
            step="1000"
            placeholder="0"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAbrir()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setBase(''); onClose() }}>Cancelar</Button>
          <Button onClick={handleAbrir} disabled={abrir.isPending}>
            {abrir.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Aperturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Crear caja principal dialog ───────────────────────────────────────────────

function CrearCajaPrincipalDialog({
  sucursal, open, onClose,
}: { sucursal: SucursalPanelItem | null; open: boolean; onClose: () => void }) {
  const [nombre,       setNombre]       = useState('')
  const [baseGeneral,  setBaseGeneral]  = useState('')
  const [loading,      setLoading]      = useState(false)

  const qc          = useQueryClient()
  const crearPadre  = useCreateCajaPadre()
  const crearCaja   = useCreateCaja()

  function reset() { setNombre(''); setBaseGeneral('') }

  async function handleCrear() {
    if (!sucursal) return
    const nombreFinal = nombre.trim() || `Caja Principal ${sucursal.nombre}`
    if (baseGeneral && (isNaN(Number(baseGeneral)) || Number(baseGeneral) < 0)) {
      toast.error('La base mínima debe ser un número válido')
      return
    }
    setLoading(true)
    try {
      const padre = await crearPadre.mutateAsync({
        sucursalId:  sucursal.sucursalId,
        nombre:      nombreFinal,
        baseGeneral: baseGeneral || '0',
      })
      await Promise.all([
        crearCaja.mutateAsync({
          sucursalId:  sucursal.sucursalId,
          cajaPadreId: padre.id,
          codigo:      `${sucursal.codigo}-GEN`,
          nombre:      'Caja Principal',
          tipo:        'general',
        }),
        crearCaja.mutateAsync({
          sucursalId:  sucursal.sucursalId,
          cajaPadreId: padre.id,
          codigo:      `${sucursal.codigo}-AUX`,
          nombre:      'Caja Auxiliar',
          tipo:        'pos',
        }),
      ])
      await qc.invalidateQueries({ queryKey: ['cajas', 'panel-admin'] })
      toast.success(`Caja principal creada para ${sucursal.nombre}`)
      reset()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al crear la caja principal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Crear caja principal</DialogTitle>
          <DialogDescription>
            {sucursal?.nombre} — se creará la caja fuerte y una caja auxiliar inicial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cp-nombre">Nombre</Label>
            <Input
              id="cp-nombre"
              placeholder={`Caja Principal ${sucursal?.nombre ?? ''}`}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-base">Base mínima ($)</Label>
            <Input
              id="cp-base"
              type="number"
              min="0"
              step="50000"
              placeholder="0"
              value={baseGeneral}
              onChange={(e) => setBaseGeneral(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Monto mínimo que debe tener la caja general del punto.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button onClick={handleCrear} disabled={loading}>
            {loading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Crear caja principal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Agregar cajero dialog ─────────────────────────────────────────────────────

function AgregarCajeroDialog({
  sucursal, open, onClose,
}: { sucursal: SucursalPanelItem | null; open: boolean; onClose: () => void }) {
  const [nombre,   setNombre]   = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  const crear = useCreateUser()

  function reset() { setNombre(''); setEmail(''); setPassword(''); setShowPwd(false) }

  async function handleCrear() {
    if (!sucursal) return
    if (!nombre.trim()) { toast.error('El nombre es requerido'); return }
    if (!email.trim())  { toast.error('El correo es requerido'); return }
    if (password.length < 8) { toast.error('La contraseña debe tener al menos 8 caracteres'); return }

    try {
      await crear.mutateAsync({
        nombre:      nombre.trim(),
        email:       email.trim().toLowerCase(),
        password,
        rol:         'CAJERO',
        sucursal_id: sucursal.sucursalId,
      })
      toast.success(`Cajero ${nombre.trim()} creado y asignado a ${sucursal.nombre}`)
      reset()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al crear el cajero')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Agregar cajero</DialogTitle>
          <DialogDescription>
            Se creará un usuario con rol CAJERO asignado a {sucursal?.nombre}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="caj-nombre">Nombre completo</Label>
            <Input
              id="caj-nombre"
              placeholder="Ej. María González"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caj-email">Correo electrónico</Label>
            <Input
              id="caj-email"
              type="email"
              placeholder="cajero@4-72.com.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="caj-pwd">Contraseña</Label>
            <div className="relative">
              <Input
                id="caj-pwd"
                type={showPwd ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button onClick={handleCrear} disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Crear cajero
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Panel lateral: servicios + apertura ───────────────────────────────────────

function SucursalSheet({
  sucursal, open, onClose, onApertura, onCrearCajaPrincipal, onAgregarCajero,
}: {
  sucursal: SucursalPanelItem | null
  open: boolean
  onClose: () => void
  onApertura: (s: SucursalPanelItem) => void
  onCrearCajaPrincipal: (s: SucursalPanelItem) => void
  onAgregarCajero: (s: SucursalPanelItem) => void
}) {
  const toggle = useToggleServicioSucursal()

  async function handleToggle(servicioId: number, activo: boolean) {
    if (!sucursal) return
    try {
      await toggle.mutateAsync({ sucursalId: sucursal.sucursalId, servicioId, activo })
      toast.success(activo ? 'Servicio activado' : 'Servicio desactivado')
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al actualizar')
    }
  }

  const cajaPos      = sucursal?.cajaPos ?? null
  const sesionActiva = cajaPos?.sesionActiva ?? false

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        {sucursal && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{sucursal.codigo}</Badge>
                {sucursal.nombre}
              </SheetTitle>
              <SheetDescription>
                <span className="flex items-center gap-1 text-xs">
                  <MapPin className="size-3" />
                  {[sucursal.ciudad, sucursal.departamento, sucursal.regional].filter(Boolean).join(' · ')}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {/* Caja auxiliar */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Caja auxiliar</p>
                {cajaPos ? (
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-mono font-semibold">{cajaPos.codigo}</p>
                      <p className="text-xs text-muted-foreground">{cajaPos.nombre}</p>
                    </div>
                    {sesionActiva ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1">
                        <CheckCircle2 className="size-3" />Abierta
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <CircleDashed className="size-3" />Cerrada
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => onApertura(sucursal)}
                        >
                          <Unlock className="size-3" />Aperturar
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Sin cajas configuradas</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 w-full h-8 text-xs"
                      onClick={() => { onClose(); onCrearCajaPrincipal(sucursal) }}
                    >
                      <Plus className="size-3" />Crear caja principal
                    </Button>
                  </div>
                )}
              </div>

              {/* Acciones de personal */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 w-full h-8 text-xs"
                  onClick={() => { onClose(); onAgregarCajero(sucursal) }}
                >
                  <UserPlus className="size-3" />Agregar cajero
                </Button>
              </div>

              <Separator />

              {/* Servicios */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Servicios habilitados
                </p>
                {sucursal.servicios.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay servicios configurados</p>
                ) : (
                  <div className="space-y-2">
                    {sucursal.servicios.map((srv) => (
                      <div key={srv.id} className="flex items-center justify-between gap-3 py-1">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{srv.nombre}</p>
                          <p className="text-xs text-muted-foreground">{srv.codigo}</p>
                        </div>
                        <Switch
                          checked={srv.activo}
                          disabled={toggle.isPending}
                          onCheckedChange={(v) => handleToggle(srv.id, v)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Tabla skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return Array.from({ length: 8 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 7 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function PuntoVentasAdmin() {
  const [buscar,              setBuscar]              = useState('')
  const [sheetTarget,         setSheetTarget]         = useState<SucursalPanelItem | null>(null)
  const [aperturaTarget,      setAperturaTarget]      = useState<SucursalPanelItem | null>(null)
  const [cajaPrincipalTarget, setCajaPrincipalTarget] = useState<SucursalPanelItem | null>(null)
  const [cajeroTarget,        setCajeroTarget]        = useState<SucursalPanelItem | null>(null)

  const { data, isLoading, isError } = usePanelAdmin()

  const sucursales = (data ?? []).filter((s) => {
    if (!buscar) return true
    const q = buscar.toLowerCase()
    return (
      s.nombre.toLowerCase().includes(q) ||
      s.codigo.toLowerCase().includes(q) ||
      (s.ciudad ?? '').toLowerCase().includes(q) ||
      (s.departamento ?? '').toLowerCase().includes(q) ||
      s.regional.toLowerCase().includes(q) ||
      (s.cajaPos?.codigo ?? '').includes(q)
    )
  })

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cajas auxiliares</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} sucursales` : 'Cargando...'} — cajas auxiliares, servicios y apertura diaria
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-9"
          placeholder="Buscar sucursal, código, ciudad…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Código</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Regional</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Dpto.</TableHead>
              <TableHead>Caja auxiliar</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar el panel.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sucursales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="size-8 opacity-30" />
                    <p className="text-sm">Sin resultados para "{buscar}"</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sucursales.map((s) => (
                <TableRow key={s.sucursalId} className="group">
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{s.codigo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.regional}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.ciudad ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.departamento ?? '—'}</TableCell>
                  <TableCell>
                    {s.cajaPos ? (
                      <span className="font-mono text-sm">{s.cajaPos.codigo}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.cajaPos?.sesionActiva ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1 text-xs">
                        <CheckCircle2 className="size-3" />Abierta
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
                        <CircleDashed className="size-3" />Cerrada
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {s.cajaPos && !s.cajaPos.sesionActiva && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-emerald-600"
                          title="Aperturar caja"
                          onClick={() => setAperturaTarget(s)}
                        >
                          <Unlock className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Configurar"
                        onClick={() => setSheetTarget(s)}
                      >
                        <Settings className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && !isError && data && (
          <div className="border-t px-4 py-2.5 text-xs text-muted-foreground tabular-nums">
            {sucursales.length} de {data.length} sucursales
            {data.filter((s) => s.cajaPos?.sesionActiva).length > 0 && (
              <span className="ml-3 text-emerald-600">
                · {data.filter((s) => s.cajaPos?.sesionActiva).length} abiertas
              </span>
            )}
          </div>
        )}
      </div>

      <SucursalSheet
        sucursal={sheetTarget}
        open={!!sheetTarget}
        onClose={() => setSheetTarget(null)}
        onApertura={(s) => { setSheetTarget(null); setAperturaTarget(s) }}
        onCrearCajaPrincipal={(s) => setCajaPrincipalTarget(s)}
        onAgregarCajero={(s) => setCajeroTarget(s)}
      />

      <AperturaDialog
        sucursal={aperturaTarget}
        open={!!aperturaTarget}
        onClose={() => setAperturaTarget(null)}
      />

      <CrearCajaPrincipalDialog
        sucursal={cajaPrincipalTarget}
        open={!!cajaPrincipalTarget}
        onClose={() => setCajaPrincipalTarget(null)}
      />

      <AgregarCajeroDialog
        sucursal={cajeroTarget}
        open={!!cajeroTarget}
        onClose={() => setCajeroTarget(null)}
      />
    </div>
  )
}
