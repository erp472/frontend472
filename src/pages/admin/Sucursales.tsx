import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, PowerOff, Loader2, AlertCircle, Store,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
import {
  useSucursales, useCreateSucursal, useUpdateSucursal,
} from '@/queries/sucursales.queries'
import { useRegionales } from '@/queries/regionales.queries'
import { GeoSelector, type GeoValue } from '@/components/GeoSelector'
import { useSessionStore } from '@/stores/useSessionStore'
import type { SucursalResponse, TipoSucursal } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15

const TIPO_LABELS: Record<TipoSucursal, string> = {
  unipersonal: 'Unipersonal',
  multipuesto: 'Multipuesto',
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const baseFields = z.object({
  nombre:           z.string().min(2, 'Mínimo 2 caracteres').max(200),
  tipo:             z.enum(['unipersonal', 'multipuesto'] as const),
  direccion:        z.string().max(300).nullable().optional(),
  telefono:         z.string().max(20).nullable().optional(),
  email:            z.string().email('Correo inválido').nullable().optional().or(z.literal('')),
  horario_apertura: z.string().regex(TIME_REGEX, 'HH:MM').nullable().optional().or(z.literal('')),
  horario_cierre:   z.string().regex(TIME_REGEX, 'HH:MM').nullable().optional().or(z.literal('')),
  pais_id:          z.number().int().positive().nullable().optional(),
  departamento_id:  z.number().int().positive().nullable().optional(),
  ciudad_id:        z.number().int().positive().nullable().optional(),
})

const createSchema = baseFields.extend({
  regional_id: z.preprocess(Number, z.number().int().positive('Requerido')),
  codigo:      z.string().min(1, 'Requerido').max(50),
})

const updateSchema = baseFields.partial()

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

function SucursalForm({
  sucursal, open, onClose,
}: { sucursal: SucursalResponse | null; open: boolean; onClose: () => void }) {
  const isEdit = !!sucursal
  const createMutation = useCreateSucursal()
  const updateMutation = useUpdateSucursal()
  const { data: regionalesData } = useRegionales({ activo: true, limite: 200 })
  const regionales = regionalesData?.datos ?? []

  const schema = isEdit ? updateSchema : createSchema
  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm & UpdateForm>({
    resolver: zodResolver(schema as any),
  })

  const [geo, setGeo] = useState<GeoValue>({ paisId: null, departamentoId: null, ciudadId: null })

  useEffect(() => {
    if (!open) return
    const vals = sucursal ? {
      nombre:           sucursal.nombre,
      tipo:             sucursal.tipo,
      direccion:        sucursal.direccion ?? '',
      telefono:         sucursal.telefono ?? '',
      email:            sucursal.email ?? '',
      horario_apertura: sucursal.horarioApertura ?? '',
      horario_cierre:   sucursal.horarioCierre ?? '',
      pais_id:          sucursal.pais?.id ?? null,
      departamento_id:  sucursal.departamento?.id ?? null,
      ciudad_id:        sucursal.ciudad?.id ?? null,
    } : { tipo: 'unipersonal' as const }
    reset(vals as any)
    const g = {
      paisId:         sucursal?.pais?.id ?? null,
      departamentoId: sucursal?.departamento?.id ?? null,
      ciudadId:       sucursal?.ciudad?.id ?? null,
    }
    setGeo(g)
  }, [open, sucursal])

  function handleGeoChange(v: GeoValue) {
    setGeo(v)
    setValue('pais_id',         v.paisId)
    setValue('departamento_id', v.departamentoId)
    setValue('ciudad_id',       v.ciudadId)
  }

  async function onSubmit(data: CreateForm & UpdateForm) {
    const payload = {
      ...data,
      email:            data.email            || null,
      horario_apertura: data.horario_apertura || null,
      horario_cierre:   data.horario_cierre   || null,
      direccion:        data.direccion        || null,
      telefono:         data.telefono         || null,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: sucursal.id, data: payload })
        toast.success('Sucursal actualizada')
      } else {
        await createMutation.mutateAsync(payload as unknown as CreateForm)
        toast.success('Sucursal registrada')
      }
      reset()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  const tipoValue = watch('tipo')

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar sucursal' : 'Nueva sucursal'}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editando ${sucursal?.nombre}` : 'Completa los datos de la sucursal.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Regional *</Label>
              <Select onValueChange={(v) => setValue('regional_id', Number(v) as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar regional" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {regionales.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.nombre} — {r.comercio?.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.regional_id && <p className="text-xs text-destructive">{errors.regional_id.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input {...register('codigo')} placeholder="SUC-XXX-001" />
                {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
              </div>
            )}
            <div className={`space-y-1.5 ${isEdit ? 'col-span-2' : ''}`}>
              <Label>Nombre *</Label>
              <Input {...register('nombre')} placeholder="Nombre de la sucursal" />
              {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <Select value={tipoValue} onValueChange={(v) => setValue('tipo', v as TipoSucursal)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TIPO_LABELS) as [TipoSucursal, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contacto</p>

          <div className="space-y-1.5">
            <Label>Dirección</Label>
            <Input {...register('direccion')} placeholder="Calle XX # XX-XX" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input {...register('telefono')} placeholder="60X-XXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="correo@dominio.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Apertura</Label>
              <Input {...register('horario_apertura')} placeholder="08:00" />
              {errors.horario_apertura && <p className="text-xs text-destructive">{errors.horario_apertura.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Cierre</Label>
              <Input {...register('horario_cierre')} placeholder="18:00" />
              {errors.horario_cierre && <p className="text-xs text-destructive">{errors.horario_cierre.message}</p>}
            </div>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ubicación geográfica</p>
          <GeoSelector value={geo} onChange={handleGeoChange} />

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

export default function SucursalesPage() {
  const rol = useSessionStore((s) => s.user?.rol)
  const canWrite = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,          setBuscar]          = useState('')
  const [filterTipo,      setFilterTipo]      = useState('_all')
  const [filterActivo,    setFilterActivo]    = useState('_all')
  const [page,            setPage]            = useState(1)
  const [formOpen,        setFormOpen]        = useState(false)
  const [editSucursal,    setEditSucursal]    = useState<SucursalResponse | null>(null)
  const [toggleTarget,    setToggleTarget]    = useState<SucursalResponse | null>(null)

  const params = {
    buscar:  buscar || undefined,
    tipo:    filterTipo !== '_all' ? filterTipo as TipoSucursal : undefined,
    activo:  filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    pagina:  page,
    limite:  ROWS,
  }

  const { data, isLoading, isError } = useSucursales(params)
  const toggleMutation = useUpdateSucursal()
  const sucursales  = data?.datos ?? []
  const meta        = data?.meta
  const totalPages  = meta?.paginas ?? 1

  function openEdit(s: SucursalResponse) { setEditSucursal(s); setFormOpen(true) }
  function openNew()  { setEditSucursal(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditSucursal(null) }
  function resetFilters() { setBuscar(''); setFilterTipo('_all'); setFilterActivo('_all'); setPage(1) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMutation.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Sucursal desactivada' : 'Sucursal activada')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Puntos de atención registrados en el sistema</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Nueva sucursal
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por código o nombre…"
            value={buscar}
            onChange={(e) => { setBuscar(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={filterTipo} onValueChange={(v) => { setFilterTipo(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {(Object.entries(TIPO_LABELS) as [TipoSucursal, string][]).map(([k, v]) => (
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
            <SelectItem value="activo">Activas</SelectItem>
            <SelectItem value="inactivo">Inactivas</SelectItem>
          </SelectContent>
        </Select>
        {(buscar || filterTipo !== '_all' || filterActivo !== '_all') && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>Limpiar</Button>
        )}
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Regional / Comercio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Horario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableSkeleton /> : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la lista.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : sucursales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Store className="size-8 opacity-30" />
                    <p className="text-sm">No hay sucursales registradas.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sucursales.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell className="font-mono text-sm">{s.codigo}</TableCell>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {s.regional
                      ? <span>{s.regional.nombre}<span className="text-xs opacity-60"> / {s.regional.comercio?.nombre}</span></span>
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIPO_LABELS[s.tipo]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {s.horarioApertura && s.horarioCierre
                      ? `${s.horarioApertura} – ${s.horarioCierre}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.activo ? 'default' : 'secondary'}>
                      {s.activo ? 'Activa' : 'Inactiva'}
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
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil className="mr-2 size-3.5" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToggleTarget(s)}
                          >
                            <PowerOff className="mr-2 size-3.5" />
                            {s.activo ? 'Desactivar' : 'Activar'}
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

      <SucursalForm sucursal={editSucursal} open={formOpen} onClose={closeForm} />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desactivar sucursal' : 'Activar sucursal'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.activo
                ? `¿Desactivar la sucursal "${toggleTarget?.nombre}"?`
                : `¿Activar la sucursal "${toggleTarget?.nombre}"?`}
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
              {toggleTarget?.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
