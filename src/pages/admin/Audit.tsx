import { useState } from 'react'
import {
  Shield, TrendingUp, Pencil, Trash2, Plus,
  ChevronDown, ChevronRight, AlertCircle, Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuditEventos, useAuditStats, type AuditEvento, type AuditParams } from '@/queries/audit.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const OP_CONFIG = {
  INSERT: { label: 'Inserción',      variant: 'default',     icon: Plus },
  UPDATE: { label: 'Actualización',  variant: 'secondary',   icon: Pencil },
  DELETE: { label: 'Eliminación',    variant: 'destructive', icon: Trash2 },
} as const

function OpBadge({ op }: { op: AuditEvento['operacion'] }) {
  const cfg = OP_CONFIG[op]
  return (
    <Badge variant={cfg.variant} className="gap-1 text-xs">
      <cfg.icon className="size-3" />
      {cfg.label}
    </Badge>
  )
}

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function JsonView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <span className="text-muted-foreground text-xs italic">—</span>
  return (
    <pre className="text-xs bg-muted rounded p-2 overflow-auto max-h-48 whitespace-pre-wrap break-all">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// ── Fila expandible ───────────────────────────────────────────────────────────

function EventoRow({ evento }: { evento: AuditEvento }) {
  const [open, setOpen] = useState(false)
  const tieneDetalle = evento.datosAntes || evento.datosDespues

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => tieneDetalle && setOpen((v) => !v)}
      >
        <TableCell className="w-6 px-2">
          {tieneDetalle
            ? open
              ? <ChevronDown className="size-3.5 text-muted-foreground" />
              : <ChevronRight className="size-3.5 text-muted-foreground" />
            : null}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {formatFecha(evento.createdAt)}
        </TableCell>
        <TableCell><OpBadge op={evento.operacion} /></TableCell>
        <TableCell className="font-mono text-xs">{evento.tabla}</TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {evento.registroId}
        </TableCell>
        <TableCell className="text-xs">
          {evento.usuario
            ? <span title={evento.usuario.email}>{evento.usuario.nombre}</span>
            : <span className="text-muted-foreground italic">Sistema</span>}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {evento.ipOrigen ?? '—'}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {(evento.datosDespues as Record<string, unknown> | null)?.['resultado'] === 'ERROR'
            ? <AlertCircle className="size-3.5 text-destructive" />
            : null}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={8} className="px-6 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Antes
                </p>
                <JsonView data={evento.datosAntes} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Después
                </p>
                <JsonView data={evento.datosDespues} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Stats cards ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, className = '' }: {
  label: string
  value: number | undefined
  icon: React.ElementType
  className?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-4 ${className}`} />
        <span className="text-xs">{label}</span>
      </div>
      {value === undefined
        ? <Skeleton className="h-7 w-16" />
        : <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('es-CO')}</p>}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const LIMITE = 50

export default function Audit() {
  const [params, setParams] = useState<AuditParams>({ pagina: 1, limite: LIMITE })
  const [draft, setDraft]   = useState({
    tabla: '', operacion: '' as AuditParams['operacion'] | '', desde: '', hasta: '',
  })

  const { data, isLoading } = useAuditEventos(params)
  const { data: stats }     = useAuditStats()

  const totalPages = data?.meta.paginas ?? 1
  const page       = params.pagina ?? 1

  function aplicarFiltros() {
    setParams({
      pagina:    1,
      limite:    LIMITE,
      tabla:     draft.tabla   || undefined,
      operacion: (draft.operacion as AuditParams['operacion']) || undefined,
      desde:     draft.desde   || undefined,
      hasta:     draft.hasta   || undefined,
    })
  }

  function limpiarFiltros() {
    setDraft({ tabla: '', operacion: '', desde: '', hasta: '' })
    setParams({ pagina: 1, limite: LIMITE })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="size-5" />
          Auditoría
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trazabilidad completa de todas las operaciones del sistema — hoy.
        </p>
      </div>

      {/* Stats del día */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total hoy"        value={stats?.total}           icon={Shield}    />
        <StatCard label="Inserciones"      value={stats?.inserciones}     icon={Plus}      />
        <StatCard label="Actualizaciones"  value={stats?.actualizaciones} icon={Pencil}    />
        <StatCard label="Eliminaciones"    value={stats?.eliminaciones}   icon={Trash2}    className="text-destructive" />
        <StatCard label="Errores"          value={stats?.errores}         icon={AlertCircle} className="text-destructive" />
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
          <Filter className="size-3.5" />
          Filtros
        </p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Tabla (ej: usuarios)"
            className="h-8 text-sm w-44"
            value={draft.tabla}
            onChange={(e) => setDraft((d) => ({ ...d, tabla: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
          />
          <Select
            value={draft.operacion}
            onValueChange={(v) => setDraft((d) => ({ ...d, operacion: v as AuditParams['operacion'] }))}
          >
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue placeholder="Operación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="INSERT">Inserción</SelectItem>
              <SelectItem value="UPDATE">Actualización</SelectItem>
              <SelectItem value="DELETE">Eliminación</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            className="h-8 text-sm w-40"
            value={draft.desde}
            onChange={(e) => setDraft((d) => ({ ...d, desde: e.target.value }))}
          />
          <Input
            type="date"
            className="h-8 text-sm w-40"
            value={draft.hasta}
            onChange={(e) => setDraft((d) => ({ ...d, hasta: e.target.value }))}
          />
          <Button size="sm" onClick={aplicarFiltros}>Filtrar</Button>
          <Button size="sm" variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead className="whitespace-nowrap">Fecha / Hora</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.datos.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                      No hay eventos con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )
                : data?.datos.map((evento) => (
                    <EventoRow key={evento.id} evento={evento} />
                  ))
            }
          </TableBody>
        </Table>

        {/* Paginación */}
        {!isLoading && (data?.meta.total ?? 0) > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {((page - 1) * LIMITE) + 1}–{Math.min(page * LIMITE, data!.meta.total)} de {data!.meta.total.toLocaleString('es-CO')}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="sm"
                onClick={() => setParams((p) => ({ ...p, pagina: Math.max(1, (p.pagina ?? 1) - 1) }))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-sm px-3 tabular-nums">{page} / {totalPages}</span>
              <Button
                variant="outline" size="sm"
                onClick={() => setParams((p) => ({ ...p, pagina: Math.min(totalPages, (p.pagina ?? 1) + 1) }))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="size-3.5" />
        Haz clic en cualquier fila para ver el detalle antes/después del cambio.
        Los eventos se actualizan cada 60 segundos.
      </div>
    </div>
  )
}
