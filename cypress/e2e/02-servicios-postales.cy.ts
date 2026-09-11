export {}

/**
 * Pruebas E2E — Servicios Postales
 *
 * Ruta: /ventas/caja/10 → tab "Servicios" → sub-tab "Formulario"
 *
 * Cubre:
 * - Carga y visualización de la página CarritoVenta
 * - Navegación a tab Servicios
 * - Selector de país destino (PaisCombobox)
 * - Selector de servicio postal
 * - Campos de peso y dimensiones
 * - Formulario de remitente y destinatario
 * - Cotización en tiempo real
 * - Validaciones del formulario
 * - Sub-tab "Envíos" con lista de guías generadas
 * - Generación de guía postal (flujo independiente sin venta)
 * - Anulación de guías
 */

const API = Cypress.env('API_URL') as string
const RUTA_CARRITO = '/ventas/caja/10'

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitCarrito() {
  cy.stubBase('cajero')
  cy.stubVentas()
  cy.visitAs(RUTA_CARRITO, 'cajero')
  cy.wait('@authMe')
  cy.wait('@featureFlags')
  cy.wait('@cajaAuxiliar')
}

function navegarAServicios() {
  // Los tabs del CarritoVenta están guardados por feature flags.
  // Esperar que se carguen los flags y buscar el tab "Servicios".
  cy.wait('@featureFlags', { timeout: 10_000 })
  cy.contains('[role="tab"]', 'Servicios').should('be.visible').click()
}

// ── Suite principal ────────────────────────────────────────────────────────────

describe('Servicios Postales — CarritoVenta → tab Servicios', () => {
  // ── Carga de la página ─────────────────────────────────────────────────────

  describe('Carga inicial', () => {
    beforeEach(() => {
      visitCarrito()
    })

    it('muestra el layout de CarritoVenta correctamente', () => {
      // La página carga y muestra algún contenido de la caja
      cy.contains('AUX-001', { timeout: 10_000 }).should('be.visible')
    })

    it('muestra los tabs principales del carrito', () => {
      cy.wait('@featureFlags', { timeout: 10_000 })
      cy.contains('[role="tab"]', 'Servicios').should('be.visible')
    })
  })

  // ── Tab Servicios: Formulario ──────────────────────────────────────────────

  describe('Formulario de servicio postal', () => {
    beforeEach(() => {
      visitCarrito()
      navegarAServicios()
    })

    it('muestra los tres sub-tabs: Formulario, Envíos, Masivos', () => {
      cy.contains('[role="tab"]', 'Formulario').should('be.visible')
      cy.contains('[role="tab"]', 'Envíos').should('be.visible')
      cy.contains('[role="tab"]', 'Masivos').should('be.visible')
    })

    it('el sub-tab Formulario está activo por defecto', () => {
      cy.contains('[role="tab"][data-state="active"]', 'Formulario').should('exist')
    })

    it('muestra el selector de país destino', () => {
      cy.contains('País destino').should('be.visible')
      cy.contains('Colombia').should('be.visible')
    })

    it('muestra el selector de servicio postal', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Servicio').should('be.visible')
      cy.contains('Seleccionar servicio').should('be.visible')
    })

    it('lista los servicios postales disponibles al abrir el selector', () => {
      cy.wait('@serviciosPostales')
      // Abrir el select de servicio
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').should('be.visible')
      cy.contains('Correo Prioritario Nacional').should('be.visible')
    })

    it('muestra el campo de peso al seleccionar un servicio', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()
      cy.contains('Peso').should('be.visible')
    })

    it('puede seleccionar servicio internacional y cambia el campo de país', () => {
      cy.wait('@paises')
      // Cambiar país a US
      cy.contains('Colombia').click({ force: true })
      cy.get('[placeholder="Buscar país…"]').type('Estados')
      cy.contains('Estados Unidos').click()
      cy.contains('EMS Internacional').should('exist')
    })

    it('muestra el botón para abrir el modal de Remitente', () => {
      cy.contains('Remitente').should('be.visible')
    })

    it('muestra el botón para abrir el modal de Destinatario', () => {
      cy.contains('Destinatario').should('be.visible')
    })

    it('muestra campo de observaciones', () => {
      cy.contains('Observaciones').should('be.visible')
    })
  })

  // ── Cotización en tiempo real ──────────────────────────────────────────────

  describe('Cotización de envío', () => {
    beforeEach(() => {
      const cotizacion = {
        pesoFisicoKg: 0.5,
        pesoVolumetricoKg: null,
        pesoTarificadoKg: 0.5,
        valorServicio: 9000,
        valorCertificacion: 1500,
        fechaEntregaEstimada: '2026-08-26',
        aduanaEstimadoUSD: null,
        servicio: { nombreservicios: 'Correo Regular No Prioritario', tiempoEntregaDias: 5 },
      }
      cy.intercept('GET', `${API}/ventas/servicios-postales/cotizar**`, {
        statusCode: 200,
        body: cotizacion,
      }).as('cotizar')

      visitCarrito()
      navegarAServicios()
    })

    it('muestra la cotización luego de seleccionar servicio y peso', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()

      cy.get('input[placeholder*="gramos"], input[type="number"]').first().type('500')
      cy.wait('@cotizar', { timeout: 8_000 })

      cy.contains('$').should('be.visible')
    })

    it('muestra fecha de entrega estimada en la cotización', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()
      cy.get('input[placeholder*="gramos"], input[type="number"]').first().type('500')
      cy.wait('@cotizar', { timeout: 8_000 })

      cy.contains('2026-08-26').should('be.visible')
    })
  })

  // ── Validaciones del formulario ────────────────────────────────────────────

  describe('Validaciones', () => {
    beforeEach(() => {
      visitCarrito()
      navegarAServicios()
    })

    it('el formulario no permite enviar sin servicio seleccionado', () => {
      // El botón de generar guía debe estar deshabilitado
      cy.contains('button', 'Generar').should('be.disabled')
    })

    it('el formulario requiere nombre del remitente', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()
      // Sin remitente, el botón sigue deshabilitado
      cy.contains('button', 'Generar').should('be.disabled')
    })
  })

  // ── Sub-tab Envíos ─────────────────────────────────────────────────────────

  describe('Sub-tab Envíos', () => {
    beforeEach(() => {
      visitCarrito()
      navegarAServicios()
    })

    it('muestra lista vacía al no haber guías generadas aún', () => {
      cy.contains('[role="tab"]', 'Envíos').click()
      cy.contains('Sin envíos').should('be.visible')
    })
  })

  // ── Generación de guía postal (flujo completo sin venta) ──────────────────

  describe('Generación de guía standalone', () => {
    beforeEach(() => {
      const cotizacion = {
        pesoFisicoKg: 0.5,
        pesoVolumetricoKg: null,
        pesoTarificadoKg: 0.5,
        valorServicio: 9000,
        valorCertificacion: 1500,
        fechaEntregaEstimada: '2026-08-26',
        aduanaEstimadoUSD: null,
        servicio: { nombreservicios: 'Correo Regular No Prioritario', tiempoEntregaDias: 5 },
      }
      cy.intercept('GET', `${API}/ventas/servicios-postales/cotizar**`, {
        statusCode: 200,
        body: cotizacion,
      }).as('cotizar')

      cy.intercept('POST', `${API}/ventas/envios`, {
        statusCode: 201,
        body: {
          guia: {
            numeroGuia: 'GU-2026-TEST01',
            codigoBarras: 'GU2026TEST01',
            tipo: 'nacional',
            tipoServicio: 'Correo Regular No Prioritario',
            remitente: {
              nombre: 'Carlos Remitente', documento: '12345678',
              telefono: null, email: null, direccion: null,
              ciudad: 'Bogotá', codigoPostal: null, pais: 'CO',
            },
            destinatario: {
              nombre: 'María Destinataria', documento: null,
              telefono: null, email: null, direccion: null,
              ciudad: 'Medellín', codigoPostal: null, pais: 'CO',
            },
            peso: { fisicoKg: 0.5, tarificadoKg: 0.5, altoCm: null, anchoCm: null, largoCm: null },
            valores: { servicio: 9000, manejo: 1500, seguro: 0, declarado: null, total: 10500 },
            estado: 'ACTIVA',
            generadoEn: '2026-08-21T12:00:00.000Z',
            fechaEntregaEstimada: '2026-08-26',
            centroOperativo: 'Bogotá Centro',
          },
          envio: {
            id: 50,
            numeroGuia: 'GU-2026-TEST01',
            tipo: 'nacional',
            remitenteNombre: 'Carlos Remitente',
            destinatarioNombre: 'María Destinataria',
            destinatarioCiudad: 'Medellín',
            destinatarioPais: 'CO',
            pesoFisicoKg: 0.5,
            pesoTarificadoKg: 0.5,
            valorServicio: 9000,
            valorSeguro: 0,
            valorEstampillas: 0,
            valorCertificacion: 1500,
            valorTotal: 10500,
            estado: 'ACTIVA',
            createdAt: '2026-08-21T12:00:00.000Z',
          },
          movimiento: { id: 200, tipo: 'venta_servicio', monto: '10500' },
          saldoActual: 139500,
          alertas: [],
          seleccionEstampillas: [],
        },
      }).as('crearEnvio')

      visitCarrito()
      navegarAServicios()
    })

    it('después de generar, muestra la guía en la pestaña Envíos', () => {
      cy.wait('@serviciosPostales')

      // Seleccionar servicio
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()

      // Peso
      cy.get('input[placeholder*="gramos"], input[type="number"]').first().type('500')
      cy.wait('@cotizar', { timeout: 8_000 })

      // Modal remitente
      cy.contains('button', /Remitente/i).first().click()
      cy.get('input[placeholder*="Nombre"]').first().type('Carlos Remitente')
      cy.contains('button', 'Guardar').click()

      // Confirmar
      cy.contains('button', 'Generar').click()
      cy.contains('button', 'Confirmar').click()
      cy.wait('@crearEnvio')

      // Debe cambiar a la pestaña Envíos y mostrar la guía
      cy.contains('[role="tab"]', 'Envíos').should('exist')
      cy.contains('GU-2026-TEST01').should('be.visible')
    })
  })

  // ── Historial de ventas del turno ─────────────────────────────────────────

  describe('Tab Historial', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/ventas/punto/10/turno**`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            sesionCajaId: 1,
            tipo: 'venta_servicio',
            monto: '10500',
            medioPago: 'efectivo',
            referenciaId: 50,
            referenciaTipo: 'envio',
            createdAt: '2026-08-21T11:00:00.000Z',
          },
        ],
      }).as('turnoConHistorial')

      visitCarrito()
    })

    it('muestra el tab Historial', () => {
      cy.wait('@featureFlags', { timeout: 10_000 })
      cy.contains('[role="tab"]', 'Historial').should('be.visible')
    })

    it('muestra movimientos del turno en el historial', () => {
      cy.wait('@featureFlags', { timeout: 10_000 })
      cy.contains('[role="tab"]', 'Historial').click()
      cy.wait('@turnoConHistorial')
      cy.contains('$ 10.500').should('be.visible')
    })
  })
})
