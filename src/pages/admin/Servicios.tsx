import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, PowerOff, Loader2, AlertCircle, Truck,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Checkbox }  from '@/components/ui/checkbox'
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
import { useServicios, useCreateServicio, useUpdateServicio } from '@/queries/servicios.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { ServicioResponse, TipoServicio } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15

const TIPO_LABELS: Record<TipoServicio, string> = {
  nacional:              'Nacional',
  internacional_ms:      'Internacional MS',
  internacional_courier: 'Internacional Courier',
  apartado_postal:       'Apartado Postal',
}

const TIPO_BADGE: Record<TipoServicio, 'default' | 'secondary' | 'outline'> = {
  nacional:              'default',
  internacional_ms:      'outline',
  internacional_courier: 'outline',
  apartado_postal:       'secondary',
}

const createSchema = z.object({
  codigo:                   z.string().min(1, 'Requerido').max(50),
  nombre:                   z.string().min(2).max(200),
  descripcion:              z.string().nullable().optional(),
  tipo:                     z.enum(['nacional', 'internacional_ms', 'internacional_courier', 'apartado_postal'] as const),
  requiere_estampilla:      z.boolean().default(false),
  requiere_dimensiones:     z.boolean().default(false),
  requiere_valor_declarado: z.boolean().default(false),
  peso_maximo_kg:           z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  factor_volumetrico:       z.preprocess((v) => v === '' ? 2500 : Number(v), z.number().int().positive()).default(2500),
  tiempo_entrega_dias:      z.preprocess((v) => v === '' ? null : Number(v), z.number().int().positive().nullable()).optional(),
  codigo_sigma:             z.string().max(50).nullable().optional(),
})

const updateSchema = z.object({
  nombre:                   z.string().min(2).max(200).optional(),
  descripcion:              z.string().nullable().optional(),
  requiere_estampilla:      z.boolean().optional(),
  requiere_dimensiones:     z.boolean().optional(),
  requiere_valor_declarado: z.boolean().optional(),
  peso_maximo_kg:           z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  factor_volumetrico:       z.preprocess((v) => v === '' ? undefined : Number(v), z.number().int().positive()).optional(),
  tiempo_entrega_dias:      z.preprocess((v) => v === '' ? null : Number(v), z.number().int().positive().nullable()).optional(),
  codigo_sigma:             z.string().max(50).nullable().optional(),
  activo:                   z.boolean().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

function TableSkeleton() {
  return Array.from({ length: 6 }).map((_, i) => (
    <TableRow key={i}>
      {Array.from({ length: 5 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  ))
}

function ServicioForm({
  servicio, open, onClose,
}: { servicio: ServicioResponse | null; open: boolean; onClose: () => void }) {
  const isEdit = !!servicio
  const createMutation = useCreateServicio()
  const updateMutation = useUpdateServicio()

  const schema = isEdit ? updateSchema : createSchema
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CreateForm & UpdateForm>({
    resolver: zodResolver(schema as any),
  })

  useEffect(() => {
    if (!open) return
    reset(isEdit ? {
      nombre:                   servicio.nombre,
      descripcion:              servicio.descripcion ?? '',
      requiere_estampilla:      servicio.requiereEstampilla,
      requiere_dimensiones:     servicio.requiereDimensiones,
      requiere_valor_declarado: servicio.requiereValorDeclarado,
      peso_maximo_kg:           servicio.pesoMaximoKg ?? ('' as any),
      factor_volumetrico:       servicio.factorVolumetrico,
      tiempo_entrega_dias:      servicio.tiempoEntregaDias ?? ('' as any),
      codigo_sigma:             servicio.codigoSigma ?? '',
    } as any : {
      tipo: 'nacional',
      requiere_estampilla: false,
      requiere_dimensiones: false,
      requiere_valor_declarado: false,
      factor_volumetrico: 2500,
    } as any)
  }, [open, servicio])

  const tipoValue = watch('tipo')
  const estampilla = watch('requiere_estampilla')
  const dimensiones = watch('requiere_dimensiones')
  const valorDeclarado = watch('requiere_valor_declarado')

  async function onSubmit(data: CreateForm & UpdateForm) {
    const payload = {
      ...data,
      descripcion: data.descripcion || null,
      codigo_sigma: data.codigo_sigma || null,
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: servicio.id, data: payload })
        toast.success('Servicio actualizado')
      } else {
        await createMutation.mutateAsync(payload as unknown as CreateForm)
        toast.success('Servicio registrado')
      }
      reset()
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Editar servicio' : 'Nuevo servicio'}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Editando ${servicio?.nombre}` : 'Agrega un servicio de envío al catálogo.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {!isEdit && (
            <>
              <div className="space-y-1.5">
                <Label>Código *</Label>
                <Input {...register('codigo')} placeholder="SRV-001" />
                {errors.codigo && <p className="text-xs text-destructive">{errors.codigo.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={tipoValue} onValueChange={(v) => setValue('tipo', v as TipoServicio)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_LABELS) as [TipoServicio, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Nombre *</Label>
            <Input {...register('nombre')} placeholder="Nombre del servicio" />
            {errors.nombre && <p className="text-xs text-destructive">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input {...register('descripcion')} placeholder="Descripción opcional" />
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Características</p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="estampilla"
                checked={!!estampilla}
                onCheckedChange={(v) => setValue('requiere_estampilla', !!v)}
              />
              <Label htmlFor="estampilla" className="cursor-pointer">
                Requiere estampilla
                <span className="ml-1 text-xs text-muted-foreground">(solo nacional)</span>
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="dimensiones"
                checked={!!dimensiones}
                onCheckedChange={(v) => setValue('requiere_dimensiones', !!v)}
              />
              <Label htmlFor="dimensiones" className="cursor-pointer">Requiere dimensiones (peso volumétrico)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="valor_declarado"
                checked={!!valorDeclarado}
                onCheckedChange={(v) => setValue('requiere_valor_declarado', !!v)}
              />
              <Label htmlFor="valor_declarado" className="cursor-pointer">Requiere valor declarado</Label>
            </div>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parámetros</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Peso máximo (kg)</Label>
              <Input {...register('peso_maximo_kg')} type="number" step="0.001" placeholder="30" />
            </div>
            <div className="space-y-1.5">
              <Label>Factor volumétrico</Label>
              <Input {...register('factor_volumetrico')} type="number" step="1" placeholder="2500" />
            </div>
            <div className="space-y-1.5">
              <Label>Tiempo entrega (días)</Label>
              <Input {...register('tiempo_entrega_dias')} type="number" step="1" placeholder="5" />
            </div>
            <div className="space-y-1.5">
              <Label>Código SIGMA</Label>
              <Input {...register('codigo_sigma')} placeholder="SIG-001" />
            </div>
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

export default function ServiciosPage() {
  const rol = useSessionStore((s) => s.user?.rol)
  const canWrite = rol === 'ADMIN_SISTEMA' || rol === 'ADMIN_NACIONAL'

  const [buscar,       setBuscar]       = useState('')
  const [filterTipo,   setFilterTipo]   = useState('_all')
  const [filterActivo, setFilterActivo] = useState('_all')
  const [page,         setPage]         = useState(1)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editServicio, setEditServicio] = useState<ServicioResponse | null>(null)
  const [toggleTarget, setToggleTarget] = useState<ServicioResponse | null>(null)

  const params = {
    buscar:  buscar || undefined,
    tipo:    filterTipo !== '_all' ? filterTipo as TipoServicio : undefined,
    activo:  filterActivo === 'activo' ? true : filterActivo === 'inactivo' ? false : undefined,
    pagina:  page,
    limite:  ROWS,
  }

  const { data, isLoading, isError } = useServicios(params)
  const toggleMutation = useUpdateServicio()
  const servicios  = data?.datos ?? []
  const meta       = data?.meta
  const totalPages = meta?.paginas ?? 1

  function openEdit(s: ServicioResponse) { setEditServicio(s); setFormOpen(true) }
  function openNew()  { setEditServicio(null); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditServicio(null) }
  function resetFilters() { setBuscar(''); setFilterTipo('_all'); setFilterActivo('_all'); setPage(1) }

  async function confirmToggle() {
    if (!toggleTarget) return
    try {
      await toggleMutation.mutateAsync({ id: toggleTarget.id, data: { activo: !toggleTarget.activo } })
      toast.success(toggleTarget.activo ? 'Servicio desactivado' : 'Servicio activado')
      setToggleTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Servicios</h1>
          <p className="text-sm text-muted-foreground">Catálogo de servicios de envío postal</p>
        </div>
        {canWrite && (
          <Button onClick={openNew}>
            <Plus className="mr-1.5 size-4" />Nuevo servicio
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
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos los tipos</SelectItem>
            {(Object.entries(TIPO_LABELS) as [TipoServicio, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActivo} onValueChange={(v) => { setFilterActivo(v); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos</SelectItem>
            <SelectItem value="activo">Activos</SelectItem>
            <SelectItem value="inactivo">Inactivos</SelectItem>
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
              <TableHead>Tipo</TableHead>
              <TableHead>Entrega</TableHead>
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
            ) : servicios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Truck className="size-8 opacity-30" />
                    <p className="text-sm">No hay servicios en el catálogo.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              servicios.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell className="font-mono text-sm">{s.codigo}</TableCell>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>
                    <Badge variant={TIPO_BADGE[s.tipo]}>{TIPO_LABELS[s.tipo]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm tabular-nums">
                    {s.tiempoEntregaDias != null ? `${s.tiempoEntregaDias} días` : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.activo ? 'default' : 'secondary'}>
                      {s.activo ? 'Activo' : 'Inactivo'}
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

      <ServicioForm servicio={editServicio} open={formOpen} onClose={closeForm} />

      <Dialog open={!!toggleTarget} onOpenChange={(v) => !v && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggleTarget?.activo ? 'Desactivar servicio' : 'Activar servicio'}</DialogTitle>
            <DialogDescription>
              {toggleTarget?.activo
                ? `¿Desactivar "${toggleTarget?.nombre}" del catálogo?`
                : `¿Activar "${toggleTarget?.nombre}"?`}
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
