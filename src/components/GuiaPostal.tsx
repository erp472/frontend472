import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { cn } from '@/lib/utils'
import type { GuiaEnvio } from '@/queries/ventas.queries'

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

// ── Barcode ───────────────────────────────────────────────────────────────────

function Barcode({ value, height = 50 }: { value: string; height?: number }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    JsBarcode(ref.current, value, {
      format:      'CODE128',
      height,
      fontSize:    11,
      margin:      4,
      displayValue: true,
      fontOptions: 'bold',
    })
  }, [value, height])
  return <svg ref={ref} className="w-full" />
}

// ── Fila de dato ──────────────────────────────────────────────────────────────

function Dato({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex gap-1 text-[11px] leading-tight">
      <span className="font-semibold shrink-0">{label}:</span>
      <span className="text-gray-700 break-words">{String(value)}</span>
    </div>
  )
}

// ── Caja de persona (remitente / destinatario) ────────────────────────────────

function CajaPersona({ titulo, persona, highlight }: {
  titulo:    string
  persona:   GuiaEnvio['remitente']
  highlight?: boolean
}) {
  return (
    <div className={cn(
      'border rounded p-2 flex flex-col gap-0.5',
      highlight ? 'border-gray-900 bg-gray-50' : 'border-gray-400',
    )}>
      <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', highlight ? 'text-gray-900' : 'text-gray-500')}>
        {titulo}
      </p>
      <Dato label="Nombre"    value={persona.nombre} />
      <Dato label="Doc"       value={persona.documento} />
      <Dato label="Tel"       value={persona.telefono} />
      <Dato label="Dirección" value={persona.direccion} />
      <Dato label="Ciudad"    value={persona.ciudad} />
      {persona.pais !== 'CO' && <Dato label="País" value={persona.pais} />}
    </div>
  )
}

// ── GuiaPostal ────────────────────────────────────────────────────────────────

interface Props {
  guia:      GuiaEnvio
  className?: string
}

export function GuiaPostal({ guia, className }: Props) {
  const esInternacional = guia.tipo === 'internacional'
  const fecha = new Date(guia.generadoEn).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      {/* ── Estilos de impresión ────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .guia-postal, .guia-postal * { visibility: visible !important; }
          .guia-postal {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 10cm !important;
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
          @page { margin: 1cm; }
        }
      `}</style>

      {/* ── Label ───────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'guia-postal bg-white border border-gray-300 rounded-lg shadow-md',
          'w-[380px] p-4 flex flex-col gap-3 font-mono text-gray-900',
          className,
        )}
      >
        {/* Cabecera: logo + número */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div>
            <p className="text-xl font-black tracking-tighter leading-none">4-72</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Servicios Postales</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-gray-500 uppercase">Guía</p>
            <p className="text-[13px] font-bold tracking-wider">{guia.numeroGuia}</p>
            <p className="text-[9px] text-gray-500">{fecha}</p>
          </div>
        </div>

        {/* Tipo de servicio */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide',
            esInternacional
              ? 'bg-blue-100 text-blue-800 border border-blue-300'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300',
          )}>
            {esInternacional ? 'Internacional' : 'Nacional'}
          </span>
          <span className="text-[10px] text-gray-500">{guia.tipoServicio}</span>
        </div>

        {/* Barcode superior */}
        <Barcode value={guia.codigoBarras} height={48} />

        {/* Remitente → Destinatario */}
        <div className="grid grid-cols-2 gap-2">
          <CajaPersona titulo="Remitente" persona={guia.remitente} />
          <CajaPersona titulo="Destinatario" persona={guia.destinatario} highlight />
        </div>

        {/* Peso y valores */}
        <div className="grid grid-cols-3 gap-2 text-center border rounded p-2 border-gray-200">
          <div>
            <p className="text-[9px] text-gray-500 uppercase">Peso</p>
            <p className="text-[13px] font-bold">{guia.peso.fisicoKg} kg</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase">Seguro</p>
            <p className="text-[13px] font-bold">{COP.format(guia.valores.seguro)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500 uppercase">Total</p>
            <p className="text-[13px] font-bold">{COP.format(guia.valores.total)}</p>
          </div>
        </div>

        {/* Valor declarado (solo si aplica) */}
        {guia.valores.declarado !== null && guia.valores.declarado > 0 && (
          <div className="text-[10px] text-gray-500 text-center">
            Valor declarado: {COP.format(guia.valores.declarado)}
          </div>
        )}

        {/* Barcode inferior */}
        <div className="border-t border-dashed border-gray-300 pt-2">
          <Barcode value={guia.codigoBarras} height={36} />
        </div>
      </div>
    </>
  )
}
