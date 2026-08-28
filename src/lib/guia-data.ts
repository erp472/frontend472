/**
 * guia-data.ts
 *
 * Modelo de datos canónico de una guía postal 4-72.
 * `GuiaData` nombra cada campo de la guía con el mismo vocabulario que usa
 * el CAMPOS embebido en guia-template.svg, de modo que el objeto sirva de
 * contrato entre cualquier plantilla (SVG, HTML, PDF) y la fuente de datos.
 *
 * Uso:
 *   const data = buildGuiaData(guia)  // GuiaEnvio → GuiaData
 *   // Cada plantilla mapea keyof GuiaData a su propio slot (tspan ID, celda, etc.)
 */

import type { GuiaEnvio } from '@/queries/ventas.queries'

// ── Textos legales estáticos ───────────────────────────────────────────────────

export const PIE_LEGAL_472 = {
  linea1:
    'Principal: Bogotá D.C. Colombia Diagonal 25 G # 95 A 55 Bogotá / www.4-72.com.co ' +
    'Línea Nacional: 01 8000 111 210 / Tel. contacto: (571) 4722000. ' +
    'Min. Transporte, Lic. de carga 000200 del 20 de mayo de 2011/' +
    'Min.TIC, Res. Mensajería Expresa 001967 de 9 septiembre del 2011',
  linea2:
    'El usuario deja expresa constancia que tuvo conocimiento del contrato que se ' +
    'encuentra publicado en la pagina web, 4-72 tratará sus datos personales para ' +
    'probar la entrega del envío. Para ejercer algún reclamo: ' +
    'servicioalcliente@4-72.com.co Para consultar la Política de',
  linea3: 'Tratamiento: www.4-72.com.co',
} as const

// ── Tipo ──────────────────────────────────────────────────────────────────────

export interface GuiaData {
  // Encabezado
  tipoEtiqueta:        string  // 'CORREO CERTIFICADO NACIONAL' | 'CORREO CERTIFICADO INTERNACIONAL'
  centroOperativo:     string
  fechaAdmision:       string  // dd/mm/yyyy HH:mm:ss
  fechaApproxEntrega:  string  // dd/mm/yyyy
  ordenServicio:       string  // número de OS, vacío si no aplica

  // Número de guía (zona grande superior-derecha)
  barcodeText1:  string  // '*' + primeros 10 chars del número de guía
  barcodeText2:  string  // resto + '*' (sólo si guía > 10 chars)
  codigoGuia:    string  // número completo

  // Remitente
  remitenteNombre:    string
  remitenteDireccion: string
  remitenteNit:       string  // NIT / documento del remitente
  remitenteCiudad:    string
  remitenteDepto:     string
  remitenteTelefono:  string
  remitenteCP:        string

  // Destinatario
  destinatarioNombre:    string
  destinatarioDireccion: string
  destinatarioCiudad:    string
  destinatarioDepto:     string
  destinatarioTel:       string

  // Pesos (en gramos, como string entero)
  pesoFisico:      string
  pesoVolumetrico: string
  pesoFacturado:   string

  // Valores monetarios (COP formateado)
  valorDeclarado: string
  valorFlete:     string
  costoManejo:    string
  valorTotal:     string

  // Observaciones y contenido
  observaciones: string
  diceContener:  string

  // Código de barras
  codigoOperativo:     string  // primeros 7 chars del barcode completo (origen)
  codigoOperativoBajo: string  // chars 7-14 del barcode completo (destino)
  barcodeLineal:       string  // string completo que genera el código de barras

  // Slots de fecha adicionales de la plantilla
  fechaEntrega:      string  // dd/mm/yyyy — fecha estimada de entrega
  fechaPlaceholder1: string  // dd/mm/yyyy — fecha de admisión (2.ª aparición)
  fechaPlaceholder2: string  // dd/mm/yyyy — fecha entrega (2.ª aparición)

  // Talón lateral — Destinatario
  lateral_destinatarioNombre:    string
  lateral_destinatarioDireccion: string
  lateral_destinatarioCiudad:    string
  lateral_destinatarioDepto:     string
  lateral_destinatarioCP:        string
  lateral_fechaAdmision:         string

  // Talón lateral — Remitente
  lateral_remitenteNombre:    string
  lateral_remitenteDireccion: string
  lateral_remitenteCiudad:    string
  lateral_remitenteDepto:     string
  lateral_remitenteCP:        string
  lateral_envio:               string  // nombre/tipo del servicio

  // Franja derecha
  lateral_derecho_codigo: string  // código de zona/distrito (4 chars)
  lateral_derecho_centro: string  // nombre del centro operativo

  // Pie legal inferior
  pieLegal1: string
  pieLegal2: string
  pieLegal3: string
}

// ── Formatters internos ───────────────────────────────────────────────────────

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

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildGuiaData(guia: GuiaEnvio): GuiaData {
  const guide = guia.numeroGuia ?? ''

  // Barcode: formato 4-72 = {origOp:7}{destOp:7}{guia:13+}
  const cb           = guia.codigoBarras ?? ''
  const isFullBarcode = /^\d{14}/.test(cb)
  const origOp       = isFullBarcode ? cb.slice(0, 7)  : ''
  const destOp       = isFullBarcode ? cb.slice(7, 14) : ''

  return {
    // Encabezado
    tipoEtiqueta:       guia.tipo === 'internacional'
                          ? 'CORREO CERTIFICADO INTERNACIONAL'
                          : 'CORREO CERTIFICADO NACIONAL',
    centroOperativo:    guia.centroOperativo ?? '',
    fechaAdmision:      fmtDate(guia.generadoEn),
    fechaApproxEntrega: fmtDateOnly(guia.fechaEntregaEstimada),
    ordenServicio:      guia.ordenServicio != null ? String(guia.ordenServicio) : '',

    // Número de guía
    barcodeText1: `*${guide.slice(0, 10)}`,
    barcodeText2: guide.length > 10 ? `${guide.slice(10)}*` : '*',
    codigoGuia:   guide,

    // Remitente
    remitenteNombre:    guia.remitente.nombre       ?? '',
    remitenteDireccion: guia.remitente.direccion    ?? '',
    remitenteNit:       guia.remitente.documento    ?? '',
    remitenteCiudad:    guia.remitente.ciudad        ?? '',
    remitenteDepto:     guia.remitente.departamento  ?? '',
    remitenteTelefono:  guia.remitente.telefono     ?? '',
    remitenteCP:        guia.remitente.codigoPostal ?? '',

    // Destinatario
    destinatarioNombre:    guia.destinatario.nombre       ?? '',
    destinatarioDireccion: guia.destinatario.direccion    ?? '',
    destinatarioCiudad:    guia.destinatario.ciudad        ?? '',
    destinatarioDepto:     guia.destinatario.departamento  ?? '',
    destinatarioTel:       guia.destinatario.telefono     ?? '',

    // Pesos
    pesoFisico:      grams(guia.peso.fisicoKg),
    pesoVolumetrico: grams(guia.peso.volumetricoKg ?? null),
    pesoFacturado:   grams(guia.peso.tarificadoKg),

    // Valores
    valorDeclarado: fmt(guia.valores.declarado),
    valorFlete:     fmt(guia.valores.servicio),
    costoManejo:    guia.valores.manejo > 0 ? fmt(guia.valores.manejo) : '$0',
    valorTotal:     fmt(guia.valores.total),

    // Observaciones y contenido
    observaciones: guia.observaciones ?? '',
    diceContener:  guia.contenido ?? '',

    // Código de barras
    codigoOperativo:     origOp,
    codigoOperativoBajo: destOp,
    barcodeLineal:       cb,

    // Fechas adicionales
    fechaEntrega:      fmtDateOnly(guia.fechaEntregaEstimada),
    fechaPlaceholder1: fmtDateOnly(guia.generadoEn),
    fechaPlaceholder2: fmtDateOnly(guia.fechaEntregaEstimada),

    // Talón lateral — Destinatario
    lateral_destinatarioNombre:    guia.destinatario.nombre       ?? '',
    lateral_destinatarioDireccion: guia.destinatario.direccion    ?? '',
    lateral_destinatarioCiudad:    guia.destinatario.ciudad        ?? '',
    lateral_destinatarioDepto:     guia.destinatario.departamento  ?? '',
    lateral_destinatarioCP:        guia.destinatario.codigoPostal ?? '',
    lateral_fechaAdmision:         fmtDateOnly(guia.generadoEn),

    // Talón lateral — Remitente
    lateral_remitenteNombre:    guia.remitente.nombre       ?? '',
    lateral_remitenteDireccion: guia.remitente.direccion    ?? '',
    lateral_remitenteCiudad:    guia.remitente.ciudad        ?? '',
    lateral_remitenteDepto:     guia.remitente.departamento  ?? '',
    lateral_remitenteCP:        guia.remitente.codigoPostal ?? '',
    lateral_envio:               guia.tipoServicio            ?? '',

    // Franja derecha
    lateral_derecho_codigo: destOp ? destOp.slice(0, 4) : '',
    lateral_derecho_centro: guia.centroOperativo ?? '',

    // Pie legal
    pieLegal1: PIE_LEGAL_472.linea1,
    pieLegal2: PIE_LEGAL_472.linea2,
    pieLegal3: PIE_LEGAL_472.linea3,
  }
}
