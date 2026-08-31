import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { useRegionales } from '@/queries/regionales.queries'
import { useSucursales } from '@/queries/sucursales.queries'
import { useUsers } from '@/queries/users.queries'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'
import {
  MapPin, Store, UserRound, Vault, Monitor, X, Plus, ChevronRight, ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import { useDiagnosticoPunto, esCajaOperativa, type ProblemaPunto } from '@/queries/cajas.queries'
import { DesglosePunto } from '@/components/DesglosePunto'

const TIPO_BOLSILLO: Record<string, string> = { general: 'Caja Fuerte', menor: 'Caja Menor' }

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface CajaAsignacion {
  id:               number
  codigo:           string
  nombre:           string
  tipo:             'general' | 'pos' | 'menor' | 'pagos'
  activo:           boolean
  cajeroFijoId:     number | null
  cajeroFijoNombre: string | null
  cajeroFijoEmail:  string | null
  sesionActiva: {
    sesionId:         number
    estado:           'abierta'
    supervisorId:     number
    supervisorNombre: string
    cajeroId:         number | null
    cajeroNombre:     string | null
    cajeroEmail:      string | null
    fechaApertura:    string
  } | null
}

interface AsignacionSucursal {
  cajaPadreId:      number | null
  cajaPadreNombre:  string | null
  supervisorId:     number | null
  supervisorNombre: string | null
  supervisorEmail:  string | null
  cajas:            CajaAsignacion[]
}

// ── Queries / Mutations ───────────────────────────────────────────────────────

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

function useSetSupervisor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cajaPadreId, supervisorId }: { cajaPadreId: number; supervisorId: number | null }) =>
      apiFetch<unknown>(`/cajas/principales/${cajaPadreId}/supervisor`, {
        method: 'PATCH',
        body:   JSON.stringify({ supervisorId }),
      }),
    onSuccess: (_, { supervisorId }) => {
      qc.invalidateQueries({ queryKey: ['cajas', 'asignacion'] })
      qc.invalidateQueries({ queryKey: ['cajas'] })
      toast.success(supervisorId ? 'Supervisor asignado al punto' : 'Supervisor removido del punto')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Subcomponente: Fila de supervisor ─────────────────────────────────────────

const PROBLEMA_TEXTO: Record<ProblemaPunto, string> = {
  sin_caja_fuerte:          'El punto no tiene Caja Fuerte configurada.',
  sin_supervisor:           'El punto no tiene supervisor asignado.',
  base_fuerte_excede_punto: 'El fondo de la Caja Fuerte supera la base asignada al punto.',
  reparto_excede_fuerte:    'Las cajas del punto tienen asignado más de lo que custodia la Caja Fuerte.',
}

function DiagnosticoBanner({ cajaPadreId }: { cajaPadreId: number }) {
  const { data } = useDiagnosticoPunto(cajaPadreId)
  if (!data || data.problemas.length === 0) return null

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
      <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
        <TriangleAlert className="size-4" />
        Configuración incoherente
      </p>
      <ul className="space-y-1">
        {data.problemas.map(p => (
          <li key={p} className="text-xs text-muted-foreground">· {PROBLEMA_TEXTO[p]}</li>
        ))}
      </ul>
      <DesglosePunto data={data} className="pt-1" />
    </div>
  )
}

function SupervisorRow({
  cajaPadreId,
  sucursalId,
  supervisorId,
  supervisorNombre,
  supervisorEmail,
}: {
  cajaPadreId:      number
  sucursalId:       number
  supervisorId:     number | null
  supervisorNombre: string | null
  supervisorEmail:  string | null
}) {
  const setSupervisor = useSetSupervisor()
  const [open, setOpen] = useState(false)

  // El backend exige un SUPERVISOR_REGIONAL destacado en la sucursal del punto
  const { data: page } = useUsers({
    rol: 'SUPERVISOR_REGIONAL', activo: true, limite: 100, sucursal_id: sucursalId,
  })
  const supervisores = page?.datos ?? []

  function handleAsignar(id: number) {
    setSupervisor.mutate({ cajaPadreId, supervisorId: id }, { onSuccess: () => setOpen(false) })
  }

  function handleRetirar() {
    if (!confirm('¿Retirar supervisor de este punto?')) return
    setSupervisor.mutate({ cajaPadreId, supervisorId: null })
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide flex items-center gap-1">
        <ShieldCheck className="size-3" />
        Supervisor del punto
      </p>
      {supervisorId ? (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserRound className="size-4 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{supervisorNombre}</div>
              <div className="text-xs text-muted-foreground truncate">{supervisorEmail}</div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="size-6 text-muted-foreground" title="Cambiar" onClick={() => setOpen(true)} disabled={setSupervisor.isPending}>
              <Plus className="size-3" />
            </Button>
            <Button size="icon" variant="ghost" className="size-6 text-destructive hover:text-destructive" title="Retirar" onClick={handleRetirar} disabled={setSupervisor.isPending}>
              <X className="size-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground italic">Sin supervisor asignado</span>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2 border-amber-300 hover:bg-amber-100" onClick={() => setOpen(true)}>
            <Plus className="size-3 mr-1" />Asignar
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Asignar supervisor al punto</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar supervisor…" />
            <CommandList>
              <CommandEmpty>Sin supervisores disponibles</CommandEmpty>
              <CommandGroup>
                {supervisores.map(s => (
                  <CommandItem
                    key={s.id}
                    value={`${s.nombre} ${s.email}`}
                    onSelect={() => handleAsignar(s.id)}
                    className="cursor-pointer"
                  >
                    <ShieldCheck className="size-4 mr-2 text-amber-600" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{s.nombre}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </div>
                    {s.id === supervisorId && <Badge variant="secondary" className="ml-2">Actual</Badge>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Subcomponente: Tarjeta de caja POS ────────────────────────────────────────

function CajaPosCard({
  caja,
  cajeros,
}: {
  caja:    CajaAsignacion
  cajeros: { id: number; nombre: string; email: string }[]
}) {
  const setFijo = useSetCajeroFijo()
  const [open, setOpen] = useState(false)

  function handleAsignar(cajeroId: number) {
    setFijo.mutate({ cajaId: caja.id, cajeroId }, { onSuccess: () => setOpen(false) })
  }

  function handleRetirar() {
    if (!confirm(`¿Remover cajero fijo de "${caja.nombre}"?`)) return
    setFijo.mutate({ cajaId: caja.id, cajeroId: null })
  }

  const sesion = caja.sesionActiva

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Monitor className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-medium text-sm truncate">{caja.nombre}</span>
          <span className="font-mono text-xs text-muted-foreground">{caja.codigo}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {sesion && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
              Abierta
            </span>
          )}
        </div>
      </div>

      {/* Cajero fijo */}
      <div className="rounded-md bg-muted/40 px-2.5 py-1.5 space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cajero fijo</p>
        {caja.cajeroFijoId ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <UserRound className="size-3.5 shrink-0 text-primary" />
              <span className="text-xs font-medium truncate">{caja.cajeroFijoNombre}</span>
              <span className="text-[10px] text-muted-foreground truncate">{caja.cajeroFijoEmail}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="size-5 text-muted-foreground" title="Cambiar" onClick={() => setOpen(true)} disabled={setFijo.isPending}>
                <Plus className="size-3" />
              </Button>
              <Button size="icon" variant="ghost" className="size-5 text-destructive hover:text-destructive" title="Remover" onClick={handleRetirar} disabled={setFijo.isPending}>
                <X className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-amber-600 font-medium">
              Sin cajero — no se puede abrir
            </span>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setOpen(true)}>
              <Plus className="size-3 mr-1" />Asignar
            </Button>
          </div>
        )}
      </div>

      {/* Sesión activa — info solo lectura */}
      {sesion && (
        <div className="text-xs text-muted-foreground space-y-0.5 border-t pt-1.5">
          <div>Apertura: <span className="text-foreground">{sesion.supervisorNombre}</span></div>
          {sesion.cajeroId === null ? (
            <div className="text-amber-600">
              Sesión sin cajero: se abrió antes de que la asignación fuera obligatoria. Ciérrela para aplicarla.
            </div>
          ) : sesion.cajeroId !== caja.cajeroFijoId && (
            <div className="text-amber-600">
              Vendiendo: <span className="font-medium">{sesion.cajeroNombre}</span> — la asignación
              nueva aplica en la próxima apertura.
            </div>
          )}
        </div>
      )}

      {/* Picker cajero fijo */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Cajero fijo para {caja.nombre}</DialogTitle>
          </DialogHeader>
          <Command>
            <CommandInput placeholder="Buscar cajero…" />
            <CommandList>
              <CommandEmpty>Sin cajeros disponibles</CommandEmpty>
              <CommandGroup>
                {cajeros.map(c => (
                  <CommandItem
                    key={c.id}
                    value={`${c.nombre} ${c.email}`}
                    onSelect={() => handleAsignar(c.id)}
                    className="cursor-pointer"
                  >
                    <UserRound className="size-4 mr-2" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{c.nombre}</div>
                      <div className="text-xs text-muted-foreground">{c.email}</div>
                    </div>
                    {c.id === caja.cajeroFijoId && <Badge variant="secondary" className="ml-2">Actual</Badge>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Panel de sucursal ─────────────────────────────────────────────────────────

function SucursalPanel({ sucursalId, sucursalNombre }: { sucursalId: number; sucursalNombre: string }) {
  const { data: asig, isLoading } = useAsignacionSucursal(sucursalId)

  // Cajeros de esta sucursal para el picker
  const { data: pageData } = useUsers({
    rol:         'CAJERO',
    sucursal_id: sucursalId,
    activo:      true,
    limite:      100,
  })
  const cajeros = (pageData?.datos ?? []).map(c => ({ id: c.id, nombre: c.nombre, email: c.email }))

  const cajasOperativas = asig?.cajas.filter(c => esCajaOperativa(c.tipo)) ?? []
  const bolsillos       = asig?.cajas.filter(c => !esCajaOperativa(c.tipo)) ?? []

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Store className="size-5 text-primary" />
          {sucursalNombre}
        </h2>
        <p className="text-sm text-muted-foreground">
          {asig?.cajaPadreNombre ?? 'Punto de venta'}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : !asig || asig.cajaPadreId === null ? (
        <p className="text-sm text-muted-foreground italic text-center py-8">
          No hay punto de venta configurado en esta sucursal
        </p>
      ) : (
        <div className="space-y-4">
          <DiagnosticoBanner cajaPadreId={asig.cajaPadreId} />

          {/* ── Supervisor ── */}
          <SupervisorRow
            cajaPadreId={asig.cajaPadreId}
            sucursalId={sucursalId}
            supervisorId={asig.supervisorId}
            supervisorNombre={asig.supervisorNombre}
            supervisorEmail={asig.supervisorEmail}
          />

          {/* ── Cajas que atienden público ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="size-4" />
                Cajas de venta y servicios
                <Badge variant="secondary">{cajasOperativas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {cajasOperativas.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                  No hay cajas de atención configuradas
                </p>
              ) : (
                <div className="space-y-2">
                  {cajasOperativas.map(caja => (
                    <CajaPosCard key={caja.id} caja={caja} cajeros={cajeros} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Bolsillos de la caja principal (no se asignan) ── */}
          {bolsillos.length > 0 && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Vault className="size-4" />
                  Bolsillos de la caja principal
                  <Badge variant="secondary">{bolsillos.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {bolsillos.map(caja => (
                  <div key={caja.id} className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2">
                    <Vault className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">{caja.nombre}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{caja.codigo}</span>
                    <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                      {TIPO_BOLSILLO[caja.tipo] ?? caja.tipo}
                    </Badge>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Responden al supervisor del punto. No abren turno ni reciben cajero propio.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Cajeros de la sucursal (solo informativo) ── */}
          {cajeros.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserRound className="size-4" />
                  Cajeros en esta sucursal
                  <Badge variant="secondary">{cajeros.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {cajeros.map(c => (
                    <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm">
                      <UserRound className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">{c.nombre}</span>
                      <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AsignacionCajerosPage() {
  const [regionalId,     setRegionalId]     = useState<number | null>(null)
  const [sucursalId,     setSucursalId]     = useState<number | null>(null)
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
        <h1 className="text-2xl font-semibold">Asignación de cajeros y supervisores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Asigna el supervisor de cada punto y el cajero fijo de cada caja POS.
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
                  Selecciona una regional y una sucursal
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
