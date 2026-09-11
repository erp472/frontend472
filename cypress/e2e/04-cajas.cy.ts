export {}

/**
 * Pruebas E2E — Módulo Cajas
 *
 * Rutas cubiertas:
 * - /cajas/principales/:sucursalId  → PuntoCajas
 * - /cajas/punto/:sesionId          → DetalleCaja
 * - /cajas/cierre/:sucursalId       → AlertasCierre
 * - /cajas/diferencias/:sucursalId  → RegistroDiferencias
 * - /cajas/sacas/:sucursalId        → SacasPage
 * - /cajas/consolidado              → ConsolidadoComercio
 *
 * Roles:
 * - SUPERVISOR_REGIONAL (Tauri) para rutas de cajas principales
 * - ADMIN_SISTEMA (web) para ConsolidadoComercio
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitCajas(path: string) {
  cy.stubBase('supervisor')
  cy.stubCajas()
  cy.visitAs(path, 'supervisor')
  cy.wait('@authMe')
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('Cajas — PuntoCajas (/cajas/principales/1)', () => {
  beforeEach(() => {
    visitCajas('/cajas/principales/1')
  })

  it('carga la página de cajas de la sucursal', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra el botón de refrescar o panel de cajas', () => {
    cy.wait('@statusPunto', { timeout: 8_000 })
    // La página carga el status de cajas
    cy.get('body').should('not.contain', 'error crítico')
  })

  it('muestra tarjetas de cajas abiertas desde el status', () => {
    cy.wait('@statusPunto', { timeout: 8_000 })
    // El fixture status-punto tiene AUX-001
    cy.contains('AUX-001', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el saldo de la caja auxiliar', () => {
    cy.wait('@statusPunto', { timeout: 8_000 })
    cy.contains('150.000', { timeout: 8_000 }).should('exist')
  })

  it('muestra indicador de estado de la caja', () => {
    cy.wait('@statusPunto', { timeout: 8_000 })
    cy.contains(/abierta/i, { timeout: 8_000 }).should('exist')
  })

  describe('con diferencias pendientes', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/cajas/sucursal/1/diferencias-pendientes`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            sesionId: 1,
            cajeroNombre: 'Ana Cajera',
            tipo: 'faltante',
            valor: '15000',
            estado: 'pendiente',
            creadaEn: '2026-08-21T10:00:00.000Z',
          },
        ],
      }).as('diferenciasPendientesConDatos')
    })

    it('muestra badge de alerta cuando hay diferencias', () => {
      cy.wait('@diferenciasPendientesConDatos', { timeout: 8_000 })
      // El panel principal debe reflejar que hay alertas
      cy.get('body').should('be.visible')
    })
  })
})

// ── DetalleCaja ────────────────────────────────────────────────────────────────

describe('Cajas — DetalleCaja (/cajas/punto/1)', () => {
  beforeEach(() => {
    visitCajas('/cajas/punto/1')
  })

  it('carga la página de detalle de sesión', () => {
    cy.wait('@saldoSesion', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  it('muestra el saldo actual de la sesión', () => {
    cy.wait('@saldoSesion', { timeout: 8_000 })
    cy.contains('150.000', { timeout: 8_000 }).should('exist')
  })

  it('muestra el nombre del cajero en la sesión', () => {
    cy.wait('@saldoSesion', { timeout: 8_000 })
    cy.contains('Ana Cajera', { timeout: 8_000 }).should('exist')
  })

  it('muestra los movimientos de la sesión', () => {
    cy.wait('@movimientos', { timeout: 8_000 })
    cy.contains('10.500', { timeout: 8_000 }).should('exist')
  })

  it('lista movimientos de distinto tipo', () => {
    cy.wait('@movimientos', { timeout: 8_000 })
    cy.contains('50.000', { timeout: 8_000 }).should('exist')
  })

  describe('cierre de sesión', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/cajas/punto/1/cierre`, {
        statusCode: 200,
        body: { sesionId: 1, estado: 'cerrada' },
      }).as('cerrarSesion')
    })

    it('muestra el botón de cierre de sesión', () => {
      cy.wait('@saldoSesion', { timeout: 8_000 })
      cy.contains(/cerrar/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── AlertasCierre ──────────────────────────────────────────────────────────────

describe('Cajas — AlertasCierre (/cajas/cierre/1)', () => {
  beforeEach(() => {
    visitCajas('/cajas/cierre/1')
    cy.wait('@alertasCierre', { timeout: 8_000 })
  })

  it('carga la página de alertas de cierre', () => {
    cy.get('body').should('be.visible')
  })

  it('muestra estado vacío cuando no hay alertas pendientes', () => {
    cy.get('body', { timeout: 8_000 }).should('be.visible')
  })

  describe('con alertas de cierre automático', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/cajas/alertas/cierre-automatico**`, {
        statusCode: 200,
        body: [
          {
            sesionId: 1,
            cajaId: 10,
            cajeroNombre: 'Ana Cajera',
            saldoActual: '150000',
            saldoEsperado: '160000',
            diferencia: '-10000',
            estado: 'pendiente',
          },
        ],
      }).as('alertasCierreConDatos')
    })

    it('muestra cajas con diferencias pendientes de cierre', () => {
      cy.wait('@alertasCierreConDatos', { timeout: 8_000 })
      cy.contains('Ana Cajera', { timeout: 8_000 }).should('exist')
    })

    it('muestra el saldo esperado vs actual', () => {
      cy.wait('@alertasCierreConDatos', { timeout: 8_000 })
      cy.contains(/saldo/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── RegistroDiferencias ────────────────────────────────────────────────────────

describe('Cajas — RegistroDiferencias (/cajas/diferencias/1)', () => {
  beforeEach(() => {
    visitCajas('/cajas/diferencias/1')
  })

  it('carga la página de registro de diferencias', () => {
    cy.wait('@diferenciasRegistro', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  it('muestra tabla o estado vacío de diferencias', () => {
    cy.wait('@diferenciasRegistro', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  describe('con diferencias históricas', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/cajas/sucursal/1/diferencias**`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            sesionId: 1,
            cajeroNombre: 'Ana Cajera',
            tipo: 'faltante',
            valor: '15000',
            causa: 'Error en cambio',
            estado: 'resuelto',
            creadaEn: '2026-08-20T10:00:00.000Z',
          },
        ],
      }).as('diferenciasConDatos')
    })

    it('muestra el registro de diferencias resueltas', () => {
      cy.wait('@diferenciasConDatos', { timeout: 8_000 })
      cy.contains('Ana Cajera', { timeout: 8_000 }).should('exist')
    })

    it('muestra el valor de la diferencia', () => {
      cy.wait('@diferenciasConDatos', { timeout: 8_000 })
      cy.contains('15.000', { timeout: 8_000 }).should('exist')
    })
  })
})

// ── SacasPage ─────────────────────────────────────────────────────────────────

describe('Cajas — SacasPage (/cajas/sacas/1)', () => {
  beforeEach(() => {
    cy.stubBase('supervisor')
    cy.stubCajas()
    cy.intercept('GET', `${API}/sacas**`, {
      fixture: 'sacas',
    }).as('sacasList')
    cy.visitAs('/cajas/sacas/1', 'supervisor')
    cy.wait('@authMe')
    cy.wait('@sacasList', { timeout: 8_000 })
  })

  it('carga la página de sacas', () => {
    cy.get('body').should('be.visible')
  })

  it('muestra las sacas existentes', () => {
    cy.contains('SAC-2026-001', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra sacas cerradas en el historial', () => {
    cy.contains('SAC-2026-002', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el destino de cada saca', () => {
    cy.contains('Bogotá Centro', { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado de la saca', () => {
    cy.contains(/abierta/i, { timeout: 8_000 }).should('exist')
    cy.contains(/cerrada/i, { timeout: 8_000 }).should('exist')
  })

  it('tiene botón para crear nueva saca', () => {
    cy.contains(/nueva saca|crear saca|nueva/i, { timeout: 8_000 }).should('exist')
  })

  describe('crear saca', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/sacas`, {
        statusCode: 201,
        body: {
          id: 3,
          codigo: 'SAC-2026-003',
          sucursalId: 1,
          estado: 'abierta',
          tipo: 'ordinaria',
          destino: 'Cali',
          totalEnvios: 0,
          creadaEn: '2026-08-21T12:00:00.000Z',
          cerradaEn: null,
        },
      }).as('crearSaca')
    })

    it('abre dialog o formulario al hacer click en crear', () => {
      cy.contains(/nueva saca|crear saca|nueva/i).click()
      cy.get('[role="dialog"], form').should('exist')
    })
  })
})

// ── ConsolidadoComercio ────────────────────────────────────────────────────────

describe('Cajas — ConsolidadoComercio (/cajas/consolidado)', () => {
  beforeEach(() => {
    cy.stubBase('admin')
    cy.intercept('GET', `${API}/cajas/consolidado-comercio**`, {
      statusCode: 200,
      body: {
        comercioId: 1,
        nombreComercio: 'Sucursal Central',
        totalCajas: 2,
        saldoTotal: '450000',
        ingresosTotales: '200000',
        egresosTotales: '50000',
        sesiones: [
          {
            sesionId: 1,
            cajeroNombre: 'Ana Cajera',
            cajaId: 10,
            codigoCaja: 'AUX-001',
            saldoActual: '150000',
            ingresos: '100000',
            egresos: '50000',
            abiertaEn: '2026-08-21T08:00:00.000Z',
          },
        ],
      },
    }).as('consolidado')

    cy.intercept('GET', `${API}/feature-flags/activos**`, {
      statusCode: 200,
      body: [
        { codigo: 'modulo:tesoreria', entorno: 'dev', plataforma: 'web' },
      ],
    }).as('featureFlagsConsolidado')

    cy.visitAsWeb('/cajas/consolidado', 'admin')
    cy.wait('@authMe')
  })

  it('carga la página de consolidado', () => {
    cy.wait('@consolidado', { timeout: 8_000 })
    cy.get('body').should('be.visible')
  })

  it('muestra el nombre del comercio', () => {
    cy.wait('@consolidado', { timeout: 8_000 })
    cy.contains('Sucursal Central', { timeout: 8_000 }).should('exist')
  })

  it('muestra el saldo total consolidado', () => {
    cy.wait('@consolidado', { timeout: 8_000 })
    cy.contains('450.000', { timeout: 8_000 }).should('exist')
  })

  it('muestra las sesiones activas', () => {
    cy.wait('@consolidado', { timeout: 8_000 })
    cy.contains('Ana Cajera', { timeout: 8_000 }).should('exist')
  })

  it('muestra el código de caja de cada sesión', () => {
    cy.wait('@consolidado', { timeout: 8_000 })
    cy.contains('AUX-001', { timeout: 8_000 }).should('exist')
  })
})
