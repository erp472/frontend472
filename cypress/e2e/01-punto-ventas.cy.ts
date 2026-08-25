export {}

/**
 * Pruebas E2E — Punto de Ventas (/ventas)
 *
 * Cubre:
 * - Pantalla principal del cajero (CajeroDashboard)
 * - Pantalla de apertura de turno
 * - Vista de selección de cajas para supervisor
 * - Estados de error y carga
 * - Flujo de apertura de turno
 * - Flujo de cierre de turno
 * - Cambio de custodia (enviar / confirmar)
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitVentas(role: 'cajero' | 'supervisor' = 'cajero') {
  cy.stubBase(role)
  cy.visitAs('/ventas', role)
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('Punto de Ventas — /ventas', () => {
  // ── CAJERO con caja abierta ────────────────────────────────────────────────

  describe('Cajero con caja abierta', () => {
    beforeEach(() => {
      visitVentas('cajero')
      cy.wait('@authMe')
      cy.wait('@statusPunto')
    })

    it('muestra el encabezado con nombre del cajero', () => {
      cy.contains('Punto de Ventas').should('be.visible')
      cy.contains('Ana Cajera').should('be.visible')
    })

    it('muestra las 4 tarjetas de métricas del turno', () => {
      cy.contains('Saldo actual').should('be.visible')
      cy.contains('Ingresos turno').should('be.visible')
      cy.contains('Egresos turno').should('be.visible')
      cy.contains('Total ventas').should('be.visible')
    })

    it('muestra el saldo actual de la caja', () => {
      // $ 150.000 formateado como COP
      cy.contains('$ 150.000').should('be.visible')
    })

    it('muestra el resumen del turno cuando está disponible', () => {
      cy.intercept('GET', `${API}/ventas/punto/10/resumen`, {
        fixture: 'resumen-turno',
      }).as('resumen')
      cy.wait('@resumen')
      cy.contains('Resumen del turno').should('be.visible')
      cy.contains('Total general').should('be.visible')
    })

    it('botón "Nueva venta" navega a la caja', () => {
      cy.contains('button', 'Nueva venta').click()
      cy.url().should('include', '/ventas/caja/10')
    })

    it('botón "Cambio de Custodia" abre el dialog', () => {
      cy.contains('button', 'Cambio de Custodia').click()
      cy.contains('Cambio de Custodia').should('be.visible')
      cy.contains('Enviar remesa').should('be.visible')
      cy.contains('Confirmar recepción').should('be.visible')
    })

    it('dialog custodia: tab "Confirmar recepción" muestra campos de código y monto', () => {
      cy.contains('button', 'Cambio de Custodia').click()
      cy.contains('Confirmar recepción').click()
      cy.contains('Código de remesa').should('be.visible')
      cy.contains('Monto físico recibido').should('be.visible')
      cy.contains('button', 'Confirmar recepción').should('be.disabled')
    })

    it('dialog custodia: botón confirmar se activa con código de 16 chars y monto', () => {
      cy.contains('button', 'Cambio de Custodia').click()
      cy.contains('Confirmar recepción').click()
      cy.get('input[placeholder="16 caracteres"]').type('ABCD1234EFGH5678')
      cy.get('input[placeholder="Ingresa el valor exacto recibido"]').type('50000')
      cy.contains('button', 'Confirmar recepción').should('not.be.disabled')
    })

    it('dialog custodia: enviar remesa muestra caja destino (Caja General)', () => {
      cy.contains('button', 'Cambio de Custodia').click()
      cy.contains('Enviar remesa').should('be.visible')
      cy.contains('Caja General').should('be.visible')
    })

    it('botón "Cerrar turno" abre el modal de cierre', () => {
      cy.contains('button', 'Cerrar turno').click()
      cy.contains('Cerrar turno —').should('be.visible')
      cy.contains('Saldo esperado').should('be.visible')
      cy.contains('Total arqueo físico').should('be.visible')
    })

    it('modal de cierre: muestra diferencia cuando el arqueo no coincide', () => {
      cy.contains('button', 'Cerrar turno').click()
      cy.get('[placeholder*="sin puntos"]').type('200000')
      cy.contains('Faltante:').should('be.visible')
    })

    it('modal de cierre: cierra el turno al confirmar', () => {
      cy.intercept('POST', `${API}/cajas/punto/1/cierre`, {
        statusCode: 200,
        body: { estado: 'cerrada' },
      }).as('cerrarTurno')

      cy.contains('button', 'Cerrar turno').click()
      cy.contains('button', 'Confirmar cierre').click()
      cy.wait('@cerrarTurno')
    })

    it('botón de refresco actualiza el estado', () => {
      cy.intercept('GET', `${API}/cajas/sucursal/1/status`, {
        fixture: 'status-punto',
      }).as('statusPuntoRefresh')

      cy.get('button[aria-label], button').filter(':has(svg)').first().click({ force: true })
    })
  })

  // ── CAJERO con caja cerrada ────────────────────────────────────────────────

  describe('Cajero con caja cerrada', () => {
    beforeEach(() => {
      cy.stubBase('cajero')

      cy.intercept('GET', `${API}/cajas/sucursal/1/status`, {
        statusCode: 200,
        body: {
          sucursalId: 1,
          cajaPadreId: 1,
          panel: { baseGeneral: '0', cajaGeneral: '0', cajaFuerteGeneral: '0', acumuladoMonedaCirculante: '0' },
          cajas: [
            {
              cajaId: 10,
              sesionId: null,
              codigo: 'AUX-001',
              nombre: 'Caja Auxiliar 1',
              tipo: 'pos',
              cajeroId: 1,
              estado: 'cerrada',
              saldoActual: null,
              baseDia: '100000',
              limiteAlerta: null,
              ingresosSesion: '0',
              egresosSesion: '0',
              girosCount: 0,
              girosValor: '0',
              alertas: [],
            },
          ],
        },
      }).as('statusCajaCerrada')

      cy.visitAs('/ventas', 'cajero')
      cy.wait('@authMe')
      cy.wait('@statusCajaCerrada')
    })

    it('muestra pantalla de apertura cuando la caja está cerrada', () => {
      cy.contains('Turno cerrado').should('be.visible')
      cy.contains('Abrir turno').should('be.visible')
    })

    it('botón de apertura deshabilitado sin monto', () => {
      cy.contains('button', 'Abrir turno').should('be.disabled')
    })

    it('abre el turno con monto válido', () => {
      cy.intercept('POST', `${API}/cajas/auxiliares/10/abrir`, {
        statusCode: 201,
        body: { id: 2, estado: 'abierta', saldoActual: '350000' },
      }).as('abrirTurno')

      cy.get('input[placeholder="Ej: 350000"]').type('350000')
      cy.contains('button', 'Abrir turno').should('not.be.disabled').click()
      cy.wait('@abrirTurno')
    })
  })

  // ── Supervisor: vista de selección de cajas ────────────────────────────────

  describe('Supervisor: selección de cajas abiertas', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/cajas/sucursal/1/status`, {
        statusCode: 200,
        body: {
          sucursalId: 1,
          cajaPadreId: 1,
          panel: { baseGeneral: '500000', cajaGeneral: '650000', cajaFuerteGeneral: '300000', acumuladoMonedaCirculante: '350000' },
          cajas: [
            {
              cajaId: 10,
              sesionId: 1,
              codigo: 'AUX-001',
              nombre: 'Caja Auxiliar 1',
              tipo: 'pos',
              cajeroId: 1,
              estado: 'abierta',
              saldoActual: '150000',
              baseDia: '100000',
              limiteAlerta: null,
              ingresosSesion: '100000',
              egresosSesion: '50000',
              girosCount: 0,
              girosValor: '0',
              alertas: [],
            },
            {
              cajaId: 11,
              sesionId: 2,
              codigo: 'AUX-002',
              nombre: 'Caja Auxiliar 2',
              tipo: 'pos',
              cajeroId: 5,
              estado: 'abierta',
              saldoActual: '200000',
              baseDia: '100000',
              limiteAlerta: null,
              ingresosSesion: '120000',
              egresosSesion: '20000',
              girosCount: 0,
              girosValor: '0',
              alertas: [],
            },
          ],
        },
      }).as('statusDosAuxiliares')

      cy.stubBase('supervisor')
      cy.visitAs('/ventas', 'supervisor')
      cy.wait('@authMe')
      cy.wait('@statusDosAuxiliares')
    })

    it('muestra el badge con cantidad de cajas abiertas', () => {
      cy.contains('2 abiertas').should('be.visible')
    })

    it('muestra tarjetas de cada caja abierta', () => {
      cy.contains('Caja Auxiliar 1').should('be.visible')
      cy.contains('Caja Auxiliar 2').should('be.visible')
    })

    it('hace click en una caja y navega a su detalle', () => {
      cy.contains('Caja Auxiliar 1').click()
      cy.url().should('include', '/ventas/caja/10')
    })
  })

  // ── Sin cajas abiertas ─────────────────────────────────────────────────────

  describe('Sin cajas abiertas (supervisor)', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/cajas/sucursal/1/status`, {
        statusCode: 200,
        body: {
          sucursalId: 1,
          cajaPadreId: 1,
          panel: { baseGeneral: '0', cajaGeneral: '0', cajaFuerteGeneral: '0', acumuladoMonedaCirculante: '0' },
          cajas: [],
        },
      }).as('statusVacio')

      cy.stubBase('supervisor')
      cy.visitAs('/ventas', 'supervisor')
      cy.wait('@authMe')
      cy.wait('@statusVacio')
    })

    it('muestra estado vacío cuando no hay cajas activas', () => {
      cy.contains('No hay cajas con sesión activa').should('be.visible')
    })
  })

  // ── Error de API ───────────────────────────────────────────────────────────

  describe('Error al cargar cajas', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/cajas/sucursal/1/status`, {
        statusCode: 500,
        body: { message: 'Error interno del servidor' },
      }).as('statusError')

      cy.stubBase('supervisor')
      cy.visitAs('/ventas', 'supervisor')
      cy.wait('@authMe')
      cy.wait('@statusError')
    })

    it('muestra mensaje de error cuando la API falla', () => {
      cy.contains('No se pudo cargar las cajas disponibles').should('be.visible')
      cy.contains('Reintentar').should('be.visible')
    })
  })
})
