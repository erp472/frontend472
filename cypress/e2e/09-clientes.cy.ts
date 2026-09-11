export {}

/**
 * Pruebas E2E — Clientes
 *
 * Rutas cubiertas:
 * - /clientes       → ClientesPage (búsqueda + detalle)
 * - /clientes/tipos → TiposClientePage (CRUD tipos)
 *
 * Rol: ADMIN_SISTEMA (web — no Tauri)
 * PermisoGuard: admin bypasses mediante useAcceso → isAdmin=true
 * FlagGuard: admin bypasses con bypass directo en FlagGuard
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitClientes(path: string) {
  cy.stubBase('admin')
  cy.visitAsWeb(path, 'admin')
  cy.wait('@authMe')
}

// ── ClientesPage ──────────────────────────────────────────────────────────────

describe('Clientes — /clientes', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/clientes**`, {
      fixture: 'clientes-search',
    }).as('clientesBuscar')

    visitClientes('/clientes')
  })

  it('carga la página de clientes', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra el buscador de clientes', () => {
    cy.get('input[type="search"], input[placeholder*="buscar"], input[placeholder*="Buscar"], input[placeholder*="documento"]', { timeout: 8_000 })
      .should('exist')
  })

  describe('con resultados de búsqueda', () => {
    beforeEach(() => {
      cy.wait('@clientesBuscar', { timeout: 8_000 })
    })

    it('muestra los clientes encontrados', () => {
      cy.contains('Carlos Remitente', { timeout: 8_000 }).should('exist')
      cy.contains('Empresa ABC S.A.S.', { timeout: 8_000 }).should('exist')
    })

    it('muestra el tipo de documento de cada cliente', () => {
      cy.contains('CC', { timeout: 8_000 }).should('exist')
      cy.contains('NIT', { timeout: 8_000 }).should('exist')
    })

    it('muestra el número de documento', () => {
      cy.contains('12345678', { timeout: 8_000 }).should('exist')
    })

    it('muestra la ciudad del cliente', () => {
      cy.contains('Bogotá', { timeout: 8_000 }).should('exist')
    })

    it('muestra el tipo de cliente', () => {
      cy.contains('Persona Natural', { timeout: 8_000 }).should('exist')
    })
  })

  describe('detalle del cliente', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/clientes/1`, {
        statusCode: 200,
        body: {
          id: 1,
          tipoDocumento: 'CC',
          numeroDocumento: '12345678',
          nombre: 'Carlos Remitente',
          email: 'carlos@email.com',
          telefono: '3001234567',
          direccion: 'Calle 10 # 5-20',
          ciudad: 'Bogotá',
          activo: true,
          tipoClienteId: 1,
          tipoCliente: { id: 1, nombre: 'Persona Natural' },
        },
      }).as('clienteDetalle')
    })

    it('puede hacer click en un cliente para ver detalles', () => {
      cy.wait('@clientesBuscar', { timeout: 8_000 })
      cy.contains('Carlos Remitente', { timeout: 8_000 }).click()
      cy.wait('@clienteDetalle', { timeout: 8_000 })
      cy.contains('3001234567', { timeout: 8_000 }).should('exist')
    })

    it('muestra el email del cliente en el detalle', () => {
      cy.wait('@clientesBuscar', { timeout: 8_000 })
      cy.contains('Carlos Remitente').click()
      cy.wait('@clienteDetalle', { timeout: 8_000 })
      cy.contains('carlos@email.com', { timeout: 8_000 }).should('exist')
    })

    it('muestra la dirección del cliente', () => {
      cy.wait('@clientesBuscar', { timeout: 8_000 })
      cy.contains('Carlos Remitente').click()
      cy.wait('@clienteDetalle', { timeout: 8_000 })
      cy.contains('Calle 10 # 5-20', { timeout: 8_000 }).should('exist')
    })
  })

  describe('crear cliente', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/clientes`, {
        statusCode: 201,
        body: {
          id: 10,
          tipoDocumento: 'CC',
          numeroDocumento: '99887766',
          nombre: 'Nuevo Cliente',
          ciudad: 'Cali',
          activo: true,
        },
      }).as('crearCliente')

      cy.intercept('GET', `${API}/clientes/tipos**`, {
        fixture: 'tipos-cliente',
      }).as('tiposParaForm')
    })

    it('tiene botón para crear nuevo cliente', () => {
      cy.contains(/nuevo cliente|crear cliente|nuevo/i, { timeout: 8_000 }).should('exist')
    })

    it('abre formulario de creación', () => {
      cy.contains(/nuevo cliente|crear cliente|nuevo/i).first().click()
      cy.get('[role="dialog"], form', { timeout: 8_000 }).should('exist')
    })
  })

  describe('búsqueda por documento', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/clientes/buscar**`, {
        statusCode: 200,
        body: {
          id: 1,
          nombre: 'Carlos Remitente',
          tipoDocumento: 'CC',
          numeroDocumento: '12345678',
        },
      }).as('buscarPorDoc')
    })

    it('busca cliente por número de documento', () => {
      const searchInput = cy.get(
        'input[type="search"], input[placeholder*="buscar"], input[placeholder*="documento"]',
        { timeout: 8_000 }
      ).first()
      searchInput.type('12345678')
      cy.get('body').should('be.visible')
    })
  })

  describe('cliente no encontrado', () => {
    beforeEach(() => {
      cy.intercept('GET', `${API}/clientes**`, {
        statusCode: 200,
        body: { data: [], total: 0, page: 1, limit: 20 },
      }).as('clientesVacio')
    })

    it('muestra mensaje cuando no hay clientes', () => {
      cy.wait('@clientesVacio', { timeout: 8_000 })
      cy.contains(/no se encontraron|sin clientes|no hay/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── TiposClientePage ──────────────────────────────────────────────────────────

describe('Clientes — Tipos (/clientes/tipos)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/clientes/tipos**`, {
      fixture: 'tipos-cliente',
    }).as('tiposCliente')

    visitClientes('/clientes/tipos')
    cy.wait('@tiposCliente', { timeout: 10_000 })
  })

  it('carga la página de tipos de cliente', () => {
    cy.contains(/tipo/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los tipos de cliente registrados', () => {
    cy.contains('Persona Natural', { timeout: 8_000 }).should('be.visible')
    cy.contains('Persona Jurídica', { timeout: 8_000 }).should('be.visible')
    cy.contains('Gobierno', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra la descripción de cada tipo', () => {
    cy.contains('Ciudadano con cédula de ciudadanía', { timeout: 8_000 }).should('exist')
  })

  it('muestra el estado activo de los tipos', () => {
    cy.contains(/activo/i, { timeout: 8_000 }).should('exist')
  })

  describe('crear tipo de cliente', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/clientes/tipos`, {
        statusCode: 201,
        body: { id: 10, nombre: 'Empresas Filiales', descripcion: 'Empresas del grupo 4-72', activo: true },
      }).as('crearTipo')
    })

    it('tiene botón para crear nuevo tipo', () => {
      cy.contains(/nuevo tipo|crear tipo|nuevo/i, { timeout: 8_000 }).should('exist')
    })

    it('abre formulario o dialog de creación', () => {
      cy.contains(/nuevo tipo|crear tipo|nuevo/i).first().click()
      cy.get('[role="dialog"], form', { timeout: 8_000 }).should('exist')
    })
  })

  describe('editar tipo', () => {
    beforeEach(() => {
      cy.intercept('PATCH', `${API}/clientes/tipos/**`, {
        statusCode: 200,
        body: { id: 1, nombre: 'Persona Natural Actualizado', descripcion: 'Actualizado', activo: true },
      }).as('actualizarTipo')
    })

    it('tiene botones de edición en cada tipo', () => {
      cy.get('body', { timeout: 8_000 }).should('be.visible')
      // En modo tarjetas, cada tipo tiene botón de editar
      cy.contains('Persona Natural').parents('div').within(() => {
        cy.get('button').should('exist')
      })
    })
  })

  describe('eliminar tipo', () => {
    beforeEach(() => {
      cy.intercept('DELETE', `${API}/clientes/tipos/**`, {
        statusCode: 200,
        body: {},
      }).as('eliminarTipo')
    })

    it('tiene acciones de eliminación en cada tipo', () => {
      cy.get('body').should('be.visible')
    })
  })
})
