import { Link } from 'react-router-dom'
import { FlaskConical, Cpu, Monitor, FileText, ArrowRight } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLabStore } from '@/stores/useLabStore'

const MODULES = [
  {
    to:          '/lab/galeria',
    icon:        FlaskConical,
    title:       'UI Gallery',
    description: 'Catálogo de componentes shadcn/ui. Botones, formularios, tablas, diálogos y más.',
    color:       'text-violet-500',
    bg:          'bg-violet-500/10',
  },
  {
    to:          '/lab/poc',
    icon:        Cpu,
    title:       'POC Sandbox',
    description: 'Prototipos y pruebas de concepto: WebSocket ping, UI optimista, formularios multi-paso.',
    color:       'text-sky-500',
    bg:          'bg-sky-500/10',
  },
  {
    to:          '/lab/mockups',
    icon:        Monitor,
    title:       'Mockups',
    description: 'Pantallas estáticas de Caja, Giros, Ventas y Despacho con datos hardcodeados.',
    color:       'text-emerald-500',
    bg:          'bg-emerald-500/10',
  },
  {
    to:          '/lab/guia',
    icon:        FileText,
    title:       'Guía Postal',
    description: 'Preview de guías postales nacionales e internacionales con datos mock UPU.',
    color:       'text-amber-500',
    bg:          'bg-amber-500/10',
  },
]

export default function LabIndex() {
  const session = useLabStore((s) => s.session)

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <p className="text-xs text-muted-foreground font-mono mb-1">
          Bienvenido, {session?.usuario ?? '—'}
        </p>
        <h1 className="text-2xl font-bold">Lab 4-72</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Entorno de desarrollo aislado. Los cambios aquí no afectan al sistema productivo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODULES.map(({ to, icon: Icon, title, description, color, bg }) => (
          <Link key={to} to={to} data-cy={`lab-module-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
              <CardHeader className="space-y-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                  <Icon className={`size-5 ${color}`} />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-1.5">
                    {title}
                    <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground/60">Cypress</p>
        <p>
          Cada módulo tiene atributos <code className="font-mono">data-cy</code> para tests E2E.
          Los mockups no hacen peticiones API — ideales para snapshots y pruebas de interacción.
        </p>
        <p className="font-mono mt-1 text-[10px]">
          cy.visit('/lab/login') → cy.get('[data-cy=lab-login-usuario]')
        </p>
      </div>
    </div>
  )
}
