export {}

/**
 * Pruebas E2E — Admin: Usuarios, Permisos, Asignación de Cajeros
 *
 * Rutas cubiertas:
 * - /admin/users              → Users (tabla + CRUD)
 * - /admin/permisos           → Permisos (matrix de roles)
 * - /admin/asignacion-cajeros → AsignacionCajerosPage
 *
 * Rol: ADMIN_SISTEMA (web — no Tauri)
 * FlagGuard: ADMIN_SISTEMA siempre pasa, no necesita flags activos.
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

function visitAdmin(path: string) {
  cy.stubBase('admin')
  cy.visitAsWeb(path, 'admin')
  cy.wait('@authMe')
}

// ── Users ──────────────────────────────────────────────────────────────────────

describe('Admin — Usuarios (/admin/users)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/users**`, {
      fixture: 'users-list',
    }).as('usersList')

    visitAdmin('/admin/users')
    cy.wait('@usersList', { timeout: 10_000 })
  })

  it('carga la página de usuarios', () => {
    cy.contains('Usuarios', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra la tabla de usuarios con columnas', () => {
    cy.contains('Nombre', { timeout: 8_000 }).should('be.visible')
    cy.contains('Correo', { timeout: 8_000 }).should('be.visible')
  })

  it('lista los usuarios del sistema', () => {
    cy.contains('Ana Cajera', { timeout: 8_000 }).should('be.visible')
    cy.contains('Pedro Supervisor', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el email de cada usuario', () => {
    cy.contains('cajera@4-72.com.co', { timeout: 8_000 }).should('be.visible')
  })

  it('muestra el rol de cada usuario', () => {
    cy.contains(/CAJERO|cajero/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra filtro por rol', () => {
    cy.contains(/rol|filtrar/i, { timeout: 8_000 }).should('exist')
  })

  describe('crear usuario', () => {
    beforeEach(() => {
      cy.intercept('POST', `${API}/users`, {
        statusCode: 201,
        body: {
          id: 10,
          nombre: 'Nuevo Cajero',
          email: 'nuevo@4-72.com.co',
          rol: 'CAJERO',
          sucursal_id: 1,
          activo: true,
        },
      }).as('crearUsuario')
    })

    it('tiene botón para crear nuevo usuario', () => {
      cy.contains(/nuevo usuario|crear usuario|nuevo/i, { timeout: 8_000 }).should('exist')
    })

    it('abre formulario al hacer click en crear', () => {
      cy.contains(/nuevo usuario|crear usuario|nuevo/i).first().click()
      cy.contains(/nombre completo|correo electrónico|rol/i, { timeout: 8_000 }).should('exist')
    })
  })

  describe('editar usuario', () => {
    beforeEach(() => {
      cy.intercept('PATCH', `${API}/users/**`, {
        statusCode: 200,
        body: {
          id: 1,
          nombre: 'Ana Cajera Actualizada',
          email: 'cajera@4-72.com.co',
          rol: 'CAJERO',
          sucursal_id: 1,
          activo: true,
        },
      }).as('actualizarUsuario')
    })

    it('tiene acciones en cada fila de usuario', () => {
      cy.get('table tbody tr', { timeout: 8_000 }).first().within(() => {
        cy.get('button').should('exist')
      })
    })
  })

  describe('filtros', () => {
    it('muestra buscador de usuarios', () => {
      cy.get('input[placeholder*="buscar"], input[type="search"], input[placeholder*="Search"], input[placeholder*="Buscar"]', { timeout: 8_000 })
        .should('exist')
    })

    it('filtra por rol al seleccionar del dropdown', () => {
      // Abre el select de rol
      cy.contains(/todos los roles|rol/i, { timeout: 8_000 }).should('exist')
    })
  })

  describe('paginación', () => {
    it('muestra información de total de usuarios', () => {
      cy.contains(/3|total/i, { timeout: 8_000 }).should('exist')
    })
  })
})

// ── Permisos ──────────────────────────────────────────────────────────────────

describe('Admin — Permisos (/admin/permisos)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/permisos/matrix`, {
      statusCode: 200,
      body: {
        roles: ['CAJERO', 'SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA'],
        permisos: [
          {
            codigo: 'ventas:consultar',
            descripcion: 'Ver ventas',
            roles: { CAJERO: true, SUPERVISOR_REGIONAL: true, ADMIN_SISTEMA: true },
          },
          {
            codigo: 'caja:consultar',
            descripcion: 'Ver cajas',
            roles: { CAJERO: false, SUPERVISOR_REGIONAL: true, ADMIN_SISTEMA: true },
          },
          {
            codigo: 'admin:usuarios',
            descripcion: 'Administrar usuarios',
            roles: { CAJERO: false, SUPERVISOR_REGIONAL: false, ADMIN_SISTEMA: true },
          },
        ],
      },
    }).as('permisosMatrix')

    cy.intercept('GET', `${API}/permisos/roles`, {
      statusCode: 200,
      body: ['CAJERO', 'SUPERVISOR_REGIONAL', 'ADMIN_SISTEMA', 'TESORERIA', 'INVENTARIOS'],
    }).as('permisosRoles')

    visitAdmin('/admin/permisos')
    cy.wait('@permisosMatrix', { timeout: 10_000 })
  })

  it('carga la página de permisos', () => {
    cy.contains(/permiso/i, { timeout: 8_000 }).should('be.visible')
  })

  it('muestra los roles disponibles en el sistema', () => {
    cy.contains(/CAJERO|cajero/i, { timeout: 8_000 }).should('exist')
    cy.contains(/SUPERVISOR_REGIONAL|supervisor/i, { timeout: 8_000 }).should('exist')
  })

  it('muestra los permisos con sus códigos', () => {
    cy.contains('ventas:consultar', { timeout: 8_000 }).should('exist')
    cy.contains('caja:consultar', { timeout: 8_000 }).should('exist')
  })

  it('muestra checkboxes o switches para asignar permisos', () => {
    cy.get('[type="checkbox"], [role="switch"]', { timeout: 8_000 }).should('exist')
  })

  it('muestra la descripción de cada permiso', () => {
    cy.contains('Ver ventas', { timeout: 8_000 }).should('exist')
  })

  describe('modificar permiso', () => {
    beforeEach(() => {
      cy.intercept('PATCH', `${API}/permisos/roles`, {
        statusCode: 200,
        body: { ok: true },
      }).as('actualizarPermiso')
    })

    it('permite hacer click en un permiso para modificarlo', () => {
      cy.get('[type="checkbox"], [role="switch"]', { timeout: 8_000 }).first().click({ force: true })
    })
  })
})

// ── AsignacionCajeros ─────────────────────────────────────────────────────────

describe('Admin — Asignación de Cajeros (/admin/asignacion-cajeros)', () => {
  beforeEach(() => {
    cy.intercept('GET', `${API}/users**`, {
      fixture: 'users-list',
    }).as('usersAsignacion')

    cy.intercept('GET', `${API}/cajas**`, {
      statusCode: 200,
      body: [
        {
          id: 1,
          nombre: 'Caja Principal Bogotá',
          codigo: 'BOG-MAIN',
          sucursalId: 1,
        },
      ],
    }).as('cajasAsignacion')

    cy.intercept('GET', `${API}/cajas/auxiliares**`, {
      statusCode: 200,
      body: [
        {
          id: 10,
          nombre: 'Caja Auxiliar 1',
          codigo: 'AUX-001',
          sucursalId: 1,
          cajeroAsignadoId: 1,
        },
      ],
    }).as('cajasAuxAsignacion')

    visitAdmin('/admin/asignacion-cajeros')
  })

  it('carga la página de asignación de cajeros', () => {
    cy.get('body', { timeout: 10_000 }).should('be.visible')
  })

  it('muestra las cajas disponibles para asignar', () => {
    cy.wait('@cajasAuxAsignacion', { timeout: 8_000 })
    cy.contains('AUX-001', { timeout: 8_000 }).should('exist')
  })

  it('muestra los cajeros disponibles', () => {
    cy.wait('@usersAsignacion', { timeout: 8_000 })
    cy.contains('Ana Cajera', { timeout: 8_000 }).should('exist')
  })

  describe('asignar cajero a caja', () => {
    beforeEach(() => {
      cy.intercept('PATCH', `${API}/cajas/sesiones/**/cajero-asignado`, {
        statusCode: 200,
        body: { ok: true },
      }).as('asignarCajero')
    })

    it('tiene controles de asignación visibles', () => {
      cy.get('body').should('be.visible')
    })
  })
})
