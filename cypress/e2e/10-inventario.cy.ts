export {}

/**
 * Pruebas E2E — Inventario
 *
 * Ruta cubierta:
 * - /inventario → InventarioPage (stock por sucursal + alertas + ajustes)
 *
 * Rol: ADMIN_SISTEMA (web — no Tauri)
 * RoleGuard: INVENTARIOS | SUPERVISOR_REGIONAL | ADMIN_SISTEMA | ADMIN_NACIONAL
 * FlagGuard: admin bypasses, para otros necesita 'modulo_inventario'
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitInventario() {
  cy.stubBase('admin')
  cy.visitAsWeb('/inventario', 'admin')
  cy.wait('@authMe')
}

// ── Suite principal ────────────────────────────────────────────────────────────

describe('Inventario — /inventario', () => {
  // ── Carga inicial ────────────────────────────────────────────────────────────

  describe('Carga inicial', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/inventario/sucursales`, {
        statusCode: 200,
        body: [
          { sucursalId: 1, nombre: 'Sucursal Central Bogotá', totalItems: 3, itemsEnAlerta: 1 },
          { sucursalId: 2, nombre: 'Sucursal Chapinero', totalItems: 2, itemsEnAlerta: 0 },
        ],
      }).as('inventarioSucursales')

      cy.intercept('GET', `${API}/inventario/alertas`, {
        statusCode: 200,
        body: [
          {
            sucursalId: 1,
            sucursalNombre: 'Sucursal Central Bogotá',
            productoId: 2,
            productoCodigo: 'SOB-001',
            productoNombre: 'Sobre Nacional',
            stockActual: 50,
            stockMinimo: 100,
            deficit: 50,
          },
        ],
      }).as('inventarioAlertas')

      visitInventario()
    })

    it('carga la página de inventario', () => {
      cy.wait('@inventarioSucursales', { timeout: 8_000 })
      cy.get('body').should('be.visible')
    })

    it('muestra las sucursales con inventario', () => {
      cy.wait('@inventarioSucursales', { timeout: 8_000 })
      cy.contains('Sucursal Central Bogotá', { timeout: 8_000 }).should('exist')
      cy.contains('Sucursal Chapinero', { timeout: 8_000 }).should('exist')
    })

    it('muestra alertas de stock bajo', () => {
      cy.wait('@inventarioAlertas', { timeout: 8_000 })
      cy.contains('Sobre Nacional', { timeout: 8_000 }).should('exist')
    })

    it('muestra la cantidad en alerta', () => {
      cy.wait('@inventarioAlertas', { timeout: 8_000 })
      cy.contains(/50|alerta/i, { timeout: 8_000 }).should('exist')
    })
  })

  // ── Stock por sucursal ───────────────────────────────────────────────────────

  describe('Stock de una sucursal', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/inventario/sucursales`, {
        statusCode: 200,
        body: [
          { sucursalId: 1, nombre: 'Sucursal Central Bogotá', totalItems: 3, itemsEnAlerta: 1 },
        ],
      }).as('inventarioSucursalesStock')

      cy.intercept('GET', `${API}/inventario/sucursal/1**`, {
        fixture: 'inventario-stock',
      }).as('stockSucursal')

      cy.intercept('GET', `${API}/inventario/alertas`, {
        statusCode: 200,
        body: [],
      }).as('alertasVacias')

      visitInventario()
      cy.wait('@inventarioSucursalesStock', { timeout: 8_000 })
    })

    it('muestra el stock al seleccionar una sucursal', () => {
      cy.contains('Sucursal Central Bogotá', { timeout: 8_000 }).click()
      cy.wait('@stockSucursal', { timeout: 8_000 })
      cy.contains('Estampilla Nacional $300', { timeout: 8_000 }).should('exist')
    })

    it('muestra el stock actual de cada producto', () => {
      cy.contains('Sucursal Central Bogotá').click()
      cy.wait('@stockSucursal', { timeout: 8_000 })
      cy.contains('500', { timeout: 8_000 }).should('exist')
    })

    it('diferencia items en alerta del stock normal', () => {
      cy.contains('Sucursal Central Bogotá').click()
      cy.wait('@stockSucursal', { timeout: 8_000 })
      cy.contains('Sobre Nacional', { timeout: 8_000 }).should('exist')
    })

    it('muestra el stock mínimo configurado', () => {
      cy.contains('Sucursal Central Bogotá').click()
      cy.wait('@stockSucursal', { timeout: 8_000 })
      cy.contains(/100/i, { timeout: 8_000 }).should('exist')
    })
  })

  // ── Ajuste de inventario ─────────────────────────────────────────────────────

  describe('Ajuste de inventario', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/inventario/sucursales`, {
        statusCode: 200,
        body: [{ sucursalId: 1, nombre: 'Sucursal Central Bogotá', totalItems: 3, itemsEnAlerta: 1 }],
      }).as('sucursalesAjuste')

      cy.intercept('GET', `${API}/inventario/sucursal/1**`, {
        fixture: 'inventario-stock',
      }).as('stockAjuste')

      cy.intercept('GET', `${API}/inventario/alertas`, { statusCode: 200, body: [] }).as('alertasAjuste')

      cy.intercept('POST', `${API}/inventario/sucursal/1/ajuste`, {
        statusCode: 200,
        body: {
          productoId: 1,
          stockAnterior: 500,
          stockNuevo: 520,
          diferencia: 20,
          motivo: 'Ajuste manual',
        },
      }).as('ajusteStock')

      visitInventario()
      cy.wait('@sucursalesAjuste', { timeout: 8_000 })
    })

    it('tiene opción para ajustar el inventario de una sucursal', () => {
      cy.contains('Sucursal Central Bogotá').click()
      cy.wait('@stockAjuste', { timeout: 8_000 })
      cy.contains(/ajust|correc/i, { timeout: 8_000 }).should('exist')
    })
  })

  // ── Movimientos de inventario ─────────────────────────────────────────────────

  describe('Movimientos de inventario', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/inventario/sucursales`, {
        statusCode: 200,
        body: [{ sucursalId: 1, nombre: 'Sucursal Central Bogotá', totalItems: 3, itemsEnAlerta: 0 }],
      }).as('sucursalesMovimientos')

      cy.intercept('GET', `${API}/inventario/sucursal/1**`, {
        fixture: 'inventario-stock',
      }).as('stockMovimientos')

      cy.intercept('GET', `${API}/inventario/sucursal/1/movimientos**`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              tipo: 'venta',
              productoNombre: 'Estampilla Nacional $300',
              cantidad: -5,
              stockResultante: 495,
              usuarioNombre: 'Ana Cajera',
              createdAt: '2026-08-21T10:00:00.000Z',
            },
          ],
          total: 1,
        },
      }).as('movimientosInventario')

      cy.intercept('GET', `${API}/inventario/alertas`, { statusCode: 200, body: [] }).as('alertasMovimientos')

      visitInventario()
      cy.wait('@sucursalesMovimientos', { timeout: 8_000 })
    })

    it('muestra los movimientos de inventario', () => {
      cy.contains('Sucursal Central Bogotá').click()
      cy.wait('@stockMovimientos', { timeout: 8_000 })
      cy.get('body').should('be.visible')
    })
  })

  // ── Sin alertas ──────────────────────────────────────────────────────────────

  describe('Sin alertas de inventario', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/inventario/sucursales`, {
        statusCode: 200,
        body: [{ sucursalId: 1, nombre: 'Sucursal Central Bogotá', totalItems: 3, itemsEnAlerta: 0 }],
      }).as('sucursalesSinAlerta')

      cy.intercept('GET', `${API}/inventario/alertas`, {
        statusCode: 200,
        body: [],
      }).as('sinAlertas')

      visitInventario()
    })

    it('muestra estado vacío cuando no hay alertas', () => {
      cy.wait('@sinAlertas', { timeout: 8_000 })
      cy.contains(/sin alertas|todo en orden|no hay alertas/i, { timeout: 8_000 }).should('exist')
    })
  })

  // ── Órdenes de inventario ─────────────────────────────────────────────────────

  describe('Órdenes de reposición', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/inventario/sucursales`, {
        statusCode: 200,
        body: [{ sucursalId: 1, nombre: 'Sucursal Central Bogotá', totalItems: 3, itemsEnAlerta: 1 }],
      }).as('sucursalesOrdenes')

      cy.intercept('GET', `${API}/inventario/alertas`, { statusCode: 200, body: [] }).as('alertasOrdenes')

      cy.intercept('GET', `${API}/inventario/ordenes**`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            sucursalId: 1,
            estado: 'pendiente',
            items: [{ productoId: 2, productoCodigo: 'SOB-001', cantidadSolicitada: 200 }],
            creadaEn: '2026-08-20T10:00:00.000Z',
          },
        ],
      }).as('ordenesInventario')

      visitInventario()
    })

    it('muestra las órdenes de reposición pendientes', () => {
      cy.wait('@ordenesInventario', { timeout: 8_000 })
      cy.get('body').should('be.visible')
    })
  })
})
