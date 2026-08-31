/**
 * GuiaDemo — Preview de guías postales con datos mock.
 * Accesible en /guia-demo. Solo para desarrollo.
 */

import { useState } from 'react'
import { GuiaPostal } from '@/components/GuiaPostal'
import { GuiaPostalSvg, GUIA_SVG_W, GUIA_SVG_H } from '@/components/GuiaPostalSvg'
import type { GuiaEnvio } from '@/queries/ventas.queries'

// ── Mock con número de guía real 4-72 (formato UPU 13 chars) ─────────────────
const MOCK_NACIONAL: GuiaEnvio = {
  numeroGuia:   'RA185194038CO',
  codigoBarras: 'RA185194038CO',
  tipo:         'nacional',
  tipoServicio: 'Correo Certificado Nacional',
  remitente: {
    nombre:        'EMPRESA DISTRIBUIDORA S.A.S.',
    documento:     '900.123.456-7',
    telefono:      '3124567890',
    email:         'despachos@distribuidora.com',
    direccion:     'Cra 7 # 32-16 Piso 3',
    ciudad:        'BOGOTÁ D.C.',
    departamento:  'CUNDINAMARCA',
    codigoPostal:  '110311',
    pais:          'CO',
  },
  destinatario: {
    nombre:        'CARLOS ANDRÉS MARTÍNEZ LÓPEZ',
    documento:     '1.019.234.567',
    telefono:      '3209876543',
    email:         'cmartinez@gmail.com',
    direccion:     'Cll 45 # 28-73 Apto 302',
    ciudad:        'MEDELLÍN',
    departamento:  'ANTIOQUIA',
    codigoPostal:  '050021',
    pais:          'CO',
  },
  peso: {
    fisicoKg:     1.25,
    tarificadoKg: 1.50,
    altoCm:       15,
    anchoCm:      20,
    largoCm:      10,
    volumetricoKg: 1.50,
  },
  valores: {
    servicio:  12800,
    manejo:    2500,
    seguro:    0,
    declarado: null,
    total:     15300,
  },
  estado:               'ACTIVO',
  generadoEn:           '2026-08-18T10:35:22.000Z',
  ordenServicio:        472185,
  fechaEntregaEstimada: '2026-08-21',
  centroOperativo:      'PV.CHAPINERO',
}

// ── Mock número interno corto (GU00000001 — 10 chars) ─────────────────────────
const MOCK_CORTO: GuiaEnvio = {
  ...MOCK_NACIONAL,
  numeroGuia:   'GU00000472',
  codigoBarras: 'GU00000472',
  estado:       'BORRADOR',
}

// ── Mock internacional ─────────────────────────────────────────────────────────
const MOCK_INTL: GuiaEnvio = {
  ...MOCK_NACIONAL,
  tipo:         'internacional',
  tipoServicio: 'Correo Certificado Internacional',
  destinatario: {
    nombre:        'JOHN WILLIAM SMITH',
    documento:     'PP-A1234567',
    telefono:      '+1 555 890 1234',
    email:         'jsmith@example.com',
    direccion:     '123 Main Street, Apt 4B',
    ciudad:        'Miami',
    departamento:  'Florida',
    codigoPostal:  '33101',
    pais:          'US',
  },
  valores: {
    servicio:  58500,
    manejo:    4200,
    seguro:    2450,
    declarado: 490000,
    total:     65150,
  },
}

const MOCKS: Record<string, GuiaEnvio> = {
  nacional: MOCK_NACIONAL,
  corto:    MOCK_CORTO,
  intl:     MOCK_INTL,
}

const ZOOM_STEP = 0.15
const ZOOM_MIN  = 0.25
const ZOOM_MAX  = 2.0
const ZOOM_DEF  = 0.75

type Vista = 'html' | 'svg'

export default function GuiaDemo() {
  const [selected, setSelected] = useState<keyof typeof MOCKS>('nacional')
  const [zoom, setZoom]         = useState(ZOOM_DEF)
  const [vista, setVista]       = useState<Vista>('html')

  const guia  = MOCKS[selected]
  const W     = vista === 'html' ? 816 : GUIA_SVG_W
  const H     = vista === 'html' ? 1056 : GUIA_SVG_H
  const clamp = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(z.toFixed(2))))

  return (
    <div className="flex flex-col h-screen bg-zinc-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex-none flex h-11 items-center gap-3 border-b bg-card px-4 shadow-sm z-10">
        <span className="font-semibold text-sm">GuiaDemo</span>

        {/* Vista: HTML vs SVG template */}
        <div className="flex gap-1 border rounded-md p-0.5 bg-muted">
          {(['html', 'svg'] as Vista[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={[
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                vista === v ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {v === 'html' ? 'HTML (producción)' : 'SVG template'}
            </button>
          ))}
        </div>

        {/* Selector de datos mock */}
        <div className="flex gap-1 border rounded-md p-0.5 bg-muted">
          {(Object.keys(MOCKS) as (keyof typeof MOCKS)[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setSelected(k)}
              className={[
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                selected === k ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 border rounded-md bg-background px-2 py-1 ml-auto">
          <button type="button" className="text-xs px-1" onClick={() => setZoom(z => clamp(z - ZOOM_STEP))}>−</button>
          <button type="button" className="text-xs w-12 text-center" onClick={() => setZoom(ZOOM_DEF)}>
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="text-xs px-1" onClick={() => setZoom(z => clamp(z + ZOOM_STEP))}>+</button>
        </div>

        <button
          type="button"
          className="text-xs border rounded-md px-3 py-1.5 bg-background hover:bg-accent"
          onClick={() => window.print()}
        >
          Imprimir
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto flex justify-center py-6">
        <div
          style={{
            width:    Math.round(W * zoom),
            height:   Math.round(H * zoom),
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              transform:       `scale(${zoom})`,
              transformOrigin: 'top left',
              width:           W,
              position:        'absolute',
              top: 0,
              left: 0,
            }}
          >
            {vista === 'html'
              ? <GuiaPostal guia={guia} />
              : <GuiaPostalSvg guia={guia} />}
          </div>
        </div>
      </div>
    </div>
  )
}
