/**
 * GuiaPostalSvg — Renderiza guia-template.svg con datos reales.
 *
 * Arquitectura de tres capas:
 *   1. buildGuiaData()  (src/lib/guia-data.ts)  GuiaEnvio → GuiaData (campos nombrados)
 *   2. CAMPOS           (este archivo)           GuiaData  → tspan IDs de esta plantilla
 *   3. inyectarGuia()   (este archivo)           aplica CAMPOS sobre el SVG del DOM
 *
 * Para diseñar otra plantilla: copiar GuiaPostalSvg.tsx, cambiar el import del SVG
 * y ajustar CAMPOS con los nuevos tspan IDs. buildGuiaData() no requiere cambios.
 */

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { GuiaEnvio } from '@/queries/ventas.queries'
import { buildGuiaData, type GuiaData } from '@/lib/guia-data'
import guiaSvg from '@/assets/guia-template.svg?raw'

// ─────────────────────────────────────────────────────────────────────────────
// CAMPOS — mapa campo GuiaData → tspan ID en guia-template.svg
//
// Modificar aquí si se mueve un campo en la plantilla SVG.
// Omitir una clave = ese campo no se inyecta (p.ej. campos sin slot en el SVG).
// ─────────────────────────────────────────────────────────────────────────────

const CAMPOS: Partial<Record<keyof GuiaData, string>> = {
  // Encabezado / info bar
  tipoEtiqueta:        'tspan54',
  centroOperativo:     'tspan80',
  fechaAdmision:       'tspan106',
  fechaApproxEntrega:  'tspan146',

  // Número de guía (zona monospace superior-derecha)
  barcodeText1:  'tspan740',
  barcodeText2:  'tspan744',
  codigoGuia:    'tspan1238',

  // Remitente  (tspan332-440 según CAMPOS embebido en la plantilla)
  remitenteNombre:    'tspan332',
  remitenteDireccion: 'tspan348',
  remitenteNit:       'tspan364',
  remitenteCiudad:    'tspan392',
  remitenteDepto:     'tspan408',
  remitenteTelefono:  'tspan424',
  remitenteCP:        'tspan440',

  // Destinatario  (tspan456-520 según CAMPOS embebido en la plantilla)
  destinatarioNombre:    'tspan456',
  destinatarioDireccion: 'tspan472',
  destinatarioCiudad:    'tspan488',
  destinatarioDepto:     'tspan504',
  destinatarioTel:       'tspan520',

  // Pesos
  pesoFisico:      'tspan576',
  pesoVolumetrico: 'tspan592',
  pesoFacturado:   'tspan608',

  // Valores
  valorDeclarado: 'tspan624',
  valorFlete:     'tspan640',
  costoManejo:    'tspan656',
  valorTotal:     'tspan672',

  // Observaciones y contenido
  diceContener: 'tspan_diceContener',

  // Código de barras (texto)
  codigoOperativo:     'tspan544',
  codigoOperativoBajo: 'tspan1306',
  barcodeLineal:       'tspan1324',

  // Fechas adicionales
  fechaEntrega:      'tspan812',
  fechaPlaceholder1: 'tspan1250',
  fechaPlaceholder2: 'tspan1262',

  // Talón lateral — Destinatario
  lateral_destinatarioNombre:    'tspan_lateral_destinatarioNombre',
  lateral_destinatarioDireccion: 'tspan_lateral_destinatarioDireccion',
  lateral_destinatarioCiudad:    'tspan_lateral_destinatarioCiudad',
  lateral_destinatarioDepto:     'tspan_lateral_destinatarioDepto',
  lateral_destinatarioCP:        'tspan_lateral_destinatarioCP',
  lateral_fechaAdmision:         'tspan_lateral_fechaAdmision',

  // Talón lateral — Remitente
  lateral_remitenteNombre:    'tspan_lateral_remitenteNombre',
  lateral_remitenteDireccion: 'tspan_lateral_remitenteDireccion',
  lateral_remitenteCiudad:    'tspan_lateral_remitenteCiudad',
  lateral_remitenteDepto:     'tspan_lateral_remitenteDepto',
  lateral_remitenteCP:        'tspan_lateral_remitenteCP',
  lateral_envio:               'tspan_lateral_envio',

  // Franja derecha
  lateral_derecho_codigo: 'tspan_lateral_derecho_codigo',
  lateral_derecho_centro: 'tspan_lateral_derecho_centro',

  // Pie legal
  pieLegal1: 'tspan_pieLegal1',
  pieLegal2: 'tspan_pieLegal2',
  pieLegal3: 'tspan_pieLegal3',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers SVG (internos — no forman parte del contrato de datos)
// ─────────────────────────────────────────────────────────────────────────────

function setTspan(svg: Element, id: string, value: string) {
  const el = svg.querySelector(`#${id}`)
  if (!el) return
  el.textContent = value
  el.removeAttribute('x')
}

function insertText(
  parent: Element,
  x: number,
  y: number,
  value: string,
  style = 'font-size:5px;font-family:Helvetica;fill:#000000',
) {
  const key      = `${x}-${y}`
  const existing = parent.querySelector(`[data-dyn="${key}"]`)
  const el       = existing ?? document.createElementNS('http://www.w3.org/2000/svg', 'text')
  el.setAttribute('transform', `matrix(1,0,0,-1,${x},${y})`)
  el.setAttribute('style', style)
  el.setAttribute('data-dyn', key)
  el.textContent = value
  if (!existing) parent.appendChild(el)
}

function generateBarcodeDataUrl(value: string): string | null {
  try {
    const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
    JsBarcode(tmp, value, { format: 'CODE128', height: 36, margin: 0, displayValue: false })
    const xml = new XMLSerializer().serializeToString(tmp)
    return `data:image/svg+xml;base64,${btoa(xml)}`
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inyección principal
// ─────────────────────────────────────────────────────────────────────────────

function inyectarGuia(svg: SVGSVGElement, guia: GuiaEnvio) {
  const data = buildGuiaData(guia)
  const set  = (id: string, v: string) => setTspan(svg, id, v)

  // Inyección por CAMPOS
  for (const [campo, tspanId] of Object.entries(CAMPOS) as [keyof GuiaData, string][]) {
    set(tspanId, data[campo])
  }

  // Orden de servicio — slot sin tspan dedicado; se inserta como texto libre
  const g10 = svg.querySelector('#g10') as Element | null
  if (data.ordenServicio && g10) {
    insertText(g10, 237, 736.552, data.ordenServicio)
  }

  // Código de barras — imagen lineal
  if (data.barcodeLineal) {
    const dataUrl = generateBarcodeDataUrl(data.barcodeLineal)
    if (dataUrl) {
      const img = svg.querySelector('#image1276') as SVGImageElement | null
      if (img) {
        img.setAttribute('href', dataUrl)
        img.setAttribute('xlink:href', dataUrl)
      }
    }
  }

  // Watermark BORRADOR
  const existingWm = svg.querySelector('[data-dyn="watermark"]')
  if (guia.estado === 'BORRADOR') {
    if (!existingWm) {
      const wm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      wm.setAttribute('data-dyn', 'watermark')
      wm.setAttribute('x', '408')
      wm.setAttribute('y', '171')
      wm.setAttribute('text-anchor', 'middle')
      wm.setAttribute('transform', 'rotate(-35, 408, 171)')
      wm.setAttribute('style', 'font-size:60px;font-weight:bold;fill:rgba(200,0,0,0.12);font-family:Helvetica')
      wm.textContent = 'BORRADOR'
      svg.appendChild(wm)
    }
  } else {
    existingWm?.remove()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  guia:       GuiaEnvio
  className?: string
}

export function GuiaPostalSvg({ guia, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svg = containerRef.current?.querySelector('svg') as SVGSVGElement | null
    if (svg) inyectarGuia(svg, guia)
  }, [guia])

  return (
    <>
      <style>{`
        @media print {
          @page { size: 11in 5in landscape; margin: 0; }
          body * { visibility: hidden !important; }
          .guia-svg-root, .guia-svg-root * { visibility: visible !important; }
          .guia-svg-root {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100vw !important; height: auto !important;
            overflow: hidden !important; box-shadow: none !important;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className={`guia-svg-root${className ? ` ${className}` : ''}`}
        style={{ width: 765, background: '#fff' }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: guiaSvg }}
      />
    </>
  )
}
