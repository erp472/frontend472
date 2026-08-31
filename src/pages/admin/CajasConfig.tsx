import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Vault, Pencil, Plus, Loader2, AlertCircle, Clock, Building2, Trash2,
  AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Badge }     from '@/components/ui/badge'
import { Skeleton }  from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  useListCajasPadres, useCreateCajaPadre, useUpdateCajaPadre, useDeleteCajaPadre,
  useDiagnosticoPunto,
  type CajaPadre, type ProblemaPunto,
} from '@/queries/cajas.queries'
import { useSucursales } from '@/queries/sucursales.queries'
import { DesglosePunto } from '@/components/DesglosePunto'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const fmt = (v: string | number | null | undefined) =>
  v != null && v !== '' ? COP.format(Number(v)) : '—'

const PROBLEMA_LABEL: Record<ProblemaPunto, string> = {
  sin_caja_fuerte:          'Sin Caja Fuerte',
  sin_supervisor:           'Sin supervisor',
  base_fuerte_excede_punto: 'Caja Fuerte sobre la base',
  reparto_excede_fuerte:    'Reparto sobre la Caja Fuerte',
}

// La configuración se guarda en tres pantallas distintas (punto, cajas, asignación)
// y ninguna ve a las otras: el diagnóstico es lo único que cruza las tres.
function DiagnosticoPunto({ cajaPadreId }: { cajaPadreId: number }) {
  const { data, isLoading } = useDiagnosticoPunto(cajaPadreId)

  if (isLoading) return <Skeleton className="h-5 w-24" />
  if (!data) return <span className="text-xs text-muted-foreground">—</span>

  if (data.problemas.length === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-600/40">
        <CheckCircle2 className="size-3" /> Coherente
      </Badge>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {data.problemas.map((p) => (
        <Badge key={p} variant="destructive" className="gap-1 text-[11px] font-normal">
          <AlertTriangle className="size-3" /> {PROBLEMA_LABEL[p]}
        </Badge>
      ))}
    </div>
  )
}

function DiagnosticoDetalle({ cajaPadreId }: { cajaPadreId: number }) {
  const { data } = useDiagnosticoPunto(cajaPadreId)
  if (!data) return null

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Diagnóstico del punto</p>
      <DesglosePunto data={data} />
      {data.problemas.length > 0 && (
        <ul className="space-y-1 pt-1">
          {data.problemas.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0 mt-px" />
              {PROBLEMA_LABEL[p]}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Sheet de edición ──────────────────────────────────────────────────────────

interface EditSheetProps {
  cajaPadre:  CajaPadre | null
  open:       boolean
  onClose:    () => void
  onDeleted:  () => void
}

function EditSheet({ cajaPadre, open, onClose, onDeleted }: EditSheetProps) {
  const [nombre,      setNombre]      = useState('')
  const [baseGeneral, setBaseGeneral] = useState('')
  const [horaReset,   setHoraReset]   = useState('')
  const [phase,       setPhase]       = useState<'edit' | 'delete'>('edit')
  const [deleteWord,  setDeleteWord]  = useState('')

  const update = useUpdateCajaPadre(cajaPadre?.id ?? 0)
  const remove = useDeleteCajaPadre(cajaPadre?.id ?? 0)

  useEffect(() => {
    if (!open || !cajaPadre) return
    setNombre(cajaPadre.nombre)
    setBaseGeneral(cajaPadre.baseGeneral)
    setHoraReset(cajaPadre.horaReset ?? '')
    setPhase('edit')
    setDeleteWord('')
  }, [open, cajaPadre])

  function handleClose() {
    setPhase('edit')
    setDeleteWord('')
    onClose()
  }

  async function handleSave() {
    if (!cajaPadre) return
    if (!nombre.trim()) { toast.error('El nombre no puede estar vacío'); return }
    const base = Number(baseGeneral)
    if (isNaN(base) || base < 0) { toast.error('Base inválida'); return }

    update.mutate(
      {
        nombre:      nombre.trim(),
        baseGeneral: String(base),
        ...(horaReset.trim() ? { horaReset: horaReset.trim() } : { horaReset: undefined }),
      },
      {
        onSuccess: () => { toast.success('Punto de caja actualizado'); handleClose() },
        onError:   (e) => toast.error(e.message),
      },
    )
  }

  async function handleDelete() {
    if (!cajaPadre || deleteWord !== 'Delete') return
    remove.mutate(undefined, {
      onSuccess: () => { toast.success('Punto eliminado'); onDeleted(); handleClose() },
      onError:   (e) => toast.error(e.message),
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        {cajaPadre && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Vault className="size-4 text-primary" />
                Editar punto de caja
              </SheetTitle>
              <SheetDescription>
                Sucursal ID {cajaPadre.sucursalId} · ID {cajaPadre.id}
              </SheetDescription>
            </SheetHeader>

            {phase === 'edit' ? (
              <div className="mt-6 space-y-5">
                <DiagnosticoDetalle cajaPadreId={cajaPadre.id} />

                <div className="space-y-1.5">
                  <Label htmlFor="edit-nombre">Nombre del punto</Label>
                  <Input
                    id="edit-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Punto Bogotá Centro"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-base">Base general ($)</Label>
                  <Input
                    id="edit-base"
                    type="number"
                    min="0"
                    step="100000"
                    value={baseGeneral}
                    onChange={(e) => setBaseGeneral(e.target.value)}
                    className="tabular-nums"
                  />
                  {baseGeneral && Number(baseGeneral) >= 0 && (
                    <p className="text-xs text-muted-foreground tabular-nums">{fmt(baseGeneral)}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Monto máximo asignado al punto. Solo ADMIN_SISTEMA puede modificarlo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-hora" className="flex items-center gap-1.5">
                    <Clock className="size-3.5" /> Hora de reset automático
                  </Label>
                  <Input
                    id="edit-hora"
                    type="time"
                    value={horaReset}
                    onChange={(e) => setHoraReset(e.target.value)}
                    className="tabular-nums"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Dejar vacío para deshabilitar el cierre automático.
                  </p>
                </div>

                <Button
                  className="w-full"
                  disabled={update.isPending}
                  onClick={handleSave}
                >
                  {update.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Guardar cambios
                </Button>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Zona de peligro</p>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setPhase('delete')}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Eliminar punto de caja
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-1.5">
                  <p className="text-sm font-medium text-destructive">
                    Eliminar "{cajaPadre.nombre}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Esta acción es irreversible. Se eliminará el punto y todas sus cajas asociadas
                    quedarán sin punto padre.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Escribe <code className="font-mono bg-muted px-1 py-0.5 rounded">Delete</code> para confirmar
                  </Label>
                  <Input
                    value={deleteWord}
                    onChange={(e) => setDeleteWord(e.target.value)}
                    placeholder="Delete"
                    className="font-mono"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setPhase('edit'); setDeleteWord('') }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={deleteWord !== 'Delete' || remove.isPending}
                    onClick={handleDelete}
                  >
                    {remove.isPending && <Loader2 className="mr-2 size-3.5 animate-spin" />}
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ── Dialog crear punto ────────────────────────────────────────────────────────

interface CrearDialogProps {
  open:    boolean
  onClose: () => void
}

function CrearDialog({ open, onClose }: CrearDialogProps) {
  const [sucursalId,  setSucursalId]  = useState('')
  const [nombre,      setNombre]      = useState('')
  const [baseGeneral, setBaseGeneral] = useState('')
  const [horaReset,   setHoraReset]   = useState('')

  const crear = useCreateCajaPadre()
  const { data: sucsPage, isLoading: loadingSucs } = useSucursales({ activo: true, limite: 200 })
  const sucursales = sucsPage?.datos ?? []

  function reset() {
    setSucursalId(''); setNombre(''); setBaseGeneral(''); setHoraReset('')
  }

  async function handleCrear() {
    if (!sucursalId) { toast.error('Selecciona una sucursal'); return }
    if (!nombre.trim()) { toast.error('El nombre es requerido'); return }
    const base = Number(baseGeneral)
    if (isNaN(base) || base < 0) { toast.error('Base inválida'); return }

    crear.mutate(
      {
        sucursalId:  Number(sucursalId),
        nombre:      nombre.trim(),
        baseGeneral: String(base),
        ...(horaReset.trim() ? { horaReset: horaReset.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Punto de caja creado')
          reset()
          onClose()
        },
        onError: (e) => toast.error(e.message),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vault className="size-4 text-primary" />
            Nuevo punto de caja
          </DialogTitle>
          <DialogDescription>
            Solo ADMIN_SISTEMA puede crear puntos de caja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Sucursal</Label>
            {loadingSucs ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select value={sucursalId} onValueChange={setSucursalId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccionar sucursal…" />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nombre}
                      <span className="ml-2 text-muted-foreground font-mono text-xs">{s.codigo}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crear-nombre">Nombre del punto</Label>
            <Input
              id="crear-nombre"
              placeholder="Ej. Punto Bogotá Centro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crear-base">Base general ($)</Label>
            <Input
              id="crear-base"
              type="number"
              min="0"
              step="100000"
              placeholder="0"
              value={baseGeneral}
              onChange={(e) => setBaseGeneral(e.target.value)}
              className="tabular-nums"
            />
            {baseGeneral && Number(baseGeneral) > 0 && (
              <p className="text-xs text-muted-foreground tabular-nums">{fmt(baseGeneral)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="crear-hora" className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> Hora de reset (opcional)
            </Label>
            <Input
              id="crear-hora"
              type="time"
              value={horaReset}
              onChange={(e) => setHoraReset(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Cancelar</Button>
          <Button onClick={handleCrear} disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Crear punto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CajasConfig() {
  const [editTarget, setEditTarget] = useState<CajaPadre | null>(null)
  const [crearOpen,  setCrearOpen]  = useState(false)

  const { data: cajas, isLoading, isError, refetch } = useListCajasPadres()

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Vault className="size-6 text-primary" />
            Configuración de Puntos de Caja
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define la base general (caja madre) de cada punto. Solo visible para ADMIN_SISTEMA.
          </p>
        </div>
        <Button onClick={() => setCrearOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Nuevo punto
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Nombre del punto</TableHead>
              <TableHead>Sucursal ID</TableHead>
              <TableHead className="text-right">Base general</TableHead>
              <TableHead>Reset automático</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-8 opacity-40" />
                    <p className="text-sm">No se pudo cargar la configuración</p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                      Reintentar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : !cajas || cajas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="size-8 opacity-30" />
                    <p className="text-sm">No hay puntos de caja configurados</p>
                    <Button size="sm" onClick={() => setCrearOpen(true)}>
                      <Plus className="size-3.5 mr-1" /> Crear el primero
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              cajas.map((c) => (
                <TableRow key={c.id} className="group">
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">{c.id}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.sucursalId}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-primary">
                    {fmt(c.baseGeneral)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.horaReset ? (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {c.horaReset.slice(0, 5)}
                      </span>
                    ) : (
                      <span className="italic">Sin reset</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DiagnosticoPunto cajaPadreId={c.id} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditTarget(c)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && !isError && cajas && cajas.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{cajas.length} punto{cajas.length !== 1 ? 's' : ''} de caja</span>
            <span className="tabular-nums">
              Total bases:{' '}
              <strong className="text-foreground">
                {fmt(cajas.reduce((s, c) => s + Number(c.baseGeneral), 0))}
              </strong>
            </span>
          </div>
        )}
      </div>

      <EditSheet
        cajaPadre={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onDeleted={() => setEditTarget(null)}
      />

      <CrearDialog
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
      />
    </div>
  )
}
