import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, MoreHorizontal, Pencil, PowerOff, Trash2, Loader2,
  AlertCircle, Store, UserPlus, Search, ArrowRightLeft, Users,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRegional, useRegionales } from '@/queries/regionales.queries'
import {
  useSucursales, useUpdateSucursal, useDeleteSucursal,
} from '@/queries/sucursales.queries'
import {
  useUsers, useUsersBySucursales, useUpdateUser, useDeleteUser,
} from '@/queries/users.queries'
import { rolLabels } from '@/components/layout/AppSidebar'
import { SucursalForm } from './Sucursales'
import { UserForm } from './Users'
import type { SucursalResponse, UserResponse } from '@/types/api'
import { ApiError } from '@/lib/api'

function mensaje(e: unknown) {
  return e instanceof ApiError ? e.message : 'Error inesperado'
}

function FilasSkeleton({ cols }: { cols: number }) {
  return Array.from({ length: 4 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

function Seccion({
  titulo, descripcion, accion, children,
}: {
  titulo: string
  descripcion: string
  accion?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="border rounded-xl overflow-hidden">
      <header className="flex items-start justify-between gap-4 border-b bg-muted/30 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{descripcion}</p>
        </div>
        {accion}
      </header>
      {children}
    </section>
  )
}

function Buscador({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative w-72">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input className="pl-9 h-9" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

// ── Mover una sucursal a otra regional ────────────────────────────────────────
// Sigue siendo un diálogo porque regional_id es obligatorio: sacar una sucursal
// de aquí exige elegir a dónde va.

function MoverSucursalDialog({
  sucursal, regionalId, onClose,
}: { sucursal: SucursalResponse | null; regionalId: number; onClose: () => void }) {
  const [destino, setDestino] = useState('')
  const { data } = useRegionales({ activo: true, limite: 200 })
  const update = useUpdateSucursal()
  const destinos = (data?.datos ?? []).filter((r) => r.id !== regionalId)

  async function confirmar() {
    if (!sucursal || !destino) return
    try {
      await update.mutateAsync({ id: sucursal.id, data: { regional_id: Number(destino) } })
      toast.success('Sucursal movida')
      setDestino(''); onClose()
    } catch (e) {
      toast.error(mensaje(e))
    }
  }

  return (
    <Dialog open={!!sucursal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover a otra regional</DialogTitle>
          <DialogDescription>
            {sucursal?.nombre} saldrá de esta regional y quedará bajo la que elijas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Regional destino</Label>
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar regional" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {destinos.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.nombre} — {r.comercio?.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!destino || update.isPending}>
            {update.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Sucursales de otras regionales, siempre a la vista ────────────────────────

function SucursalesDisponibles({ regionalId, regionalNombre }: {
  regionalId: number; regionalNombre: string
}) {
  const [buscar, setBuscar] = useState('')
  const [asignando, setAsignando] = useState<number | null>(null)
  const { data, isLoading } = useSucursales({ buscar: buscar || undefined, limite: 200 })
  const update = useUpdateSucursal()

  const disponibles = (data?.datos ?? []).filter((s) => s.regionalId !== regionalId)

  async function asignar(s: SucursalResponse) {
    setAsignando(s.id)
    try {
      await update.mutateAsync({ id: s.id, data: { regional_id: regionalId } })
      toast.success(`${s.nombre} ahora pertenece a ${regionalNombre}`)
    } catch (e) {
      toast.error(mensaje(e))
    } finally {
      setAsignando(null)
    }
  }

  return (
    <Seccion
      titulo="Sucursales disponibles"
      descripcion={`Pertenecen a otra regional. Al asignarlas se trasladan a ${regionalNombre} con sus cajas y usuarios.`}
      accion={<Buscador value={buscar} onChange={setBuscar} placeholder="Buscar por código o nombre…" />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Regional actual</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? <FilasSkeleton cols={6} /> : disponibles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                {buscar ? 'Ninguna sucursal coincide con la búsqueda.' : 'No hay sucursales fuera de esta regional.'}
              </TableCell>
            </TableRow>
          ) : disponibles.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-sm">{s.codigo}</TableCell>
              <TableCell className="font-medium">{s.nombre}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{s.regional?.nombre ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{s.ciudad?.nombre ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={s.activo ? 'default' : 'secondary'}>{s.activo ? 'Activa' : 'Inactiva'}</Badge>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => asignar(s)} disabled={asignando === s.id}>
                  {asignando === s.id && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Asignar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Seccion>
  )
}

// ── Usuarios fuera de la regional, siempre a la vista ─────────────────────────

function UsuariosDisponibles({ sucursales }: { sucursales: SucursalResponse[] }) {
  const [buscar,    setBuscar]    = useState('')
  const [destino,   setDestino]   = useState('')
  const [asignando, setAsignando] = useState<number | null>(null)
  const { data, isLoading } = useUsers({ buscar: buscar || undefined, activo: true, limite: 100 })
  const update = useUpdateUser()

  const idsRegional = new Set(sucursales.map((s) => s.id))
  const disponibles = (data?.datos ?? []).filter(
    (u) => u.sucursal === null || !idsRegional.has(u.sucursal.id),
  )
  const sucursalDestino = sucursales.find((s) => String(s.id) === destino)

  async function asignar(u: UserResponse) {
    if (!sucursalDestino) return
    setAsignando(u.id)
    try {
      await update.mutateAsync({ id: u.id, data: { sucursal_id: sucursalDestino.id } })
      toast.success(`${u.nombre} asignado a ${sucursalDestino.nombre}`)
    } catch (e) {
      toast.error(mensaje(e))
    } finally {
      setAsignando(null)
    }
  }

  return (
    <Seccion
      titulo="Usuarios disponibles"
      descripcion="Sin sucursal o destacados en otra regional. Elige la sucursal destino y asígnalos."
      accion={
        <div className="flex items-center gap-2">
          <Buscador value={buscar} onChange={setBuscar} placeholder="Buscar por nombre o correo…" />
          <Select value={destino} onValueChange={setDestino}>
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="Sucursal destino" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.codigo} — {s.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Sucursal actual</TableHead>
            <TableHead className="w-28" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? <FilasSkeleton cols={5} /> : disponibles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                {buscar ? 'Ningún usuario coincide con la búsqueda.' : 'No hay usuarios fuera de esta regional.'}
              </TableCell>
            </TableRow>
          ) : disponibles.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.nombre}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
              <TableCell><Badge variant="outline">{rolLabels[u.rol] ?? u.rol}</Badge></TableCell>
              <TableCell className="text-muted-foreground text-sm">{u.sucursal?.nombre ?? 'Sin sucursal'}</TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => asignar(u)}
                  disabled={!sucursalDestino || asignando === u.id}
                  title={sucursalDestino ? undefined : 'Elige primero la sucursal destino'}
                >
                  {asignando === u.id && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Asignar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Seccion>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function RegionalDetallePage() {
  const { regionalId } = useParams<{ regionalId: string }>()
  const id = Number(regionalId)

  const { data: regional, isLoading: cargandoRegional } = useRegional(id)
  const { data: sucursalesData, isLoading: cargandoSucursales, isError: errorSucursales } =
    useSucursales({ regional_id: id, limite: 200 })

  const sucursales = useMemo(() => sucursalesData?.datos ?? [], [sucursalesData])
  const idsSucursales = useMemo(() => sucursales.map((s) => s.id), [sucursales])
  const usuarios = useUsersBySucursales(idsSucursales)

  const [formSucursal, setFormSucursal] = useState(false)
  const [editSucursal, setEditSucursal] = useState<SucursalResponse | null>(null)
  const [moverSuc,     setMoverSuc]     = useState<SucursalResponse | null>(null)
  const [toggleSuc,    setToggleSuc]    = useState<SucursalResponse | null>(null)
  const [borrarSuc,    setBorrarSuc]    = useState<SucursalResponse | null>(null)

  const [formUsuario, setFormUsuario] = useState(false)
  const [editUsuario, setEditUsuario] = useState<UserResponse | null>(null)
  const [borrarUsr,   setBorrarUsr]   = useState<UserResponse | null>(null)

  const updateSucursal = useUpdateSucursal()
  const deleteSucursal = useDeleteSucursal()
  const updateUsuario  = useUpdateUser()
  const deleteUsuario  = useDeleteUser()

  const nombreRegional = regional?.nombre ?? 'esta regional'

  const nombreSucursal = (sucursalId: number | null | undefined) =>
    sucursales.find((s) => s.id === sucursalId)?.nombre ?? '—'

  async function confirmarToggleSucursal() {
    if (!toggleSuc) return
    try {
      await updateSucursal.mutateAsync({ id: toggleSuc.id, data: { activo: !toggleSuc.activo } })
      toast.success(toggleSuc.activo ? 'Sucursal desactivada' : 'Sucursal activada')
      setToggleSuc(null)
    } catch (e) { toast.error(mensaje(e)) }
  }

  async function confirmarBorrarSucursal() {
    if (!borrarSuc) return
    try {
      await deleteSucursal.mutateAsync(borrarSuc.id)
      toast.success('Sucursal eliminada de la regional')
      setBorrarSuc(null)
    } catch (e) { toast.error(mensaje(e)) }
  }

  async function desvincularUsuario(u: UserResponse) {
    try {
      await updateUsuario.mutateAsync({ id: u.id, data: { sucursal_id: null } })
      toast.success('Usuario desvinculado de la regional')
    } catch (e) { toast.error(mensaje(e)) }
  }

  async function confirmarBorrarUsuario() {
    if (!borrarUsr) return
    try {
      await deleteUsuario.mutateAsync(borrarUsr.id)
      toast.success('Usuario eliminado')
      setBorrarUsr(null)
    } catch (e) { toast.error(mensaje(e)) }
  }

  if (!cargandoRegional && !regional) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
          <AlertCircle className="size-8 opacity-40" />
          <p className="text-sm">La regional no existe o fue eliminada.</p>
          <Button variant="outline" asChild><Link to="/admin/regionales">Volver a regionales</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="-ml-2 h-7 text-muted-foreground" asChild>
            <Link to="/admin/regionales"><ArrowLeft className="mr-1.5 size-3.5" />Regionales</Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {cargandoRegional ? <Skeleton className="h-8 w-64" /> : regional?.nombre}
          </h1>
          <p className="text-sm text-muted-foreground">
            {regional?.codigo} · {regional?.comercio?.nombre ?? 'sin comercio'} ·{' '}
            {sucursales.length} sucursal{sucursales.length === 1 ? '' : 'es'} ·{' '}
            {usuarios.datos.length} usuario{usuarios.datos.length === 1 ? '' : 's'}
          </p>
        </div>
        {regional && !regional.activo && <Badge variant="secondary">Regional inactiva</Badge>}
      </div>

      <Tabs defaultValue="sucursales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
        </TabsList>

        {/* ── Sucursales ─────────────────────────────────────────────────── */}
        <TabsContent value="sucursales" className="space-y-4">
          <Seccion
            titulo={`Sucursales de ${nombreRegional}`}
            descripcion="Puntos de atención que operan bajo esta regional."
            accion={
              <Button size="sm" onClick={() => { setEditSucursal(null); setFormSucursal(true) }}>
                <Plus className="mr-1.5 size-4" />Nueva sucursal
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cargandoSucursales ? <FilasSkeleton cols={6} /> : errorSucursales ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No se pudo cargar la lista de sucursales.
                    </TableCell>
                  </TableRow>
                ) : sucursales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-14 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Store className="size-8 opacity-30" />
                        <p className="text-sm">
                          Esta regional aún no tiene sucursales. Crea una nueva o asigna alguna de las de abajo.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sucursales.map((s) => (
                  <TableRow key={s.id} className="group">
                    <TableCell className="font-mono text-sm">{s.codigo}</TableCell>
                    <TableCell className="font-medium">{s.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.ciudad?.nombre ?? '—'}</TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {usuarios.datos.filter((u) => u.sucursal?.id === s.id).length}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.activo ? 'default' : 'secondary'}>{s.activo ? 'Activa' : 'Inactiva'}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditSucursal(s); setFormSucursal(true) }}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMoverSuc(s)}>
                            <ArrowRightLeft className="mr-2 size-3.5" />Mover a otra regional
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setToggleSuc(s)}>
                            <PowerOff className="mr-2 size-3.5" />{s.activo ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setBorrarSuc(s)}
                          >
                            <Trash2 className="mr-2 size-3.5" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>

          <SucursalesDisponibles regionalId={id} regionalNombre={nombreRegional} />
        </TabsContent>

        {/* ── Usuarios ───────────────────────────────────────────────────── */}
        <TabsContent value="usuarios" className="space-y-4">
          <Seccion
            titulo={`Usuarios de ${nombreRegional}`}
            descripcion="Destacados en alguna sucursal de esta regional."
            accion={
              <Button
                size="sm"
                onClick={() => { setEditUsuario(null); setFormUsuario(true) }}
                disabled={sucursales.length === 0}
              >
                <UserPlus className="mr-1.5 size-4" />Nuevo usuario
              </Button>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.isLoading ? <FilasSkeleton cols={6} /> : usuarios.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No se pudo cargar la lista de usuarios.
                    </TableCell>
                  </TableRow>
                ) : usuarios.datos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-14 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="size-8 opacity-30" />
                        <p className="text-sm">
                          {sucursales.length === 0
                            ? 'Crea una sucursal antes de asignar usuarios.'
                            : 'Ninguna sucursal de esta regional tiene usuarios.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : usuarios.datos.map((u) => (
                  <TableRow key={u.id} className="group">
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{rolLabels[u.rol] ?? u.rol}</Badge></TableCell>
                    <TableCell className="text-sm">{nombreSucursal(u.sucursal?.id)}</TableCell>
                    <TableCell>
                      <Badge variant={u.activo ? 'default' : 'secondary'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditUsuario(u); setFormUsuario(true) }}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => desvincularUsuario(u)}>
                            <ArrowRightLeft className="mr-2 size-3.5" />Quitar de la regional
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setBorrarUsr(u)}
                          >
                            <Trash2 className="mr-2 size-3.5" />Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Seccion>

          <UsuariosDisponibles sucursales={sucursales} />
        </TabsContent>
      </Tabs>

      <SucursalForm
        sucursal={editSucursal}
        regionalId={id}
        open={formSucursal}
        onClose={() => { setFormSucursal(false); setEditSucursal(null) }}
      />
      <MoverSucursalDialog sucursal={moverSuc} regionalId={id} onClose={() => setMoverSuc(null)} />

      <UserForm
        user={editUsuario}
        sucursales={sucursales}
        open={formUsuario}
        onClose={() => { setFormUsuario(false); setEditUsuario(null) }}
      />

      <Dialog open={!!toggleSuc} onOpenChange={(v) => !v && setToggleSuc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleSuc?.activo ? 'Desactivar sucursal' : 'Activar sucursal'}</DialogTitle>
            <DialogDescription>
              {toggleSuc?.activo
                ? `"${toggleSuc?.nombre}" dejará de operar, pero sigue en la regional.`
                : `"${toggleSuc?.nombre}" volverá a operar.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleSuc(null)}>Cancelar</Button>
            <Button
              variant={toggleSuc?.activo ? 'destructive' : 'default'}
              onClick={confirmarToggleSucursal}
              disabled={updateSucursal.isPending}
            >
              {updateSucursal.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {toggleSuc?.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!borrarSuc} onOpenChange={(v) => !v && setBorrarSuc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar sucursal</DialogTitle>
            <DialogDescription>
              "{borrarSuc?.nombre}" se marca como eliminada y desaparece de los listados; el histórico
              de sus cajas se conserva. El backend rechaza la operación si aún tiene usuarios activos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrarSuc(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarBorrarSucursal} disabled={deleteSucursal.isPending}>
              {deleteSucursal.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!borrarUsr} onOpenChange={(v) => !v && setBorrarUsr(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              "{borrarUsr?.nombre}" se marca como eliminado y no podrá iniciar sesión. Si solo quieres
              sacarlo de la regional, usa "Quitar de la regional".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrarUsr(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmarBorrarUsuario} disabled={deleteUsuario.isPending}>
              {deleteUsuario.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
