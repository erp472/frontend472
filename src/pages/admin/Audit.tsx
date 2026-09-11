import { useState } from 'react'
import {
  Shield, TrendingUp, Pencil, Trash2, Plus,
  ChevronDown, ChevronRight, AlertCircle, Filter,
  Eye, LogIn, LogOut, Printer, Download, Ban, Loader2,
  ShieldAlert, ShieldCheck, Siren,
} from 'lucide-react'
import { useSessionStore } from '@/stores/useSessionStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  ACCIONES, useAuditEventos, useAuditStats, useDbCambios, buildAuditExportUrl,
  type AuditAccion, type AuditEvento, type AuditParams, type DbCambio,
} from '@/queries/audit.queries'
import {
  useSecurityAlertas, useSecurityStats,
  type AlertSeverity, type SecurityAlerta,
} from '@/queries/security.queries'
import { useUsers } from '@/queries/users.queries'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<'ADM' | 'OPE' | 'FIN' | 'CBS', {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
}> = {
  ADM: { label: 'Administrativo', variant: 'secondary'   },
  OPE: { label: 'Operación',      variant: 'default'     },
  FIN: { label: 'Finanza',        variant: 'outline'     },
  CBS: { label: 'Ciberseguridad', variant: 'destructive' },
}

function TipoBadge({ tipo }: { tipo: AuditEvento['tipo'] | null | undefined }) {
  const cfg = tipo ? TIPO_CONFIG[tipo] : TIPO_CONFIG.OPE
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
}

const ACCION_CONFIG: Record<AuditAccion, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ElementType
}> = {
  CREATE: { label: 'Creación',       variant: 'default',     icon: Plus },
  READ:   { label: 'Consulta',       variant: 'outline',     icon: Eye },
  UPDATE: { label: 'Actualización',  variant: 'secondary',   icon: Pencil },
  DELETE: { label: 'Eliminación',    variant: 'destructive', icon: Trash2 },
  LOGIN:  { label: 'Inicio sesión',  variant: 'secondary',   icon: LogIn },
  LOGOUT: { label: 'Cierre sesión',  variant: 'outline',     icon: LogOut },
  PRINT:  { label: 'Impresión',      variant: 'outline',     icon: Printer },
  EXPORT: { label: 'Exportación',    variant: 'outline',     icon: Download },
  DENIED: { label: 'Acceso negado',  variant: 'destructive', icon: Ban },
}

function AccionBadge({ accion }: { accion: AuditEvento['accion'] }) {
  const cfg = ACCION_CONFIG[accion] ?? ACCION_CONFIG.CREATE
  return (
    <Badge variant={cfg.variant} className="gap-1 text-xs">
      <cfg.icon className="size-3" />
      {cfg.label}
    </Badge>
  )
}

const SEVERIDAD_CONFIG: Record<AlertSeverity, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}> = {
  LOW:      { label: 'Baja',     variant: 'outline',     className: 'text-muted-foreground' },
  MEDIUM:   { label: 'Media',    variant: 'secondary',   className: 'text-yellow-600' },
  HIGH:     { label: 'Alta',     variant: 'default',     className: 'text-orange-600' },
  CRITICAL: { label: 'Crítica',  variant: 'destructive', className: 'text-destructive' },
}

function SeveridadBadge({ severidad }: { severidad: AlertSeverity }) {
  const cfg = SEVERIDAD_CONFIG[severidad]
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
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

// ── Panel de db_changes ───────────────────────────────────────────────────────

function DbCambiosPanel({ requestId }: { requestId: string }) {
  const { data, isLoading } = useDbCambios(requestId)
  const cambios = data?.cambios ?? []

  if (isLoading) return <Skeleton className="h-16 w-full" />
  if (cambios.length === 0) return (
    <p className="text-xs text-muted-foreground italic">Sin cambios de BD registrados para este request.</p>
  )

  return (
    <div className="space-y-2">
      {cambios.map((c: DbCambio) => (
        <div key={c._id} className="rounded border bg-background p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="font-mono">{c.tabla}</Badge>
            <Badge variant={c.operacion === 'DELETE' ? 'destructive' : c.operacion === 'INSERT' ? 'default' : 'secondary'} className="text-xs">
              {c.operacion}
            </Badge>
            {c.registro_id && <span className="text-muted-foreground">id: {c.registro_id}</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Antes</p>
              <JsonView data={c.datos_antes ?? null} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Después</p>
              <JsonView data={c.datos_despues ?? null} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Fila expandible de auditoría ──────────────────────────────────────────────

function EventoRow({ evento }: { evento: AuditEvento }) {
  const [open, setOpen] = useState(false)
  const tieneDetalle = evento.datosAntes || evento.datosDespues || evento.requestId

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
        <TableCell className="font-mono text-xs whitespace-nowrap">{evento.auditKey}</TableCell>
        <TableCell><TipoBadge tipo={evento.tipo} /></TableCell>
        <TableCell><AccionBadge accion={evento.accion} /></TableCell>
        <TableCell className="font-mono text-xs">{evento.tabla}</TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {evento.registroId ?? '—'}
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
          {evento.resultado === 'ERROR'
            ? (
              <span title={evento.errorMsg ?? 'Error'}>
                <AlertCircle className="size-3.5 text-destructive" />
              </span>
            )
            : null}
        </TableCell>
      </TableRow>

      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={10} className="px-6 py-4 space-y-4">
            {/* Payload antes/después */}
            {(evento.datosAntes || evento.datosDespues) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Antes</p>
                  <JsonView data={evento.datosAntes} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Después</p>
                  <JsonView data={evento.datosDespues} />
                </div>
              </div>
            )}
            {/* Cambios de BD correlacionados */}
            {evento.requestId && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Cambios de BD (request {evento.requestId.slice(0, 8)}…)
                </p>
                <DbCambiosPanel requestId={evento.requestId} />
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Fila expandible de alerta ─────────────────────────────────────────────────

function AlertaRow({ alerta }: { alerta: SecurityAlerta }) {
  const [open, setOpen] = useState(false)
  const tieneMetadata = alerta.metadata && Object.keys(alerta.metadata).length > 0

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => tieneMetadata && setOpen((v) => !v)}
      >
        <TableCell className="w-6 px-2">
          {tieneMetadata
            ? open
              ? <ChevronDown className="size-3.5 text-muted-foreground" />
              : <ChevronRight className="size-3.5 text-muted-foreground" />
            : null}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {formatFecha(alerta.timestamp)}
        </TableCell>
        <TableCell className="font-mono text-xs">{alerta.audit_key}</TableCell>
        <TableCell><SeveridadBadge severidad={alerta.severidad} /></TableCell>
        <TableCell className="text-xs max-w-xs truncate" title={alerta.descripcion}>
          {alerta.descripcion}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{alerta.mitre}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">{alerta.nist_csf}</TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {alerta.ip ?? '—'}
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {alerta.origen_audit_key ?? '—'}
        </TableCell>
      </TableRow>

      {open && tieneMetadata && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={9} className="px-6 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Metadata
            </p>
            <JsonView data={alerta.metadata!} />
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

// ── Tab: Eventos de auditoría ─────────────────────────────────────────────────

const LIMITE = 50
const TODAS  = '__todas__'

const TODOS_USUARIOS = '__todos__'

function TabEventos() {
  const [params, setParams]       = useState<AuditParams>({ pagina: 1, limite: LIMITE })
  const [draft, setDraft]         = useState({
    tabla: '', accion: '' as AuditAccion | '', desde: '', hasta: '', usuario_id: '' as string,
  })

  const { data: usersData } = useUsers({ limite: 200 })
  const [exporting, setExporting] = useState(false)

  const { data, isLoading } = useAuditEventos(params)
  const { data: stats }     = useAuditStats()

  const totalPages = data?.meta.paginas ?? 1
  const page       = params.pagina ?? 1

  async function descargarExcel() {
    setExporting(true)
    try {
      const url = buildAuditExportUrl(params)
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${useSessionStore.getState().token ?? ''}` },
      })
      if (!res.ok) throw new Error('Error al exportar')
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = href
      a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(href)
    } finally {
      setExporting(false)
    }
  }

  function aplicarFiltros() {
    setParams({
      pagina: 1, limite: LIMITE,
      ...(draft.tabla      && { tabla:      draft.tabla }),
      ...(draft.accion     && { accion:     draft.accion }),
      ...(draft.desde      && { desde:      draft.desde }),
      ...(draft.hasta      && { hasta:      draft.hasta }),
      ...(draft.usuario_id && { usuario_id: Number(draft.usuario_id) }),
    })
  }

  function limpiarFiltros() {
    setDraft({ tabla: '', accion: '', desde: '', hasta: '', usuario_id: '' })
    setParams({ pagina: 1, limite: LIMITE })
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
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
            value={draft.accion}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, accion: v === TODAS ? '' : (v as AuditAccion) }))
            }
          >
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas</SelectItem>
              {ACCIONES.map((a) => (
                <SelectItem key={a} value={a}>{ACCION_CONFIG[a].label}</SelectItem>
              ))}
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
          <Select
            value={draft.usuario_id || TODOS_USUARIOS}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, usuario_id: v === TODOS_USUARIOS ? '' : v }))
            }
          >
            <SelectTrigger className="h-8 text-sm w-48">
              <SelectValue placeholder="Usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_USUARIOS}>Todos los usuarios</SelectItem>
              {usersData?.datos.map((u) => (
                <SelectItem key={u.id} value={String(u.id)}>
                  {u.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={aplicarFiltros}>Filtrar</Button>
          <Button size="sm" variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>
          <Button
            size="sm" variant="outline"
            onClick={descargarExcel}
            disabled={exporting}
            className="ml-auto"
          >
            {exporting
              ? <Loader2 className="mr-2 size-4 animate-spin" />
              : <Download className="mr-2 size-4" />}
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead className="whitespace-nowrap">Fecha / Hora</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>IP</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.datos.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                      No hay eventos con los filtros actuales.
                    </TableCell>
                  </TableRow>
                )
                : data?.datos.map((evento) => (
                    <EventoRow key={evento.id} evento={evento} />
                  ))}
          </TableBody>
        </Table>

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

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="size-3.5" />
        Haz clic en cualquier fila para ver el detalle antes/después del cambio.
        Los eventos se actualizan cada 60 segundos.
      </div>
    </div>
  )
}

// ── Tab: Alertas de seguridad ─────────────────────────────────────────────────

const TODAS_SEV = '__todas__'

function TabSeguridad() {
  const [filtroSev, setFiltroSev] = useState<AlertSeverity | ''>('')

  const { data, isLoading }   = useSecurityAlertas(filtroSev || undefined)
  const { data: stats }       = useSecurityStats()

  const alertas = data?.alertas ?? []

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total hoy"  value={stats?.total}                       icon={Siren}       />
        <StatCard label="Críticas"   value={stats?.porSeveridad?.CRITICAL ?? 0} icon={ShieldAlert} className="text-destructive" />
        <StatCard label="Altas"      value={stats?.porSeveridad?.HIGH     ?? 0} icon={ShieldAlert} className="text-orange-500" />
        <StatCard label="Medias"     value={stats?.porSeveridad?.MEDIUM   ?? 0} icon={ShieldCheck} className="text-yellow-500" />
      </div>

      {/* Filtro por severidad */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
          <Filter className="size-3.5" />
          Filtros
        </p>
        <div className="flex flex-wrap gap-2">
          <Select
            value={filtroSev || TODAS_SEV}
            onValueChange={(v) => setFiltroSev(v === TODAS_SEV ? '' : (v as AlertSeverity))}
          >
            <SelectTrigger className="h-8 text-sm w-44">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS_SEV}>Todas</SelectItem>
              <SelectItem value="CRITICAL">Crítica</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="LOW">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6" />
              <TableHead className="whitespace-nowrap">Fecha / Hora</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>MITRE</TableHead>
              <TableHead>NIST CSF</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Origen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : alertas.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground text-sm">
                      No hay alertas de seguridad registradas.
                    </TableCell>
                  </TableRow>
                )
                : alertas.map((alerta) => (
                    <AlertaRow key={alerta._id} alerta={alerta} />
                  ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldAlert className="size-3.5" />
        Se muestran las últimas 50 alertas. Las alertas se actualizan cada 60 segundos.
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Audit() {
  const { data: secStats } = useSecurityStats()
  const criticas = (secStats?.porSeveridad?.CRITICAL ?? 0) + (secStats?.porSeveridad?.HIGH ?? 0)

  return (
    <div className="space-y-6 p-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="size-5" />
          Auditoría
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trazabilidad completa de todas las operaciones del sistema.
        </p>
      </div>

      <Tabs defaultValue="eventos">
        <TabsList>
          <TabsTrigger value="eventos">
            Eventos de auditoría
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="gap-2">
            Alertas de seguridad
            {criticas > 0 && (
              <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] leading-none">
                {criticas}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="mt-4">
          <TabEventos />
        </TabsContent>

        <TabsContent value="seguridad" className="mt-4">
          <TabSeguridad />
        </TabsContent>
      </Tabs>
    </div>
  )
}
