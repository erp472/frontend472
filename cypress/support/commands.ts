// ── Tipos de usuario para pruebas ─────────────────────────────────────────────

export type TestRole = 'cajero' | 'supervisor' | 'admin' | 'tesoreria' | 'inventarios'

const TEST_USERS: Record<TestRole, object> = {
  cajero: {
    id: '1',
    nombre: 'Ana Cajera',
    email: 'cajera@4-72.com.co',
    rol: 'CAJERO',
    sucursal_id: 1,
    activo: true,
    ultimoLogin: '2026-08-21T08:00:00.000Z',
    permisos: ['ventas:consultar', 'ventas:operar'],
  },
  supervisor: {
    id: '2',
    nombre: 'Pedro Supervisor',
    email: 'supervisor@4-72.com.co',
    rol: 'SUPERVISOR_REGIONAL',
    sucursal_id: 1,
    activo: true,
    ultimoLogin: '2026-08-21T08:00:00.000Z',
    permisos: ['caja:consultar', 'caja:operar', 'ventas:consultar', 'ventas:operar'],
  },
  admin: {
    id: '3',
    nombre: 'Admin Sistema',
    email: 'admin@4-72.com.co',
    rol: 'ADMIN_SISTEMA',
    sucursal_id: 1,
    activo: true,
    ultimoLogin: '2026-08-21T08:00:00.000Z',
    permisos: [],
  },
  tesoreria: {
    id: '4',
    nombre: 'Teresa Tesorera',
    email: 'tesoreria@4-72.com.co',
    rol: 'TESORERIA',
    sucursal_id: 1,
    activo: true,
    ultimoLogin: '2026-08-21T08:00:00.000Z',
    permisos: ['caja:consultar', 'caja:operar'],
  },
  inventarios: {
    id: '5',
    nombre: 'Ingrid Inventarios',
    email: 'inventarios@4-72.com.co',
    rol: 'INVENTARIOS',
    sucursal_id: 1,
    activo: true,
    ultimoLogin: '2026-08-21T08:00:00.000Z',
    permisos: ['inventario:consultar', 'inventario:operar'],
  },
}

// ── Declaración de tipos para Cypress ─────────────────────────────────────────

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Visita una ruta autenticada como el rol dado.
       * Inyecta el token en sessionStorage y simula el entorno Tauri.
       * Usar para roles DESKTOP_ONLY: CAJERO, SUPERVISOR_REGIONAL.
       */
      visitAs(path: string, role: TestRole): Chainable<void>

      /**
       * Igual que visitAs pero sin simular Tauri.
       * Usar para roles WEB_ONLY: ADMIN_SISTEMA, ADMIN_NACIONAL, INVENTARIOS, etc.
       */
      visitAsWeb(path: string, role: TestRole): Chainable<void>

      /** Stub de APIs comunes: auth/me, feature-flags, status-punto */
      stubBase(role?: TestRole): Chainable<void>

      /** Stub de todos los endpoints de ventas necesarios para CarritoVenta */
      stubVentas(): Chainable<void>

      /** Stub de todos los endpoints de envíos masivos */
      stubEnviosMasivos(options?: { lotes?: object; lote?: object }): Chainable<void>

      /** Stub de endpoints de cajas: saldo, movimientos, status */
      stubCajas(opts?: { sesionId?: number; sucursalId?: number }): Chainable<void>

      /**
       * Autentica en el Lab vía POST /lab/login e inyecta la sesión en sessionStorage.
       * No requiere JWT del sistema principal ni simulación de Tauri.
       */
      labLogin(usuario?: string, contraseña?: string): Chainable<void>
    }
  }
}

// ── Implementación de comandos ─────────────────────────────────────────────────

Cypress.Commands.add('visitAs', (path: string, role: TestRole) => {
  const user = TEST_USERS[role]
  const sessionData = JSON.stringify({
    state: { token: `test-token-${role}`, lastActivity: Date.now() },
    version: 0,
  })

  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: user,
  }).as('authMe')

  cy.visit(path, {
    onBeforeLoad(win) {
      win.sessionStorage.setItem('session', sessionData)
      Object.defineProperty(win, '__TAURI_INTERNALS__', {
        value: {},
        writable: true,
        configurable: true,
      })
    },
  })
})

Cypress.Commands.add('visitAsWeb', (path: string, role: TestRole) => {
  const user = TEST_USERS[role]
  const sessionData = JSON.stringify({
    state: { token: `test-token-${role}`, lastActivity: Date.now() },
    version: 0,
  })

  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: user,
  }).as('authMe')

  cy.visit(path, {
    onBeforeLoad(win) {
      // Solo inyectar sesión, sin __TAURI_INTERNALS__ (rol web-only)
      win.sessionStorage.setItem('session', sessionData)
    },
  })
})

Cypress.Commands.add('stubBase', (role: TestRole = 'cajero') => {
  const user = TEST_USERS[role]
  const apiUrl = Cypress.env('API_URL')

  cy.intercept('GET', `${apiUrl}/auth/me`, {
    statusCode: 200,
    body: user,
  }).as('authMe')

  cy.intercept('GET', `${apiUrl}/feature-flags/activos**`, {
    fixture: 'feature-flags',
  }).as('featureFlags')

  cy.intercept('GET', `${apiUrl}/cajas/sucursal/1/status`, {
    fixture: 'status-punto',
  }).as('statusPunto')
})

Cypress.Commands.add('stubVentas', () => {
  const apiUrl = Cypress.env('API_URL')

  cy.intercept('GET', `${apiUrl}/cajas/auxiliares/10`, {
    fixture: 'caja-auxiliar',
  }).as('cajaAuxiliar')

  cy.intercept('GET', `${apiUrl}/ventas/servicios-postales**`, {
    fixture: 'servicios-postales',
  }).as('serviciosPostales')

  cy.intercept('GET', `${apiUrl}/ventas/punto/10/resumen`, {
    fixture: 'resumen-turno',
  }).as('resumenTurno')

  cy.intercept('GET', `${apiUrl}/ventas/punto/10/turno**`, {
    statusCode: 200,
    body: [],
  }).as('turno')

  cy.intercept('GET', `${apiUrl}/ventas/catalogo/productos**`, {
    statusCode: 200,
    body: [],
  }).as('catalogoProductos')

  cy.intercept('GET', `${apiUrl}/geo/paises`, {
    statusCode: 200,
    body: [
      { id: 1, nombre: 'Colombia', iso2: 'CO' },
      { id: 2, nombre: 'Estados Unidos', iso2: 'US' },
      { id: 3, nombre: 'México', iso2: 'MX' },
    ],
  }).as('paises')

  cy.intercept('GET', `${apiUrl}/ventas/clientes/buscar**`, {
    statusCode: 404,
    body: { message: 'Cliente no encontrado' },
  }).as('buscarCliente')

  cy.intercept('GET', `${apiUrl}/ventas/apartados/disponibles**`, {
    statusCode: 200,
    body: { totalDisponibles: 0, lista: [] },
  }).as('apartados')
})

Cypress.Commands.add(
  'stubEnviosMasivos',
  (options: { lotes?: object; lote?: object } = {}) => {
    const apiUrl = Cypress.env('API_URL')

    cy.intercept('GET', `${apiUrl}/envios-masivos**`, (req) => {
      // Diferenciar entre lista y detalle: /envios-masivos vs /envios-masivos/1
      if (/\/envios-masivos\/\d+$/.test(req.url)) {
        req.reply({ statusCode: 200, body: options.lote ?? { fixture: 'lote-masivo' } })
      } else {
        req.reply({ statusCode: 200, body: options.lotes ?? [] })
      }
    }).as('enviosMasivos')

    cy.intercept('POST', `${apiUrl}/envios-masivos`, {
      fixture: 'lote-masivo-vacio',
    }).as('crearLote')

    cy.intercept('POST', `${apiUrl}/envios-masivos/*/items`, {
      statusCode: 201,
      body: {
        item: {
          id: 10,
          fila: 2,
          envioId: null,
          remitente: null,
          destinatario: {
            nombre: 'Carlos Nuevo',
            documento: null,
            email: null,
            telefono: null,
            direccion: null,
            ciudad: 'Cali',
            pais: 'CO',
            codigoPostal: null,
          },
          calculo: {
            pesoFisicoKg: 1.0,
            pesoTarificadoKg: 1.0,
            valorServicio: 12000,
            valorEstampillas: 0,
            valorTotal: 13500,
          },
          contenido: null,
          observaciones: null,
        },
        cotizacion: { pesoTarificado: 1.0, valorServicio: 12000 },
      },
    }).as('agregarItem')

    cy.intercept('POST', `${apiUrl}/envios-masivos/*/items/bulk`, {
      statusCode: 201,
      body: { agregados: 1, errores: [] },
    }).as('agregarItemsBulk')

    cy.intercept('PATCH', `${apiUrl}/envios-masivos/*/confirmar**`, {
      statusCode: 200,
      body: {
        loteId: 1,
        ventaId: 1,
        enviosCreados: 1,
        totalCarrito: 10500,
        guias: [{ fila: 1, numeroGuia: 'RR000000001CO', envioId: 501 }],
      },
    }).as('confirmarLote')

    cy.intercept('DELETE', `${apiUrl}/envios-masivos/*/items/*`, {
      statusCode: 200,
      body: {},
    }).as('eliminarItem')

    cy.intercept('DELETE', `${apiUrl}/envios-masivos/*`, {
      statusCode: 200,
      body: {},
    }).as('eliminarLote')

    cy.intercept('POST', `${apiUrl}/envios-masivos/*/csv`, {
      statusCode: 200,
      body: { importados: 2, errores: [] },
    }).as('importarCsv')
  },
)

Cypress.Commands.add('stubCajas', (opts: { sesionId?: number; sucursalId?: number } = {}) => {
  const apiUrl    = Cypress.env('API_URL') as string
  const sesionId  = opts.sesionId  ?? 1
  const sucursalId = opts.sucursalId ?? 1

  cy.intercept('GET', `${apiUrl}/cajas/sucursal/${sucursalId}/status`, {
    fixture: 'status-punto',
  }).as('statusPunto')

  cy.intercept('GET', `${apiUrl}/cajas/punto/${sesionId}/saldo`, {
    statusCode: 200,
    body: {
      sesionId,
      saldoActual: '150000',
      saldoEsperado: '160000',
      diferencia: '-10000',
      ingresosTotales: '100000',
      egresosTotales: '50000',
      baseAsignada: '100000',
      cajeroNombre: 'Ana Cajera',
      abiertaEn: '2026-08-21T08:00:00.000Z',
    },
  }).as('saldoSesion')

  cy.intercept('GET', `${apiUrl}/cajas/punto/${sesionId}/movimientos`, {
    statusCode: 200,
    body: [
      {
        id: 1,
        tipo: 'venta_servicio',
        monto: '10500',
        medioPago: 'efectivo',
        descripcion: 'Envío postal nacional',
        createdAt: '2026-08-21T09:00:00.000Z',
      },
      {
        id: 2,
        tipo: 'pago_giro',
        monto: '50000',
        medioPago: 'efectivo',
        descripcion: 'Pago giro nacional',
        createdAt: '2026-08-21T09:30:00.000Z',
      },
    ],
  }).as('movimientos')

  cy.intercept('GET', `${apiUrl}/cajas/sucursal/${sucursalId}/diferencias-pendientes`, {
    statusCode: 200,
    body: [],
  }).as('diferenciasPendientes')

  cy.intercept('GET', `${apiUrl}/cajas/sucursal/${sucursalId}/diferencias**`, {
    statusCode: 200,
    body: [],
  }).as('diferenciasRegistro')

  cy.intercept('GET', `${apiUrl}/sacas**`, {
    statusCode: 200,
    body: [],
  }).as('sacas')

  cy.intercept('GET', `${apiUrl}/cajas/alertas/cierre-automatico**`, {
    statusCode: 200,
    body: [],
  }).as('alertasCierre')

  cy.intercept('GET', `${apiUrl}/cajas/auxiliares/${sesionId}/alertas`, {
    statusCode: 200,
    body: [],
  }).as('alertasAuxiliar')

  cy.intercept('GET', `${apiUrl}/cajas/consolidado-comercio**`, {
    statusCode: 200,
    body: {
      comercioId: 1,
      nombreComercio: 'Sucursal Central',
      totalCajas: 2,
      saldoTotal: '450000',
      ingresosTotales: '200000',
      egresosTotales: '50000',
      sesiones: [],
    },
  }).as('consolidadoComercio')

  cy.intercept('GET', `${apiUrl}/cajas/panel-admin`, {
    statusCode: 200,
    body: [],
  }).as('panelAdmin')
})

// ── Lab login ─────────────────────────────────────────────────────────────────

Cypress.Commands.add('labLogin', (usuario = 'lab_admin', contraseña = 'lab472dev') => {
  cy.request({
    method:           'POST',
    url:              `${Cypress.env('API_URL')}/lab/login`,
    body:             { usuario, contraseña },
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status !== 200) {
      throw new Error(`Lab login failed ${res.status}: ${JSON.stringify(res.body)}`)
    }
    const stored = JSON.stringify({ state: { session: res.body }, version: 0 })
    cy.window().then((win) => win.sessionStorage.setItem('lab-session', stored))
  })
})

export {}
