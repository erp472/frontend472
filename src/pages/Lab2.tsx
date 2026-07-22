/**
 * Lab v2 — POC Sandbox
 *
 * Espacio aislado para prototipos y pruebas de concepto.
 * Cada tab es un POC independiente.
 *
 * ── Cómo agregar un POC ──────────────────────────────────────────────────────
 * 1. Copia la sección "Plantilla" al final de los TabsContent.
 * 2. Dale un value único (kebab-case).
 * 3. Agrega el TabsTrigger correspondiente en el TabsList.
 * 4. Implementa el POC como un componente interno.
 * 5. Mantén cada POC autocontenido: sus datos, estado y helpers locales.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Moon, Sun, Wifi, WifiOff, RefreshCw, Send, Trash2,
  CheckCircle2, XCircle, Clock, ChevronRight, ChevronLeft,
  User, Mail, ShieldCheck, Building2, Loader2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

// ── Helpers ────────────────────────────────────────────────────────────────────

function PocSection({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="bg-muted/40 px-5 py-3 border-b">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── POC 1: WebSocket Ping ──────────────────────────────────────────────────────

type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
type WsMessage = { id: number; ts: string; type: 'send' | 'recv' | 'sys'; text: string }

function WsPingPoc() {
  const [status, setStatus]   = useState<WsStatus>('disconnected')
  const [msgs, setMsgs]       = useState<WsMessage[]>([])
  const [input, setInput]     = useState('')
  const [autoHb, setAutoHb]   = useState(true)
  const [failNext, setFailNext] = useState(false)
  const idRef    = useRef(0)
  const hbRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const push = useCallback((type: WsMessage['type'], text: string) => {
    const ts = new Date().toLocaleTimeString('es-CO', { hour12: false })
    setMsgs(prev => [...prev.slice(-49), { id: ++idRef.current, ts, type, text }])
  }, [])

  const connect = useCallback(() => {
    setStatus('connecting')
    push('sys', 'Iniciando conexión a ws://localhost:3000/realtime…')
    setTimeout(() => {
      if (failNext) {
        setStatus('error')
        push('sys', '✗ Error: ECONNREFUSED — el servidor no está disponible')
        setFailNext(false)
        return
      }
      setStatus('connected')
      push('sys', '✓ Conexión establecida — handshake OK')
      push('recv', JSON.stringify({ event: 'connection.ack', data: { sessionId: 'SIM-001' } }))
    }, 800)
  }, [push, failNext])

  const disconnect = useCallback(() => {
    if (hbRef.current) clearInterval(hbRef.current)
    hbRef.current = null
    setStatus('disconnected')
    push('sys', 'Conexión cerrada por el cliente')
  }, [push])

  const sendMsg = useCallback(() => {
    if (!input.trim()) return
    push('send', input)
    const echo = { event: 'echo', data: { received: input, ts: Date.now() } }
    setTimeout(() => push('recv', JSON.stringify(echo)), 150)
    setInput('')
  }, [input, push])

  useEffect(() => {
    if (status === 'connected' && autoHb) {
      hbRef.current = setInterval(() => {
        push('recv', JSON.stringify({ event: 'heartbeat', ts: Date.now() }))
      }, 3000)
    } else if (hbRef.current) {
      clearInterval(hbRef.current)
      hbRef.current = null
    }
    return () => { if (hbRef.current) clearInterval(hbRef.current) }
  }, [status, autoHb, push])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [msgs])

  const statusBadge: Record<WsStatus, React.ReactNode> = {
    disconnected: <Badge variant="secondary" className="gap-1"><WifiOff className="size-3" />Desconectado</Badge>,
    connecting:   <Badge variant="outline"   className="gap-1"><RefreshCw className="size-3 animate-spin" />Conectando…</Badge>,
    connected:    <Badge variant="default"   className="gap-1 bg-green-600 hover:bg-green-600"><Wifi className="size-3" />Conectado</Badge>,
    error:        <Badge variant="destructive" className="gap-1"><XCircle className="size-3" />Error</Badge>,
  }

  return (
    <div className="space-y-4">
      <PocSection
        title="Simulador WebSocket"
        description="Simula la conexión a ws://localhost:3000/realtime con heartbeat y reconexión"
      >
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {statusBadge[status]}
          <Button
            size="sm"
            onClick={status === 'connected' ? disconnect : connect}
            disabled={status === 'connecting'}
            variant={status === 'connected' ? 'outline' : 'default'}
          >
            {status === 'connected' ? 'Desconectar' : 'Conectar'}
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Switch checked={autoHb} onCheckedChange={setAutoHb} id="hb" />
            <Label htmlFor="hb" className="text-xs font-normal cursor-pointer">Heartbeat 3s</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={failNext} onCheckedChange={setFailNext} id="fail" />
            <Label htmlFor="fail" className="text-xs font-normal cursor-pointer text-destructive">Fallar siguiente</Label>
          </div>
        </div>

        <ScrollArea className="h-56 rounded-lg border bg-muted/30 font-mono text-xs p-3" ref={scrollRef}>
          {msgs.length === 0 && (
            <p className="text-muted-foreground">Esperando conexión…</p>
          )}
          {msgs.map(m => (
            <div key={m.id} className={`flex gap-2 mb-1 ${m.type === 'sys' ? 'text-muted-foreground' : ''}`}>
              <span className="shrink-0 text-muted-foreground/60">{m.ts}</span>
              <span className={`shrink-0 ${m.type === 'send' ? 'text-primary' : m.type === 'recv' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                {m.type === 'send' ? '↑' : m.type === 'recv' ? '↓' : '·'}
              </span>
              <span className="break-all">{m.text}</span>
            </div>
          ))}
        </ScrollArea>

        <div className="flex gap-2 mt-3">
          <Input
            className="font-mono text-xs"
            placeholder='{"event":"ping","data":{}} — Enter para enviar'
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && status === 'connected' && sendMsg()}
            disabled={status !== 'connected'}
          />
          <Button size="sm" disabled={status !== 'connected'} onClick={sendMsg}>
            <Send className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMsgs([])}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </PocSection>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>Referencia de arquitectura real → <span className="font-mono text-foreground">src/realtime/socket.ts</span></p>
        <p>El cliente real usa reconexión exponencial + heartbeat. Este simulador replica el flujo de mensajes.</p>
      </div>
    </div>
  )
}

// ── POC 2: Optimistic UI ──────────────────────────────────────────────────────

type OptItem = { id: string; nombre: string; rol: string; pendiente?: boolean; error?: boolean }

function OptimisticPoc() {
  const [items, setItems]       = useState<OptItem[]>([
    { id: '1', nombre: 'Ana García',    rol: 'ADMIN_SISTEMA' },
    { id: '2', nombre: 'Luis Pérez',    rol: 'CAJERO' },
    { id: '3', nombre: 'María Romero',  rol: 'TESORERIA' },
  ])
  const [nombre, setNombre]     = useState('')
  const [rol, setRol]           = useState('')
  const [simFail, setSimFail]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const addUser = useCallback(() => {
    if (!nombre.trim() || !rol) return
    const tempId = `opt-${Date.now()}`
    const optimistic: OptItem = { id: tempId, nombre, rol, pendiente: true }

    setItems(prev => [...prev, optimistic])
    setNombre('')
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      if (simFail) {
        setItems(prev => prev.map(i => i.id === tempId ? { ...i, pendiente: false, error: true } : i))
        toast.error('Error al crear usuario — operación revertida')
        setTimeout(() => {
          setItems(prev => prev.filter(i => i.id !== tempId))
        }, 1800)
      } else {
        setItems(prev => prev.map(i => i.id === tempId ? { ...optimistic, id: `US-${String(prev.length).padStart(3,'0')}`, pendiente: false } : i))
        toast.success(`Usuario "${optimistic.nombre}" creado`)
      }
    }, 1200)
  }, [nombre, rol, simFail])

  const removeUser = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  return (
    <div className="space-y-4">
      <PocSection
        title="Creación optimista de usuario"
        description="El item aparece inmediatamente en la lista; si la API falla, se revierte con animación"
      >
        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          <Input
            placeholder="Nombre completo"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addUser()}
          />
          <Select value={rol} onValueChange={setRol}>
            <SelectTrigger><SelectValue placeholder="Rol…" /></SelectTrigger>
            <SelectContent>
              {['CAJERO','ADMINISTRATIVO','TESORERIA','INVENTARIOS','SUPERVISOR_REGIONAL','ADMIN_NACIONAL','ADMIN_SISTEMA'].map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={addUser} disabled={!nombre.trim() || !rol || loading} className="flex-1">
              {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Agregar
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Switch checked={simFail} onCheckedChange={setSimFail} id="sim-fail" />
          <Label htmlFor="sim-fail" className="text-xs font-normal cursor-pointer text-destructive">
            Simular fallo de API
          </Label>
        </div>

        <div className="space-y-1.5">
          {items.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                item.error ? 'border-destructive/50 bg-destructive/5' :
                item.pendiente ? 'border-dashed opacity-70' : 'bg-card'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.pendiente && !item.error && <Clock className="size-3.5 text-muted-foreground shrink-0 animate-pulse" />}
                {item.error && <XCircle className="size-3.5 text-destructive shrink-0" />}
                {!item.pendiente && !item.error && <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />}
                <span className="text-sm font-medium truncate">{item.nombre}</span>
                <Badge variant="outline" className="text-[10px] font-mono shrink-0">{item.rol}</Badge>
                {item.pendiente && !item.error && <span className="text-[10px] text-muted-foreground">guardando…</span>}
                {item.error && <span className="text-[10px] text-destructive">revertiendo…</span>}
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                className="shrink-0"
                onClick={() => removeUser(item.id)}
                disabled={!!item.pendiente}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </PocSection>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>Patrón real → <span className="font-mono text-foreground">useMutation + onMutate + onError rollback</span> en TanStack Query</p>
        <p>Este POC simula el ciclo optimistic → confirm / rollback sin un servidor real.</p>
      </div>
    </div>
  )
}

// ── POC 3: Form Wizard ────────────────────────────────────────────────────────

const wizardStep1Schema = z.object({
  nombre:   z.string().min(3, 'Mínimo 3 caracteres'),
  email:    z.string().email('Correo inválido'),
})
const wizardStep2Schema = z.object({
  rol:       z.string({ required_error: 'Selecciona un rol' }),
  sucursal:  z.string({ required_error: 'Selecciona una sucursal' }),
})
type Step1 = z.infer<typeof wizardStep1Schema>
type Step2 = z.infer<typeof wizardStep2Schema>

const STEPS = ['Información', 'Permisos', 'Confirmar'] as const

function FormWizardPoc() {
  const [step, setStep]     = useState(0)
  const [done, setDone]     = useState(false)
  const [data1, setData1]   = useState<Step1 | null>(null)
  const [data2, setData2]   = useState<Step2 | null>(null)
  const [submitting, setSub] = useState(false)

  const form1 = useForm<Step1>({ resolver: zodResolver(wizardStep1Schema) })
  const form2 = useForm<Step2>({ resolver: zodResolver(wizardStep2Schema) })

  const resetAll = () => {
    setStep(0); setDone(false); setData1(null); setData2(null)
    form1.reset(); form2.reset()
  }

  const onStep1 = (v: Step1) => { setData1(v); setStep(1) }
  const onStep2 = (v: Step2) => { setData2(v); setStep(2) }

  const onConfirm = () => {
    setSub(true)
    setTimeout(() => {
      setSub(false); setDone(true)
      toast.success(`Usuario "${data1?.nombre}" creado`)
    }, 1400)
  }

  if (done) {
    return (
      <PocSection title="Wizard completado">
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle2 className="size-12 text-green-600" />
          <p className="font-semibold text-lg">¡Usuario creado!</p>
          <p className="text-sm text-muted-foreground">{data1?.nombre} · {data2?.rol}</p>
          <Button variant="outline" onClick={resetAll}>Nuevo usuario</Button>
        </div>
      </PocSection>
    )
  }

  return (
    <div className="space-y-4">
      <PocSection title="Form Wizard — creación de usuario en 3 pasos">
        {/* Progress */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s} className={`flex items-center gap-1 ${i === step ? 'text-foreground font-semibold' : ''}`}>
                <span className={`inline-flex size-5 items-center justify-center rounded-full border text-[10px] ${
                  i < step  ? 'bg-primary border-primary text-primary-foreground' :
                  i === step ? 'border-primary text-primary' : 'border-muted-foreground/30'
                }`}>{i < step ? '✓' : i + 1}</span>
                {s}
              </span>
            ))}
          </div>
          <Progress value={((step) / (STEPS.length - 1)) * 100} />
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <Form {...form1}>
            <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
              <FormField control={form1.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Ana García" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form1.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input className="pl-9" type="email" placeholder="usuario@4-72.com.co" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-end pt-1">
                <Button type="submit">Siguiente <ChevronRight className="size-4 ml-1" /></Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <Form {...form2}>
            <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
              <FormField control={form2.control} name="rol" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol del sistema</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <ShieldCheck className="size-4 text-muted-foreground mr-2" />
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['CAJERO','ADMINISTRATIVO','TESORERIA','INVENTARIOS','SUPERVISOR_REGIONAL','ADMIN_NACIONAL','ADMIN_SISTEMA'].map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form2.control} name="sucursal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sucursal asignada</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <Building2 className="size-4 text-muted-foreground mr-2" />
                        <SelectValue placeholder="Selecciona una sucursal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['Bogotá Centro','Medellín Norte','Cali Sur','Barranquilla','Bucaramanga','Pereira'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex justify-between pt-1">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>
                  <ChevronLeft className="size-4 mr-1" /> Anterior
                </Button>
                <Button type="submit">
                  Siguiente <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Step 3 — Confirm */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-lg border divide-y text-sm">
              {[
                { label: 'Nombre',    value: data1?.nombre,   icon: User },
                { label: 'Correo',    value: data1?.email,    icon: Mail },
                { label: 'Rol',       value: data2?.rol,      icon: ShieldCheck },
                { label: 'Sucursal',  value: data2?.sucursal, icon: Building2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-20 shrink-0">{label}</span>
                  <span className="font-medium truncate">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-1">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="size-4 mr-1" /> Anterior
              </Button>
              <Button onClick={onConfirm} disabled={submitting}>
                {submitting
                  ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Creando…</>
                  : 'Confirmar y crear'}
              </Button>
            </div>
          </div>
        )}
      </PocSection>

      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>Patrón: un <span className="font-mono text-foreground">useForm</span> por paso + validación Zod independiente.</p>
        <p>En producción, el wizard acumula datos parciales en Zustand o estado compartido antes del POST final.</p>
      </div>
    </div>
  )
}

// ── POC Plantilla ─────────────────────────────────────────────────────────────

function PlantillaPoc() {
  return (
    <div className="space-y-4">
      <PocSection title="Plantilla — copia esto para un nuevo POC">
        <pre className="rounded-lg bg-muted p-4 text-xs font-mono overflow-x-auto whitespace-pre text-muted-foreground leading-relaxed">
{`// 1. Define el componente del POC (con sus propios hooks y datos)
function MiPoc() {
  const [value, setValue] = useState(0)

  return (
    <div className="space-y-4">
      <PocSection title="Mi POC" description="Descripción breve">
        {/* contenido del POC */}
      </PocSection>

      {/* nota de referencia opcional */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs
                      text-muted-foreground">
        Referencia → src/...
      </div>
    </div>
  )
}

// 2. Agrega el TabsTrigger en el TabsList de Lab2
<TabsTrigger value="mi-poc">Mi POC</TabsTrigger>

// 3. Agrega el TabsContent dentro de <Tabs>
<TabsContent value="mi-poc" className="mt-6">
  <MiPoc />
</TabsContent>`}
        </pre>
      </PocSection>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ideas de próximos POCs</CardTitle>
          <CardDescription className="text-xs">Backlog de pruebas de concepto pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              { titulo: 'Infinite Scroll',         desc: 'useInfiniteQuery + IntersectionObserver para listas largas' },
              { titulo: 'Exportar a Excel',         desc: 'xlsx: generar un .xlsx de tabla de usuarios desde el cliente' },
              { titulo: 'PDF de reporte',           desc: 'jspdf + autotable: generar PDF de cierre de caja' },
              { titulo: 'Notificaciones push',      desc: 'Bridge WS → toast: recibir eventos del servidor y mostrar toast' },
              { titulo: 'Modo offline',             desc: 'TanStack Query staleTime + localStorage como caché de respaldo' },
              { titulo: 'Impersonación de rol',     desc: 'Dev-only: cambiar el rol del usuario de prueba sin relogin' },
            ].map(({ titulo, desc }) => (
              <li key={titulo} className="flex gap-2.5">
                <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <span><span className="font-medium text-foreground">{titulo}</span> — {desc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Lab 2 page ────────────────────────────────────────────────────────────────

export default function Lab2() {
  const [isDark, setIsDark] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('dark') === '1'
    if (fromUrl) document.documentElement.classList.add('dark')
    return fromUrl || document.documentElement.classList.contains('dark')
  })

  const toggleDark = () => {
    document.documentElement.classList.toggle('dark')
    setIsDark(v => !v)
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">UI Lab v2</h1>
            <Badge variant="secondary" className="text-[10px] font-mono">POC</Badge>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">DEV</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Sandbox de prototipos · cada tab es un POC autocontenido
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={toggleDark} aria-label="Alternar modo oscuro">
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <Separator />

      <Tabs defaultValue={new URLSearchParams(window.location.search).get('poc') ?? 'ws-ping'}>
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="ws-ping">WS Ping</TabsTrigger>
          <TabsTrigger value="optimistic">Optimistic UI</TabsTrigger>
          <TabsTrigger value="wizard">Form Wizard</TabsTrigger>
          <TabsTrigger value="plantilla">+ Plantilla</TabsTrigger>
        </TabsList>

        {/* ── WS PING ────────────────────────────────────────────────────────── */}
        <TabsContent value="ws-ping" className="mt-6">
          <WsPingPoc />
        </TabsContent>

        {/* ── OPTIMISTIC UI ───────────────────────────────────────────────────── */}
        <TabsContent value="optimistic" className="mt-6">
          <OptimisticPoc />
        </TabsContent>

        {/* ── FORM WIZARD ─────────────────────────────────────────────────────── */}
        <TabsContent value="wizard" className="mt-6">
          <FormWizardPoc />
        </TabsContent>

        {/* ── PLANTILLA ───────────────────────────────────────────────────────── */}
        <TabsContent value="plantilla" className="mt-6">
          <PlantillaPoc />
        </TabsContent>

      </Tabs>
    </div>
  )
}
