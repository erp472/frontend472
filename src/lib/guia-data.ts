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
  barcodeText1:  string  // '*' + primeros 10 chars del código de barras
  barcodeText2:  string  // resto + '*'
  codigoGuia:    string  // número completo

  // Remitente
  remitenteNombre:    string
  remitenteDireccion: string
  remitenteReferencia: string // adición de dirección (apto, torre, interior…)
  remitenteNit:       string  // NIT / documento del remitente
  remitenteCiudad:    string
  remitenteDepto:     string
  remitenteTelefono:  string
  remitenteCP:        string

  // Destinatario
  destinatarioNombre:    string
  destinatarioDireccion: string
  destinatarioReferencia: string
  destinatarioCiudad:    string
  destinatarioDepto:     string
  destinatarioTel:       string
  destinatarioCP:        string

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
  codigoOperativo:     string  // código del servicio postal
  codigoOperativoBajo: string  // código de la sucursal de admisión
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
  lateral_envio:               string  // código del servicio

  // Franja derecha
  lateral_derecho_codigo: string  // tramo final del código de sucursal
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

// El slot vertical de la franja derecha sólo admite 8 caracteres, así que el
// código de sucursal completo ("SUC-BOG-002") se recortaría a "SUC-BOG-". El
// tramo final es el que identifica el punto, así que es el que conservamos.
function codigoCorto(codigoSucursal: string): string {
  const partes = codigoSucursal.split('-')
  return partes.length > 1 ? partes[partes.length - 1]! : codigoSucursal
}

// Corta en el último espacio antes del límite para no partir una palabra por la
// mitad ("Chapinero Centro Alto" → "Chapinero" y no "Chapinero Cent").
function truncarPalabra(texto: string, max: number): string {
  if (texto.length <= max) return texto
  const corte = texto.slice(0, max)
  const sep   = corte.lastIndexOf(' ')
  return (sep > 0 ? corte.slice(0, sep) : corte).trimEnd()
}

// El formulario compone la dirección como "<dirección>, <adición>" (ver
// composeAddress en CarritoVenta) y la envía en un solo campo, así que aquí es
// donde se vuelve a separar para llenar el slot "Referencia:" de la guía. Las
// direcciones normalizadas nunca traen coma en la parte principal, así que el
// corte es en la primera.
function partirDireccion(direccion: string): [string, string] {
  const i = direccion.indexOf(', ')
  if (i < 0) return [direccion, '']
  return [direccion.slice(0, i), direccion.slice(i + 2)]
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildGuiaData(guia: GuiaEnvio): GuiaData {
  const guide = guia.numeroGuia ?? ''
  // El código de barras es el S10 (RA185194038CO) cuando el servicio tiene
  // rastreo; si no, cae al número de guía.
  const cb      = guia.codigoBarras ?? guide
  const cbHead  = cb.slice(0, 10)
  const cbTail  = cb.slice(10)
  const centro  = guia.centroOperativo       ?? ''
  const centroC = guia.centroOperativoCodigo ?? ''
  const servCod = guia.codigoServicio        ?? ''

  // El borrador se arma desde el formulario a medio llenar, así que los objetos
  // anidados pueden faltar; sin esto un remitente ausente lanzaba y dejaba la
  // guía entera en blanco en vez de mostrar los campos que sí hay.
  const rem  = guia.remitente    ?? ({} as NonNullable<GuiaEnvio['remitente']>)
  const dest = guia.destinatario ?? ({} as NonNullable<GuiaEnvio['destinatario']>)
  const peso = guia.peso         ?? ({} as NonNullable<GuiaEnvio['peso']>)
  const val  = guia.valores      ?? ({} as NonNullable<GuiaEnvio['valores']>)

  const [remDir,  remRef]  = partirDireccion(rem.direccion  ?? '')
  const [destDir, destRef] = partirDireccion(dest.direccion ?? '')

  return {
    // Encabezado
    tipoEtiqueta:       guia.tipo === 'internacional'
                          ? 'CORREO CERTIFICADO INTERNACIONAL'
                          : 'CORREO CERTIFICADO NACIONAL',
    // El clip del slot admite ~28 caracteres en Helvetica 5px; con 18 se perdía
    // la palabra que identifica el centro ("Medellín El Poblado" → "Medellín El").
    centroOperativo:    truncarPalabra(centro, 28),
    fechaAdmision:      fmtDate(guia.generadoEn),
    fechaApproxEntrega: fmtDateOnly(guia.fechaEntregaEstimada),
    ordenServicio:      guia.ordenServicio != null ? String(guia.ordenServicio) : '',

    // Número de guía — se parte en dos renglones porque el slot grande sólo
    // admite 10 caracteres. Un código de 10 o menos cabe entero, así que el
    // asterisco de cierre va en el primer renglón y el segundo queda vacío.
    barcodeText1: cbTail ? `*${cbHead}` : `*${cbHead}*`,
    barcodeText2: cbTail ? `${cbTail}*` : '',
    codigoGuia:   guide,

    // Remitente
    remitenteNombre:    rem.nombre       ?? '',
    remitenteDireccion:  remDir,
    remitenteReferencia: remRef,
    remitenteNit:       rem.documento    ?? '',
    remitenteCiudad:    rem.ciudad        ?? '',
    remitenteDepto:     rem.departamento  ?? '',
    remitenteTelefono:  rem.telefono     ?? '',
    remitenteCP:        rem.codigoPostal ?? '',

    // Destinatario
    destinatarioNombre:    dest.nombre       ?? '',
    destinatarioDireccion:  destDir,
    destinatarioReferencia: destRef,
    destinatarioCiudad:    dest.ciudad        ?? '',
    destinatarioDepto:     dest.departamento  ?? '',
    destinatarioTel:       dest.telefono     ?? '',
    destinatarioCP:        dest.codigoPostal ?? '',

    // Pesos
    pesoFisico:      grams(peso.fisicoKg),
    pesoVolumetrico: grams(peso.volumetricoKg ?? null),
    pesoFacturado:   grams(peso.tarificadoKg),

    // Valores
    valorDeclarado: fmt(val.declarado),
    valorFlete:     fmt(val.servicio),
    costoManejo:    (val.manejo ?? 0) > 0 ? fmt(val.manejo) : '$0',
    valorTotal:     fmt(val.total),

    // Observaciones y contenido
    observaciones: guia.observaciones ?? '',
    diceContener:  guia.contenido ?? '',

    // Código de barras
    codigoOperativo:     servCod,
    codigoOperativoBajo: centroC,
    barcodeLineal:       cb,

    // Fechas adicionales
    fechaEntrega:      fmtDateOnly(guia.fechaEntregaEstimada),
    fechaPlaceholder1: fmtDateOnly(guia.generadoEn),
    fechaPlaceholder2: fmtDateOnly(guia.fechaEntregaEstimada),

    // Talón lateral — Destinatario
    lateral_destinatarioNombre:    dest.nombre       ?? '',
    lateral_destinatarioDireccion: dest.direccion    ?? '',
    lateral_destinatarioCiudad:    dest.ciudad        ?? '',
    lateral_destinatarioDepto:     dest.departamento  ?? '',
    lateral_destinatarioCP:        dest.codigoPostal ?? '',
    lateral_fechaAdmision:         fmtDateOnly(guia.generadoEn),

    // Talón lateral — Remitente
    lateral_remitenteNombre:    rem.nombre       ?? '',
    lateral_remitenteDireccion: rem.direccion    ?? '',
    lateral_remitenteCiudad:    rem.ciudad        ?? '',
    lateral_remitenteDepto:     rem.departamento  ?? '',
    lateral_remitenteCP:        rem.codigoPostal ?? '',
    // El slot admite 18 caracteres y los nombres de servicio pasan de 38, así que
    // el código es lo único que cabe entero sin volverse ambiguo.
    lateral_envio:               servCod || (guia.tipoServicio ?? ''),

    // Franja derecha
    lateral_derecho_codigo: codigoCorto(centroC),
    // La plantilla fija textLength="110" en este slot, así que se condensa solo.
    lateral_derecho_centro: truncarPalabra(centro, 24),

    // Pie legal
    pieLegal1: PIE_LEGAL_472.linea1,
    pieLegal2: PIE_LEGAL_472.linea2,
    pieLegal3: PIE_LEGAL_472.linea3,
  }
}
