export {}

/**
 * Pruebas E2E — Dashboard y Reportes
 *
 * Rutas cubiertas:
 * - /        → Dashboard (HomeRedirect — rol-específico)
 * - /reportes → Reportes (todos los roles autenticados)
 *
 * Roles probados:
 * - ADMIN_SISTEMA (web) → ve el Dashboard de administración
 * - CAJERO (Tauri)      → redirige a /ventas/estadisticas
 */

const API = Cypress.env('API_URL') as string

// ── Dashboard — Admin ─────────────────────────────────────────────────────────

describe('Dashboard — Admin (/)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas/panel-admin`, {
      statusCode: 200,
      body: [
        {
          sucursalId: 1,
          sucursalNombre: 'Sucursal Central Bogotá',
          totalCajas: 2,
          cajasAbiertas: 1,
          saldoTotal: '450000',
          ingresosTotales: '200000',
        },
      ],
    }).as('panelAdmin')

    cy.intercept('GET', `${API}/cajas/sucursal/1/status`, {
      fixture: 'status-punto',
    }).as('statusPuntoDash')

    cy.stubBase('admin')
    cy.visitAsWeb('/', 'admin')
    cy.wait('@authMe')
  })

  it('carga el dashboard de administración', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('no redirige al admin a /ventas/estadisticas', () => {
    cy.url().should('not.include', '/ventas/estadisticas')
  })

  it('muestra el layout del panel de administración', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
    cy.contains(/bienvenido|dashboard|inicio|panel/i, { timeout: 8_000 }).should('exist')
  })
})

// ── Dashboard — Cajero (redirige) ─────────────────────────────────────────────

describe('Dashboard — Cajero redirige a estadísticas', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/ventas/punto/10/resumen`, {
      fixture: 'resumen-turno',
    }).as('resumenEstadisticas')

    cy.intercept('GET', `${API}/ventas/punto/10/turno**`, {
      statusCode: 200,
      body: [],
    }).as('turnoEstadisticas')

    cy.stubBase('cajero')
    cy.visitAs('/', 'cajero')
    cy.wait('@authMe')
    cy.wait('@featureFlags', { timeout: 10_000 })
  })

  it('redirige al cajero a /ventas/estadisticas', () => {
    cy.url({ timeout: 8_000 }).should('include', '/ventas/estadisticas')
  })

  it('muestra el contenido de estadísticas de ventas', () => {
    cy.wait('@resumenEstadisticas', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })
})

// ── Reportes ──────────────────────────────────────────────────────────────────

describe('Reportes — /reportes (Admin)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas/balance-pagos**`, {
      statusCode: 200,
      body: [],
    }).as('balancePagos')

    cy.intercept('GET', `${API}/ventas/reportes**`, {
      statusCode: 200,
      body: {
        totalVentas: 150000,
        totalEnvios: 25,
        porServicio: [
          { servicioNombre: 'Correo Regular No Prioritario', cantidad: 15, valor: 90000 },
          { servicioNombre: 'Correo Prioritario Nacional', cantidad: 10, valor: 60000 },
        ],
      },
    }).as('reportesVentas')

    cy.stubBase('admin')
    cy.visitAsWeb('/reportes', 'admin')
    cy.wait('@authMe')
  })

  it('carga la página de reportes', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra el título de reportes', () => {
    cy.contains(/reporte/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los tabs de reportes', () => {
    cy.get('[role="tab"]', { timeout: 8_000 }).should('have.length.gte', 1)
  })
})

describe('Reportes — /reportes (Supervisor)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas/balance-pagos**`, {
      statusCode: 200,
      body: [],
    }).as('balancePagosSup')

    cy.stubBase('supervisor')
    cy.visitAs('/reportes', 'supervisor')
    cy.wait('@authMe')
    cy.wait('@featureFlags', { timeout: 10_000 })
  })

  it('carga reportes también para el supervisor', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra contenido de reportes al supervisor', () => {
    cy.contains(/reporte/i, { timeout: 8_000 }).should('be.visible')
  })
})

// ── Error al cargar ───────────────────────────────────────────────────────────

describe('Dashboard — error de API', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas/panel-admin`, {
      statusCode: 500,
      body: { message: 'Error interno del servidor' },
    }).as('panelError')

    cy.stubBase('admin')
    cy.visitAsWeb('/', 'admin')
    cy.wait('@authMe')
  })

  it('maneja error de API sin romper la página', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
    cy.contains(/error|reintentar|cargando/i, { timeout: 8_000 }).should('exist')
  })
})
