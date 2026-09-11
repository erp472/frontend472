import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Search, Plus, MoreHorizontal, Pencil, PowerOff, Loader2, AlertCircle, Truck,
  DollarSign, Trash2, Check, X,
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
import {
  useServicios, useCreateServicio, useUpdateServicio,
  useTarifasServicio, useCreateTarifa, useUpdateTarifa,
  useDeleteTarifa, useUpdateCertificacion,
} from '@/queries/servicios.queries'
import { useSessionStore } from '@/stores/useSessionStore'
import type { ServicioResponse, TipoServicio, TarifaEnvioResponse } from '@/types/api'
import { ApiError } from '@/lib/api'

const ROWS = 15

const TIPO_LABELS: Record<TipoServicio, string> = {
  nacional:              'Nacional',
  internacional_ms:      'Internacional MS',
  internacional_courier: 'Internacional Courier',
  apartado_postal:       'Apartado Postal',
  alistamiento:          'Alistamiento',
}

const TIPO_BADGE: Record<TipoServicio, 'default' | 'secondary' | 'outline'> = {
  nacional:              'default',
  internacional_ms:      'outline',
  internacional_courier: 'outline',
  apartado_postal:       'secondary',
  alistamiento:          'default',
}

function formatPeso(kg: number | null): string {
  if (kg === null) return '∞'
  return kg < 1 ? `${kg * 1000} g` : `${kg} kg`
}

function formatPrecio(n: number): string {
  return `$${n.toLocaleString('es-CO')}`
}

// ── Panel de tarifas ──────────────────────────────────────────────────────────

const PAIS_NOMBRES: Record<string, string> = {
  CO: 'Colombia',       US: 'Estados Unidos', BR: 'Brasil',
  CA: 'Canadá',         DE: 'Alemania',       EC: 'Ecuador',
  ES: 'España',         FR: 'Francia',        MX: 'México',
  PE: 'Perú',           VE: 'Venezuela',      AR: 'Argentina',
  CL: 'Chile',          PA: 'Panamá',         CR: 'Costa Rica',
  GT: 'Guatemala',      HN: 'Honduras',       SV: 'El Salvador',
  NI: 'Nicaragua',      DO: 'Rep. Dominicana',
}

const newTarifaSchema = z.object({
  paisDestino:       z.string().min(2).max(5),
  ciudadDestino:     z.string().max(100).nullable().optional(),
  pesoMinKg:         z.preprocess((v) => Number(v), z.number().min(0)),
  pesoMaxKg:         z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  tarifa:            z.preprocess((v) => Number(v), z.number().positive()),
  tarifaKgAdicional: z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
})
type NewTarifaForm = z.infer<typeof newTarifaSchema>

function TarifasPanel({
  servicio, open, onClose, canWrite,
}: { servicio: ServicioResponse | null; open: boolean; onClose: () => void; canWrite: boolean }) {
  const svcId          = servicio?.id ?? null
  const isInternacional = (servicio?.tipo ?? '').startsWith('internacional')

  const { data: tarifas, isLoading } = useTarifasServicio(svcId)
  const createMutation = useCreateTarifa(svcId ?? 0)
  const updateMutation = useUpdateTarifa(svcId ?? 0)
  const deleteMutation = useDeleteTarifa(svcId ?? 0)
  const certMutation   = useUpdateCertificacion(svcId ?? 0)

  const [addOpen,      setAddOpen]      = useState(false)
  const [editingId,    setEditingId]    = useState<number | null>(null)
  const [editTarifa,   setEditTarifa]   = useState('')
  const [editKgAdic,   setEditKgAdic]   = useState('')
  const [editActiva,   setEditActiva]   = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<TarifaEnvioResponse | null>(null)
  const [certValue,    setCertValue]    = useState('')
  const [certEditing,  setCertEditing]  = useState(false)
  const [selectedPais, setSelectedPais] = useState('CO')

  const paises = useMemo(
    () => [...new Set((tarifas ?? []).map((t) => t.paisDestino))].sort(),
    [tarifas],
  )

  const tarifasFiltradas = useMemo(
    () => (tarifas ?? [])
      .filter((t) => t.paisDestino === selectedPais)
      .sort((a, b) => a.pesoMinKg - b.pesoMinKg),
    [tarifas, selectedPais],
  )

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<NewTarifaForm>({
    resolver: zodResolver(newTarifaSchema) as never,
    defaultValues: { paisDestino: 'CO' },
  })

  useEffect(() => {
    if (!open || !servicio) return
    setCertValue(servicio.tarifaCertificacion != null ? String(servicio.tarifaCertificacion) : '')
    setCertEditing(false)
    setEditingId(null)
  }, [open, servicio])

  useEffect(() => {
    if (paises.length > 0 && !paises.includes(selectedPais)) {
      setSelectedPais(paises[0] ?? '')
    }
  }, [paises])

  function openAdd() {
    reset({ paisDestino: selectedPais })
    setAddOpen(true)
  }

  function closeAdd() {
    reset({ paisDestino: selectedPais })
    setAddOpen(false)
  }

  function startEdit(t: TarifaEnvioResponse) {
    setEditingId(t.id)
    setEditTarifa(String(t.tarifa))
    setEditKgAdic(t.tarifaKgAdicional != null ? String(t.tarifaKgAdicional) : '')
    setEditActiva(t.activa)
  }

  async function saveEdit(t: TarifaEnvioResponse) {
    const tarifaNum = Number(editTarifa)
    const kgAdicNum = editKgAdic !== '' ? Number(editKgAdic) : null
    if (!tarifaNum || tarifaNum <= 0) { toast.error('Tarifa inválida'); return }
    try {
      await updateMutation.mutateAsync({
        tarifaId: t.id,
        data: { tarifa: tarifaNum, tarifaKgAdicional: kgAdicNum, activa: editActiva },
      })
      toast.success('Tarifa actualizada')
      setEditingId(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Tarifa eliminada')
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  async function saveCert() {
    const val = certValue === '' ? null : Number(certValue)
    if (val !== null && (isNaN(val) || val <= 0)) { toast.error('Tarifa de certificación inválida'); return }
    try {
      await certMutation.mutateAsync(val)
      toast.success('Tarifa de certificación actualizada')
      setCertEditing(false)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  async function onAddSubmit(data: NewTarifaForm) {
    if (!svcId) return
    try {
      const pais = data.paisDestino.toUpperCase()
      await createMutation.mutateAsync({
        paisDestino:       pais,
        ciudadDestino:     data.ciudadDestino ?? null,
        pesoMinKg:         data.pesoMinKg,
        pesoMaxKg:         data.pesoMaxKg ?? null,
        tarifa:            data.tarifa,
        tarifaKgAdicional: data.tarifaKgAdicional ?? null,
      })
      toast.success('Tarifa creada')
      setSelectedPais(pais)
      closeAdd()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error inesperado')
    }
  }

  const colSpan = canWrite ? 6 : 5

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tarifas — {servicio?.nombre}</SheetTitle>
            <SheetDescription>
              {isInternacional
                ? 'Tarifas por país destino. Selecciona un país para ver y editar sus tramos.'
                : 'Tramos de tarifa nacionales para este servicio.'}
            </SheetDescription>
          </SheetHeader>

          {/* Tarifa de certificación (solo nacionales) */}
          {!isInternacional && (
            <div className="mt-6 rounded-lg border p-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tarifa de certificación</p>
              <div className="flex items-center gap-2">
                {certEditing ? (
                  <>
                    <Input
                      type="number" step="1" min="0"
                      className="w-40 h-8 text-sm"
                      value={certValue}
                      onChange={(e) => setCertValue(e.target.value)}
                      placeholder="0"
                    />
                    <Button size="icon-sm" variant="ghost" onClick={saveCert} disabled={certMutation.isPending}>
                      {certMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 text-green-600" />}
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => {
                      setCertEditing(false)
                      setCertValue(servicio?.tarifaCertificacion != null ? String(servicio.tarifaCertificacion) : '')
                    }}>
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold tabular-nums">
                      {servicio?.tarifaCertificacion != null ? formatPrecio(servicio.tarifaCertificacion) : 'No aplica'}
                    </span>
                    {canWrite && (
                      <Button size="icon-sm" variant="ghost" onClick={() => setCertEditing(true)}>
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Selector de país (internacionales) */}
          {isInternacional && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">País</p>
              {paises.length > 0 ? (
                <Select value={selectedPais} onValueChange={(v) => { setSelectedPais(v); setEditingId(null) }}>
                  <SelectTrigger className="h-8 w-60 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paises.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="font-mono mr-2">{p}</span>
                        <span className="text-muted-foreground">{PAIS_NOMBRES[p] ?? p}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : !isLoading && (
                <span className="text-sm text-muted-foreground">Sin tarifas aún</span>
              )}
            </div>
          )}

          {/* Tabla de tramos */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isInternacional && selectedPais
                  ? `Tramos — ${selectedPais}${PAIS_NOMBRES[selectedPais] ? ` (${PAIS_NOMBRES[selectedPais]})` : ''}`
                  : 'Tramos por peso'}
              </p>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={openAdd}>
                  <Plus className="mr-1.5 size-3.5" />Agregar tramo
                </Button>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Peso mín</TableHead>
                    <TableHead className="text-xs">Peso máx</TableHead>
                    <TableHead className="text-xs">Tarifa base</TableHead>
                    <TableHead className="text-xs">kg adicional</TableHead>
                    <TableHead className="text-xs">Activa</TableHead>
                    {canWrite && <TableHead className="w-16 text-xs" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: colSpan }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : tarifasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="text-center py-8 text-muted-foreground text-sm">
                        No hay tramos definidos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tarifasFiltradas.map((t) => (
                      <TableRow key={t.id} className={!t.activa ? 'opacity-50' : ''}>
                        <TableCell className="text-sm tabular-nums">{formatPeso(t.pesoMinKg)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{formatPeso(t.pesoMaxKg)}</TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {editingId === t.id ? (
                            <Input type="number" step="1" className="h-7 w-28 text-xs"
                              value={editTarifa} onChange={(e) => setEditTarifa(e.target.value)} />
                          ) : formatPrecio(t.tarifa)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {editingId === t.id ? (
                            <Input type="number" step="1" className="h-7 w-28 text-xs"
                              value={editKgAdic} placeholder="—" onChange={(e) => setEditKgAdic(e.target.value)} />
                          ) : (t.tarifaKgAdicional != null ? formatPrecio(t.tarifaKgAdicional) : '—')}
                        </TableCell>
                        <TableCell>
                          {editingId === t.id ? (
                            <Checkbox checked={editActiva} onCheckedChange={(v) => setEditActiva(!!v)} />
                          ) : (
                            <Badge variant={t.activa ? 'default' : 'secondary'} className="text-xs">
                              {t.activa ? 'Sí' : 'No'}
                            </Badge>
                          )}
                        </TableCell>
                        {canWrite && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {editingId === t.id ? (
                                <>
                                  <Button size="icon-sm" variant="ghost" onClick={() => saveEdit(t)} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5 text-green-600" />}
                                  </Button>
                                  <Button size="icon-sm" variant="ghost" onClick={() => setEditingId(null)}>
                                    <X className="size-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="icon-sm" variant="ghost" onClick={() => startEdit(t)}>
                                    <Pencil className="size-3.5" />
                                  </Button>
                                  <Button size="icon-sm" variant="ghost"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(t)}>
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog agregar tramo */}
      <Dialog open={addOpen} onOpenChange={(v) => { if (!v) closeAdd() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar tramo de tarifa</DialogTitle>
            <DialogDescription>Define un nuevo rango de peso y su tarifa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddSubmit as never)} className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {isInternacional && (
                <>
                  <div className="space-y-1.5">
                    <Label>País destino (ISO) *</Label>
                    <Input {...register('paisDestino')} placeholder="US, BR, CA…" className="uppercase" />
                    {errors.paisDestino && <p className="text-xs text-destructive">{errors.paisDestino.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ciudad destino</Label>
                    <Input {...register('ciudadDestino')} placeholder="Opcional" />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label>Peso mín (kg) *</Label>
                <Input {...register('pesoMinKg')} type="number" step="0.001" placeholder="0" />
                {errors.pesoMinKg && <p className="text-xs text-destructive">{errors.pesoMinKg.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Peso máx (kg)</Label>
                <Input {...register('pesoMaxKg')} type="number" step="0.001" placeholder="sin límite" />
              </div>
              <div className="space-y-1.5">
                <Label>Tarifa base ($) *</Label>
                <Input {...register('tarifa')} type="number" step="1" placeholder="4850" />
                {errors.tarifa && <p className="text-xs text-destructive">{errors.tarifa.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>$/kg adicional</Label>
                <Input {...register('tarifaKgAdicional')} type="number" step="1" placeholder="Opcional" />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={closeAdd}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar eliminación */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar tramo</DialogTitle>
            <DialogDescription>
              {deleteTarget && `¿Eliminar el tramo ${formatPeso(deleteTarget.pesoMinKg)} – ${formatPeso(deleteTarget.pesoMaxKg)} (${formatPrecio(deleteTarget.tarifa)})?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const createSchema = z.object({
  codigo:                   z.string().min(1, 'Requerido').max(50),
  nombre:                   z.string().min(2).max(200),
  descripcion:              z.string().nullable().optional(),
  tipo:                     z.enum(['nacional', 'internacional_ms', 'internacional_courier', 'apartado_postal', 'alistamiento'] as const),
  requiere_estampilla:      z.boolean().default(false),
  requiere_dimensiones:     z.boolean().default(false),
  requiere_valor_declarado: z.boolean().default(false),
  peso_maximo_kg:           z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  factor_volumetrico:       z.preprocess((v) => v === '' ? 5000 : Number(v), z.number().int().positive()).default(5000),
  tiempo_entrega_dias:      z.preprocess((v) => v === '' ? null : Number(v), z.number().int().positive().nullable()).optional(),
  codigo_sigma:             z.string().max(50).nullable().optional(),
  minimo_seguro_postal:     z.preprocess((v) => v === '' ? null : Number(v), z.number().min(0).nullable()).optional(),
  alto_max_cm:              z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  ancho_max_cm:             z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  largo_max_cm:             z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
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
  minimo_seguro_postal:     z.preprocess((v) => v === '' ? null : Number(v), z.number().min(0).nullable()).optional(),
  alto_max_cm:              z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  ancho_max_cm:             z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
  largo_max_cm:             z.preprocess((v) => v === '' ? null : Number(v), z.number().positive().nullable()).optional(),
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
      minimo_seguro_postal:     servicio.minimoSeguroPostal ?? ('' as any),
      alto_max_cm:              servicio.altoMaxCm ?? ('' as any),
      ancho_max_cm:             servicio.anchoMaxCm ?? ('' as any),
      largo_max_cm:             servicio.largoMaxCm ?? ('' as any),
    } as any : {
      tipo: 'nacional',
      requiere_estampilla: false,
      requiere_dimensiones: false,
      requiere_valor_declarado: false,
      factor_volumetrico: 5000,
    } as any)
  }, [open, servicio])

  const tipoValue = watch('tipo')
  const estampilla = watch('requiere_estampilla')
  const dimensiones = watch('requiere_dimensiones')
  const valorDeclarado = watch('requiere_valor_declarado')

  // Smart factor default: 5000 nacional, 6000 internacional (UPU estándar)
  useEffect(() => {
    if (isEdit) return
    setValue('factor_volumetrico', tipoValue?.startsWith('internacional') ? 6000 : 5000)
  }, [tipoValue, isEdit])

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
              <Input {...register('factor_volumetrico')} type="number" step="1" placeholder="5000" />
              <p className="text-xs text-muted-foreground">Nacional: 5000 · Internacional: 6000</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tiempo entrega (días)</Label>
              <Input {...register('tiempo_entrega_dias')} type="number" step="1" placeholder="5" />
            </div>
            <div className="space-y-1.5">
              <Label>Código SIGMA</Label>
              <Input {...register('codigo_sigma')} placeholder="SIG-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Mínimo seguro postal (COP)</Label>
              <Input {...register('minimo_seguro_postal')} type="number" step="1" placeholder="500" />
            </div>
          </div>

          <Separator />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dimensiones máximas</p>
          <p className="text-xs text-muted-foreground -mt-2">Dejar en blanco si no hay restricción</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Alto máx (cm)</Label>
              <Input {...register('alto_max_cm')} type="number" step="0.1" placeholder="—" />
            </div>
            <div className="space-y-1.5">
              <Label>Ancho máx (cm)</Label>
              <Input {...register('ancho_max_cm')} type="number" step="0.1" placeholder="—" />
            </div>
            <div className="space-y-1.5">
              <Label>Largo máx (cm)</Label>
              <Input {...register('largo_max_cm')} type="number" step="0.1" placeholder="—" />
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

  const [buscar,         setBuscar]         = useState('')
  const [filterTipo,     setFilterTipo]     = useState('_all')
  const [filterActivo,   setFilterActivo]   = useState('_all')
  const [page,           setPage]           = useState(1)
  const [formOpen,       setFormOpen]       = useState(false)
  const [editServicio,   setEditServicio]   = useState<ServicioResponse | null>(null)
  const [toggleTarget,   setToggleTarget]   = useState<ServicioResponse | null>(null)
  const [tarifasServicio, setTarifasServicio] = useState<ServicioResponse | null>(null)
  const [tarifasOpen,    setTarifasOpen]    = useState(false)

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
  function openTarifas(s: ServicioResponse) { setTarifasServicio(s); setTarifasOpen(true) }
  function closeTarifas() { setTarifasOpen(false); setTarifasServicio(null) }

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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openTarifas(s)}>
                          <DollarSign className="mr-2 size-3.5" />Tarifas
                        </DropdownMenuItem>
                        {canWrite && (
                          <>
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
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      <TarifasPanel
        servicio={tarifasServicio}
        open={tarifasOpen}
        onClose={closeTarifas}
        canWrite={canWrite}
      />

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
