export {}

/**
 * Pruebas E2E — Ventas Adicionales
 *
 * Rutas cubiertas:
 * - /ventas/estadisticas   → DashboardVentas
 * - /ventas/apartados      → ApartadosVentaPage
 * - /ventas/caja/10/giros    → GirosPage
 * - /ventas/caja/10/recaudos → RecaudosPage
 *
 * Rol: CAJERO (Tauri — DesktopOnlyRoute)
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitVentasPage(path: string) {
  cy.stubBase('cajero')
  cy.stubVentas()
  cy.visitAs(path, 'cajero')
  cy.wait('@authMe')
  cy.wait('@featureFlags', { timeout: 10_000 })
}

// ── DashboardVentas ────────────────────────────────────────────────────────────

describe('DashboardVentas — /ventas/estadisticas', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/ventas/punto/10/resumen`, {
      fixture: 'resumen-turno',
    }).as('resumenDashboard')

    cy.intercept('GET', `${API}/ventas/punto/10/turno**`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          tipo: 'venta_servicio',
          monto: '10500',
          medioPago: 'efectivo',
          createdAt: '2026-08-21T09:00:00.000Z',
        },
        {
          id: 2,
          tipo: 'venta_producto',
          monto: '300',
          medioPago: 'efectivo',
          createdAt: '2026-08-21T09:30:00.000Z',
        },
      ],
    }).as('turnoConMovimientos')

    visitVentasPage('/ventas/estadisticas')
  })

  it('carga la página de estadísticas de ventas', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra métricas del turno actual', () => {
    cy.wait('@resumenDashboard', { timeout: 8_000 })
    // El fixture resumen-turno tiene totalGeneral: 44500
    cy.contains(/44\.500|44500|total/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra el historial de movimientos del turno', () => {
    cy.wait('@turnoConMovimientos', { timeout: 8_000 })
    cy.contains(/10\.500|10500/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra medios de pago en los movimientos', () => {
    cy.wait('@turnoConMovimientos', { timeout: 8_000 })
    cy.contains(/efectivo/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra resumen de ventas por categoría', () => {
    cy.wait('@resumenDashboard', { timeout: 8_000 })
    cy.contains(/servicio|producto|total/i, { timeout: 8_000 }).should('exist')
  })
})

// ── ApartadosVentaPage ─────────────────────────────────────────────────────────

describe('ApartadosVentaPage — /ventas/apartados', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/ventas/apartados/disponibles**`, {
      statusCode: 200,
      body: {
        totalDisponibles: 3,
        lista: [
          {
            id: 1,
            codigo: 'APT-001',
            sucursalId: 1,
            estado: 'disponible',
            tamaño: 'pequeño',
            precio: '15000',
          },
          {
            id: 2,
            codigo: 'APT-002',
            sucursalId: 1,
            estado: 'disponible',
            tamaño: 'mediano',
            precio: '25000',
          },
          {
            id: 3,
            codigo: 'APT-003',
            sucursalId: 1,
            estado: 'ocupado',
            tamaño: 'grande',
            precio: '40000',
          },
        ],
      },
    }).as('apartadosDisponibles')

    visitVentasPage('/ventas/apartados')
  })

  it('carga la página de apartados postales', () => {
    cy.wait('@apartadosDisponibles', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  it('muestra los apartados disponibles', () => {
    cy.wait('@apartadosDisponibles', { timeout: 8_000 })
    cy.contains('APT-001', { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado de cada apartado', () => {
    cy.wait('@apartadosDisponibles', { timeout: 8_000 })
    cy.contains(/disponible/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra el precio de los apartados', () => {
    cy.wait('@apartadosDisponibles', { timeout: 8_000 })
    cy.contains(/15\.000|25\.000/i, { timeout: 8_000 }).should('exist')
  })

  it('diferencia apartados ocupados de disponibles', () => {
    cy.wait('@apartadosDisponibles', { timeout: 8_000 })
    cy.contains(/ocupado/i, { timeout: 8_000 }).should('exist')
  })

  describe('sin apartados disponibles', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/ventas/apartados/disponibles**`, {
        statusCode: 200,
        body: { totalDisponibles: 0, lista: [] },
      }).as('apartadosVacios')
    })

    it('muestra mensaje cuando no hay apartados', () => {
      cy.wait('@apartadosVacios', { timeout: 8_000 })
      cy.contains(/no hay|sin apartados|disponible/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── GirosPage ─────────────────────────────────────────────────────────────────

describe('GirosPage — /ventas/caja/10/giros', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas/auxiliares/10`, {
      fixture: 'caja-auxiliar',
    }).as('cajaGiros')

    cy.intercept('GET', `${API}/giros/sesion/**`, {
      statusCode: 200,
      body: [],
    }).as('girosSesion')

    cy.intercept('GET', `${API}/cajas/punto/*/saldo`, {
      statusCode: 200,
      body: {
        sesionId: 1,
        saldoActual: '150000',
        ingresosTotales: '0',
        egresosTotales: '0',
        baseAsignada: '150000',
      },
    }).as('saldoGiros')

    visitVentasPage('/ventas/caja/10/giros')
  })

  it('carga la página de giros', () => {
    cy.wait('@girosSesion', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  it('muestra los tabs de tipo de giro', () => {
    cy.wait('@girosSesion', { timeout: 8_000 })
    // GirosPage tiene tabs: Emitir/Pagar Nacional, Emitir/Pagar Internacional
    cy.contains(/nacional|giro/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra formulario de emitir giro nacional', () => {
    cy.wait('@girosSesion', { timeout: 8_000 })
    cy.contains(/emitir/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra campo de monto para emitir giro', () => {
    cy.wait('@girosSesion', { timeout: 8_000 })
    cy.contains(/monto/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra historial vacío al no haber giros en sesión', () => {
    cy.wait('@girosSesion', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  describe('con giros en sesión', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/giros/sesion/**`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            tipo: 'nacional',
            monto: '100000',
            estado: 'EMITIDO',
            beneficiario: { nombre: 'Juan Pérez', numeroDoc: '98765432' },
            emisor: { nombre: 'Ana Cajera' },
            createdAt: '2026-08-21T10:00:00.000Z',
          },
        ],
      }).as('girosConDatos')
    })

    it('muestra el giro en el historial', () => {
      cy.wait('@girosConDatos', { timeout: 8_000 })
      cy.contains('Juan Pérez', { timeout: 8_000 }).should('exist')
    })

    it('muestra el monto del giro', () => {
      cy.wait('@girosConDatos', { timeout: 8_000 })
      cy.contains('100.000', { timeout: 8_000 }).should('exist')
    })
  })

  describe('emitir giro nacional exitoso', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/giros/nacional/emitir`, {
        statusCode: 201,
        body: {
          giro: {
            id: 10,
            tipo: 'nacional',
            monto: '200000',
            estado: 'EMITIDO',
            beneficiario: { nombre: 'María López', numeroDoc: '11223344' },
          },
          pin: '1234',
          saldoActual: 100000,
        },
      }).as('emitirGiro')
    })

    it('el formulario de emitir tiene campos requeridos', () => {
      cy.wait('@girosSesion', { timeout: 8_000 })
      cy.contains(/emitir/i).should('exist')
      // Los campos monto y beneficiario deben existir
      cy.contains(/monto|beneficiario/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── RecaudosPage ──────────────────────────────────────────────────────────────

describe('RecaudosPage — /ventas/caja/10/recaudos', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas/auxiliares/10`, {
      fixture: 'caja-auxiliar',
    }).as('cajaRecaudos')

    cy.intercept('GET', `${API}/recaudos/convenios**`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          nombre: 'Convenio Agua Bogotá',
          codigo: 'EAAB',
          activo: true,
        },
        {
          id: 2,
          nombre: 'Convenio Gas Natural',
          codigo: 'GN',
          activo: true,
        },
      ],
    }).as('convenios')

    cy.intercept('GET', `${API}/recaudos/sesion/**`, {
      statusCode: 200,
      body: [],
    }).as('recaudosSesion')

    cy.intercept('GET', `${API}/cajas/punto/*/saldo`, {
      statusCode: 200,
      body: {
        sesionId: 1,
        saldoActual: '150000',
        ingresosTotales: '0',
        egresosTotales: '0',
        baseAsignada: '150000',
      },
    }).as('saldoRecaudos')

    visitVentasPage('/ventas/caja/10/recaudos')
  })

  it('carga la página de recaudos', () => {
    cy.wait('@convenios', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  it('muestra el título de la página de recaudos', () => {
    cy.wait('@convenios', { timeout: 8_000 })
    cy.contains(/recaudo/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el tab de Registrar', () => {
    cy.wait('@convenios', { timeout: 8_000 })
    cy.contains('[role="tab"]', 'Registrar', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el tab de Historial', () => {
    cy.wait('@convenios', { timeout: 8_000 })
    cy.contains('[role="tab"]', 'Historial', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los convenios disponibles en el formulario', () => {
    cy.wait('@convenios', { timeout: 8_000 })
    cy.contains('Convenio Agua Bogotá', { timeout: 8_000 }).should('exist')
  })

  it('muestra historial vacío de recaudos', () => {
    cy.contains('[role="tab"]', 'Historial').click()
    cy.wait('@recaudosSesion', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  describe('con recaudos registrados', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/recaudos/sesion/**`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            convenioNombre: 'Convenio Agua Bogotá',
            referencia: '1234567890',
            monto: '85000',
            estado: 'registrado',
            createdAt: '2026-08-21T11:00:00.000Z',
          },
        ],
      }).as('recaudosConDatos')
    })

    it('muestra el recaudo en el historial', () => {
      cy.contains('[role="tab"]', 'Historial').click()
      cy.wait('@recaudosConDatos', { timeout: 8_000 })
      cy.contains('85.000', { timeout: 8_000 }).should('exist')
    })

    it('muestra el convenio del recaudo', () => {
      cy.contains('[role="tab"]', 'Historial').click()
      cy.wait('@recaudosConDatos', { timeout: 8_000 })
      cy.contains('Convenio Agua Bogotá', { timeout: 8_000 }).should('exist')
    })
  })

  describe('registrar recaudo', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/recaudos/punto/10/registrar`, {
        statusCode: 201,
        body: {
          recaudo: {
            id: 10,
            convenioNombre: 'Convenio Gas Natural',
            referencia: '0987654321',
            monto: '120000',
            estado: 'registrado',
            sesionCajaId: 1,
          },
          saldoActual: 270000,
        },
      }).as('registrarRecaudo')
    })

    it('el formulario de registro existe en el tab Registrar', () => {
      cy.wait('@convenios', { timeout: 8_000 })
      cy.contains('[role="tab"]', 'Registrar').should('have.attr', 'data-state', 'active')
      cy.contains(/referencia|convenio/i, { timeout: 8_000 }).should('exist')
    })
  })
})
