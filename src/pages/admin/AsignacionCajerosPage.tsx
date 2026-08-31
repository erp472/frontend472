import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useRegionales } from '@/queries/regionales.queries'
import { useSucursales } from '@/queries/sucursales.queries'
import { useUsers, useUpdateUser } from '@/queries/users.queries'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  MapPin, Store, UserRound, Vault, Monitor, X, Plus, ChevronRight,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CajaAsignacionSesion {
  sesionId:         number
  estado:           'abierta' | 'cerrada'
  supervisorId:     number
  supervisorNombre: string
  cajeroId:         number | null
  cajeroNombre:     string | null
  cajeroEmail:      string | null
  fechaApertura:    string
}

interface CajaAsignacion {
  id:                 number
  codigo:             string
  nombre:             string
  tipo:               'general' | 'pos' | 'menor' | 'pagos'
  activo:             boolean
  cajeroFijoId:       number | null
  cajeroFijoNombre:   string | null
  cajeroFijoEmail:    string | null
  sesionActiva:       CajaAsignacionSesion | null
}

interface AsignacionSucursal {
  cajaPadreId:     number | null
  cajaPadreNombre: string | null
  cajas:           CajaAsignacion[]
}

// ── Queries ───────────────────────────────────────────────────────────────────

const ASIG_KEYS = {
  sucursal: (id: number) => ['cajas', 'asignacion', 'sucursal', id] as const,
}

function useAsignacionSucursal(sucursalId: number | null) {
  return useQuery({
    queryKey: ASIG_KEYS.sucursal(sucursalId ?? 0),
    queryFn:  () => apiFetch<AsignacionSucursal>(`/cajas/asignacion/sucursal/${sucursalId}`),
    enabled:  sucursalId != null,
  })
}

function useSetCajeroAsignado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sesionId, cajeroId }: { sesionId: number; cajeroId: number | null }) =>
      apiFetch<unknown>(`/cajas/sesiones/${sesionId}/cajero-asignado`, {
        method: 'PATCH',
        body:   JSON.stringify({ cajeroId }),
      }),
    onSuccess: (_, { cajeroId }) => {
      qc.invalidateQueries({ queryKey: ['cajas', 'asignacion'] })
      qc.invalidateQueries({ queryKey: ['cajas'] })
      toast.success(cajeroId ? 'Cajero asignado a la sesión' : 'Cajero retirado de la sesión')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

function useSetCajeroFijo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cajaId, cajeroId }: { cajaId: number; cajeroId: number | null }) =>
      apiFetch<unknown>(`/cajas/auxiliares/${cajaId}/cajero-fijo`, {
        method: 'PATCH',
        body:   JSON.stringify({ cajeroId }),
      }),
    onSuccess: (_, { cajeroId }) => {
      qc.invalidateQueries({ queryKey: ['cajas', 'asignacion'] })
      toast.success(cajeroId ? 'Cajero fijo asignado' : 'Cajero fijo removido')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const tipoBadge: Record<string, string> = {
  pos:    'bg-blue-100 text-blue-800',
  general: 'bg-green-100 text-green-800',
  menor:  'bg-yellow-100 text-yellow-800',
  pagos:  'bg-purple-100 text-purple-800',
}

const tipoLabel: Record<string, string> = {
  pos:    'POS',
  general: 'Caja fuerte',
  menor:  'Menor',
  pagos:  'Pagos',
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function CajaCard({
  caja, cajerosDeSucursal,
}: {
  caja:              CajaAsignacion
  cajerosDeSucursal: { id: number; nombre: string; email: string }[]
}) {
  const setAsig  = useSetCajeroAsignado()
  const setFijo  = useSetCajeroFijo()
  const [openSesion, setOpenSesion] = useState(false)
  const [openFijo,   setOpenFijo]   = useState(false)

  const sesion    = caja.sesionActiva
  const esPOS     = caja.tipo === 'pos'

  function handleRetiroSesion() {
    if (!sesion) return
    if (!confirm(`¿Retirar cajero de la sesión de "${caja.nombre}"?`)) return
    setAsig.mutate({ sesionId: sesion.sesionId, cajeroId: null })
  }

  function handleAsignarSesion(cajeroId: number) {
    if (!sesion) return
    setAsig.mutate({ sesionId: sesion.sesionId, cajeroId }, { onSuccess: () => setOpenSesion(false) })
  }

  function handleAsignarFijo(cajeroId: number) {
    setFijo.mutate({ cajaId: caja.id, cajeroId }, { onSuccess: () => setOpenFijo(false) })
  }

  function handleRetirarFijo() {
    if (!confirm(`¿Remover cajero fijo de "${caja.nombre}"?`)) return
    setFijo.mutate({ cajaId: caja.id, cajeroId: null })
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Monitor className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-sm truncate">{caja.nombre}</span>
          <span className="font-mono text-xs text-muted-foreground">{caja.codigo}</span>
        </div>
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', tipoBadge[caja.tipo])}>
          {tipoLabel[caja.tipo]}
        </span>
      </div>

      {/* Cajero fijo (solo POS) */}
      {esPOS && (
        <div className="rounded-md bg-muted/40 px-2.5 py-1.5 space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cajero asignado</p>
          {caja.cajeroFijoId ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserRound className="size-3.5 shrink-0 text-primary" />
                <span className="text-xs font-medium truncate">{caja.cajeroFijoNombre}</span>
                <span className="text-[10px] text-muted-foreground truncate">{caja.cajeroFijoEmail}</span>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="size-5 text-muted-foreground" title="Cambiar" onClick={() => setOpenFijo(true)} disabled={setFijo.isPending}>
                  <Plus className="size-3" />
                </Button>
                <Button size="icon" variant="ghost" className="size-5 text-destructive hover:text-destructive" title="Remover" onClick={handleRetirarFijo} disabled={setFijo.isPending}>
                  <X className="size-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground italic">Sin cajero asignado</span>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setOpenFijo(true)}>
                <Plus className="size-3 mr-1" />Asignar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sesión activa */}
      {!sesion ? (
        <p className="text-xs text-muted-foreground italic">Sin sesión activa</p>
      ) : (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Supervisor: <span className="text-foreground font-medium">{sesion.supervisorNombre}</span>
          </div>
          {sesion.cajeroId ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <UserRound className="size-3.5 shrink-0 text-green-600" />
                <span className="text-xs font-medium truncate">{sesion.cajeroNombre}</span>
                <span className="text-[10px] text-muted-foreground truncate">{sesion.cajeroEmail}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="size-6 shrink-0 text-destructive hover:text-destructive"
                onClick={handleRetiroSesion}
                disabled={setAsig.isPending}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            esPOS && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground italic">Sin cajero en sesión</span>
                <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setOpenSesion(true)}>
                  <Plus className="size-3 mr-1" />
                  Asignar a sesión
                </Button>
              </div>
            )
          )}
        </div>
      )}

      {/* Picker — cajero fijo */}
      <Dialog open={openFijo} onOpenChange={setOpenFijo}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Cajero fijo para {caja.nombre}</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar cajero…" />
            <CommandList>
              <CommandEmpty>Sin cajeros en esta sucursal</CommandEmpty>
              <CommandGroup>
                {cajerosDeSucursal.map(c => (
                  <CommandItem
                    key={c.id}
                    value={`${c.nombre} ${c.email}`}
                    onSelect={() => handleAsignarFijo(c.id)}
                    className="cursor-pointer"
                  >
                    <UserRound className="size-4 mr-2" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{c.nombre}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFijo(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Picker — cajero de sesión activa */}
      <Dialog open={openSesion} onOpenChange={setOpenSesion}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Asignar cajero a sesión de {caja.nombre}</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar cajero…" />
            <CommandList>
              <CommandEmpty>Sin cajeros en esta sucursal</CommandEmpty>
              <CommandGroup>
                {cajerosDeSucursal.map(c => (
                  <CommandItem
                    key={c.id}
                    value={`${c.nombre} ${c.email}`}
                    onSelect={() => handleAsignarSesion(c.id)}
                    className="cursor-pointer"
                  >
                    <UserRound className="size-4 mr-2" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{c.nombre}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSesion(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Panel de sucursal ─────────────────────────────────────────────────────────

function SucursalPanel({ sucursalId, sucursalNombre }: { sucursalId: number; sucursalNombre: string }) {
  const qc            = useQueryClient()
  const updateUser    = useUpdateUser()
  const { data: asig, isLoading: loadingCajas } = useAsignacionSucursal(sucursalId)

  // Cajeros ya en esta sucursal
  const { data: pageData, isLoading: loadingCajeros } = useUsers({
    rol:        'CAJERO',
    sucursal_id: sucursalId,
    limite:     50,
  })
  const cajeros = pageData?.datos ?? []

  // Cajeros sin sucursal o de otras sucursales (para el picker de agregar)
  const { data: libres } = useUsers({ rol: 'CAJERO', activo: true, limite: 100 })
  const [pickerOpen, setPickerOpen] = useState(false)

  function handleAgregar(userId: number) {
    updateUser.mutate(
      { id: userId, data: { sucursal_id: sucursalId } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['users'] })
          setPickerOpen(false)
          toast.success('Cajero asignado a la sucursal')
        },
        onError: (e: Error) => toast.error(e.message),
      },
    )
  }

  function handleRetirar(userId: number, nombre: string) {
    if (!confirm(`¿Retirar a ${nombre} de esta sucursal?`)) return
    updateUser.mutate(
      { id: userId, data: { sucursal_id: null } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ['users'] })
          toast.success('Cajero retirado de la sucursal')
        },
        onError: (e: Error) => toast.error(e.message),
      },
    )
  }

  const cajerosDeSucursal = cajeros.map(c => ({ id: c.id, nombre: c.nombre, email: c.email }))
  const libresParaPicker  = (libres?.datos ?? []).filter(u => u.sucursal?.id !== sucursalId)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Store className="size-5 text-primary" />
          {sucursalNombre}
        </h2>
        <p className="text-sm text-muted-foreground">Gestión de cajeros y cajas</p>
      </div>

      {/* ── Cajeros de la sucursal ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserRound className="size-4" />
              Cajeros asignados
              {!loadingCajeros && (
                <Badge variant="secondary">{cajeros.length}</Badge>
              )}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <Plus className="size-3.5 mr-1" />
              Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingCajeros ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : cajeros.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No hay cajeros asignados a esta sucursal
            </p>
          ) : (
            <div className="space-y-2">
              {cajeros.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserRound className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{c.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                    </div>
                    {!c.activo && <Badge variant="destructive" className="text-[10px] px-1 py-0">Inactivo</Badge>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleRetirar(c.id, c.nombre)}
                    disabled={updateUser.isPending}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Cajas ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Vault className="size-4" />
            {asig?.cajaPadreNombre ?? 'Cajas'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingCajas ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !asig || asig.cajas.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No hay cajas configuradas en esta sucursal
            </p>
          ) : (
            <div className="space-y-2">
              {asig.cajas.map(caja => (
                <CajaCard
                  key={caja.id}
                  caja={caja}
                  cajerosDeSucursal={cajerosDeSucursal}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Picker de cajeros libres */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Agregar cajero a {sucursalNombre}</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar por nombre o email…" />
            <CommandList className="max-h-56">
              <CommandEmpty>Sin cajeros disponibles</CommandEmpty>
              <CommandGroup>
                {libresParaPicker.map(u => (
                  <CommandItem
                    key={u.id}
                    value={`${u.nombre} ${u.email}`}
                    onSelect={() => handleAgregar(u.id)}
                    className="cursor-pointer"
                  >
                    <UserRound className="size-4 mr-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{u.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {u.email}
                        {u.sucursal && (
                          <span className="ml-1 text-amber-600">(en {u.sucursal.nombre})</span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AsignacionCajerosPage() {
  const [regionalId,  setRegionalId]  = useState<number | null>(null)
  const [sucursalId,  setSucursalId]  = useState<number | null>(null)
  const [sucursalNombre, setSucursalNombre] = useState('')

  const { data: regsPage, isLoading: loadingRegs } = useRegionales({ activo: true, limite: 100 })
  const regionales = regsPage?.datos ?? []

  const { data: sucsPage, isLoading: loadingSucs } = useSucursales({
    regional_id: regionalId ?? undefined,
    activo:      true,
    limite:      100,
  })
  const sucursales = sucsPage?.datos ?? []

  function handleRegional(id: number) {
    setRegionalId(id)
    setSucursalId(null)
    setSucursalNombre('')
  }

  function handleSucursal(id: number, nombre: string) {
    setSucursalId(id)
    setSucursalNombre(nombre)
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Asignación de cajeros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestiona qué cajeros pertenecen a cada sucursal y cuáles están operando en cada caja.
        </p>
      </div>

      <div className="grid grid-cols-[220px_220px_1fr] gap-4 items-start">

        {/* ── Col 1: Regionales ── */}
        <Card className="sticky top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <MapPin className="size-4" />
              Regionales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {loadingRegs ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="p-1">
                  {regionales.map(r => (
                    <button
                      key={r.id}
                      onClick={() => handleRegional(r.id)}
                      className={cn(
                        'w-full text-left text-sm px-3 py-2 rounded-md flex items-center justify-between gap-2 transition-colors',
                        regionalId === r.id
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted',
                      )}
                    >
                      <span className="truncate">{r.nombre}</span>
                      <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Col 2: Sucursales ── */}
        <Card className="sticky top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Store className="size-4" />
              Sucursales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-220px)]">
              {!regionalId ? (
                <p className="text-xs text-muted-foreground text-center py-8 px-3">
                  Selecciona una regional
                </p>
              ) : loadingSucs ? (
                <div className="p-3 space-y-2">
                  {[1, 2].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : sucursales.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8 px-3">
                  Sin sucursales activas
                </p>
              ) : (
                <div className="p-1">
                  {sucursales.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSucursal(s.id, s.nombre)}
                      className={cn(
                        'w-full text-left text-sm px-3 py-2 rounded-md flex items-center justify-between gap-2 transition-colors',
                        sucursalId === s.id
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'hover:bg-muted',
                      )}
                    >
                      <span className="truncate">{s.nombre}</span>
                      <ChevronRight className="size-3.5 shrink-0 opacity-60" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Col 3: Panel ── */}
        <div>
          {!sucursalId ? (
            <div className="flex min-h-[200px] items-center justify-center text-center p-8">
              <div className="space-y-2">
                <Store className="size-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Selecciona una regional y una sucursal para gestionar sus cajeros y cajas
                </p>
              </div>
            </div>
          ) : (
            <SucursalPanel sucursalId={sucursalId} sucursalNombre={sucursalNombre} />
          )}
        </div>
      </div>
    </div>
  )
}
