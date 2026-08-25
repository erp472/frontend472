import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { GuiaEnvio } from '@/queries/ventas.queries'
import guiaSvg from '@/assets/guia.svg?raw'

// ── Formatters ────────────────────────────────────────────────────────────────

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
})

function fmt(v: number | null | undefined): string {
  return v == null ? '—' : COP.format(v)
}

function grams(kg: number | null | undefined): string {
  if (kg == null) return '—'
  return String(Math.round(kg * 1000))
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function setTspan(svg: Element, id: string, value: string) {
  const el = svg.querySelector(`#${id}`)
  if (!el) return
  el.textContent = value
  // Remove fixed per-character x positions so variable-length values don't overlap
  el.removeAttribute('x')
}

function insertText(
  g10: Element,
  x: number,
  y: number,
  value: string,
  style = 'font-size:5px;font-family:Helvetica;fill:#000000',
) {
  const key = `${x}-${y}`
  const existing = g10.querySelector(`[data-dyn="${key}"]`)
  const el = existing ?? document.createElementNS('http://www.w3.org/2000/svg', 'text')
  el.setAttribute('transform', `matrix(1,0,0,-1,${x},${y})`)
  el.setAttribute('style', style)
  el.setAttribute('data-dyn', key)
  el.textContent = value
  if (!existing) g10.appendChild(el)
}

function generateBarcodeDataUrl(value: string): string | null {
  try {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    JsBarcode(tmp, value, {
      format: 'CODE128',
      height: 36,
      margin: 0,
      displayValue: false,
    })
    const xml = new XMLSerializer().serializeToString(tmp)
    return `data:image/svg+xml;base64,${btoa(xml)}`
  } catch {
    return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  guia:       GuiaEnvio
  className?: string
}

export function GuiaPostalSvg({ guia, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const svg = container.querySelector('svg') as SVGSVGElement | null
    if (!svg) return

    const g10 = svg.querySelector('#g10') as Element | null
    const set = (id: string, v: string) => setTspan(svg, id, v)

    // ── Tipo de servicio ──────────────────────────────────────────────────────
    set('tspan54', guia.tipo === 'internacional'
      ? 'CORREO CERTIFICADO INTERNACIONAL'
      : 'CORREO CERTIFICADO NACIONAL')

    // ── Info bar ──────────────────────────────────────────────────────────────
    set('tspan80',  guia.centroOperativo ?? '—')
    set('tspan106', fmtDate(guia.generadoEn))
    set('tspan146', fmtDateOnly(guia.fechaEntregaEstimada))

    // Orden servicio: label tspan94 at (152.341,736.552); value inserted after it
    if (guia.ordenServicio != null && g10) {
      insertText(g10, 237, 736.552, String(guia.ordenServicio))
    }

    // ── Guide number (large monospace in upper-right) ─────────────────────────
    // SVG template was designed for 13-char UPU codes (e.g. RA185194038CO).
    // We split at position 10 regardless of actual length; when the number is
    // ≤10 chars it fits entirely on the first line and the second line shows
    // only the closing asterisk (standard barcode delimiters).
    const guide = guia.numeroGuia ?? ''
    set('tspan740',  `*${guide.slice(0, 10)}`)
    set('tspan744',  guide.length > 10 ? `${guide.slice(10)}*` : '*')
    set('tspan1238', guide)

    // ── Destinatario ──────────────────────────────────────────────────────────
    set('tspan332', guia.destinatario.nombre      ?? '')
    set('tspan348', guia.destinatario.direccion   ?? '')
    set('tspan364', guia.destinatario.documento   ?? '')
    set('tspan392', guia.destinatario.ciudad      ?? '')
    set('tspan408', guia.destinatario.departamento ?? '')   // Depto
    set('tspan424', guia.destinatario.telefono    ?? '')
    set('tspan440', guia.destinatario.codigoPostal ?? '')

    // ── Remitente ─────────────────────────────────────────────────────────────
    set('tspan456', guia.remitente.nombre       ?? '')
    set('tspan472', guia.remitente.direccion    ?? '')
    set('tspan488', guia.remitente.ciudad       ?? '')
    set('tspan504', guia.remitente.departamento ?? '')      // Depto
    set('tspan520', guia.remitente.telefono     ?? '')

    // ── Valores ───────────────────────────────────────────────────────────────
    set('tspan576', grams(guia.peso.fisicoKg))
    set('tspan592', grams(guia.peso.volumetricoKg ?? null))
    set('tspan608', grams(guia.peso.tarificadoKg))
    set('tspan624', fmt(guia.valores.declarado))
    set('tspan640', fmt(guia.valores.servicio))
    set('tspan656', guia.valores.manejo > 0 ? fmt(guia.valores.manejo) : '$0')
    set('tspan672', fmt(guia.valores.total))

    // ── Código de barras ──────────────────────────────────────────────────────
    // El barcode completo de 4-72 tiene formato: {origOp7}{destOp7}{guia13}
    // Si el backend envía el string completo (≥14 dígitos antes de la guía),
    // extraemos los códigos operativos; de lo contrario dejamos esos campos vacíos.
    const cb = guia.codigoBarras ?? ''
    const isFullBarcode = /^\d{14}/.test(cb)
    const origOp = isFullBarcode ? cb.slice(0, 7) : ''
    const destOp = isFullBarcode ? cb.slice(7, 14) : ''
    set('tspan544',  origOp)   // Código Operativo remitente
    set('tspan1306', destOp)   // Código Operativo destinatario
    set('tspan1324', cb)

    if (cb) {
      const dataUrl = generateBarcodeDataUrl(cb)
      if (dataUrl) {
        const img = svg.querySelector('#image1276') as SVGImageElement | null
        img?.setAttribute('href', dataUrl)
        img?.setAttribute('xlink:href', dataUrl)
      }
    }

    // ── Watermark BORRADOR ────────────────────────────────────────────────────
    const existingWm = svg.querySelector('[data-dyn="watermark"]')
    if (guia.estado === 'BORRADOR') {
      if (!existingWm) {
        const wm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        wm.setAttribute('data-dyn', 'watermark')
        wm.setAttribute('x', '408')
        wm.setAttribute('y', '528')
        wm.setAttribute('text-anchor', 'middle')
        wm.setAttribute('transform', 'rotate(-35, 408, 528)')
        wm.setAttribute('style', 'font-size:100px;font-weight:bold;fill:rgba(200,0,0,0.12);font-family:Helvetica')
        wm.textContent = 'BORRADOR'
        svg.appendChild(wm)
      }
    } else {
      existingWm?.remove()
    }

  }, [guia])

  return (
    <>
      <style>{`
        @media print {
          @page { size: 8.5in 11in portrait; margin: 0; }
          body * { visibility: hidden !important; }
          .guia-svg-root, .guia-svg-root * { visibility: visible !important; }
          .guia-svg-root {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 816px !important; height: 1056px !important;
            overflow: hidden !important; box-shadow: none !important;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className={`guia-svg-root${className ? ` ${className}` : ''}`}
        style={{ width: 816, background: '#fff' }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: guiaSvg }}
      />
    </>
  )
}
