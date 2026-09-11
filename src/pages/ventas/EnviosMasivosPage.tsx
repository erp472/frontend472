import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Table2,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  type AgregarItemPayload,
  type ItemMasivo,
  type RemitentePayload,
  descargarGuiasPdf,
  useAgregarItemMasivo,
  useEliminarLoteMasivo,
  useCrearLoteMasivo,
  useEliminarItemMasivo,
  useGenerarGuiasPdf,
  useImportarCsvMasivo,
  useLoteMasivo,
  useLotesMasivos,
} from '@/queries/envios-masivos.queries'
import { descargarGuiaEnvioPdf } from '@/queries/ventas.queries'
import { useStatusPunto } from '@/queries/cajas.queries'
import { useServicios } from '@/queries/servicios.queries'
import { useSessionStore } from '@/stores/useSessionStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const fmt = (v: number) => COP.format(v)

const ESTADO_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  borrador:   { label: 'Borrador',   variant: 'secondary' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  anulado:    { label: 'Anulado',    variant: 'destructive' },
}

type ModoRemitente = 'compartido' | 'individual'

function emptyRem(): RemitentePayload { return { nombre: '' } }

// ── TablaEntradaRapida — tipos y constantes ───────────────────────────────────

type FilaEditable = {
  id:         string
  remNombre:  string; remDoc:  string; remCiudad:  string
  destNombre: string; destDoc: string; destCiudad: string
  destPais:   string; destDir: string; destTel:    string
  peso:       string; contenido: string
  error?:     string
}

type ColDef = {
  key:         keyof Omit<FilaEditable, 'id' | 'error'>
  label:       string
  placeholder: string
  width:       string
  required?:   boolean
  type?:       'text' | 'number'
  maxLen?:     number
}

const COLS_COMPARTIDO: ColDef[] = [
  { key: 'destNombre', label: 'Nombre *',    placeholder: 'Destinatario',   width: 'min-w-[140px]', required: true },
  { key: 'destDoc',    label: 'Documento',   placeholder: 'CC / NIT',       width: 'min-w-[100px]' },
  { key: 'destCiudad', label: 'Ciudad',      placeholder: 'Ciudad',         width: 'min-w-[100px]' },
  { key: 'destPais',   label: 'País',        placeholder: 'CO',             width: 'w-14',          maxLen: 2 },
  { key: 'destDir',    label: 'Dirección',   placeholder: 'Dirección',      width: 'min-w-[140px]' },
  { key: 'destTel',    label: 'Teléfono',    placeholder: 'Teléfono',       width: 'min-w-[100px]' },
  { key: 'peso',       label: 'Peso kg *',   placeholder: '0.500',          width: 'w-20',          required: true, type: 'number' },
  { key: 'contenido',  label: 'Contenido',   placeholder: 'Descripción',    width: 'min-w-[120px]' },
]

const COLS_INDIVIDUAL: ColDef[] = [
  { key: 'remNombre',  label: 'Rem. Nombre *', placeholder: 'Remitente',    width: 'min-w-[120px]', required: true },
  { key: 'remDoc',     label: 'Rem. Doc.',      placeholder: 'CC / NIT',    width: 'min-w-[90px]' },
  { key: 'remCiudad',  label: 'Rem. Ciudad',    placeholder: 'Ciudad',      width: 'min-w-[90px]' },
  ...COLS_COMPARTIDO,
]

function nuevaFila(): FilaEditable {
  return {
    id: crypto.randomUUID(),
    remNombre: '', remDoc: '', remCiudad: '',
    destNombre: '', destDoc: '', destCiudad: '',
    destPais: 'CO', destDir: '', destTel: '',
    peso: '', contenido: '',
  }
}

// ── TablaEntradaRapida ────────────────────────────────────────────────────────

function TablaEntradaRapida({
  loteId,
  modoIndividual,
  onGuardado,
  onCerrar,
}: {
  loteId:         number
  modoIndividual: boolean
  onGuardado:     () => void
  onCerrar:       () => void
}) {
  const [filas, setFilas]       = useState<FilaEditable[]>(() => Array.from({ length: 5 }, nuevaFila))
  const [guardando, setGuardando] = useState(false)
  const [progreso, setProgreso]   = useState({ actual: 0, total: 0 })
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const agregar  = useAgregarItemMasivo(loteId)

  const cols = modoIndividual ? COLS_INDIVIDUAL : COLS_COMPARTIDO

  const setRef = (row: number, col: number) => (el: HTMLInputElement | null) => {
    const key = `${row}-${col}`
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }

  const focusCell = (row: number, col: number) =>
    cellRefs.current.get(`${row}-${col}`)?.focus()

  const updateFila = (id: string, field: string, value: string) =>
    setFilas(prev => prev.map(f => f.id === id ? { ...f, [field]: value, error: undefined } : f))

  const addFilas = (n = 5) =>
    setFilas(prev => [...prev, ...Array.from({ length: n }, nuevaFila)])

  const removeFila = (id: string) =>
    setFilas(prev => prev.length > 1 ? prev.filter(f => f.id !== id) : prev)

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (rowIdx === filas.length - 1) {
        setFilas(prev => [...prev, nuevaFila()])
        setTimeout(() => focusCell(rowIdx + 1, colIdx), 20)
      } else {
        focusCell(rowIdx + 1, colIdx)
      }
    }
    // Tab al último campo de la última fila → nueva fila
    if (e.key === 'Tab' && !e.shiftKey && rowIdx === filas.length - 1 && colIdx === cols.length - 1) {
      e.preventDefault()
      setFilas(prev => [...prev, nuevaFila()])
      setTimeout(() => focusCell(rowIdx + 1, 0), 20)
    }
  }

  const handlePaste = (e: React.ClipboardEvent, rowIdx: number, colIdx: number) => {
    const text = e.clipboardData.getData('text')
    // Solo interceptar si hay múltiples celdas (TSV de Excel / Sheets)
    if (!text.includes('\t') && !text.includes('\n')) return
    e.preventDefault()

    const pastedRows = text.replace(/\r\n/g, '\n').trim().split('\n')
    setFilas(prev => {
      const updated = [...prev]
      pastedRows.forEach((pastedRow, ri) => {
        const targetRow = rowIdx + ri
        const cells = pastedRow.split('\t')
        if (targetRow >= updated.length) updated.push(nuevaFila())
        const fila: FilaEditable = { ...updated[targetRow] }
        cells.forEach((cell, ci) => {
          const targetCol = colIdx + ci
          if (targetCol < cols.length) {
            (fila as Record<string, string>)[cols[targetCol].key] = cell.trim()
          }
        })
        updated[targetRow] = fila
      })
      return updated
    })
  }

  const filasConDatos = filas.filter(f => f.destNombre.trim() && Number(f.peso) > 0)

  const handleGuardar = async () => {
    // Validar antes de enviar
    let hasErrors = false
    const validated = filas.map(fila => {
      if (!fila.destNombre.trim()) return fila // fila vacía — ignorar
      const peso = Number(fila.peso)
      const errs: string[] = []
      if (!peso || peso <= 0) errs.push('peso inválido')
      if (modoIndividual && !fila.remNombre.trim()) errs.push('remitente requerido')
      if (errs.length) { hasErrors = true; return { ...fila, error: errs.join(' · ') } }
      return fila
    })
    if (hasErrors) { setFilas(validated); return }

    const porGuardar = filas.filter(f => f.destNombre.trim() && Number(f.peso) > 0)
    if (!porGuardar.length) { toast.error('No hay filas con datos completos'); return }

    setGuardando(true)
    setProgreso({ total: porGuardar.length, actual: 0 })
    let exitos = 0

    for (const fila of porGuardar) {
      try {
        await agregar.mutateAsync({
          ...(modoIndividual ? {
            remitente: {
              nombre:    fila.remNombre,
              documento: fila.remDoc    || undefined,
              ciudad:    fila.remCiudad || undefined,
            },
          } : {}),
          destinatarioNombre:    fila.destNombre,
          destinatarioDocumento: fila.destDoc    || undefined,
          destinatarioCiudad:    fila.destCiudad || undefined,
          destinatarioPais:      fila.destPais   || 'CO',
          destinatarioDireccion: fila.destDir    || undefined,
          destinatarioTelefono:  fila.destTel    || undefined,
          pesoFisicoKg:          Number(fila.peso),
          contenido:             fila.contenido  || undefined,
        })
        exitos++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error'
        toast.error(`"${fila.destNombre}": ${msg}`)
      }
      setProgreso(p => ({ ...p, actual: p.actual + 1 }))
    }

    setGuardando(false)
    if (exitos > 0) {
      toast.success(`${exitos} envío(s) agregado(s)`)
      setFilas(Array.from({ length: 5 }, nuevaFila))
      onGuardado()
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-md border bg-background">
      {/* Cabecera */}
      <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Entrada rápida</span>
          <span className="text-xs text-muted-foreground">
            {filasConDatos.length > 0 ? `${filasConDatos.length} fila(s) con datos` : 'sin datos aún'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addFilas(5)}>
            <Plus className="mr-1 h-3.5 w-3.5" />5 filas
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onCerrar}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabla editable */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-muted/60">
            <tr>
              <th className="w-8 border-b border-r px-1.5 py-1.5 text-center text-muted-foreground">#</th>
              {cols.map(col => (
                <th
                  key={col.key}
                  className={cn('border-b border-r px-2 py-1.5 text-left font-medium whitespace-nowrap', col.width)}
                >
                  {col.label}
                </th>
              ))}
              <th className="w-7 border-b" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, rowIdx) => (
              <tr key={fila.id} className={cn('group border-b last:border-0', fila.error && 'bg-destructive/5')}>
                <td className="border-r px-1.5 text-center text-muted-foreground tabular-nums">{rowIdx + 1}</td>
                {cols.map((col, colIdx) => (
                  <td key={col.key} className={cn('border-r p-0', col.width)}>
                    <input
                      ref={setRef(rowIdx, colIdx)}
                      type={col.type ?? 'text'}
                      step={col.type === 'number' ? '0.001' : undefined}
                      min={col.type === 'number' ? '0.001' : undefined}
                      maxLength={col.maxLen}
                      placeholder={col.placeholder}
                      value={(fila as Record<string, string>)[col.key]}
                      onChange={e => updateFila(fila.id, col.key, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, rowIdx, colIdx)}
                      onPaste={e => handlePaste(e, rowIdx, colIdx)}
                      className={cn(
                        'w-full bg-transparent px-1.5 py-1 outline-none',
                        'focus:bg-primary/5 focus:ring-1 focus:ring-inset focus:ring-primary',
                        col.required && fila.error && !(fila as Record<string, string>)[col.key]?.trim()
                          && 'bg-destructive/10',
                      )}
                    />
                  </td>
                ))}
                <td className="px-1 py-0.5 text-center">
                  <button
                    onClick={() => removeFila(fila.id)}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pie */}
      <div className="flex shrink-0 items-center justify-between border-t bg-muted/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border px-1 font-mono">Tab</kbd> · <kbd className="rounded border px-1 font-mono">Enter</kbd> para navegar · Pegar desde Excel/Sheets
        </p>
        <Button
          size="sm"
          onClick={handleGuardar}
          disabled={guardando || filasConDatos.length === 0}
        >
          {guardando ? (
            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />{progreso.actual}/{progreso.total}</>
          ) : (
            <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Guardar {filasConDatos.length} envío(s)</>
          )}
        </Button>
      </div>
    </div>
  )
}

// ── RemitenteForm ─────────────────────────────────────────────────────────────

function RemitenteForm({
  value,
  onChange,
  label,
  compact = false,
}: {
  value:    RemitentePayload
  onChange: (v: RemitentePayload) => void
  label?:   string
  compact?: boolean
}) {
  const set = (k: keyof RemitentePayload, v: string) =>
    onChange({ ...value, [k]: v || undefined })

  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>}
      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
        <div className="space-y-1">
          <Label className="text-xs">Nombre *</Label>
          <Input
            placeholder="Nombre o razón social"
            value={value.nombre}
            onChange={e => onChange({ ...value, nombre: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Documento</Label>
          <Input
            placeholder="CC / NIT"
            value={value.documento ?? ''}
            onChange={e => set('documento', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ciudad</Label>
          <Input
            placeholder="Ciudad de origen"
            value={value.ciudad ?? ''}
            onChange={e => set('ciudad', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dirección</Label>
          <Input
            placeholder="Dirección"
            value={value.direccion ?? ''}
            onChange={e => set('direccion', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Teléfono</Label>
          <Input
            placeholder="Teléfono"
            value={value.telefono ?? ''}
            onChange={e => set('telefono', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Email</Label>
          <Input
            placeholder="Email"
            type="email"
            value={value.email ?? ''}
            onChange={e => set('email', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )
}

// ── DestinatarioInlineRow ─────────────────────────────────────────────────────

function ItemRow({
  item,
  loteId,
  modoIndividual,
  isPagado,
  onDeleted,
}: {
  item:           ItemMasivo
  loteId:         number
  modoIndividual: boolean
  isPagado:       boolean
  onDeleted:      () => void
}) {
  const [expanded,    setExpanded]    = useState(false)
  const [descargando, setDescargando] = useState(false)
  const eliminar = useEliminarItemMasivo(loteId)

  const handleDelete = async () => {
    await eliminar.mutateAsync(item.id)
    onDeleted()
  }

  const handleDescargarGuia = async () => {
    if (!item.envioId) return
    setDescargando(true)
    try {
      await descargarGuiaEnvioPdf(item.envioId, item.guia?.numeroGuia)
    } catch {
      toast.error('No se pudo descargar la guía')
    } finally {
      setDescargando(false)
    }
  }

  const remitente = item.remitente

  return (
    <>
      <TableRow className="group">
        <TableCell className="w-8 text-center text-xs text-muted-foreground">{item.fila}</TableCell>
        {modoIndividual && (
          <TableCell className="text-sm">
            <div className="font-medium">{remitente?.nombre ?? <span className="text-muted-foreground italic">—</span>}</div>
            <div className="text-xs text-muted-foreground">{remitente?.ciudad}</div>
          </TableCell>
        )}
        <TableCell className="text-sm">
          <div className="font-medium">{item.destinatario.nombre}</div>
          <div className="text-xs text-muted-foreground">{item.destinatario.ciudad}</div>
          {item.guia?.numeroGuia && (
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {item.guia.numeroGuia}
            </div>
          )}
        </TableCell>
        <TableCell className="text-sm text-right tabular-nums">
          {item.calculo.pesoFisicoKg.toFixed(2)} kg
        </TableCell>
        <TableCell className="text-sm text-right tabular-nums font-medium">
          {fmt(item.calculo.valorTotal)}
        </TableCell>
        <TableCell className="w-20 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isPagado && item.envioId !== null && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDescargarGuia}
                disabled={descargando}
                title={item.guia?.numeroGuia ? `Descargar ${item.guia.numeroGuia}` : 'Descargar guía PDF'}
              >
                {descargando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(p => !p)}
            >
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
            {!isPagado && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={eliminar.isPending}
              >
                {eliminar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={modoIndividual ? 6 : 5} className="py-3">
            <div className="grid grid-cols-2 gap-4 text-xs px-2">
              {item.guia && (
                <div className="col-span-2">
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Guía postal</p>
                  <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">{item.guia.numeroGuia}</p>
                  <p>Estado: {item.guia.estado}</p>
                </div>
              )}
              {modoIndividual && remitente && (
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Remitente</p>
                  <p>{remitente.nombre}</p>
                  {remitente.documento && <p>Doc: {remitente.documento}</p>}
                  {remitente.direccion && <p>{remitente.direccion}</p>}
                  {remitente.ciudad    && <p>{remitente.ciudad}</p>}
                  {remitente.telefono  && <p>{remitente.telefono}</p>}
                  {remitente.email     && <p>{remitente.email}</p>}
                </div>
              )}
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Destinatario</p>
                <p>{item.destinatario.nombre}</p>
                {item.destinatario.documento && <p>Doc: {item.destinatario.documento}</p>}
                {item.destinatario.direccion && <p>{item.destinatario.direccion}</p>}
                {item.destinatario.ciudad    && <p>{item.destinatario.ciudad} ({item.destinatario.pais})</p>}
                {item.destinatario.telefono  && <p>{item.destinatario.telefono}</p>}
                {item.destinatario.email     && <p>{item.destinatario.email}</p>}
              </div>
              <div>
                <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Cálculo</p>
                <p>Peso físico: {item.calculo.pesoFisicoKg.toFixed(3)} kg</p>
                <p>Peso tarificado: {item.calculo.pesoTarificadoKg.toFixed(3)} kg</p>
                <p>Servicio: {fmt(item.calculo.valorServicio)}</p>
                {item.calculo.valorEstampillas > 0 && <p>Estampillas: {fmt(item.calculo.valorEstampillas)}</p>}
                <p className="font-semibold">Total: {fmt(item.calculo.valorTotal)}</p>
              </div>
              {item.contenido && (
                <div>
                  <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-1">Contenido</p>
                  <p>{item.contenido}</p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── AgregarItemDialog ─────────────────────────────────────────────────────────

function AgregarItemDialog({
  open,
  loteId,
  modoIndividual,
  onClose,
}: {
  open:           boolean
  loteId:         number
  modoIndividual: boolean
  onClose:        () => void
}) {
  const [rem, setRem]   = useState<RemitentePayload>(emptyRem())
  const [dest, setDest] = useState({
    destinatarioNombre:    '',
    destinatarioDocumento: '',
    destinatarioEmail:     '',
    destinatarioTelefono:  '',
    destinatarioDireccion: '',
    destinatarioCiudad:    '',
    destinatarioPais:      'CO',
    destinatarioCp:        '',
    pesoFisicoKg:          '' as string | number,
    contenido:             '',
  })

  const agregar = useAgregarItemMasivo(loteId)

  const handleSubmit = async () => {
    if (!dest.destinatarioNombre.trim()) {
      toast.error('El nombre del destinatario es requerido')
      return
    }
    const peso = Number(dest.pesoFisicoKg)
    if (!peso || peso <= 0) {
      toast.error('El peso debe ser mayor a 0')
      return
    }
    if (modoIndividual && !rem.nombre.trim()) {
      toast.error('El nombre del remitente es requerido en modo multi-origen')
      return
    }

    const payload: AgregarItemPayload = {
      ...(modoIndividual && { remitente: rem }),
      destinatarioNombre:    dest.destinatarioNombre.trim(),
      destinatarioDocumento: dest.destinatarioDocumento || undefined,
      destinatarioEmail:     dest.destinatarioEmail || undefined,
      destinatarioTelefono:  dest.destinatarioTelefono || undefined,
      destinatarioDireccion: dest.destinatarioDireccion || undefined,
      destinatarioCiudad:    dest.destinatarioCiudad || undefined,
      destinatarioPais:      dest.destinatarioPais || 'CO',
      destinatarioCp:        dest.destinatarioCp || undefined,
      pesoFisicoKg:          peso,
      contenido:             dest.contenido || undefined,
    }

    await agregar.mutateAsync(payload)
    toast.success('Envío agregado')
    setDest({
      destinatarioNombre: '', destinatarioDocumento: '', destinatarioEmail: '',
      destinatarioTelefono: '', destinatarioDireccion: '', destinatarioCiudad: '',
      destinatarioPais: 'CO', destinatarioCp: '', pesoFisicoKg: '', contenido: '',
    })
    if (modoIndividual) setRem(emptyRem())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar envío</DialogTitle>
          <DialogDescription>
            {modoIndividual
              ? 'Ingresa el remitente y destinatario para este envío.'
              : 'Ingresa los datos del destinatario. El remitente es el del lote.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 py-1">
            {modoIndividual && (
              <>
                <RemitenteForm value={rem} onChange={setRem} label="Remitente (origen)" />
                <Separator />
              </>
            )}

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destinatario</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Nombre *</Label>
                  <Input
                    placeholder="Nombre completo"
                    value={dest.destinatarioNombre}
                    onChange={e => setDest(p => ({ ...p, destinatarioNombre: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Documento</Label>
                  <Input
                    placeholder="CC / NIT"
                    value={dest.destinatarioDocumento}
                    onChange={e => setDest(p => ({ ...p, destinatarioDocumento: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ciudad</Label>
                  <Input
                    placeholder="Ciudad destino"
                    value={dest.destinatarioCiudad}
                    onChange={e => setDest(p => ({ ...p, destinatarioCiudad: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">País</Label>
                  <Input
                    placeholder="CO"
                    maxLength={2}
                    value={dest.destinatarioPais}
                    onChange={e => setDest(p => ({ ...p, destinatarioPais: e.target.value.toUpperCase() }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Dirección</Label>
                  <Input
                    placeholder="Dirección de entrega"
                    value={dest.destinatarioDireccion}
                    onChange={e => setDest(p => ({ ...p, destinatarioDireccion: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Teléfono</Label>
                  <Input
                    placeholder="Teléfono"
                    value={dest.destinatarioTelefono}
                    onChange={e => setDest(p => ({ ...p, destinatarioTelefono: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    placeholder="Email"
                    type="email"
                    value={dest.destinatarioEmail}
                    onChange={e => setDest(p => ({ ...p, destinatarioEmail: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Peso físico (kg) *</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  placeholder="0.500"
                  value={dest.pesoFisicoKg}
                  onChange={e => setDest(p => ({ ...p, pesoFisicoKg: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contenido</Label>
                <Input
                  placeholder="Descripción del contenido"
                  value={dest.contenido}
                  onChange={e => setDest(p => ({ ...p, contenido: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={agregar.isPending}>
            {agregar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agregar envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── ImportarCsvDialog ─────────────────────────────────────────────────────────

function ImportarCsvDialog({
  open,
  loteId,
  modoIndividual,
  onClose,
}: {
  open:           boolean
  loteId:         number
  modoIndividual: boolean
  onClose:        () => void
}) {
  const [csv, setCsv] = useState('')
  const importar = useImportarCsvMasivo(loteId)
  const [resultado, setResultado] = useState<{ importados: number; errores: Array<{ fila: number; error: string }> } | null>(null)

  const handleImportar = async () => {
    if (!csv.trim()) return
    const res = await importar.mutateAsync(csv)
    setResultado(res)
    toast.success(`${res.importados} envío(s) importado(s)`)
  }

  const formatoEjemplo = modoIndividual
    ? 'remNombre,remDoc,remEmail,remTel,remDir,remCiudad,remCp,destNombre,destDoc,destEmail,destTel,destDir,destCiudad,destPais,destCp,pesoKg,contenido'
    : 'nombre,documento,email,telefono,direccion,ciudad,pais,codigoPostal,pesoKg,contenido'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            {modoIndividual
              ? 'Formato extendido: remitente + destinatario por fila (17 columnas).'
              : 'Formato estándar: solo destinatarios (10 columnas). El remitente se toma del lote.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-muted px-3 py-2 text-xs font-mono text-muted-foreground break-all">
            {formatoEjemplo}
          </div>
          <Textarea
            placeholder="Pega el contenido del CSV aquí..."
            value={csv}
            onChange={e => setCsv(e.target.value)}
            className="min-h-[180px] font-mono text-xs"
          />
          {resultado && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-green-600">{resultado.importados} envío(s) importado(s)</p>
              {resultado.errores.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                  {resultado.errores.map(e => (
                    <p key={e.fila} className="text-xs text-destructive">Fila {e.fila}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button onClick={handleImportar} disabled={importar.isPending || !csv.trim()}>
            {importar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── CrearLoteDialog ───────────────────────────────────────────────────────────

function CrearLoteDialog({
  open,
  cajaId,
  sucursalId,
  onCreado,
  onClose,
}: {
  open:      boolean
  cajaId:    number
  sucursalId: number
  onCreado:  (id: number) => void
  onClose:   () => void
}) {
  const [modo, setModo]         = useState<ModoRemitente>('compartido')
  const [servicioId, setServicioId] = useState('')
  const [rem, setRem]           = useState<RemitentePayload>(emptyRem())
  const [observaciones, setObs] = useState('')

  const { data: servicios } = useServicios({ activo: true })
  const crear = useCrearLoteMasivo()

  const handleCrear = async () => {
    if (!servicioId) { toast.error('Selecciona un servicio'); return }
    if (modo === 'compartido' && !rem.nombre.trim()) {
      toast.error('El nombre del remitente es requerido en modo compartido')
      return
    }

    const lote = await crear.mutateAsync({
      sucursalId,
      cajaId,
      servicioId:    Number(servicioId),
      remitente:     modo === 'compartido' ? rem : undefined,
      observaciones: observaciones || undefined,
    })

    toast.success('Lote creado')
    onCreado(lote.id)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuevo lote masivo</DialogTitle>
          <DialogDescription>
            Configura el tipo de envío y el modo de remitente para este lote.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Servicio */}
          <div className="space-y-1">
            <Label className="text-xs">Servicio postal *</Label>
            <Select value={servicioId} onValueChange={setServicioId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {servicios?.datos?.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modo remitente */}
          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Modo remitente</p>
                <p className="text-xs text-muted-foreground">
                  {modo === 'compartido'
                    ? 'Un solo origen para todos los envíos del lote'
                    : 'Cada envío tiene su propio remitente (múltiples orígenes)'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={cn('text-muted-foreground', modo === 'compartido' && 'font-medium text-foreground')}>
                  Compartido
                </span>
                <Switch
                  checked={modo === 'individual'}
                  onCheckedChange={v => setModo(v ? 'individual' : 'compartido')}
                />
                <span className={cn('text-muted-foreground', modo === 'individual' && 'font-medium text-foreground')}>
                  Múltiple
                </span>
              </div>
            </div>

            {modo === 'compartido' && (
              <RemitenteForm value={rem} onChange={setRem} label="Remitente compartido" />
            )}

            {modo === 'individual' && (
              <div className="flex items-start gap-2 rounded bg-amber-50 border border-amber-200 p-2">
                <Users className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Cada envío tendrá su propio remitente. Podrás ingresarlo al agregar cada fila o importar desde CSV extendido.
                </p>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="space-y-1">
            <Label className="text-xs">Observaciones</Label>
            <Input
              placeholder="Observaciones del lote (opcional)"
              value={observaciones}
              onChange={e => setObs(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCrear} disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── LoteEditor ────────────────────────────────────────────────────────────────

function LoteEditor({
  loteId,
  onClose,
}: {
  loteId:  number
  onClose: () => void
}) {
  const { data: lote, isLoading, refetch } = useLoteMasivo(loteId)
  const eliminar    = useEliminarLoteMasivo()
  const generarPdf  = useGenerarGuiasPdf(loteId)
  const token       = useSessionStore(s => s.token)
  const [showAgregar,      setShowAgregar]      = useState(false)
  const [showCsv,          setShowCsv]          = useState(false)
  const [showTablaRapida,  setShowTablaRapida]  = useState(false)
  const [descargando,      setDescargando]      = useState(false)

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!lote) return null

  const modoIndividual = lote.remitente === null
  const esBorrador     = lote.estado === 'borrador'
  const isPagado       = lote.estado === 'confirmado' && !!lote.cobrado
  const puedeEliminar  = lote.estado === 'borrador' || lote.estado === 'anulado'
  const badgeInfo      = ESTADO_BADGE[lote.estado]

  const handleEliminar = async () => {
    await eliminar.mutateAsync(loteId)
    toast.success('Lote eliminado')
    onClose()
  }

  const handleGenerarPdf = async () => {
    const res = await generarPdf.mutateAsync()
    toast.success(`PDF generado — ${res.totalGuias} guía(s)`)
  }

  const handleDescargarPdf = async () => {
    if (!token) { toast.error('Sin sesión'); return }
    setDescargando(true)
    try {
      await descargarGuiasPdf(loteId, token)
    } catch {
      toast.error('Error al descargar el PDF')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header del lote */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onClose}>
              <ChevronRight className="h-3.5 w-3.5 rotate-180 mr-1" />
              Lotes
            </Button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-sm font-medium">Lote #{lote.id}</span>
            <Badge variant={badgeInfo.variant} className="text-xs">{badgeInfo.label}</Badge>
            {modoIndividual && (
              <Badge variant="outline" className="text-xs gap-1">
                <Users className="h-3 w-3" /> Múltiples orígenes
              </Badge>
            )}
          </div>
          {!modoIndividual && lote.remitente && (
            <p className="mt-1 text-sm text-muted-foreground">
              Remitente: <span className="text-foreground font-medium">{lote.remitente.nombre}</span>
              {lote.remitente.ciudad && ` · ${lote.remitente.ciudad}`}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{lote.servicio?.nombreservicios}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {lote.estado === 'confirmado' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerarPdf}
                disabled={generarPdf.isPending}
              >
                {generarPdf.isPending
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
                {lote.pdfGenerado ? 'Regenerar PDF' : 'Generar PDF'}
              </Button>
              {lote.pdfGenerado && (
                <Button
                  size="sm"
                  onClick={handleDescargarPdf}
                  disabled={descargando}
                >
                  {descargando
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <FileDown className="mr-1.5 h-3.5 w-3.5" />}
                  Descargar PDF
                </Button>
              )}
            </>
          )}
          {esBorrador && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowCsv(true)}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
              <Button
                variant={showTablaRapida ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowTablaRapida(p => !p)}
              >
                <Table2 className="mr-1.5 h-3.5 w-3.5" />
                Tabla rápida
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAgregar(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Agregar
              </Button>
            </>
          )}
          {puedeEliminar && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEliminar}
              disabled={eliminar.isPending}
            >
              {eliminar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de items */}
      <div className={cn('rounded-md border overflow-hidden', showTablaRapida ? 'h-44 shrink-0' : 'flex-1')}>
        <ScrollArea className="h-full">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-8 text-center">#</TableHead>
                {modoIndividual && <TableHead>Remitente</TableHead>}
                <TableHead>Destinatario</TableHead>
                <TableHead className="text-right">Peso</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!lote.items || lote.items.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={modoIndividual ? 6 : 5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Sin envíos. Usa la tabla rápida o importa un CSV.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                lote.items.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    loteId={loteId}
                    modoIndividual={modoIndividual}
                    isPagado={isPagado}
                    onDeleted={() => refetch()}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Tabla de entrada rápida */}
      {showTablaRapida && esBorrador && (
        <div className="flex-1 overflow-hidden">
          <TablaEntradaRapida
            loteId={loteId}
            modoIndividual={modoIndividual}
            onGuardado={() => refetch()}
            onCerrar={() => setShowTablaRapida(false)}
          />
        </div>
      )}

      {/* Footer con totales y acción confirmar */}
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-6 text-sm">
          <span>
            <span className="text-muted-foreground">Envíos: </span>
            <span className="font-medium">{lote.totales.items}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Peso: </span>
            <span className="font-medium">{lote.totales.pesoKg.toFixed(2)} kg</span>
          </span>
          {lote.totales.estampillas > 0 && (
            <span>
              <span className="text-muted-foreground">Estampillas: </span>
              <span className="font-medium">{fmt(lote.totales.estampillas)}</span>
            </span>
          )}
          <span className="text-base font-bold">
            {fmt(lote.totales.total)}
          </span>
        </div>

        {esBorrador && (
          <span className="text-xs text-muted-foreground">
            Para cobrar el lote, ábrelo desde el carrito del POS (pestaña Servicios postales).
          </span>
        )}
      </div>

      {/* Dialogs */}
      {esBorrador && (
        <>
          <AgregarItemDialog
            open={showAgregar}
            loteId={loteId}
            modoIndividual={modoIndividual}
            onClose={() => setShowAgregar(false)}
          />
          <ImportarCsvDialog
            open={showCsv}
            loteId={loteId}
            modoIndividual={modoIndividual}
            onClose={() => setShowCsv(false)}
          />
        </>
      )}
    </div>
  )
}

// ── EnviosMasivosPage ─────────────────────────────────────────────────────────

export default function EnviosMasivosPage() {
  const user       = useSessionStore(s => s.user)
  const sucursalId = user?.sucursal_id ?? 0

  const { data: statusPunto } = useStatusPunto(sucursalId)
  const miCaja   = statusPunto?.cajas.find(c => c.cajeroId === Number(user?.id))
  const cajaIdNum = miCaja?.cajaId ?? 0

  const [loteActivoId, setLoteActivoId] = useState<number | null>(null)
  const [showCrear, setShowCrear]       = useState(false)

  const { data: lotes, isLoading, refetch } = useLotesMasivos(sucursalId)

  if (loteActivoId) {
    return (
      <div className="flex flex-col gap-0 h-[calc(100vh-4rem)] p-4">
        <LoteEditor
          loteId={loteActivoId}
          onClose={() => { setLoteActivoId(null); refetch() }}
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Envíos masivos</h1>
          <p className="text-sm text-muted-foreground">
            Preporteado corporativo — un origen o múltiples orígenes hacia múltiples destinos
          </p>
        </div>
        <Button onClick={() => setShowCrear(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nuevo lote
        </Button>
      </div>

      {/* Lista de lotes */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !lotes?.length ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center">
          <FileDown className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="font-medium">Sin lotes</p>
            <p className="text-sm text-muted-foreground">Crea un nuevo lote para comenzar.</p>
          </div>
          <Button variant="outline" onClick={() => setShowCrear(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo lote
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead className="text-right">Envíos</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map(lote => {
                const badge = ESTADO_BADGE[lote.estado]
                return (
                  <TableRow
                    key={lote.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setLoteActivoId(lote.id)}
                  >
                    <TableCell className="text-sm text-muted-foreground">#{lote.id}</TableCell>
                    <TableCell className="text-sm font-medium">{lote.remitente}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{lote.totalItems}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums font-medium">{fmt(lote.totalCop)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(lote.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CrearLoteDialog
        open={showCrear}
        cajaId={cajaIdNum}
        sucursalId={sucursalId}
        onCreado={id => { setLoteActivoId(id) }}
        onClose={() => setShowCrear(false)}
      />
    </div>
  )
}
