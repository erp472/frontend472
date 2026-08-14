import { useState } from 'react'
import { Plus, Pencil, Trash2, Tag, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Label }        from '@/components/ui/label'
import { Badge }        from '@/components/ui/badge'
import { Switch }       from '@/components/ui/switch'
import { Skeleton }     from '@/components/ui/skeleton'
import { Separator }    from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  useTiposCliente, useCreateTipoCliente, useUpdateTipoCliente, useDeleteTipoCliente,
  type TipoCliente,
} from '@/queries/clientes.queries'

// ── Formulario de tipo ────────────────────────────────────────────────────────

interface TipoForm {
  codigo: string; nombre: string; descuentoPorcentaje: string
  aplicaEstampillas: boolean; aplicaGirosSisben: boolean
  vigenciaInicio: string; vigenciaFin: string
}

const EMPTY: TipoForm = {
  codigo: '', nombre: '', descuentoPorcentaje: '0',
  aplicaEstampillas: false, aplicaGirosSisben: false,
  vigenciaInicio: '', vigenciaFin: '',
}

function TipoDialog({
  open, onClose, editing,
}: { open: boolean; onClose: () => void; editing: TipoCliente | null }) {
  const [form, setForm] = useState<TipoForm>(() =>
    editing ? {
      codigo:             editing.codigo,
      nombre:             editing.nombre,
      descuentoPorcentaje: editing.descuentoPorcentaje,
      aplicaEstampillas:  editing.aplicaEstampillas,
      aplicaGirosSisben:  editing.aplicaGirosSisben,
      vigenciaInicio:     editing.vigenciaInicio ?? '',
      vigenciaFin:        editing.vigenciaFin    ?? '',
    } : EMPTY,
  )

  const create = useCreateTipoCliente()
  const update = useUpdateTipoCliente(editing?.id ?? 0)
  const busy   = create.isPending || update.isPending

  const set = (k: keyof TipoForm) => (v: string | boolean) =>
    setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son obligatorios')
      return
    }
    try {
      const payload = {
        nombre:             form.nombre.trim(),
        descuentoPorcentaje: form.descuentoPorcentaje || '0',
        aplicaEstampillas:  form.aplicaEstampillas,
        aplicaGirosSisben:  form.aplicaGirosSisben,
        vigenciaInicio:     form.vigenciaInicio || null,
        vigenciaFin:        form.vigenciaFin    || null,
      }
      if (editing) {
        await update.mutateAsync(payload)
        toast.success('Tipo actualizado')
      } else {
        await create.mutateAsync({ codigo: form.codigo.trim().toUpperCase(), ...payload })
        toast.success('Tipo creado')
      }
      onClose()
    } catch {
      toast.error('No se pudo guardar el tipo de cliente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-[538px]">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar tipo de cliente' : 'Nuevo tipo de cliente'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input
                value={form.codigo}
                onChange={e => set('codigo')(e.target.value)}
                placeholder="POSTAL_RED"
                disabled={!!editing}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descuento (%)</Label>
              <Input
                type="number" min="0" max="100" step="0.5"
                value={form.descuentoPorcentaje}
                onChange={e => set('descuentoPorcentaje')(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={form.nombre}
              onChange={e => set('nombre')(e.target.value)}
              placeholder="Tarifa Postal Reducida"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vigencia inicio</Label>
              <Input type="date" value={form.vigenciaInicio} onChange={e => set('vigenciaInicio')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vigencia fin</Label>
              <Input type="date" value={form.vigenciaFin} onChange={e => set('vigenciaFin')(e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Aplica en estampillas</p>
                <p className="text-xs text-muted-foreground">El descuento aplica a productos de filatelia</p>
              </div>
              <Switch checked={form.aplicaEstampillas} onCheckedChange={v => set('aplicaEstampillas')(v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Aplica en giros SISBEN</p>
                <p className="text-xs text-muted-foreground">Tarifa reducida para giros a beneficiarios SISBEN</p>
              </div>
              <Switch checked={form.aplicaGirosSisben} onCheckedChange={v => set('aplicaGirosSisben')(v)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Crear tipo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Tarjeta de tipo ───────────────────────────────────────────────────────────

function TipoCard({
  tipo, onEdit, onDelete,
}: { tipo: TipoCliente; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border bg-card transition-colors',
      !tipo.activo && 'opacity-50',
    )}>
      <div className="flex items-center justify-center size-9 rounded-lg bg-primary/10 shrink-0 mt-0.5">
        <Tag className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{tipo.nombre}</span>
          <Badge variant="outline" className="text-[10px] font-mono">{tipo.codigo}</Badge>
          {!tipo.activo && <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
          <span className="text-xs text-muted-foreground">
            Descuento: <span className="text-foreground font-medium">{tipo.descuentoPorcentaje}%</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Estampillas:
            {tipo.aplicaEstampillas
              ? <CheckCircle2 className="size-3 text-emerald-600" />
              : <XCircle className="size-3 text-muted-foreground/40" />}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Giros SISBEN:
            {tipo.aplicaGirosSisben
              ? <CheckCircle2 className="size-3 text-emerald-600" />
              : <XCircle className="size-3 text-muted-foreground/40" />}
          </span>
        </div>
        {(tipo.vigenciaInicio || tipo.vigenciaFin) && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Vigencia: {tipo.vigenciaInicio ?? '—'} → {tipo.vigenciaFin ?? '∞'}
          </p>
        )}
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function TiposClientePage() {
  const { data: tipos = [], isLoading } = useTiposCliente()
  const deleteMut = useDeleteTipoCliente()

  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [editing,     setEditing]     = useState<TipoCliente | null>(null)
  const [toDelete,    setToDelete]    = useState<TipoCliente | null>(null)

  const openCreate = () => { setEditing(null); setDialogOpen(true) }
  const openEdit   = (t: TipoCliente) => { setEditing(t); setDialogOpen(true) }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await deleteMut.mutateAsync(toDelete.id)
      toast.success(`"${toDelete.nombre}" eliminado`)
    } catch {
      toast.error('No se pudo eliminar el tipo')
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <h1 className="text-lg font-semibold">Tipos de cliente</h1>
          <p className="text-xs text-muted-foreground">Categorías con beneficios y descuentos. Los clientes sin tipo son canal <strong>retail</strong></p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" /> Nuevo tipo
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : tipos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2">
            <Tag className="size-8 opacity-30" />
            No hay tipos de cliente — todos los clientes serán canal retail
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {/* Canal retail siempre visible como referencia */}
            <div className="flex items-start gap-3 p-4 rounded-lg border border-dashed bg-muted/30">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted shrink-0 mt-0.5">
                <Tag className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-muted-foreground">Canal Retail</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">retail</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sin descuentos. Asignado por defecto a clientes nuevos sin categoría.</p>
              </div>
            </div>
            {tipos.map(t => (
              <TipoCard key={t.id} tipo={t} onEdit={() => openEdit(t)} onDelete={() => setToDelete(t)} />
            ))}
          </div>
        )}
      </div>

      <TipoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={v => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{toDelete?.nombre}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Los clientes asignados a este tipo quedarán sin categoría (canal retail).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
