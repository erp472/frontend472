import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Moon,
  Sun,
  Loader2,
  TriangleAlert,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  Link2,
  CalendarDays,
  Building2,
  Mail,
  User,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from '@/components/ui/toolbar'
import { PasswordInput } from '@/components/ui/password-input'
import { toast } from 'sonner'

// ── Color swatches ─────────────────────────────────────────────────────────────

const colorGroups = [
  {
    label: 'Base',
    tokens: [
      { name: 'Background',  token: '--background' },
      { name: 'Foreground',  token: '--foreground' },
      { name: 'Card',        token: '--card' },
      { name: 'Popover',     token: '--popover' },
      { name: 'Muted',       token: '--muted' },
      { name: 'Muted FG',    token: '--muted-foreground' },
      { name: 'Border',      token: '--border' },
      { name: 'Input',       token: '--input' },
      { name: 'Ring',        token: '--ring' },
    ],
  },
  {
    label: 'Identidad 4-72',
    tokens: [
      { name: 'Amarillo',    token: '--brand-yellow', hex: '#FDC52F', pantone: '123c' },
      { name: 'Azul',        token: '--brand-blue',   hex: '#1E4093', pantone: '286c' },
      { name: 'Rojo',        token: '--brand-red',    hex: '#E51937', pantone: '185c' },
      { name: 'Primary',     token: '--primary',      hex: '#1E4093', pantone: '286c' },
      { name: 'Primary FG',  token: '--primary-foreground' },
      { name: 'Warning',     token: '--warning',      hex: '#FDC52F', pantone: '123c' },
      { name: 'Destructive', token: '--destructive',  hex: '#E51937', pantone: '185c' },
    ],
  },
  {
    label: 'Sidebar',
    tokens: [
      { name: 'Sidebar',         token: '--sidebar' },
      { name: 'Sidebar FG',      token: '--sidebar-foreground' },
      { name: 'Sidebar Primary', token: '--sidebar-primary' },
      { name: 'Sidebar P. FG',   token: '--sidebar-primary-foreground' },
      { name: 'Sidebar Accent',  token: '--sidebar-accent' },
      { name: 'Sidebar Border',  token: '--sidebar-border' },
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

function Swatch({
  name, token, hex, pantone,
}: {
  name: string; token: string; hex?: string; pantone?: string
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div
        className="h-14 w-full rounded-lg border-2 border-foreground/10 ring-1 ring-inset ring-foreground/5"
        style={{ background: `var(${token})` }}
      />
      <p className="text-xs font-semibold truncate mt-0.5">{name}</p>
      {hex     && <p className="text-[10px] font-mono font-medium truncate">{hex}</p>}
      {pantone && <p className="text-[10px] text-muted-foreground truncate">Pantone {pantone}</p>}
      <p className="text-[10px] text-muted-foreground font-mono truncate">{token}</p>
    </div>
  )
}

// ── Typography data ────────────────────────────────────────────────────────────

const typeScale = [
  { label: 'xs',   size: '0.75rem / 12px',  cls: 'text-xs',   use: 'Metadatos, chips, badges, timestamps' },
  { label: 'sm',   size: '0.875rem / 14px', cls: 'text-sm',   use: 'Cuerpo secundario, labels de formulario, descripciones' },
  { label: 'base', size: '1rem / 16px',     cls: 'text-base', use: 'Cuerpo principal, párrafos, contenido de tabla' },
  { label: 'lg',   size: '1.125rem / 18px', cls: 'text-lg',   use: 'Énfasis, subtítulos de sección' },
  { label: 'xl',   size: '1.25rem / 20px',  cls: 'text-xl',   use: 'Títulos de página, encabezados de tarjeta' },
  { label: '2xl',  size: '1.5rem / 24px',   cls: 'text-2xl',  use: 'Títulos principales, KPI labels' },
  { label: '3xl',  size: '1.875rem / 30px', cls: 'text-3xl',  use: 'Valores KPI, números destacados' },
  { label: '4xl',  size: '2.25rem / 36px',  cls: 'text-4xl',  use: 'Pantallas de splash, páginas de error' },
]

const nunitoWeights = [
  { w: 200, cls: 'font-extralight', label: 'ExtraLight' },
  { w: 300, cls: 'font-light',      label: 'Light' },
  { w: 400, cls: 'font-normal',     label: 'Regular' },
  { w: 500, cls: 'font-medium',     label: 'Medium' },
  { w: 600, cls: 'font-semibold',   label: 'SemiBold' },
  { w: 700, cls: 'font-bold',       label: 'Bold' },
  { w: 800, cls: 'font-extrabold',  label: 'ExtraBold' },
  { w: 900, cls: 'font-black',      label: 'Black' },
]

// ── Table sample data ──────────────────────────────────────────────────────────

const tableRows = [
  { id: 'US-001', nombre: 'Ana García',       rol: 'ADMIN_SISTEMA',       estado: 'Activo',   sucursal: 'Bogotá Centro' },
  { id: 'US-002', nombre: 'Luis Pérez',        rol: 'CAJERO',              estado: 'Activo',   sucursal: 'Medellín Norte' },
  { id: 'US-003', nombre: 'María Rodríguez',   rol: 'SUPERVISOR_REGIONAL', estado: 'Inactivo', sucursal: 'Cali Sur' },
  { id: 'US-004', nombre: 'Carlos Martínez',   rol: 'ADMINISTRATIVO',      estado: 'Activo',   sucursal: 'Barranquilla' },
  { id: 'US-005', nombre: 'Laura Sánchez',     rol: 'TESORERIA',           estado: 'Activo',   sucursal: 'Bucaramanga' },
  { id: 'US-006', nombre: 'Diego Vargas',      rol: 'INVENTARIOS',         estado: 'Activo',   sucursal: 'Pereira' },
  { id: 'US-007', nombre: 'Camila Torres',     rol: 'CAJERO',              estado: 'Inactivo', sucursal: 'Manizales' },
  { id: 'US-008', nombre: 'Andrés Morales',    rol: 'ADMIN_NACIONAL',      estado: 'Activo',   sucursal: 'Bogotá Norte' },
]

const ROWS_PER_PAGE = 3

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, children, accent }: {
  title: string
  children: React.ReactNode
  accent?: 'yellow' | 'blue' | 'red'
}) {
  const accentColor = {
    yellow: '#FDC52F',
    blue:   '#1E4093',
    red:    '#E51937',
  }
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="bg-muted/40 px-5 py-3 border-b flex items-center gap-2">
        {accent && (
          <span
            className="inline-block w-1 self-stretch rounded-full"
            style={{ background: accentColor[accent] }}
            aria-hidden="true"
          />
        )}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Demo form schema ───────────────────────────────────────────────────────────

const demoSchema = z.object({
  nombre:     z.string().min(3, 'Mínimo 3 caracteres'),
  email:      z.string().email('Correo inválido'),
  contrasena: z.string().min(8, 'Mínimo 8 caracteres'),
  rol:        z.string({ required_error: 'Selecciona un rol' }),
  sucursal:   z.enum(['bogota', 'medellin', 'cali'], {
    required_error: 'Selecciona una sucursal',
  }),
  activo: z.boolean().default(true),
})
type DemoFormValues = z.infer<typeof demoSchema>

function DemoFormSection() {
  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: { nombre: '', email: '', contrasena: '', activo: true },
  })
  const [submitting, setSubmitting] = useState(false)

  function onSubmit(values: DemoFormValues) {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Usuario creado', {
        description: `${values.nombre} · ${values.rol}`,
      })
      form.reset()
    }, 1200)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* nombre */}
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input className="pl-9" placeholder="Ana García" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input className="pl-9" type="email" placeholder="usuario@4-72.com.co" {...field} />
                </div>
              </FormControl>
              <FormDescription>Se usará para el acceso al sistema.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* contraseña */}
        <FormField
          control={form.control}
          name="contrasena"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <PasswordInput placeholder="Mínimo 8 caracteres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* rol */}
        <FormField
          control={form.control}
          name="rol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol del sistema</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ADMIN_SISTEMA">Admin Sistema</SelectItem>
                  <SelectItem value="ADMIN_NACIONAL">Admin Nacional</SelectItem>
                  <SelectItem value="SUPERVISOR_REGIONAL">Supervisor Regional</SelectItem>
                  <SelectItem value="ADMINISTRATIVO">Administrativo</SelectItem>
                  <SelectItem value="TESORERIA">Tesorería</SelectItem>
                  <SelectItem value="CAJERO">Cajero</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* sucursal */}
        <FormField
          control={form.control}
          name="sucursal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sucursal asignada</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex gap-4 pt-1"
                >
                  {[
                    { value: 'bogota',   label: 'Bogotá' },
                    { value: 'medellin', label: 'Medellín' },
                    { value: 'cali',     label: 'Cali' },
                  ].map((s) => (
                    <div key={s.value} className="flex items-center gap-2">
                      <RadioGroupItem value={s.value} id={`suc-${s.value}`} />
                      <Label htmlFor={`suc-${s.value}`} className="font-normal cursor-pointer">
                        {s.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* activo */}
        <FormField
          control={form.control}
          name="activo"
          render={({ field }) => (
            <FormItem className="flex items-start gap-3 rounded-md border p-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              </FormControl>
              <div className="leading-none">
                <FormLabel className="font-medium">Usuario activo</FormLabel>
                <FormDescription className="mt-1">
                  Permite el acceso inmediato al sistema.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => form.reset()}
            disabled={submitting}
          >
            Limpiar
          </Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting
              ? <><Loader2 className="mr-1.5 size-3.5 animate-spin" />Guardando…</>
              : 'Crear usuario'
            }
          </Button>
        </div>
      </form>
    </Form>
  )
}

// ── Scroll demo data ───────────────────────────────────────────────────────────

const scrollItems = [
  { code: 'BOG-01', nombre: 'Bogotá Centro',        ciudad: 'Bogotá',        activa: true },
  { code: 'MED-01', nombre: 'Medellín El Poblado',   ciudad: 'Medellín',      activa: true },
  { code: 'CAL-01', nombre: 'Cali Centro',           ciudad: 'Cali',          activa: true },
  { code: 'BAR-01', nombre: 'Barranquilla Norte',    ciudad: 'Barranquilla',  activa: true },
  { code: 'BUC-01', nombre: 'Bucaramanga Cabecera',  ciudad: 'Bucaramanga',   activa: false },
  { code: 'PER-01', nombre: 'Pereira Circunvalar',   ciudad: 'Pereira',       activa: true },
  { code: 'MAN-01', nombre: 'Manizales Centro',      ciudad: 'Manizales',     activa: true },
  { code: 'CTG-01', nombre: 'Cartagena Bocagrande',  ciudad: 'Cartagena',     activa: false },
  { code: 'CUC-01', nombre: 'Cúcuta San Luis',       ciudad: 'Cúcuta',        activa: true },
  { code: 'IBA-01', nombre: 'Ibagué El Centro',      ciudad: 'Ibagué',        activa: true },
]

// ── Lab page ───────────────────────────────────────────────────────────────────

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
      <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') ?? 'diccionario'}>
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="diccionario">Diccionario</TabsTrigger>
          <TabsTrigger value="colores">Colores</TabsTrigger>
          <TabsTrigger value="tipografia">Tipografía</TabsTrigger>
          <TabsTrigger value="botones">Botones</TabsTrigger>
          <TabsTrigger value="formularios">Formularios</TabsTrigger>
          <TabsTrigger value="tarjetas">Tarjetas</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="overlays">Overlays</TabsTrigger>
        </TabsList>

        {/* ── DICCIONARIO ───────────────────────────────────────────────────── */}
        <TabsContent value="diccionario" className="mt-6 space-y-6">

          {/* Tricolor reference */}
          <div className="flex items-center gap-3">
            <div className="flex h-4 w-24 rounded overflow-hidden shrink-0">
              <div className="flex-1" style={{ background: '#FDC52F' }} />
              <div className="flex-1" style={{ background: '#1E4093' }} />
              <div className="flex-1" style={{ background: '#E51937' }} />
            </div>
            <p className="text-xs text-muted-foreground">
              Paleta Pantone 123c · 286c · 185c — colores aplicados en estados activos y acentos de componentes
            </p>
          </div>

          {/* ROW 1: Form + right column */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Form */}
            <Section title="Form — RHF + Zod + PasswordInput" accent="blue">
              <DemoFormSection />
            </Section>

            {/* Right column stacked */}
            <div className="space-y-4">

              {/* Toast */}
              <Section title="Toast — Sonner" accent="yellow">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast('Notificación del sistema', { description: 'Operación procesada.' })}
                  >
                    Default
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success('Usuario creado', { description: 'Ana García · CAJERO' })}
                  >
                    Éxito
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.error('Error de conexión', { description: 'No se pudo contactar el servidor.' })}
                  >
                    Error
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.warning('Sesión por expirar', { description: 'Tu sesión expira en 5 min.' })}
                  >
                    Advertencia
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info('Sincronización', { description: 'Datos actualizados desde el servidor.' })}
                  >
                    Info
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      toast('Confirmar eliminación', {
                        action: { label: 'Eliminar', onClick: () => toast.error('Eliminado') },
                        cancel: { label: 'Cancelar', onClick: () => {} },
                      })
                    }
                  >
                    Con acciones
                  </Button>
                </div>
              </Section>

              {/* Dialog */}
              <Section title="Dialog" accent="blue">
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">Abrir confirmación</Button>
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
                        <Button onClick={() => toast.success('Acción confirmada')}>Confirmar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">Eliminar registro</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Eliminar usuario</DialogTitle>
                        <DialogDescription>
                          Esta acción no se puede deshacer. El usuario perderá acceso inmediatamente.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancelar</Button>
                        <Button variant="destructive" onClick={() => toast.error('Usuario eliminado')}>
                          Sí, eliminar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </Section>

              {/* Popover + HoverCard */}
              <Section title="Popover · HoverCard" accent="yellow">
                <div className="flex flex-wrap gap-3 items-center">

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">Filtros activos</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div
                        className="px-4 py-3 border-b"
                        style={{ borderLeft: '3px solid #FDC52F' }}
                      >
                        <p className="text-sm font-semibold">Filtrar por rol</p>
                      </div>
                      <div className="p-3 space-y-2">
                        {['CAJERO', 'ADMINISTRATIVO', 'TESORERIA', 'INVENTARIOS'].map((rol) => (
                          <div key={rol} className="flex items-center gap-2">
                            <Checkbox id={`filter-${rol}`} />
                            <Label htmlFor={`filter-${rol}`} className="font-normal text-xs cursor-pointer font-mono">
                              {rol}
                            </Label>
                          </div>
                        ))}
                        <Button size="sm" className="w-full mt-2" onClick={() => toast.info('Filtros aplicados')}>
                          Aplicar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                      <Button variant="link" size="sm" className="text-primary px-0">
                        Ana García
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72 p-0" align="start">
                      <div
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ background: '#1E4093', borderRadius: '0.5rem 0.5rem 0 0' }}
                      >
                        <div className="flex size-9 items-center justify-center rounded-full bg-white/20 text-white text-sm font-bold shrink-0">
                          AG
                        </div>
                        <div className="text-white">
                          <p className="text-sm font-semibold leading-tight">Ana García</p>
                          <p className="text-[11px] opacity-70">ADMIN_SISTEMA</p>
                        </div>
                      </div>
                      <div className="p-3 space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="size-3.5 shrink-0" />
                          <span className="truncate">ana.garcia@4-72.com.co</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="size-3.5 shrink-0" />
                          <span>Bogotá Centro</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="size-3.5 shrink-0" />
                          <span>Último acceso: hoy, 09:42</span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                </div>
              </Section>

            </div>
          </div>

          {/* ROW 2: Toggle, ToggleGroup, Toolbar */}
          <div className="grid gap-4 lg:grid-cols-3">

            {/* Toggle */}
            <Section title="Toggle" accent="blue">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Variante default</p>
                  <div className="flex flex-wrap gap-2">
                    <Toggle aria-label="Negrita"><Bold className="size-4" /></Toggle>
                    <Toggle aria-label="Cursiva"><Italic className="size-4" /></Toggle>
                    <Toggle aria-label="Subrayado"><Underline className="size-4" /></Toggle>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Variante outline</p>
                  <div className="flex flex-wrap gap-2">
                    <Toggle variant="outline" aria-label="Lista"><List className="size-4" /></Toggle>
                    <Toggle variant="outline" aria-label="Enlace"><Link2 className="size-4" /></Toggle>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Con texto</p>
                  <div className="flex flex-wrap gap-2">
                    <Toggle size="sm" defaultPressed>
                      <Bold className="size-3.5" />Negrita
                    </Toggle>
                    <Toggle size="sm">
                      <Italic className="size-3.5" />Cursiva
                    </Toggle>
                  </div>
                </div>
              </div>
            </Section>

            {/* ToggleGroup */}
            <Section title="ToggleGroup" accent="blue">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Alineación (single)</p>
                  <ToggleGroup type="single" defaultValue="left">
                    <ToggleGroupItem value="left" aria-label="Izquierda">
                      <AlignLeft className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="center" aria-label="Centro">
                      <AlignCenter className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="right" aria-label="Derecha">
                      <AlignRight className="size-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Formato (multiple)</p>
                  <ToggleGroup type="multiple">
                    <ToggleGroupItem value="bold" aria-label="Negrita">
                      <Bold className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Cursiva">
                      <Italic className="size-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Subrayado">
                      <Underline className="size-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Outline</p>
                  <ToggleGroup type="single" variant="outline" defaultValue="cajero">
                    <ToggleGroupItem value="cajero" className="text-xs px-3">Cajero</ToggleGroupItem>
                    <ToggleGroupItem value="admin" className="text-xs px-3">Admin</ToggleGroupItem>
                    <ToggleGroupItem value="sup" className="text-xs px-3">Supervisor</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </Section>

            {/* Toolbar */}
            <Section title="Toolbar" accent="red">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Editor de texto</p>
                  <Toolbar aria-label="Formato de texto">
                    <ToolbarToggleGroup type="multiple" aria-label="Formato">
                      <ToolbarToggleItem value="bold" aria-label="Negrita">
                        <Bold className="size-4" />
                      </ToolbarToggleItem>
                      <ToolbarToggleItem value="italic" aria-label="Cursiva">
                        <Italic className="size-4" />
                      </ToolbarToggleItem>
                      <ToolbarToggleItem value="underline" aria-label="Subrayado">
                        <Underline className="size-4" />
                      </ToolbarToggleItem>
                    </ToolbarToggleGroup>
                    <ToolbarSeparator />
                    <ToolbarToggleGroup type="single" defaultValue="left" aria-label="Alineación">
                      <ToolbarToggleItem value="left" aria-label="Izquierda">
                        <AlignLeft className="size-4" />
                      </ToolbarToggleItem>
                      <ToolbarToggleItem value="center" aria-label="Centro">
                        <AlignCenter className="size-4" />
                      </ToolbarToggleItem>
                      <ToolbarToggleItem value="right" aria-label="Derecha">
                        <AlignRight className="size-4" />
                      </ToolbarToggleItem>
                    </ToolbarToggleGroup>
                    <ToolbarSeparator />
                    <ToolbarButton onClick={() => toast.info('Enlace insertado')}>
                      <Link2 className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton onClick={() => toast.info('Lista insertada')}>
                      <List className="size-4" />
                    </ToolbarButton>
                  </Toolbar>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Acciones de tabla</p>
                  <Toolbar aria-label="Acciones">
                    <ToolbarButton size="sm" onClick={() => toast.success('Exportado')}>
                      Exportar
                    </ToolbarButton>
                    <ToolbarButton size="sm" onClick={() => toast.info('Importado')}>
                      Importar
                    </ToolbarButton>
                    <ToolbarSeparator />
                    <ToolbarButton size="sm" onClick={() => toast.error('Eliminados')}>
                      Eliminar selección
                    </ToolbarButton>
                  </Toolbar>
                </div>
              </div>
            </Section>
          </div>

          {/* ROW 3: Checkbox + RadioGroup standalone | ScrollArea */}
          <div className="grid gap-4 lg:grid-cols-2">

            {/* Checkbox + RadioGroup */}
            <div className="space-y-4">
              <Section title="Checkbox — variantes" accent="blue">
                <div className="space-y-3">
                  {[
                    { label: 'Acceso al sistema',   checked: true,  disabled: false },
                    { label: 'Ver reportes',         checked: false, disabled: false },
                    { label: 'Gestionar usuarios',   checked: true,  disabled: false },
                    { label: 'Configuración global', checked: false, disabled: true },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`dict-chk-${item.label}`}
                        defaultChecked={item.checked}
                        disabled={item.disabled}
                      />
                      <Label
                        htmlFor={`dict-chk-${item.label}`}
                        className={`font-normal cursor-pointer ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="RadioGroup" accent="blue">
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Rol del sistema</p>
                    <RadioGroup defaultValue="CAJERO" className="space-y-2">
                      {[
                        { value: 'CAJERO',          label: 'Cajero',          desc: 'Acceso mínimo al POS' },
                        { value: 'ADMINISTRATIVO',  label: 'Administrativo',  desc: 'Backoffice básico' },
                        { value: 'ADMIN_SISTEMA',   label: 'Admin Sistema',   desc: 'Acceso total' },
                      ].map((r) => (
                        <div key={r.value} className="flex items-start gap-2.5">
                          <RadioGroupItem value={r.value} id={`rg-${r.value}`} className="mt-0.5" />
                          <Label htmlFor={`rg-${r.value}`} className="leading-tight cursor-pointer">
                            <span className="font-medium">{r.label}</span>
                            <span className="block text-xs text-muted-foreground font-normal">{r.desc}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </Section>
            </div>

            {/* ScrollArea */}
            <Section title="ScrollArea — lista de sucursales" accent="yellow">
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-1">
                  {scrollItems.map((item, i) => (
                    <div key={item.code}>
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors cursor-default">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                              {item.code}
                            </span>
                            <span className="text-sm font-medium truncate">{item.nombre}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{item.ciudad}</span>
                        </div>
                        <Badge
                          variant={item.activa ? 'default' : 'secondary'}
                          className="ml-3 shrink-0 text-[10px]"
                        >
                          {item.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      {i < scrollItems.length - 1 && <Separator className="my-0.5 opacity-50" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-[11px] text-muted-foreground mt-2">
                {scrollItems.length} sucursales · {scrollItems.filter(s => s.activa).length} activas
              </p>
            </Section>

          </div>

          {/* ROW 4: Select variations */}
          <Section title="Select — variantes y estados" accent="blue">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Rol del sistema</Label>
                <Select defaultValue="CAJERO">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN_SISTEMA">Admin Sistema</SelectItem>
                    <SelectItem value="ADMIN_NACIONAL">Admin Nacional</SelectItem>
                    <SelectItem value="CAJERO">Cajero</SelectItem>
                    <SelectItem value="TESORERIA">Tesorería</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar ciudad…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bogota">Bogotá</SelectItem>
                    <SelectItem value="medellin">Medellín</SelectItem>
                    <SelectItem value="cali">Cali</SelectItem>
                    <SelectItem value="barranquilla">Barranquilla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs opacity-50">Estado (deshabilitado)</Label>
                <Select disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No disponible" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Período de reporte</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Período…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoy">Hoy</SelectItem>
                    <SelectItem value="semana">Esta semana</SelectItem>
                    <SelectItem value="mes">Este mes</SelectItem>
                    <SelectItem value="trimestre">Trimestre</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

        </TabsContent>

        {/* ── COLORES ────────────────────────────────────────────────────────── */}
        <TabsContent value="colores" className="mt-6 space-y-8">

          {/* Referencia Pantone */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex h-5 w-28 rounded overflow-hidden shrink-0 border border-foreground/10">
              <div className="flex-1" style={{ background: '#FDC52F' }} />
              <div className="flex-1" style={{ background: '#1E4093' }} />
              <div className="flex-1" style={{ background: '#E51937' }} />
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Paleta Pantone 123c · 286c · 185c — tokens <span className="font-mono">--brand-*</span> son los valores exactos del Manual de Identidad.
              Los tokens semánticos (<span className="font-mono">--primary</span>, <span className="font-mono">--warning</span>, <span className="font-mono">--destructive</span>) varían en modo oscuro.
            </p>
          </div>

          {colorGroups.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 xl:grid-cols-9 gap-3">
                {group.tokens.map((t) => (
                  <Swatch key={t.token} name={t.name} token={t.token} hex={t.hex} pantone={t.pantone} />
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ── TIPOGRAFÍA ─────────────────────────────────────────────────────── */}
        <TabsContent value="tipografia" className="mt-6 space-y-6">

          {/* Stack de fuentes */}
          <Section title="Stack tipográfico corporativo" accent="blue">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-4 rounded-full shrink-0"
                    style={{ background: '#1E4093' }}
                    aria-hidden="true"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primaria</p>
                </div>
                <p className="text-lg font-semibold leading-tight" style={{ fontFamily: "'Nunito Sans'" }}>Nunito Sans Variable</p>
                <p className="text-[11px] text-muted-foreground font-mono">--font-sans · 100–900 · Normal + Italic</p>
                <p className="text-[11px] text-muted-foreground">Interfaz, formularios, tablas, cuerpo de texto</p>
              </div>
              <div className="rounded-lg border p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-1.5 h-4 rounded-full shrink-0"
                    style={{ background: '#FDC52F' }}
                    aria-hidden="true"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secundaria / Fallback</p>
                </div>
                <p className="text-lg font-semibold leading-tight" style={{ fontFamily: 'Verdana' }}>Verdana</p>
                <p className="text-[11px] text-muted-foreground font-mono">400 · 700 · 700 Italic</p>
                <p className="text-[11px] text-muted-foreground">Fallback corporativo cuando Nunito Sans no carga</p>
              </div>
            </div>
          </Section>

          {/* Escala de tamaños */}
          <Section title="Escala de tamaños — Nunito Sans Variable">
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
                  <div className="flex-1 min-w-0">
                    <span className={t.cls}>4-72 Servicios Postales Nacionales</span>
                    <span className="ml-4 text-[10px] text-muted-foreground/60 hidden sm:inline">{t.use}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Pesos — Nunito Sans */}
          <Section title="Pesos — Nunito Sans">
            <div className="divide-y divide-border -mx-5">
              {nunitoWeights.map(({ w, cls, label }) => (
                <div
                  key={w}
                  className="flex items-baseline gap-6 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-14 shrink-0 text-right">
                    <span className="text-[10px] font-mono text-muted-foreground">{w}</span>
                    <div className="text-[9px] text-muted-foreground/50">{label}</div>
                  </div>
                  <p className={`text-base ${cls}`}>Panel de Administración 4-72</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Verdana — fuente secundaria */}
          <Section title="Verdana — corporativa secundaria" accent="yellow">
            <div className="space-y-2" style={{ fontFamily: 'Verdana' }}>
              {[
                { w: 400, cls: 'font-normal', label: 'Regular' },
                { w: 700, cls: 'font-bold',   label: 'Bold' },
                { w: 700, cls: 'font-bold italic', label: 'Bold Italic' },
              ].map(({ w, cls, label }) => (
                <div key={label} className="flex items-baseline gap-4">
                  <div className="w-20 shrink-0 text-right">
                    <span className="text-[10px] font-mono text-muted-foreground">{w}</span>
                    <div className="text-[9px] text-muted-foreground/50">{label}</div>
                  </div>
                  <p className={`text-base ${cls}`} style={{ fontFamily: 'Verdana' }}>
                    4-72 Servicios Postales Nacionales
                  </p>
                </div>
              ))}
            </div>
          </Section>

        </TabsContent>

        {/* ── BOTONES ────────────────────────────────────────────────────────── */}
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

          <Section title="Sólidos de Marca — Azul · Amarillo · Rojo">
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

        {/* ── FORMULARIOS ────────────────────────────────────────────────────── */}
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
                  <PasswordInput id="lab-pass" placeholder="••••••••" />
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

        {/* ── TARJETAS ───────────────────────────────────────────────────────── */}
        <TabsContent value="tarjetas" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Usuarios activos</CardDescription>
                <CardTitle className="text-3xl font-bold tabular-nums">1,284</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">+12% vs mes anterior</p>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle>Estado del sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'API Backend',      ok: true },
                  { label: 'Base de datos',    ok: true },
                  { label: 'Cola de mensajes', ok: false },
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

        {/* ── FEEDBACK ───────────────────────────────────────────────────────── */}
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
                  Sobre fondo azul corporativo
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
                { label: 'Carga de datos',  value: 75 },
                { label: 'Validación',      value: 45 },
                { label: 'Sincronización',  value: 100 },
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

        {/* ── DATOS ──────────────────────────────────────────────────────────── */}
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

        {/* ── OVERLAYS ───────────────────────────────────────────────────────── */}
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
