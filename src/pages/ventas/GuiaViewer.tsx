import { useEffect, useState } from 'react'
import { ZoomIn, ZoomOut, Printer, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GuiaPostalSvg } from '@/components/GuiaPostalSvg'
import type { GuiaEnvio } from '@/queries/ventas.queries'

const ZOOM_STEP = 0.15
const ZOOM_MIN  = 0.3
const ZOOM_MAX  = 2.5
const ZOOM_DEF  = 1.0

export default function GuiaViewer() {
  const [guia, setGuia] = useState<GuiaEnvio | null>(null)
  const [zoom, setZoom] = useState(ZOOM_DEF)

  useEffect(() => {
    // Primary: data passed via URL query param (works in Tauri isolated windows)
    const params = new URLSearchParams(window.location.search)
    const data = params.get('data')
    if (data) {
      try { setGuia(JSON.parse(decodeURIComponent(atob(data))) as GuiaEnvio) } catch { /* noop */ }
      return
    }
    // Fallback: legacy localStorage channel (same-origin web only)
    const raw = localStorage.getItem('__guia_viewer__')
    if (raw) {
      localStorage.removeItem('__guia_viewer__')
      try { setGuia(JSON.parse(raw) as GuiaEnvio) } catch { /* noop */ }
    }
  }, [])

  const clampZoom = (z: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(z.toFixed(2))))

  const zoomOut  = () => setZoom((z) => clampZoom(z - ZOOM_STEP))
  const zoomIn   = () => setZoom((z) => clampZoom(z + ZOOM_STEP))
  const zoomReset = () => setZoom(ZOOM_DEF)

  if (!guia) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <p className="text-sm text-muted-foreground">Sin datos de guía.</p>
      </div>
    )
  }

  // GuiaPostalSvg usa 765px de ancho (SVG landscape)
  const svgW = 765
  const svgH = 1056

  return (
    <div className="flex flex-col h-screen bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div
        className="no-print flex-none flex h-11 items-center gap-2 border-b bg-card px-4 shadow-sm z-10"
        style={{ minWidth: svgW }}
      >
        {/* Título */}
        <span className="flex-1 truncate font-mono text-sm font-semibold">
          {guia.estado === 'BORRADOR'
            ? <span className="text-destructive">BORRADOR</span>
            : <>Guía <span className="text-primary">{guia.numeroGuia}</span></>}
        </span>

        {/* Controles de zoom */}
        <div className="flex items-center gap-1 rounded-md border bg-background px-1">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={zoom <= ZOOM_MIN}
            onClick={zoomOut}
            title="Reducir"
          >
            <ZoomOut className="size-3.5" />
          </Button>

          <button
            type="button"
            className="w-14 rounded px-1 py-0.5 text-center text-xs tabular-nums hover:bg-accent"
            onClick={zoomReset}
            title="Restablecer zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            disabled={zoom >= ZOOM_MAX}
            onClick={zoomIn}
            title="Ampliar"
          >
            <ZoomIn className="size-3.5" />
          </Button>

          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            onClick={zoomReset}
            title="Restablecer"
          >
            <RotateCcw className="size-3" />
          </Button>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          {guia.estado !== 'BORRADOR' && (
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => window.print()}>
              <Printer className="size-3.5" />
              Imprimir
            </Button>
          )}
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            onClick={() => window.close()}
            title="Cerrar ventana"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Contenido ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto flex justify-center">
        {/* Wrapper con dimensiones físicas del contenido escalado — garantiza scrollbars correctos */}
        <div
          style={{
            width: Math.round(svgW * zoom),
            height: Math.round(svgH * zoom),
            position: 'relative',
            flexShrink: 0,
            margin: '24px 16px',
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: svgW,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            <GuiaPostalSvg guia={guia} />
          </div>
        </div>
      </div>

    </div>
  )
}
