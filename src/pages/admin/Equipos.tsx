import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, PowerOff, Loader2, AlertCircle, Monitor,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useEquipos, useCreateEquipo, useUpdateEquipo } from '@/queries/equipos.queries'
import { useSucursales } from '@/queries/sucursales.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { EquipoResponse, SistemaOperativo } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15

const SO_LABELS: Record<SistemaOperativo, string> = {
  windows: 'Windows',
  linux:   'Linux',
  macos:   'macOS',
}

const createSchema = z.object({
  sucursal_id:       z.preprocess(Number, z.number().int().positive('Requerido')),
  mac:               z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/, 'Formato XX:XX:XX:XX:XX:XX'),
  nombre:            z.string().max(100).nullable().optional(),
  sistema_operativo: z.enum(['windows', 'linux', 'macos']).nullable().optional(),
})

const updateSchema = z.object({
  nombre:            z.string().max(100).nullable().optional(),
  sistema_operativo: z.enum(['windows', 'linux', 'macos']).nullable().optional(),
  activo:            z.boolean().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 6 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

function EquipoForm({
  equipo, open, onClose,
}: { equipo: EquipoResponse | null; open: boolean; onClose: () => void }) {
  const isEdit = !!equipo
  const createMutation = useCreateEquipo()
  const updateMutation = useUpdateEquipo()
  const { data: sucursalesData } = useSucursales({ activo: true, limite: 200 })
  const sucursales = sucursalesData?.datos ?? []

  const schema = isEdit ? updateSchema : createSchema
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateForm & UpdateForm>({
    resolver: zodResolver(schema as any),
    defaultValues: (isEdit ? {
      nombre:            equipo.nombre ?? '',
      sistema_operativo: equipo.sistemaOperativo ?? null,
    } : undefined) as any,
  })

  const soValue = watch('sistema_operativo')

  async function onSubmit(data: CreateForm & UpdateForm) {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: equipo.id,
          data: {
            nombre:            data.nombre || null,
            sistema_operativo: data.sistema_operativo || null,
          },
        })
        toast.success('Equipo actualizado')
      } else {
        await createMutation.mutateAsync({
          sucursal_id:       Number(data.sucursal_id),
          mac:               data.mac!,
          nombre:            data.nombre || null,
          sistema_operativo: (data.sistema_operativo || null) as SistemaOperativo | null,
        })
        toast.success('Equipo registrado')
      }
      reset()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar equipo' : 'Registrar equipo'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? `Editando ${equipo?.mac}`
              : 'El MAC se normalizará a mayúsculas. No puede reutilizarse tras eliminar.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit as any)} className="mt-6 space-y-4">
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Sucursal *</Label>
                <Select onValueChange={(v) => setValue('sucursal_id', Number(v) as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {sucursales.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nombre} ({s.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.sucursal_id && <p className="text-xs text-destructive">{errors.sucursal_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>MAC Address *</Label>
                <Input {...register('mac')} placeholder="AA:BB:CC:DD:EE:FF" className="font-mono uppercase" />
                {errors.mac && <p className="text-xs text-destructive">{errors.mac.message}</p>}
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Nombre (opcional)</Label>
            <Input {...register('nombre')} placeholder="PC Caja 1" />
          </div>

          <div className="space-y-1.5">
            <Label>Sistema operativo</Label>
            <Select
              value={soValue ?? '_none'}
              onValueChange={(v) => setValue('sistema_operativo', v === '_none' ? null : v as SistemaOperativo)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sin especificar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sin especificar</SelectItem>
                {(Object.keys(SO_LABELS) as SistemaOperativo[]).map((so) => (
                  <SelectItem key={so} value={so}>{SO_LABELS[so]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {isEdit ? 'Guardar' : 'Registrar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function EquiposPage() {
  const rol = useSessionStore((s) => s.user?.rol)
  const canWrite = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,       setBuscar]       = useState('')
  const [filterSO,     setFilterSO]     = useState('_all')
  const [filterActivo, setFilterActivo] = useState('_all')
  const [page,         setPage]         = useState(1)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editEquipo,   setEditEquipo]   = useState<EquipoResponse | null>(null)
  const [toggleTarget, setToggleTarget] = useState<EquipoResponse | null>(null)

  const params = {
    buscar:            buscar || undefined,
    sistema_operativo: filterSO !== '_all' ? filterSO as SistemaOperativo : undefined,
    activo:            filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    pagina:            page,
    limite:            ROWS,
  }

  const { data, isLoading, isError } = useEquipos(params)
  const toggleMutation = useUpdateEquipo()
  const equipos    = data?.datos ?? []
  const meta       = data?.meta
  const totalPages = meta?.paginas ?? 1

  function openEdit(e: EquipoResponse) { setEditEquipo(e); setFormOpen(true) }
  function openNew()  { setEditEquipo(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditEquipo(null) }
  function resetFilters() { setBuscar(''); setFilterSO('_all'); setFilterActivo('_all'); setPage(1) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMutation.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Equipo desautorizado' : 'Equipo autorizado')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipos autorizados</h1>
          <p className="text-sm text-muted-foreground">Dispositivos habilitados por MAC address</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Registrar equipo
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por MAC o nombre…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterSO} onValueChange={(v) => { setFilterSO(v); setPage(1) }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sistema operativo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los SO</SelectItem>
            {(Object.entries(SO_LABELS) as [SistemaOperativo, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActivo} onValueChange={(v) => { setFilterActivo(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="activo">Autorizados</SelectItem>
            <SelectItem value="inactivo">Desautorizados</SelectItem>
          </SelectContent>
        </Select>
        {(buscar || filterSO !== '_all' || filterActivo !== '_all') && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar</Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>MAC</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>SO</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : equipos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Monitor className="size-8 opacity-30" />
                    <p className="text-sm">No hay equipos registrados.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              equipos.map((e) => (
                <TableRow key={e.id} className="group">
                  <TableCell className="font-mono text-sm">{e.mac}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{e.nombre ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {e.sucursal ? `${e.sucursal.nombre} (${e.sucursal.codigo})` : '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.sistemaOperativo ? SO_LABELS[e.sistemaOperativo] : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.activo ? 'default' : 'secondary'}>
                      {e.activo ? 'Autorizado' : 'Desautorizado'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canWrite && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(e)}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToggleTarget(e)}
                          >
                            <PowerOff className="mr-2 size-3.5" />
                            {e.activo ? 'Desautorizar' : 'Reautorizar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {(page - 1) * ROWS + 1}–{Math.min(page * ROWS, meta.total)} de {meta.total}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
              <span className="text-sm px-3 tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>

      <EquipoForm equipo={editEquipo} open={formOpen} onClose={closeForm} />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desautorizar equipo' : 'Reautorizar equipo'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.activo
                ? `¿Desautorizar el equipo con MAC ${toggleTarget?.mac}? Dejará de poder iniciar sesión inmediatamente.`
                : `¿Reautorizar el equipo con MAC ${toggleTarget?.mac}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>Cancelar</Button>
            <Button
              variant={toggleTarget?.activo ? 'destructive' : 'default'}
              onClick={confirmToggle}
              disabled={toggleMutation.isPending}
            >
              {toggleMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {toggleTarget?.activo ? 'Desautorizar' : 'Reautorizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
