import { useMemo, useState } from 'react'
import { Building2, Clock, Mail, MapPin, Phone, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type DireccionFrecuente, useDireccionesFrecuentes } from '@/queries/ventas.queries'

interface Props {
  open:       boolean
  onClose:    () => void
  clienteId:  number
  rol:        'remitente' | 'destinatario'
  onSelect:   (d: DireccionFrecuente) => void
}

type TabRol = 'todos' | 'remitente' | 'destinatario'

export function DireccionFrecuenteModal({ open, onClose, clienteId, rol, onSelect }: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [tabRol, setTabRol] = useState<TabRol>(rol)

  // Fetch all directions (no rol filter) so the user can see both tabs
  const { data, isLoading } = useDireccionesFrecuentes(open ? clienteId : 0)

  const filtradas = useMemo(() => {
    if (!data) return []
    let lista = data
    if (tabRol !== 'todos') lista = lista.filter((d) => d.rol === tabRol)
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      lista = lista.filter(
        (d) =>
          d.nombre.toLowerCase().includes(q) ||
          d.telefono?.toLowerCase().includes(q) ||
          d.ciudad?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q) ||
          d.empresa?.toLowerCase().includes(q),
      )
    }
    return lista
  }, [data, tabRol, busqueda])

  function handleSelect(d: DireccionFrecuente) {
    onSelect(d)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" />
            Historial de direcciones — selecciona para autocompletar
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-3 border-b px-6 py-3">
          <Tabs value={tabRol} onValueChange={(v) => setTabRol(v as TabRol)}>
            <TabsList className="h-8">
              <TabsTrigger value="todos" className="px-3 text-xs">
                Todos
                {data && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                    {data.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="remitente" className="px-3 text-xs">
                Remitentes
                {data && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                    {data.filter((d) => d.rol === 'remitente').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="destinatario" className="px-3 text-xs">
                Destinatarios
                {data && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px]">
                    {data.filter((d) => d.rol === 'destinatario').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Input
            placeholder="Buscar por nombre, teléfono, ciudad, email…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="h-8 max-w-xs text-xs"
          />

          <span className="ml-auto text-xs text-muted-foreground">
            {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading && (
            <div className="space-y-2 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          )}

          {!isLoading && filtradas.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <Clock className="size-10 text-muted-foreground/40" />
              {data && data.length === 0 ? (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    Aún no hay direcciones guardadas para este cliente
                  </p>
                  <p className="max-w-xs text-xs text-muted-foreground/70">
                    Las direcciones se guardan automáticamente cada vez que se crea un envío.
                    Registra el primer envío y aquí aparecerán los remitentes y destinatarios
                    para reutilizarlos en el futuro.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin resultados para «{busqueda}»
                </p>
              )}
            </div>
          )}

          {!isLoading && filtradas.length > 0 && (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-24 text-xs">Rol</TableHead>
                  <TableHead className="text-xs">Nombre / Empresa</TableHead>
                  <TableHead className="text-xs">Teléfono</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Ciudad</TableHead>
                  <TableHead className="text-xs">Dirección</TableHead>
                  <TableHead className="w-16 text-center text-xs">Usos</TableHead>
                  <TableHead className="w-24 text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-accent/60"
                    onClick={() => handleSelect(d)}
                  >
                    <TableCell className="py-2">
                      <Badge
                        variant={d.rol === 'remitente' ? 'default' : 'secondary'}
                        className="text-[10px] font-normal"
                      >
                        {d.rol === 'remitente' ? 'Remitente' : 'Destinatario'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <User className="size-3 shrink-0 text-muted-foreground" />
                          {d.nombre}
                        </span>
                        {d.empresa && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Building2 className="size-3 shrink-0" />
                            {d.empresa}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      {d.telefono ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="size-3 shrink-0" />
                          {d.telefono}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {d.email ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3 shrink-0" />
                          {d.email}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {d.ciudad ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          {d.ciudad}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[180px] py-2">
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.direccion ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {d.usos}×
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-primary hover:text-primary"
                        onClick={(e) => { e.stopPropagation(); handleSelect(d) }}
                      >
                        Usar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t px-6 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
