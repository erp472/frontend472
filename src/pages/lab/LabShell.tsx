import { Suspense, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  FlaskConical, LayoutGrid, Cpu, Monitor, FileText,
  LogOut, Loader2, Database, ExternalLink, User,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLabStore } from '@/stores/useLabStore'
import { labVerify, labLogout } from '@/queries/lab.queries'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavItem {
  to:    string
  label: string
  icon:  React.ElementType
  end?:  boolean
}

interface NavGroup {
  label:   string
  items:   NavItem[]
}

// ── Nav structure ──────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      { to: '/lab', label: 'Inicio', icon: LayoutGrid, end: true },
    ],
  },
  {
    label: 'Módulos',
    items: [
      { to: '/lab/galeria',  label: 'UI Gallery',   icon: FlaskConical },
      { to: '/lab/poc',      label: 'POC Sandbox',  icon: Cpu },
      { to: '/lab/mockups',  label: 'Mockups',      icon: Monitor },
      { to: '/lab/guia',     label: 'Guía Postal',  icon: FileText },
    ],
  },
]

const EXTERNAL_LINKS = [
  {
    href:  'http://localhost:8081',
    label: 'Mongo Express',
    hint:  'Base de datos',
    icon:  Database,
  },
]

// ── Sub-components ─────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function NavGroupSection({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        {group.label}
        <ChevronDown
          className={cn('size-3 transition-transform duration-150', open ? 'rotate-0' : '-rotate-90')}
        />
      </button>

      {open && (
        <div className="space-y-0.5">
          {group.items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              data-cy={`lab-nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LabShell() {
  const navigate     = useNavigate()
  const session      = useLabStore((s) => s.session)
  const clearSession = useLabStore((s) => s.clearSession)
  const [checked, setChecked] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!session?.token) {
      navigate('/lab/login', { replace: true })
      return
    }
    labVerify(session.token)
      .then(() => { if (mountedRef.current) setChecked(true) })
      .catch(() => {
        clearSession()
        navigate('/lab/login', { replace: true })
      })
  }, [session, navigate, clearSession])

  async function handleLogout() {
    if (session?.token) await labLogout(session.token).catch(() => {})
    clearSession()
    navigate('/lab/login', { replace: true })
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 border-r bg-muted/20 flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
            <FlaskConical className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Lab 4-72</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Entorno dev</p>
          </div>
          <span className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary">
            {session?.rol ?? 'dev'}
          </span>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-3">
          {NAV_GROUPS.map((group) => (
            <NavGroupSection key={group.label} group={group} />
          ))}

          <Separator />

          {/* Herramientas externas */}
          <div>
            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Herramientas
            </p>
            <div className="space-y-0.5">
              {EXTERNAL_LINKS.map(({ href, label, hint, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cy={`lab-ext-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors group"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block leading-none">{label}</span>
                    <span className="block text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
                      {hint}
                    </span>
                  </span>
                  <ExternalLink className="size-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer — usuario + logout */}
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="flex size-6 items-center justify-center rounded-full bg-muted">
              <User className="size-3.5 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground truncate flex-1">
              {session?.usuario}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-8"
            onClick={handleLogout}
            data-cy="lab-logout"
          >
            <LogOut className="size-3.5 mr-2" />
            Salir del Lab
          </Button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
