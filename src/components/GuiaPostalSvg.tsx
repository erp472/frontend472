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

import { useEffect, useMemo, useRef } from 'react'
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
  remitenteNombre:     'tspan332',
  remitenteDireccion:  'tspan348',
  remitenteReferencia: 'tspan_remitenteReferencia',
  remitenteNit:       'tspan364',
  remitenteCiudad:    'tspan392',
  remitenteDepto:     'tspan408',
  remitenteTelefono:  'tspan424',
  remitenteCP:        'tspan440',

  // Destinatario  (tspan456-520 según CAMPOS embebido en la plantilla)
  destinatarioNombre:     'tspan456',
  destinatarioDireccion:  'tspan472',
  destinatarioReferencia: 'tspan_destinatarioReferencia',
  destinatarioCiudad:    'tspan488',
  destinatarioDepto:     'tspan504',
  destinatarioTel:       'tspan520',
  destinatarioCP:        'tspan_destinatarioCP',

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
  observaciones: 'tspan704',
  diceContener:  'tspan_diceContener',

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

// data-maxw = ancho útil del slot (unidades PDF). Se condensa solo si el texto
// real lo desborda, para no estirar valores cortos.
function condensar(el: SVGTextContentElement, maxw: number) {
  el.removeAttribute('textLength')
  if (el.textContent && el.getComputedTextLength() > maxw) {
    el.setAttribute('textLength', String(maxw))
    el.setAttribute('lengthAdjust', 'spacingAndGlyphs')
  }
}

function setTspan(svg: Element, id: string, value: string) {
  const el = svg.querySelector(`#${id}`)
  if (!el) return
  el.textContent = value
  el.removeAttribute('x')

  const maxw = Number(el.getAttribute('data-maxw'))
  if (maxw) condensar(el as SVGTextContentElement, maxw)
}

// Reparte el texto de un slot entre sus renglones de continuación
// (data-wrap = ancho del renglón, data-wrap-next = id del siguiente). Sólo se
// puede hacer aquí porque hay que medir el texto ya compuesto: la plantilla no
// sabe cuánto ocupa un valor hasta que el navegador lo dibuja.
function repartirLineas(svg: Element) {
  for (const el of svg.querySelectorAll<SVGTextContentElement>('[data-wrap-next]')) {
    const ancho = Number(el.getAttribute('data-wrap'))
    const texto = el.textContent ?? ''
    if (!ancho || !texto) continue

    el.removeAttribute('textLength')
    if (el.getComputedTextLength() <= ancho) continue

    // Último espacio cuyo prefijo todavía cabe; si ni la primera palabra cabe,
    // se deja entera y el condensado de data-maxw la ajusta.
    let corte = -1
    for (let i = texto.indexOf(' '); i > 0; i = texto.indexOf(' ', i + 1)) {
      if (el.getSubStringLength(0, i) > ancho) break
      corte = i
    }
    if (corte < 0) continue

    el.textContent = texto.slice(0, corte)

    const sig = svg.querySelector<SVGTextContentElement>(`#${el.getAttribute('data-wrap-next')}`)
    if (!sig) continue
    sig.textContent = texto.slice(corte + 1)

    const maxw = Number(sig.getAttribute('data-maxw'))
    if (maxw) condensar(sig, maxw)
  }
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
// Pre-inyección sobre el string (mismo motor que el generador del PDF)
//
// La plantilla se inyecta ANTES de entrar al DOM para que la guía nunca dependa
// de que el efecto llegue a correr: si el efecto falla o el <svg> aún no está
// montado, los datos ya vienen en el markup. El efecto sólo refina lo que exige
// medir en pantalla (condensado por data-maxw, watermark, orden de servicio).
// ─────────────────────────────────────────────────────────────────────────────

/** La plantilla trae un <script> de demo que pisa los datos si algo lo ejecuta. */
const TEMPLATE = guiaSvg.replace(/<script[\s\S]*?<\/script>/g, '')

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function injectField(svg: string, tspanId: string, value: string): string {
  const idPos = svg.indexOf(`id="${tspanId}"`)
  if (idPos === -1) return svg

  const tagStart = svg.lastIndexOf('<tspan', idPos)
  if (tagStart === -1) return svg

  const tagEnd = svg.indexOf('>', idPos) + 1
  if (tagEnd === 0) return svg

  const closeTag = svg.indexOf('</tspan>', tagEnd)
  if (closeTag === -1) return svg

  return svg.slice(0, tagEnd) + xmlEscape(value) + svg.slice(closeTag)
}

function injectBarcodeImage(svg: string, dataUrl: string): string {
  const idPos = svg.indexOf('id="image1276"')
  if (idPos === -1) return svg

  const attr     = 'xlink:href="'
  const hrefPos  = svg.indexOf(attr, idPos)
  if (hrefPos === -1) return svg

  const valStart = hrefPos + attr.length
  const valEnd   = svg.indexOf('"', valStart)
  if (valEnd === -1) return svg

  return svg.slice(0, valStart) + dataUrl + svg.slice(valEnd)
}

function buildSvgMarkup(guia: GuiaEnvio): string {
  const data = buildGuiaData(guia)
  let svg = TEMPLATE

  for (const [campo, tspanId] of Object.entries(CAMPOS) as [keyof GuiaData, string][]) {
    svg = injectField(svg, tspanId, data[campo] ?? '')
  }

  if (data.barcodeLineal) {
    const dataUrl = generateBarcodeDataUrl(data.barcodeLineal)
    if (dataUrl) svg = injectBarcodeImage(svg, dataUrl)
  }

  return svg
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

  repartirLineas(svg)

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

/** Dimensiones del viewBox de guia-template.svg — 8.5in × 3.77in a 96dpi. */
export const GUIA_SVG_W = 816
export const GUIA_SVG_H = 362

interface Props {
  guia:       GuiaEnvio
  className?: string
}

export function GuiaPostalSvg({ guia, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markup       = useMemo(() => buildSvgMarkup(guia), [guia])

  useEffect(() => {
    const svg = containerRef.current?.querySelector('svg') as SVGSVGElement | null
    if (!svg) return
    // Los datos ya están en el markup; si el refinado falla no debe tumbar la
    // guía completa, que es lo que pasaba cuando el error subía al boundary.
    try {
      inyectarGuia(svg, guia)
    } catch (err) {
      console.error('[GuiaPostalSvg] fallo el refinado en DOM:', err)
    }
  }, [guia, markup])

  return (
    <>
      <style>{`
        @media print {
          @page { size: 8.5in 3.77in; margin: 0; }
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
        style={{ width: GUIA_SVG_W, background: '#fff' }}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </>
  )
}
