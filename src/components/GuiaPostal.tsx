import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { GuiaEnvio } from '@/queries/ventas.queries'

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

function fmt(v: number | null | undefined): string {
  if (v == null) return '—'
  return COP.format(v)
}

function grams(kg: number | null | undefined): string {
  if (kg == null) return '—'
  return String(Math.round(kg * 1000))
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
}

function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

// ── Barcode ──────────────────────────────────────────────────────────────────

function Barcode({
  value,
  height = 60,
  fontSize = 10,
  displayValue = true,
}: {
  value: string
  height?: number
  fontSize?: number
  displayValue?: boolean
}) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current || !value) return
    JsBarcode(ref.current, value, {
      format:       'CODE128',
      height,
      fontSize,
      margin:       2,
      displayValue,
      fontOptions:  'bold',
      textMargin:   2,
    })
  }, [value, height, fontSize, displayValue])
  return <svg ref={ref} style={{ display: 'block', width: '100%' }} />
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

function Checkbox({ code, label }: { code: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 1 }}>
      <div style={{
        width: 7, height: 7, border: '0.5px solid black', flexShrink: 0,
      }} />
      <span style={{ fontSize: 6, lineHeight: 1 }}>
        <strong>{code}</strong>={label}
      </span>
    </div>
  )
}

// ── LabelRow ─────────────────────────────────────────────────────────────────

function LabelRow({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 1, lineHeight: 1.1 }}>
      <span style={{ fontSize: 6, color: '#444', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: 7, fontWeight: bold ? 'bold' : 'normal' }}>{value || ''}</span>
    </div>
  )
}

// ── GuiaPostal ────────────────────────────────────────────────────────────────

interface Props {
  guia:       GuiaEnvio
  className?: string
}

export function GuiaPostal({ guia, className }: Props) {
  const esInt = guia.tipo === 'internacional'
  const esBorrador = guia.estado === 'BORRADOR'

  const fechaAdmision   = fmtDate(guia.generadoEn)
  const fechaEstimada   = fmtDateOnly(guia.fechaEntregaEstimada)
  const centroOp        = guia.centroOperativo ?? 'PV.CHAPINERO'
  const ordenServicio   = guia.ordenServicio != null ? String(guia.ordenServicio) : ''

  const pesoFisicoGrs   = grams(guia.peso.fisicoKg)
  const pesoVolGrs      = grams(guia.peso.volumetricoKg)
  const pesoTarifGrs    = grams(guia.peso.tarificadoKg)

  const s = {
    // outer container
    root: {
      position: 'relative' as const,
      width: 816,
      height: 1056,
      display: 'flex',
      border: '1px solid black',
      fontFamily: 'Helvetica, Arial, sans-serif',
      backgroundColor: 'white',
      color: '#000',
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
    border: '0.5px solid black',
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: 8.5in 11in portrait; margin: 0; }
          body * { visibility: hidden !important; }
          .guia-postal-root, .guia-postal-root * { visibility: visible !important; }
          .guia-postal-root {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 816px !important; height: 1056px !important;
            overflow: hidden !important; box-shadow: none !important;
          }
        }
      `}</style>

      <div className={`guia-postal-root${className ? ` ${className}` : ''}`} style={s.root}>

        {/* BORRADOR watermark */}
        {esBorrador && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, pointerEvents: 'none',
          }}>
            <span style={{
              fontSize: 100, fontWeight: 'bold', color: 'rgba(200,0,0,0.12)',
              transform: 'rotate(-35deg)', userSelect: 'none', whiteSpace: 'nowrap',
            }}>
              BORRADOR
            </span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LEFT STRIP — 115px */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          width: 115, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: s.border, backgroundColor: '#f8f8f8',
        }}>
          {/* Top: 4-72 brand + guide number */}
          <div style={{
            borderBottom: s.border, padding: '6px 4px', display: 'flex',
            flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              4-72
            </span>
            <span style={{ fontSize: 7, writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 }}>
              {guia.numeroGuia}
            </span>
          </div>

          {/* Remitente rotated */}
          <div style={{
            flex: 1, borderBottom: s.border, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 6,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 'bold', writingMode: 'vertical-rl',
              transform: 'rotate(180deg)', textTransform: 'uppercase', letterSpacing: 2,
            }}>
              Remitente
            </span>
            <span style={{
              fontSize: 6, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              textAlign: 'center', lineHeight: 1.2,
            }}>
              {[guia.remitente.nombre, guia.remitente.direccion, guia.remitente.ciudad]
                .filter(Boolean).join(' | ')}
            </span>
          </div>

          {/* Destinatario rotated */}
          <div style={{
            flex: 1, borderBottom: s.border, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: 6,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 'bold', writingMode: 'vertical-rl',
              transform: 'rotate(180deg)', textTransform: 'uppercase', letterSpacing: 2,
            }}>
              Destinatario
            </span>
            <span style={{
              fontSize: 6, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              textAlign: 'center', lineHeight: 1.2,
            }}>
              {[guia.destinatario.nombre, guia.destinatario.direccion, guia.destinatario.ciudad]
                .filter(Boolean).join(' | ')}
            </span>
          </div>

          {/* Bottom: small 4-72 */}
          <div style={{
            padding: '6px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 7, fontWeight: 'bold', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              4-72
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MAIN BODY — flex:1 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* ── 1. HEADER ~~90px ─────────────────────────────────────────── */}
          <div style={{
            height: 90, flexShrink: 0, display: 'flex', borderBottom: s.border,
          }}>
            {/* Left: company info */}
            <div style={{
              flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
              borderRight: s.border,
            }}>
              <p style={{ fontSize: 7, fontWeight: 'bold', margin: 0, lineHeight: 1.3 }}>
                SERVICIOS POSTALES NACIONALES S.A NIT 900.062.917-9
              </p>
              <p style={{ fontSize: 6, margin: 0, lineHeight: 1.3 }}>
                Min. Tic Concesión de Correo Contrato 010-14//
              </p>
              <p style={{ fontSize: 8, fontWeight: 'bold', margin: 0, marginTop: 4, lineHeight: 1.3 }}>
                CORREO CERTIFICADO {esInt ? 'INTERNACIONAL' : 'NACIONAL'}
              </p>
            </div>
            {/* Right: guide number large */}
            <div style={{
              width: 280, flexShrink: 0, padding: '4px 8px',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
            }}>
              <p style={{
                fontSize: 40, fontFamily: 'Courier New, monospace', fontWeight: 'bold',
                margin: 0, lineHeight: 1, letterSpacing: 1,
              }}>
                *{guia.numeroGuia}
              </p>
              <p style={{ fontSize: 8, margin: 0, marginTop: 2, fontFamily: 'Courier New, monospace' }}>
                {guia.codigoBarras}
              </p>
            </div>
          </div>

          {/* ── 2. INFO BAR ~~38px ───────────────────────────────────────── */}
          <div style={{
            flexShrink: 0, borderBottom: s.border, display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
          }}>
            {/* Row 1 */}
            <div style={{ padding: '3px 6px', borderRight: s.border, borderBottom: s.border }}>
              <span style={{ fontSize: 6 }}>Centro Operativo: </span>
              <span style={{ fontSize: 6, fontWeight: 'bold' }}>{centroOp}</span>
            </div>
            <div style={{ padding: '3px 6px', borderRight: s.border, borderBottom: s.border }}>
              <span style={{ fontSize: 6 }}>Fecha Admisión: </span>
              <span style={{ fontSize: 6, fontWeight: 'bold' }}>{fechaAdmision}</span>
            </div>
            <div style={{ padding: '3px 6px', borderBottom: s.border }}>
              <span style={{ fontSize: 6 }}>Orden de servicio: </span>
              <span style={{ fontSize: 6, fontWeight: 'bold' }}>{ordenServicio}</span>
            </div>
            {/* Row 2 */}
            <div style={{ padding: '3px 6px', borderRight: s.border }} />
            <div style={{ padding: '3px 6px', borderRight: s.border }}>
              <span style={{ fontSize: 6 }}>Fecha Aprox Entrega: </span>
              <span style={{ fontSize: 6, fontWeight: 'bold' }}>{fechaEstimada}</span>
            </div>
            <div style={{ padding: '3px 6px' }} />
          </div>

          {/* ── 3. REMITENTE SECTION ~~100px ─────────────────────────────── */}
          <div style={{ flexShrink: 0, borderBottom: s.border, padding: '4px 6px' }}>
            <p style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 3px 0', letterSpacing: 1 }}>
              Remitente
            </p>
            <LabelRow label="Nombre/Razón Social" value={guia.remitente.nombre} bold />
            <div style={{ display: 'flex', gap: 16, marginBottom: 1 }}>
              <LabelRow label="Dirección" value={guia.remitente.direccion} />
              <LabelRow label="NIT/C.C/T.I" value={guia.remitente.documento} />
            </div>
            <LabelRow label="Referencia" value="" />
            <div style={{ display: 'flex', gap: 16, marginBottom: 1 }}>
              <LabelRow label="Ciudad" value={guia.remitente.ciudad} />
              <LabelRow label="Depto" value="" />
              <LabelRow label="Teléfono" value={guia.remitente.telefono} />
              <LabelRow label="Código Postal" value={guia.remitente.codigoPostal} />
            </div>
            <LabelRow label="Código Operativo" value="" />
          </div>

          {/* ── 4. DESTINATARIO SECTION ~~95px ───────────────────────────── */}
          <div style={{ flexShrink: 0, borderBottom: s.border, padding: '4px 6px' }}>
            <p style={{ fontSize: 7, fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 3px 0', letterSpacing: 1 }}>
              Destinatario
            </p>
            <LabelRow label="Nombre/Razón Social" value={guia.destinatario.nombre} bold />
            <LabelRow label="Dirección" value={guia.destinatario.direccion} />
            <div style={{ display: 'flex', gap: 16, marginBottom: 1 }}>
              <LabelRow label="Tel" value={guia.destinatario.telefono} />
              <LabelRow label="Código Postal" value={guia.destinatario.codigoPostal} />
              <LabelRow label="Código Operativo" value="" />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 1 }}>
              <LabelRow label="Ciudad" value={guia.destinatario.ciudad} />
              <LabelRow label="Depto" value="" />
              {esInt && <LabelRow label="País" value={guia.destinatario.pais} />}
            </div>
          </div>

          {/* ── 5. VALORES | DICE CONTENER | CAUSAL DEVOLUCIONES — flex:1 ── */}
          <div style={{ flex: 1, display: 'flex', borderBottom: s.border, minHeight: 0 }}>

            {/* LEFT: Valores ~140px */}
            <div style={{ width: 140, flexShrink: 0, borderRight: s.border, padding: '4px 6px' }}>
              <p style={{ fontSize: 7, fontWeight: 'bold', margin: '0 0 4px 0', borderBottom: s.border, paddingBottom: 2 }}>
                Valores
              </p>
              <LabelRow label="Peso Físico(grs)" value={pesoFisicoGrs} />
              <LabelRow label="Peso Volumétrico(grs)" value={pesoVolGrs} />
              <LabelRow label="Peso Facturado(grs)" value={pesoTarifGrs} />
              <LabelRow label="Valor Declarado" value={guia.valores.declarado != null ? fmt(guia.valores.declarado) : '—'} />
              <LabelRow label="Valor Flete" value={fmt(guia.valores.servicio)} />
              <LabelRow label="Costo de manejo" value={guia.valores.manejo > 0 ? fmt(guia.valores.manejo) : '—'} />
              <div style={{ marginTop: 4, paddingTop: 3, borderTop: s.border }}>
                <span style={{ fontSize: 7, fontWeight: 'bold' }}>Valor Total: </span>
                <span style={{ fontSize: 9, fontWeight: 'bold' }}>{fmt(guia.valores.total)} COP</span>
              </div>
            </div>

            {/* CENTER: Dice Contener + Observaciones */}
            <div style={{ flex: 1, borderRight: s.border, padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 7, fontWeight: 'bold', margin: '0 0 2px 0' }}>Dice Contener:</p>
                <div style={{ flex: 1, minHeight: 30 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 7, fontWeight: 'bold', margin: '0 0 2px 0' }}>Observaciones del cliente:</p>
                <div style={{ flex: 1, minHeight: 30 }} />
              </div>
            </div>

            {/* RIGHT: Causal Devoluciones ~145px */}
            <div style={{ width: 145, flexShrink: 0, padding: '4px 6px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 7, fontWeight: 'bold', margin: '0 0 4px 0', borderBottom: s.border, paddingBottom: 2 }}>
                Causal Devoluciones:
              </p>
              {/* 2-column grid of checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 4px', marginBottom: 6 }}>
                <Checkbox code="RE" label="Rehusado" />
                <Checkbox code="C1" label="Cerrado1" />
                <Checkbox code="C2" label="Cerrado2" />
                <Checkbox code="NE" label="No existe" />
                <Checkbox code="N1" label="No contact.1" />
                <Checkbox code="N2" label="No contact.2" />
                <Checkbox code="NS" label="No reside" />
                <Checkbox code="FA" label="Fallecido" />
                <Checkbox code="NR" label="No reclamado" />
                <Checkbox code="AC" label="Apart.Claus." />
                <Checkbox code="DE" label="Desconocido" />
                <Checkbox code="FM" label="Fuerza Mayor" />
                <Checkbox code="DR" label="Dir.errada" />
              </div>
              {/* Signature block */}
              <div style={{ marginTop: 'auto', borderTop: s.border, paddingTop: 3 }}>
                <p style={{ fontSize: 6, margin: '0 0 6px 0', lineHeight: 1.3 }}>
                  Firma nombre y/o sello de quien recibe:
                </p>
                <div style={{ borderBottom: s.border, marginBottom: 4, height: 14 }} />
                <p style={{ fontSize: 6, margin: '0 0 3px 0' }}>C.C. ___________ Tel: __________ Hora: ______</p>
                <p style={{ fontSize: 6, margin: 0 }}>Fecha de entrega: dd/mm/aaaa</p>
              </div>
            </div>
          </div>

          {/* ── 6. GESTIÓN DE ENTREGA ~~28px ─────────────────────────────── */}
          <div style={{
            flexShrink: 0, height: 28, borderBottom: s.border,
            display: 'flex', alignItems: 'center', padding: '0 8px', gap: 16,
          }}>
            <span style={{ fontSize: 7, fontWeight: 'bold' }}>Gestión de entrega:</span>
            <span style={{ fontSize: 7 }}>1er [____________]</span>
            <span style={{ fontSize: 7 }}>2do [____________]</span>
            <span style={{ fontSize: 7 }}>3er [____________]</span>
            <span style={{ fontSize: 7 }}>Distribuidor: _______________</span>
          </div>

          {/* ── 7. BARCODE ~~90px ────────────────────────────────────────── */}
          <div style={{ flexShrink: 0, height: 90, borderBottom: s.border, padding: '4px 8px' }}>
            <Barcode value={guia.codigoBarras} height={65} fontSize={9} displayValue />
          </div>

          {/* ── 8. FOOTER ~~28px ─────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0, padding: '4px 8px', display: 'flex', alignItems: 'center',
          }}>
            <p style={{ fontSize: 5.5, margin: 0, lineHeight: 1.4, color: '#333' }}>
              La responsabilidad de 4-72 Servicios Postales Nacionales S.A. se limita al valor declarado de los envíos, dentro de los
              términos y condiciones establecidos en la normativa postal vigente. El destinatario o remitente podrá presentar reclamaciones
              ante 4-72 dentro de los plazos legales. Para más información visite www.4-72.com.co o llame a la línea nacional 01 8000 112
              472. NIT 900.062.917-9.
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT STRIP — 85px */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div style={{
          width: 85, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderLeft: s.border, backgroundColor: '#f8f8f8',
          alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0',
        }}>
          <span style={{
            fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2,
            writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1.2,
          }}>
            {centroOp}
          </span>
          {guia.tipo === 'nacional' && (
            <span style={{
              fontSize: 7, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              letterSpacing: 1, color: '#444',
            }}>
              NAL
            </span>
          )}
          {guia.tipo === 'internacional' && (
            <span style={{
              fontSize: 7, writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              letterSpacing: 1, color: '#444',
            }}>
              INTL
            </span>
          )}
        </div>

      </div>
    </>
  )
}
