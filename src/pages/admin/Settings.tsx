import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ToggleLeft, Plus, Pencil, Trash2, Loader2, AlertCircle,
  Users as UsersIcon, Search, X,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Switch }    from '@/components/ui/switch'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Checkbox }  from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  useFeatureFlags, useCreateFeatureFlag, useUpdateFeatureFlag, useDeleteFeatureFlag,
  useRolesDisponibles, useAsignarRolFlag, useRevocarRolFlag,
  useAsignarUsuarioFlag, useRevocarUsuarioFlag,
} from '@/queries/feature-flags.queries'
import { useUsers } from '@/queries/users.queries'
import { ApiError } from '@/lib/api'
import type { FeatureFlagResponse } from '@/types/api'

// ── Constantes ────────────────────────────────────────────────────────────────

const ENTORNO_VALUES = ['all', 'dev', 'staging', 'prod'] as const

const ENTORNO_LABELS: Record<string, string> = {
  all: 'Todos los ambientes',
  dev: 'Desarrollo',
  staging: 'Staging / QA',
  prod: 'Producción',
}

const ENTORNO_BADGE: Record<string, string> = {
  all: 'secondary',
  dev: 'outline',
  staging: 'outline',
  prod: 'default',
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  codigo:      z.string().min(2, 'Mínimo 2 caracteres').max(100)
    .regex(/^[a-z0-9_:]+$/, 'Solo minúsculas, números, _ y :'),
  descripcion: z.string().max(200).optional(),
  activo:      z.boolean(),
  entorno:     z.enum(ENTORNO_VALUES),
})

const updateSchema = z.object({
  descripcion: z.string().max(200).optional(),
  activo:      z.boolean(),
  entorno:     z.enum(ENTORNO_VALUES),
})

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

// ── Helpers ───────────────────────────────────────────────────────────────────

function segmentacionLabel(flag: FeatureFlagResponse) {
  if (flag.roles.length === 0 && flag.usuarios.length === 0) return 'Todos'
  const partes: string[] = []
  if (flag.roles.length > 0) partes.push(`${flag.roles.length} rol${flag.roles.length !== 1 ? 'es' : ''}`)
  if (flag.usuarios.length > 0) partes.push(`${flag.usuarios.length} usuario${flag.usuarios.length !== 1 ? 's' : ''}`)
  return partes.join(' + ')
}

// ── Segmentación (roles + usuarios) ──────────────────────────────────────────

function SegmentacionPanel({ flag }: { flag: FeatureFlagResponse }) {
  const { data: roles, isLoading: rolesLoading } = useRolesDisponibles()
  const asignarRol   = useAsignarRolFlag()
  const revocarRol   = useRevocarRolFlag()
  const asignarUser  = useAsignarUsuarioFlag()
  const revocarUser  = useRevocarUsuarioFlag()

  const [buscar, setBuscar] = useState('')
  const { data: resultados, isFetching: buscando } = useUsers({
    ...(buscar.length >= 2 ? { buscar } : {}),
    limite: 5,
  })

  const rolesAsignados = new Set(flag.roles.map((r) => r.id))
  const usuariosAsignados = new Set(flag.usuarios.map((u) => u.id))

  function toggleRol(rolId: number) {
    if (rolesAsignados.has(rolId)) revocarRol.mutate({ id: flag.id, rolId })
    else asignarRol.mutate({ id: flag.id, rolId })
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        Sin roles ni usuarios seleccionados, el flag aplica a <strong>todos</strong> los usuarios
        del entorno configurado. Al elegir al menos uno, solo esos roles/usuarios lo ven.
      </div>

      {/* Roles */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground tracking-wide">Roles</Label>
        {rolesLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-1.5">
            {(roles ?? []).filter((r) => r.activoroles).map((r) => (
              <label key={r.idroles} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={rolesAsignados.has(r.idroles)}
                  onCheckedChange={() => toggleRol(r.idroles)}
                  disabled={asignarRol.isPending || revocarRol.isPending}
                />
                {r.nombreroles}
                <span className="text-xs text-muted-foreground">({r.codigoroles})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Usuarios */}
      <div className="space-y-2">
        <Label className="text-xs uppercase text-muted-foreground tracking-wide">Usuarios específicos</Label>

        {usuariosAsignados.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {flag.usuarios.map((u) => (
              <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                {u.nombre}
                <button
                  type="button"
                  onClick={() => revocarUser.mutate({ id: flag.id, usuarioId: u.id })}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Quitar ${u.nombre}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Buscar usuario por nombre o correo…"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        {buscar.length >= 2 && (
          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
            {buscando ? (
              <div className="p-2 text-xs text-muted-foreground">Buscando…</div>
            ) : (resultados?.datos.filter((u) => !usuariosAsignados.has(Number(u.id))).length ?? 0) === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">Sin resultados.</div>
            ) : (
              resultados!.datos
                .filter((u) => !usuariosAsignados.has(Number(u.id)))
                .map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { asignarUser.mutate({ id: flag.id, usuarioId: Number(u.id) }); setBuscar('') }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-sm hover:bg-muted text-left"
                  >
                    <span>{u.nombre} <span className="text-xs text-muted-foreground">({u.email})</span></span>
                    <Plus className="size-3.5 text-muted-foreground" />
                  </button>
                ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Form de feature flag ─────────────────────────────────────────────────────

interface FeatureFlagFormProps {
  flag?: FeatureFlagResponse | null
  open: boolean
  onClose: () => void
}

function FeatureFlagForm({ flag, open, onClose }: FeatureFlagFormProps) {
  const isEdit = !!flag
  const createMutation = useCreateFeatureFlag()
  const updateMutation = useUpdateFeatureFlag()
  const isPending = createMutation.isPending || updateMutation.isPending
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver(isEdit ? updateSchema : createSchema) as never,
    defaultValues: {
      ...(isEdit ? {} : { codigo: '' }),
      descripcion: flag?.descripcion ?? '',
      activo:      flag?.activo ?? false,
      entorno:     flag?.entorno ?? 'all',
    },
  })

  useEffect(() => {
    if (!open) return
    setServerError(null)
    form.reset({
      ...(isEdit ? {} : { codigo: '' }),
      descripcion: flag?.descripcion ?? '',
      activo:      flag?.activo ?? false,
      entorno:     flag?.entorno ?? 'all',
    })
  }, [open, flag])

  async function onSubmit(values: CreateForm | UpdateForm) {
    setServerError(null)
    const descripcion = values.descripcion ? { descripcion: values.descripcion } : {}
    try {
      if (isEdit && flag) {
        await updateMutation.mutateAsync({
          id: flag.id,
          ...descripcion,
          activo: values.activo,
          entorno: values.entorno,
        })
      } else {
        const { codigo } = values as CreateForm
        await createMutation.mutateAsync({ ...descripcion, codigo, activo: values.activo, entorno: values.entorno })
        onClose()
      }
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Error inesperado. Intente de nuevo.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Editar módulo · ${flag?.codigo}` : 'Nuevo módulo'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Ajusta el estado, ambiente y segmentación de este feature flag.'
              : 'El código no se puede cambiar después de crearlo.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit as never)} className="px-4 pb-6 space-y-5">
          {serverError && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {serverError}
            </div>
          )}

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="ff-codigo">Código <span className="text-destructive">*</span></Label>
              <Input
                id="ff-codigo"
                placeholder="modulo_facturacion"
                {...form.register('codigo' as const)}
                aria-invalid={!!(form.formState.errors as Record<string, unknown>).codigo}
              />
              <p className="text-xs text-muted-foreground">Minúsculas, números, guion bajo y dos puntos.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ff-desc">Descripción</Label>
            <Input id="ff-desc" {...form.register('descripcion')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ff-entorno">Ambiente</Label>
            <Controller
              control={form.control}
              name="entorno"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="ff-entorno"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTORNO_VALUES.map((e) => (
                      <SelectItem key={e} value={e}>{ENTORNO_LABELS[e]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <Label htmlFor="ff-activo" className="font-medium">Módulo activo</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Interruptor maestro — si está apagado, nadie lo ve (ni la segmentación aplica).
              </p>
            </div>
            <Controller
              control={form.control}
              name="activo"
              render={({ field }) => (
                <Switch id="ff-activo" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
          </div>

          {isEdit && flag && (
            <>
              <Separator />
              <SegmentacionPanel flag={flag} />
            </>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t mt-8">
            <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {isEdit ? 'Guardar cambios' : 'Crear módulo'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Catálogo de feature flags ─────────────────────────────────────────────────

function FeatureFlagsCatalog() {
  const { data: flags, isLoading, isError } = useFeatureFlags()
  const deleteMutation = useDeleteFeatureFlag()

  const [formOpen, setFormOpen] = useState(false)
  const [editFlag, setEditFlag] = useState<FeatureFlagResponse | null>(null)
  const [deleteFlag, setDeleteFlag] = useState<FeatureFlagResponse | null>(null)

  function openCreate() { setEditFlag(null); setFormOpen(true) }
  function openEdit(f: FeatureFlagResponse) { setEditFlag(f); setFormOpen(true) }
  function closeForm() { setFormOpen(false); setEditFlag(null) }

  async function confirmDelete() {
    if (!deleteFlag) return
    await deleteMutation.mutateAsync(deleteFlag.id)
    setDeleteFlag(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {flags ? `${flags.length} módulo${flags.length !== 1 ? 's' : ''}` : 'Kill-switches y activación por ambiente/rol/usuario'}
        </p>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />Nuevo módulo
        </Button>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ambiente</TableHead>
              <TableHead>Segmentación</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="size-8 opacity-40 mx-auto mb-2" />
                  No se pudo cargar la lista de módulos.
                </TableCell>
              </TableRow>
            ) : !flags || flags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground text-sm">
                  Todavía no hay feature flags creados.
                </TableCell>
              </TableRow>
            ) : (
              flags.map((f) => (
                <TableRow key={f.id} className="group">
                  <TableCell className="font-mono text-sm">{f.codigo}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{f.descripcion ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={f.activo ? 'default' : 'secondary'}>
                      {f.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={(ENTORNO_BADGE[f.entorno] ?? 'outline') as 'default' | 'secondary' | 'outline'}>
                      {ENTORNO_LABELS[f.entorno] ?? f.entorno}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {(f.roles.length > 0 || f.usuarios.length > 0) && <UsersIcon className="size-3.5" />}
                      {segmentacionLabel(f)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex opacity-0 group-hover:opacity-100 gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => openEdit(f)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar" onClick={() => setDeleteFlag(f)}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <FeatureFlagForm flag={editFlag} open={formOpen} onClose={closeForm} />

      <Dialog open={!!deleteFlag} onOpenChange={(v) => !v && setDeleteFlag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar módulo</DialogTitle>
            <DialogDescription>
              ¿Eliminar el flag <strong>{deleteFlag?.codigo}</strong>? Se pierden también sus reglas de segmentación.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFlag(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuraciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Ajustes generales del sistema</p>
      </div>

      <Separator />

      <Tabs defaultValue="modulos">
        <TabsList className="mb-4">
          <TabsTrigger value="modulos" className="gap-1.5">
            <ToggleLeft className="size-3.5" />Módulos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modulos">
          <FeatureFlagsCatalog />
        </TabsContent>
      </Tabs>
    </div>
  )
}
