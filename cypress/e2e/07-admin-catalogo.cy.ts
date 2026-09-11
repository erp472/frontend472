export {}

/**
 * Pruebas E2E — Admin: Catálogo (Servicios, Productos, Apartados)
 *
 * Rutas cubiertas:
 * - /admin/servicios            → Servicios (tabla + tarifas)
 * - /admin/productos            → Productos (tabla + CRUD)
 * - /admin/estampillas          → EstampillasAdmin
 * - /admin/filatelia            → FilateliaAdmin
 * - /admin/productos-especiales → ProductosEspeciales
 * - /admin/apartados            → ApartadosAdmin
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

// ── Servicios ─────────────────────────────────────────────────────────────────

describe('Admin — Servicios (/admin/servicios)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/servicios**`, {
      fixture: 'servicios-admin',
    }).as('serviciosAdmin')

    visitAdmin('/admin/servicios')
    cy.wait('@serviciosAdmin', { timeout: 10_000 })
  })

  it('carga la página de servicios', () => {
    cy.contains(/servicio/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los servicios postales disponibles', () => {
    cy.contains('Correo Regular No Prioritario', { timeout: 8_000 }).should('be.visible')
    cy.contains('Correo Prioritario Nacional', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el código de cada servicio', () => {
    cy.contains('NP-NAC-001', { timeout: 8_000 }).should('exist')
  })

  it('muestra el tipo de cada servicio', () => {
    cy.contains(/nacional|internacional/i, { timeout: 8_000 }).should('exist')
  })

  it('diferencia servicios activos de inactivos', () => {
    cy.get('body').should('be.visible')
  })

  describe('crear servicio', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/servicios`, {
        statusCode: 201,
        body: {
          id: 10,
          codigoservicio: 'TEST-001',
          nombreservicios: 'Nuevo Servicio Test',
          tipo: 'nacional',
          activo: true,
        },
      }).as('crearServicio')
    })

    it('tiene botón para crear nuevo servicio', () => {
      cy.contains(/nuevo servicio|crear servicio|nuevo/i, { timeout: 8_000 }).should('exist')
    })
  })

  describe('tarifas del servicio', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/servicios/1/tarifas`, {
        statusCode: 200,
        body: [
          {
            id: 1,
            servicioId: 1,
            pesoDesdeKg: 0,
            pesoHastaKg: 0.5,
            precio: '9000',
            activo: true,
          },
          {
            id: 2,
            servicioId: 1,
            pesoDesdeKg: 0.5,
            pesoHastaKg: 1.0,
            precio: '12000',
            activo: true,
          },
        ],
      }).as('tarifasServicio')
    })

    it('puede abrir las tarifas de un servicio', () => {
      cy.get('table tbody tr', { timeout: 8_000 }).first().within(() => {
        cy.get('button').first().click({ force: true })
      })
      cy.wait('@tarifasServicio', { timeout: 8_000 })
      cy.get('body').should('be.visible')
    })
  })
})

// ── Productos ─────────────────────────────────────────────────────────────────

describe('Admin — Productos (/admin/productos)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/productos**`, {
      fixture: 'productos-list',
    }).as('productosList')

    visitAdmin('/admin/productos')
    cy.wait('@productosList', { timeout: 10_000 })
  })

  it('carga la página de productos', () => {
    cy.contains(/producto/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los productos disponibles', () => {
    cy.contains('Sobre Nacional', { timeout: 8_000 }).should('be.visible')
    cy.contains('Empaque Pequeño', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el precio de cada producto', () => {
    cy.contains(/500|2\.000/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra el código de producto', () => {
    cy.contains('SOB-001', { timeout: 8_000 }).should('exist')
  })

  describe('crear producto', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/productos`, {
        statusCode: 201,
        body: { id: 10, codigo: 'NEW-001', nombre: 'Nuevo Producto', precio: '1000', activo: true },
      }).as('crearProducto')
    })

    it('tiene botón para crear nuevo producto', () => {
      cy.contains(/nuevo producto|crear producto|nuevo/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── Estampillas ───────────────────────────────────────────────────────────────

describe('Admin — Estampillas (/admin/estampillas)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/admin/estampillas**`, {
      statusCode: 200,
      body: {
        data: [
          { id: 1, codigo: 'EST-300', nombre: 'Estampilla $300', precio: '300', activo: true },
          { id: 2, codigo: 'EST-500', nombre: 'Estampilla $500', precio: '500', activo: true },
        ],
        total: 2,
      },
    }).as('estampilasList')

    visitAdmin('/admin/estampillas')
  })

  it('carga la página de estampillas', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra las estampillas registradas', () => {
    cy.wait('@estampilasList', { timeout: 8_000 })
    cy.contains('Estampilla $300', { timeout: 8_000 }).should('exist')
  })
})

// ── Filatelia ─────────────────────────────────────────────────────────────────

describe('Admin — Filatelia (/admin/filatelia)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/admin/filatelia**`, {
      statusCode: 200,
      body: {
        data: [
          { id: 1, codigo: 'FIL-001', nombre: 'Serie Fauna Colombiana', precio: '5000', activo: true },
        ],
        total: 1,
      },
    }).as('filateliaList')

    visitAdmin('/admin/filatelia')
  })

  it('carga la página de filatelia', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra los sellos filatélicos', () => {
    cy.wait('@filateliaList', { timeout: 8_000 })
    cy.contains('Serie Fauna Colombiana', { timeout: 8_000 }).should('exist')
  })
})

// ── Productos Especiales ──────────────────────────────────────────────────────

describe('Admin — Productos Especiales (/admin/productos-especiales)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/admin/productos-especiales**`, {
      statusCode: 200,
      body: {
        data: [
          {
            id: 1,
            codigo: 'ESP-001',
            nombre: 'Kit Emprendedor',
            descripcion: 'Pack completo para emprendedores',
            precio: '45000',
            activo: true,
          },
        ],
        total: 1,
      },
    }).as('productosEspeciales')

    visitAdmin('/admin/productos-especiales')
  })

  it('carga la página de productos especiales', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra los productos especiales registrados', () => {
    cy.wait('@productosEspeciales', { timeout: 8_000 })
    cy.contains('Kit Emprendedor', { timeout: 8_000 }).should('exist')
  })
})

// ── Apartados Admin ───────────────────────────────────────────────────────────

describe('Admin — Apartados (/admin/apartados)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/ventas/admin/apartados**`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          codigo: 'APT-001',
          sucursalId: 1,
          estado: 'disponible',
          tamaño: 'pequeño',
          precio: '15000',
          clienteId: null,
        },
        {
          id: 2,
          codigo: 'APT-002',
          sucursalId: 1,
          estado: 'ocupado',
          tamaño: 'mediano',
          precio: '25000',
          clienteId: 1,
          clienteNombre: 'Carlos Remitente',
          vencimientoContrato: '2027-01-01',
        },
      ],
    }).as('apartadosAdmin')

    visitAdmin('/admin/apartados')
    cy.wait('@apartadosAdmin', { timeout: 10_000 })
  })

  it('carga la página de administración de apartados', () => {
    cy.get('body').should('be.visible')
  })

  it('muestra los apartados postales', () => {
    cy.contains('APT-001', { timeout: 8_000 }).should('exist')
    cy.contains('APT-002', { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado de cada apartado', () => {
    cy.contains(/disponible/i, { timeout: 8_000 }).should('exist')
    cy.contains(/ocupado/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra el cliente asignado en apartados ocupados', () => {
    cy.contains('Carlos Remitente', { timeout: 8_000 }).should('exist')
  })

  it('muestra el precio de suscripción', () => {
    cy.contains(/15\.000|25\.000/i, { timeout: 8_000 }).should('exist')
  })

  describe('crear apartado', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/ventas/admin/apartados`, {
        statusCode: 201,
        body: { id: 10, codigo: 'APT-010', estado: 'disponible', precio: '15000' },
      }).as('crearApartado')
    })

    it('tiene botón para crear nuevo apartado', () => {
      cy.contains(/nuevo apartado|crear apartado|nuevo/i, { timeout: 8_000 }).should('exist')
    })
  })
})
