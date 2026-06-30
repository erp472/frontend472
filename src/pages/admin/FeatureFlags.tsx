import { useState } from 'react'
import { toast } from 'sonner'
import {
  useFeatureFlags,
  useToggleFeatureFlag,
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  type Entorno,
} from '@/queries/feature-flags.queries'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2, Plus } from 'lucide-react'

const ENTORNOS: Entorno[] = ['all', 'dev', 'staging', 'prod']

const entornoBadge: Record<Entorno, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  all:     'default',
  dev:     'secondary',
  staging: 'outline',
  prod:    'destructive',
}

export default function FeatureFlags() {
  const { data: flags, isLoading } = useFeatureFlags()
  const toggle = useToggleFeatureFlag()
  const create = useCreateFeatureFlag()
  const remove = useDeleteFeatureFlag()

  const [open, setOpen]           = useState(false)
  const [codigo, setCodigo]       = useState('')
  const [descripcion, setDesc]    = useState('')
  const [entorno, setEntorno]     = useState<Entorno>('all')

  function handleCreate() {
    if (!codigo.trim()) return
    create.mutate(
      { codigo: codigo.trim(), descripcion: descripcion.trim() || undefined, entorno },
      {
        onSuccess: () => { setOpen(false); setCodigo(''); setDesc(''); setEntorno('all') },
        onError:   (e) => toast.error(e.message),
      },
    )
  }

  function handleToggle(id: string, activo: boolean) {
    toggle.mutate({ id, activo }, { onError: (e) => toast.error(e.message) })
  }

  function handleDelete(id: string, cod: string) {
    if (!confirm(`¿Eliminar el flag "${cod}"?`)) return
    remove.mutate(id, { onError: (e) => toast.error(e.message) })
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feature Flags</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Activa o desactiva funcionalidades por entorno sin redesplegar.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nuevo flag
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Entorno</TableHead>
              <TableHead className="text-center">Activo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : flags?.map((ff) => (
                  <TableRow key={ff.id}>
                    <TableCell className="font-mono text-sm">{ff.codigo}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ff.descripcion ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={entornoBadge[ff.entorno]}>{ff.entorno}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={ff.activo}
                        onCheckedChange={(v) => handleToggle(ff.id, v)}
                        disabled={toggle.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(ff.id, ff.codigo)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
            }
            {!isLoading && flags?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay flags configurados. Crea el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Código</label>
              <Input
                placeholder="ej: ventas:nueva_ui"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Solo minúsculas, números, _ y :</p>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                placeholder="Para qué sirve este flag..."
                value={descripcion}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Entorno</label>
              <Select value={entorno} onValueChange={(v) => setEntorno(v as Entorno)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTORNOS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!codigo.trim() || create.isPending}>
              Crear flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
