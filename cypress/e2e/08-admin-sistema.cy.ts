export {}

/**
 * Pruebas E2E — Admin: Sistema (Feature Flags, Sucursales, Equipos, Audit,
 *                                PuntosVenta, Comercios, Regionales)
 *
 * Rutas cubiertas:
 * - /admin/feature-flags → FeatureFlags
 * - /admin/branches      → Sucursales
 * - /admin/devices       → Equipos
 * - /admin/audit         → Audit
 * - /admin/puntos-venta  → PuntoVentasAdmin
 * - /admin/comercios     → Comercios
 * - /admin/regionales    → Regionales
 *
 * Rol: ADMIN_SISTEMA (web — no Tauri)
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitAdmin(path: string) {
  cy.stubBase('admin')
  cy.visitAsWeb(path, 'admin')
  cy.wait('@authMe')
}

// ── Feature Flags ─────────────────────────────────────────────────────────────

describe('Admin — Feature Flags (/admin/feature-flags)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/feature-flags`, {
      statusCode: 200,
      body: [
        { id: 1, codigo: 'modulo:ventas', descripcion: 'Módulo Ventas', entorno: 'dev', plataforma: 'tauri', activo: true },
        { id: 2, codigo: 'modulo_usuarios', descripcion: 'Gestión de Usuarios', entorno: 'dev', plataforma: 'web', activo: true },
        { id: 3, codigo: 'modulo_inventario', descripcion: 'Inventario', entorno: 'prod', plataforma: 'web', activo: false },
      ],
    }).as('featureFlagsList')

    visitAdmin('/admin/feature-flags')
    cy.wait('@featureFlagsList', { timeout: 10_000 })
  })

  it('carga la página de feature flags', () => {
    cy.contains('Feature Flags', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra la lista de feature flags', () => {
    cy.contains('modulo:ventas', { timeout: 8_000 }).should('be.visible')
    cy.contains('modulo_usuarios', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el entorno de cada flag', () => {
    cy.contains(/dev|prod/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra la plataforma de cada flag', () => {
    cy.contains(/tauri|web/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado activo/inactivo de cada flag', () => {
    cy.get('[role="switch"], [type="checkbox"]', { timeout: 8_000 }).should('exist')
  })

  describe('crear feature flag', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/feature-flags`, {
        statusCode: 201,
        body: { id: 10, codigo: 'nuevo_flag', entorno: 'dev', plataforma: 'web', activo: true },
      }).as('crearFlag')
    })

    it('tiene botón para crear nuevo flag', () => {
      cy.contains(/nuevo flag|crear flag|nuevo/i, { timeout: 8_000 }).should('exist')
    })

    it('abre formulario al hacer click en crear', () => {
      cy.contains(/nuevo flag|crear flag|nuevo/i).first().click()
      cy.get('[role="dialog"], form', { timeout: 8_000 }).should('exist')
    })
  })

  describe('toggle de flag', () => {
    beforeEach(() => {
      cy.intercept('PATCH', `${API}/feature-flags/**`, {
        statusCode: 200,
        body: { id: 1, codigo: 'modulo:ventas', activo: false },
      }).as('toggleFlag')
    })

    it('puede hacer toggle en un feature flag', () => {
      cy.get('[role="switch"]', { timeout: 8_000 }).first().click({ force: true })
    })
  })
})

// ── Sucursales ────────────────────────────────────────────────────────────────

describe('Admin — Sucursales (/admin/branches)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/sucursales**`, {
      fixture: 'sucursales',
    }).as('sucursalesList')

    visitAdmin('/admin/branches')
    cy.wait('@sucursalesList', { timeout: 10_000 })
  })

  it('carga la página de sucursales', () => {
    cy.contains(/sucursal/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra las sucursales registradas', () => {
    cy.contains('Sucursal Central Bogotá', { timeout: 8_000 }).should('be.visible')
    cy.contains('Sucursal Chapinero', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el código de cada sucursal', () => {
    cy.contains('BOG-001', { timeout: 8_000 }).should('exist')
  })

  it('muestra la dirección de cada sucursal', () => {
    cy.contains('Calle 10 # 5-60', { timeout: 8_000 }).should('exist')
  })

  it('muestra la ciudad de cada sucursal', () => {
    cy.contains('Bogotá', { timeout: 8_000 }).should('exist')
  })

  describe('crear sucursal', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/sucursales`, {
        statusCode: 201,
        body: { id: 10, nombre: 'Nueva Sucursal', codigo: 'BOG-003', ciudad: 'Bogotá', activo: true },
      }).as('crearSucursal')
    })

    it('tiene botón para crear nueva sucursal', () => {
      cy.contains(/nueva sucursal|crear sucursal|nuevo/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── Equipos ───────────────────────────────────────────────────────────────────

describe('Admin — Equipos (/admin/devices)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/equipos**`, {
      fixture: 'equipos',
    }).as('equiposList')

    visitAdmin('/admin/devices')
    cy.wait('@equiposList', { timeout: 10_000 })
  })

  it('carga la página de equipos', () => {
    cy.contains(/equipo/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los equipos autorizados', () => {
    cy.contains('PC Caja 1', { timeout: 8_000 }).should('be.visible')
    cy.contains('PC Caja 2', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra la dirección MAC de cada equipo', () => {
    cy.contains('AA:BB:CC:DD:EE:01', { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado activo de los equipos', () => {
    cy.contains(/activo|autorizado/i, { timeout: 8_000 }).should('exist')
  })

  describe('autorizar nuevo equipo', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/equipos`, {
        statusCode: 201,
        body: { id: 10, nombre: 'PC Nueva', mac: 'FF:EE:DD:CC:BB:AA', sucursalId: 1, activo: true },
      }).as('autorizarEquipo')
    })

    it('tiene botón para autorizar nuevo equipo', () => {
      cy.contains(/autorizar|nuevo equipo|nuevo/i, { timeout: 8_000 }).should('exist')
    })

    it('abre formulario de autorización al hacer click', () => {
      cy.contains(/autorizar|nuevo equipo|nuevo/i).first().click()
      cy.get('[role="dialog"], form', { timeout: 8_000 }).should('exist')
    })
  })
})

// ── Audit ─────────────────────────────────────────────────────────────────────

describe('Admin — Auditoría (/admin/audit)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/audit**`, {
      fixture: 'audit-logs',
    }).as('auditLogs')

    cy.intercept('GET', `${API}/audit/stats`, {
      fixture: 'audit-stats',
    }).as('auditStats')

    visitAdmin('/admin/audit')
    cy.wait('@auditLogs', { timeout: 10_000 })
  })

  it('carga la página de auditoría', () => {
    cy.contains(/auditoría|audit/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra estadísticas del sistema', () => {
    cy.wait('@auditStats', { timeout: 8_000 })
    // stats: 1250 acciones, 48 hoy
    cy.contains('1.250', { timeout: 8_000 }).should('exist')
  })

  it('muestra los registros de auditoría', () => {
    cy.contains('Ana Cajera', { timeout: 8_000 }).should('exist')
  })

  it('muestra el tipo de acción auditada', () => {
    cy.contains('LOGIN', { timeout: 8_000 }).should('exist')
  })

  it('muestra la entidad auditada', () => {
    cy.contains('envio', { timeout: 8_000 }).should('exist')
  })

  it('muestra la IP del usuario', () => {
    cy.contains('192.168.1.10', { timeout: 8_000 }).should('exist')
  })

  it('tiene filtros de búsqueda', () => {
    cy.get('input[type="search"], input[placeholder*="buscar"], input[placeholder*="Buscar"]', { timeout: 8_000 })
      .should('exist')
  })
})

// ── PuntoVentasAdmin ──────────────────────────────────────────────────────────

describe('Admin — Puntos de Venta (/admin/puntos-venta)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/cajas**`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          nombre: 'Caja Principal Bogotá',
          codigo: 'BOG-MAIN',
          sucursalId: 1,
          sucursalNombre: 'Sucursal Central Bogotá',
          estado: 'abierta',
          baseGeneral: '500000',
        },
        {
          id: 2,
          nombre: 'Caja Principal Chapinero',
          codigo: 'CHP-MAIN',
          sucursalId: 2,
          sucursalNombre: 'Sucursal Chapinero',
          estado: 'cerrada',
          baseGeneral: '200000',
        },
      ],
    }).as('cajasPrincipales')

    visitAdmin('/admin/puntos-venta')
    cy.wait('@cajasPrincipales', { timeout: 10_000 })
  })

  it('carga la página de puntos de venta', () => {
    cy.get('body').should('be.visible')
  })

  it('muestra los puntos de venta registrados', () => {
    cy.contains('Caja Principal Bogotá', { timeout: 8_000 }).should('exist')
    cy.contains('Caja Principal Chapinero', { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado de cada caja', () => {
    cy.contains(/abierta/i, { timeout: 8_000 }).should('exist')
    cy.contains(/cerrada/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra la base general de cada caja', () => {
    cy.contains(/500\.000|500000/i, { timeout: 8_000 }).should('exist')
  })
})

// ── Comercios ─────────────────────────────────────────────────────────────────

describe('Admin — Comercios (/admin/comercios)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/comercios**`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          nombre: '4-72 Bogotá Norte',
          nit: '900100200-1',
          ciudad: 'Bogotá',
          activo: true,
        },
        {
          id: 2,
          nombre: '4-72 Medellín Centro',
          nit: '900200300-2',
          ciudad: 'Medellín',
          activo: true,
        },
      ],
    }).as('comerciosList')

    cy.intercept('GET', `${API}/feature-flags/activos**`, {
      statusCode: 200,
      body: [{ codigo: 'modulo_comercios', entorno: 'dev', plataforma: 'web' }],
    }).as('flagsComercio')

    visitAdmin('/admin/comercios')
    cy.wait('@comerciosList', { timeout: 10_000 })
  })

  it('carga la página de comercios', () => {
    cy.get('body').should('be.visible')
  })

  it('muestra los comercios registrados', () => {
    cy.contains('4-72 Bogotá Norte', { timeout: 8_000 }).should('exist')
    cy.contains('4-72 Medellín Centro', { timeout: 8_000 }).should('exist')
  })

  it('muestra el NIT de cada comercio', () => {
    cy.contains('900100200-1', { timeout: 8_000 }).should('exist')
  })

  it('muestra la ciudad de cada comercio', () => {
    cy.contains('Bogotá', { timeout: 8_000 }).should('exist')
    cy.contains('Medellín', { timeout: 8_000 }).should('exist')
  })
})

// ── Regionales ────────────────────────────────────────────────────────────────

describe('Admin — Regionales (/admin/regionales)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/regionales**`, {
      statusCode: 200,
      body: [
        { id: 1, nombre: 'Regional Bogotá', codigo: 'REG-BOG', activo: true },
        { id: 2, nombre: 'Regional Antioquia', codigo: 'REG-ANT', activo: true },
      ],
    }).as('regionalesList')

    visitAdmin('/admin/regionales')
    cy.wait('@regionalesList', { timeout: 10_000 })
  })

  it('carga la página de regionales', () => {
    cy.get('body').should('be.visible')
  })

  it('muestra las regionales del sistema', () => {
    cy.contains('Regional Bogotá', { timeout: 8_000 }).should('exist')
    cy.contains('Regional Antioquia', { timeout: 8_000 }).should('exist')
  })

  it('muestra el código de cada regional', () => {
    cy.contains('REG-BOG', { timeout: 8_000 }).should('exist')
  })
})
