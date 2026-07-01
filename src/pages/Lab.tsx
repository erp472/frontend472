import { useState } from 'react'
import {
  Moon,
  Sun,
  Loader2,
  TriangleAlert,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

// ── Color swatches ──────────────────────────────────────────────────────────

const colorGroups = [
  {
    label: 'Base',
    tokens: [
      { name: 'Background', token: '--background' },
      { name: 'Foreground', token: '--foreground' },
      { name: 'Card', token: '--card' },
      { name: 'Popover', token: '--popover' },
      { name: 'Muted', token: '--muted' },
      { name: 'Muted FG', token: '--muted-foreground' },
      { name: 'Border', token: '--border' },
      { name: 'Input', token: '--input' },
      { name: 'Ring', token: '--ring' },
    ],
  },
  {
    label: 'Marca 4-72',
    tokens: [
      { name: 'Primary', token: '--primary' },
      { name: 'Primary FG', token: '--primary-foreground' },
      { name: 'Secondary', token: '--secondary' },
      { name: 'Accent', token: '--accent' },
      { name: 'Destructive', token: '--destructive' },
      { name: 'Warning', token: '--warning' },
      { name: 'Warning FG', token: '--warning-foreground' },
    ],
  },
  {
    label: 'Sidebar',
    tokens: [
      { name: 'Sidebar', token: '--sidebar' },
      { name: 'Sidebar FG', token: '--sidebar-foreground' },
      { name: 'Sidebar Primary', token: '--sidebar-primary' },
      { name: 'Sidebar Primary FG', token: '--sidebar-primary-foreground' },
      { name: 'Sidebar Accent', token: '--sidebar-accent' },
      { name: 'Sidebar Border', token: '--sidebar-border' },
    ],
  },
  {
    label: 'Gráficas',
    tokens: [
      { name: 'Chart 1', token: '--chart-1' },
      { name: 'Chart 2', token: '--chart-2' },
      { name: 'Chart 3', token: '--chart-3' },
      { name: 'Chart 4', token: '--chart-4' },
      { name: 'Chart 5', token: '--chart-5' },
    ],
  },
]

function Swatch({ name, token }: { name: string; token: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div
        className="h-14 w-full rounded-lg border-2 border-foreground/10 ring-1 ring-inset ring-foreground/5"
        style={{ background: `var(${token})` }}
      />
      <p className="text-xs font-medium truncate">{name}</p>
      <p className="text-[10px] text-muted-foreground font-mono truncate">{token}</p>
    </div>
  )
}

// ── Typography scale ─────────────────────────────────────────────────────────

const typeScale = [
  { label: 'xs',   size: '12px', cls: 'text-xs' },
  { label: 'sm',   size: '14px', cls: 'text-sm' },
  { label: 'base', size: '16px', cls: 'text-base' },
  { label: 'lg',   size: '18px', cls: 'text-lg' },
  { label: 'xl',   size: '20px', cls: 'text-xl' },
  { label: '2xl',  size: '24px', cls: 'text-2xl' },
  { label: '3xl',  size: '30px', cls: 'text-3xl' },
]

// ── Table sample data ────────────────────────────────────────────────────────

const tableRows = [
  { id: 'US-001', nombre: 'Ana García',        rol: 'ADMIN_SISTEMA',       estado: 'Activo',   sucursal: 'Bogotá Centro' },
  { id: 'US-002', nombre: 'Luis Pérez',         rol: 'CAJERO',              estado: 'Activo',   sucursal: 'Medellín Norte' },
  { id: 'US-003', nombre: 'María Rodríguez',    rol: 'SUPERVISOR_REGIONAL', estado: 'Inactivo', sucursal: 'Cali Sur' },
  { id: 'US-004', nombre: 'Carlos Martínez',    rol: 'ADMINISTRATIVO',      estado: 'Activo',   sucursal: 'Barranquilla' },
  { id: 'US-005', nombre: 'Laura Sánchez',      rol: 'TESORERIA',           estado: 'Activo',   sucursal: 'Bucaramanga' },
  { id: 'US-006', nombre: 'Diego Vargas',       rol: 'INVENTARIOS',         estado: 'Activo',   sucursal: 'Pereira' },
  { id: 'US-007', nombre: 'Camila Torres',      rol: 'CAJERO',              estado: 'Inactivo', sucursal: 'Manizales' },
  { id: 'US-008', nombre: 'Andrés Morales',     rol: 'ADMIN_NACIONAL',      estado: 'Activo',   sucursal: 'Bogotá Norte' },
]

const ROWS_PER_PAGE = 3

// ── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="bg-muted/40 px-5 py-3 border-b">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Lab page ─────────────────────────────────────────────────────────────────

export default function Lab() {
  const [isDark, setIsDark] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('dark') === '1'
    if (fromUrl) document.documentElement.classList.add('dark')
    return fromUrl || document.documentElement.classList.contains('dark')
  })
  const [dataPage, setDataPage] = useState(1)
  const dataTotalPages = Math.ceil(tableRows.length / ROWS_PER_PAGE)

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark((v) => !v)
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">UI Lab</h1>
            <Badge variant="secondary" className="text-[10px] font-mono">DEV</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Workbench de componentes shadcn/ui · Paleta de marca 4-72
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={toggleDark} aria-label="Alternar modo oscuro">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') ?? 'colores'}>
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="colores">Colores</TabsTrigger>
          <TabsTrigger value="tipografia">Tipografía</TabsTrigger>
          <TabsTrigger value="botones">Botones</TabsTrigger>
          <TabsTrigger value="formularios">Formularios</TabsTrigger>
          <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="overlays">Overlays</TabsTrigger>
        </TabsList>

        {/* ── COLORES ───────────────────────────────────────────────── */}
        <TabsContent value="colores" className="mt-6 space-y-8">
          {colorGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 xl:grid-cols-9 gap-3">
                {group.tokens.map((t) => (
                  <Swatch key={t.token} name={t.name} token={t.token} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── TIPOGRAFÍA ────────────────────────────────────────────── */}
        <TabsContent value="tipografia" className="mt-6 space-y-6">
          <Section title="Escala de tamaños — Geist Variable">
            <div className="divide-y divide-border -mx-5">
              {typeScale.map((t) => (
                <div
                  key={t.label}
                  className="flex items-baseline gap-6 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-14 shrink-0 text-right">
                    <span className="text-[10px] font-mono text-muted-foreground">{t.label}</span>
                    <div className="text-[9px] text-muted-foreground/50">{t.size}</div>
                  </div>
                  <span className={t.cls}>4-72 Servicios Postales Nacionales</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Pesos">
            <div className="space-y-3">
              {(
                [
                  ['font-light',    '300'],
                  ['font-normal',   '400'],
                  ['font-medium',   '500'],
                  ['font-semibold', '600'],
                  ['font-bold',     '700'],
                ] as const
              ).map(([cls, w]) => (
                <div key={cls} className="flex items-baseline gap-4">
                  <span className="text-[10px] font-mono text-muted-foreground w-10 shrink-0">{w}</span>
                  <p className={`text-base ${cls}`}>Panel de Administración 4-72</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* ── BOTONES ──────────────────────────────────────────────── */}
        <TabsContent value="botones" className="mt-6 space-y-4">
          <Section title="Variantes">
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </Section>

          <Section title="Sólidos de Marca — Fondo Azul · Amarillo · Rojo">
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/85 shadow-sm">
                Primario — Azul
              </Button>
              <Button className="bg-warning text-warning-foreground hover:bg-warning/85 shadow-sm">
                Advertencia — Amarillo
              </Button>
              <Button className="bg-destructive text-white hover:bg-destructive/85 shadow-sm">
                Destructivo — Rojo
              </Button>
            </div>
          </Section>

          <Section title="Tamaños">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </Section>

          <Section title="Estados">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Normal</Button>
              <Button disabled>Deshabilitado</Button>
              <Button disabled>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Guardando…
              </Button>
            </div>
          </Section>

          <Section title="Solo ícono">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="icon-xs" variant="ghost" aria-label="Cerrar"><X className="size-3" /></Button>
              <Button size="icon-sm" variant="outline" aria-label="Cerrar"><X /></Button>
              <Button size="icon" aria-label="Cerrar"><X /></Button>
              <Button size="icon-lg" variant="secondary" aria-label="Cerrar"><X /></Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── FORMULARIOS ──────────────────────────────────────────── */}
        <TabsContent value="formularios" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Inputs">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lab-email">Correo electrónico</Label>
                  <Input id="lab-email" type="email" placeholder="usuario@4-72.com.co" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lab-pass">Contraseña</Label>
                  <Input id="lab-pass" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lab-err">Con error</Label>
                  <Input id="lab-err" aria-invalid placeholder="Campo inválido" />
                  <p className="text-xs text-destructive">Este campo es requerido</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lab-dis" className="opacity-50">Deshabilitado</Label>
                  <Input id="lab-dis" placeholder="No editable" disabled />
                </div>
              </div>
            </Section>

            <div className="space-y-4">
              <Section title="Select">
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_sistema">Admin Sistema</SelectItem>
                    <SelectItem value="admin_nacional">Admin Nacional</SelectItem>
                    <SelectItem value="cajero">Cajero</SelectItem>
                    <SelectItem value="tesoreria">Tesorería</SelectItem>
                    <SelectItem value="supervisor">Supervisor Regional</SelectItem>
                  </SelectContent>
                </Select>
              </Section>

              <Section title="Checkboxes">
                <div className="space-y-3">
                  {['Acceso al sistema', 'Ver reportes', 'Gestionar usuarios'].map((item) => (
                    <div key={item} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`chk-${item}`}
                        defaultChecked={item === 'Acceso al sistema'}
                      />
                      <Label htmlFor={`chk-${item}`} className="font-normal cursor-pointer">
                        {item}
                      </Label>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Switches">
                <div className="space-y-3">
                  {[
                    { label: 'Notificaciones activas', on: true },
                    { label: 'Modo mantenimiento',     on: false },
                    { label: 'Autenticación 2FA',      on: false },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <Label className="font-normal">{s.label}</Label>
                      <Switch defaultChecked={s.on} />
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        </TabsContent>

        {/* ── TARJETAS ─────────────────────────────────────────────── */}
        <TabsContent value="tarjetas" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* KPI */}
            <Card>
              <CardHeader>
                <CardDescription>Usuarios activos</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">1,284</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">+12% vs mes anterior</p>
              </CardContent>
            </Card>

            {/* Acción */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Ajustes generales del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Administra parámetros globales, integraciones y políticas de seguridad del panel 4-72.
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" variant="outline">Cancelar</Button>
                <Button size="sm">Guardar cambios</Button>
              </CardFooter>
            </Card>

            {/* Estado */}
            <Card>
              <CardHeader>
                <CardTitle>Estado del sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'API Backend',       ok: true },
                  { label: 'Base de datos',     ok: true },
                  { label: 'Cola de mensajes',  ok: false },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <Badge variant={s.ok ? 'default' : 'destructive'}>
                      {s.ok ? 'Operativo' : 'Degradado'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── FEEDBACK ─────────────────────────────────────────────── */}
        <TabsContent value="feedback" className="mt-6 space-y-4">
          <Section title="Badges">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Sobre fondo oscuro — invertido
                </p>
                <div className="flex flex-wrap gap-2 rounded-xl bg-primary px-4 py-3">
                  <Badge className="bg-primary-foreground text-primary border-transparent">Sólido</Badge>
                  <Badge className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/25">Outline</Badge>
                  <Badge className="bg-destructive text-white border-transparent">Destructivo</Badge>
                  <Badge className="bg-warning text-warning-foreground border-transparent">Advertencia</Badge>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Alertas">
            <div className="space-y-3">
              <Alert>
                <Info className="size-4" />
                <AlertTitle>Información</AlertTitle>
                <AlertDescription>
                  Los cambios se aplicarán en el próximo ciclo de sincronización.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertTitle>Error de autenticación</AlertTitle>
                <AlertDescription>
                  Credenciales inválidas. Verifica tu correo y contraseña.
                </AlertDescription>
              </Alert>
              <Alert variant="warning">
                <TriangleAlert className="size-4" />
                <AlertTitle>Advertencia</AlertTitle>
                <AlertDescription>
                  El sistema entrará en mantenimiento a las 22:00 horas.
                </AlertDescription>
              </Alert>
            </div>
          </Section>

          <Section title="Progress">
            <div className="space-y-4">
              {[
                { label: 'Carga de datos',   value: 75 },
                { label: 'Validación',       value: 45 },
                { label: 'Sincronización',   value: 100 },
              ].map((p) => (
                <div key={p.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{p.label}</span>
                    <span className="tabular-nums">{p.value}%</span>
                  </div>
                  <Progress value={p.value} />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Skeleton">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </Section>

          <Section title="Toast (Sonner)">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => toast('Operación completada')}>
                Default
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.success('Usuario creado exitosamente')}>
                Success
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.error('Error al guardar cambios')}>
                Error
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.warning('Verificación pendiente')}>
                Warning
              </Button>
              <Button size="sm" variant="outline" onClick={() => toast.info('Sincronización en progreso')}>
                Info
              </Button>
            </div>
          </Section>
        </TabsContent>

        {/* ── DATOS ────────────────────────────────────────────────── */}
        <TabsContent value="datos" className="mt-6">
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows
                  .slice((dataPage - 1) * ROWS_PER_PAGE, dataPage * ROWS_PER_PAGE)
                  .map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.id}
                      </TableCell>
                      <TableCell className="font-medium">{row.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {row.rol}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.sucursal}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.estado === 'Activo' ? 'default' : 'secondary'}>
                          {row.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {(dataPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(dataPage * ROWS_PER_PAGE, tableRows.length)} de {tableRows.length} registros
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setDataPage((p) => Math.max(1, p - 1))}
                  disabled={dataPage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                {Array.from({ length: dataTotalPages }, (_, i) => (
                  <Button
                    key={i + 1}
                    variant={dataPage === i + 1 ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setDataPage(i + 1)}
                    aria-current={dataPage === i + 1 ? 'page' : undefined}
                    className="min-w-8 px-2"
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setDataPage((p) => Math.min(dataTotalPages, p + 1))}
                  disabled={dataPage === dataTotalPages}
                  aria-label="Siguiente página"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── OVERLAYS ─────────────────────────────────────────────── */}
        <TabsContent value="overlays" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Dialog">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Abrir Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar acción</DialogTitle>
                    <DialogDescription>
                      Esta operación modificará la configuración global del sistema 4-72.
                      ¿Deseas continuar?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">Cancelar</Button>
                    <Button>Confirmar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Section>

            <Section title="Sheet">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Abrir Sheet</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Panel de detalle</SheetTitle>
                    <SheetDescription>
                      Información extendida del elemento seleccionado.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nombre</Label>
                      <Input defaultValue="Ana García" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Correo</Label>
                      <Input type="email" defaultValue="ana.garcia@4-72.com.co" />
                    </div>
                    <Button className="w-full mt-2">Guardar cambios</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </Section>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
