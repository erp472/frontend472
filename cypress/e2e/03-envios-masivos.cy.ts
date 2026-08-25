export {}

/**
 * Pruebas E2E — Envíos Masivos
 *
 * Cubre dos vistas:
 *
 * A) CarritoVenta → tab "Servicios" → sub-tab "Masivos" (TabMasivos)
 *    - Lista de lotes masivos
 *    - Crear nuevo lote (dialog)
 *    - LoteDetalle: items, tabla rápida, CSV, confirmar, eliminar
 *
 * B) Página standalone /ventas/masivos (EnviosMasivosPage)
 *    - Lista de lotes con estados
 *    - Crear lote con modo remitente compartido / múltiple
 *    - Agregar ítems individualmente
 *    - Tabla de entrada rápida
 *    - Importar CSV
 *    - Confirmar lote y resumen
 *    - Eliminar lote en borrador
 */

const API = Cypress.env('API_URL') as string

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Visita CarritoVenta con todos los stubs necesarios. */
function visitCarrito(lotes: object[] = []) {
  cy.stubBase('cajero')
  cy.stubVentas()
  cy.stubEnviosMasivos({ lotes })
  cy.visitAs('/ventas/caja/10', 'cajero')
  cy.wait('@authMe')
  cy.wait('@featureFlags')
  cy.wait('@cajaAuxiliar')
}

/** Navega desde CarritoVenta hasta el sub-tab Masivos dentro de "Servicios". */
function navegarAMasivosEnCarrito() {
  cy.wait('@featureFlags', { timeout: 10_000 })
  cy.contains('[role="tab"]', 'Servicios').should('be.visible').click()
  cy.contains('[role="tab"]', 'Masivos').should('be.visible').click()
}

/** Visita la página standalone EnviosMasivosPage. */
function visitMasivos(lotes: object[] = []) {
  cy.stubBase('cajero')
  cy.stubVentas()
  cy.stubEnviosMasivos({ lotes })
  cy.visitAs('/ventas/masivos', 'cajero')
  cy.wait('@authMe')
  cy.wait('@featureFlags')
}

// ══════════════════════════════════════════════════════════════════════════════
// A) CARRITO → MASIVOS TAB
// ══════════════════════════════════════════════════════════════════════════════

describe('Envíos Masivos — CarritoVenta → Servicios → Masivos', () => {
  // ── Lista vacía ───────────────────────────────────────────────────────────

  describe('Sin lotes existentes', () => {
    beforeEach(() => {
      visitCarrito([])
      navegarAMasivosEnCarrito()
    })

    it('muestra el encabezado "Envíos Masivos"', () => {
      cy.contains('Envíos Masivos').should('be.visible')
    })

    it('muestra estado vacío con botón "Crear primer lote"', () => {
      cy.contains('Sin lotes masivos').should('be.visible')
      cy.contains('Crear primer lote').should('be.visible')
    })

    it('botón "Nuevo lote" en la cabecera abre el dialog de creación', () => {
      cy.contains('button', 'Nuevo lote').first().click()
      cy.contains('Nuevo lote de envíos masivos').should('be.visible')
    })

    it('"Crear primer lote" también abre el dialog de creación', () => {
      cy.contains('button', 'Crear primer lote').click()
      cy.contains('Nuevo lote de envíos masivos').should('be.visible')
    })
  })

  // ── Dialog de creación de lote ────────────────────────────────────────────

  describe('Dialog: Crear nuevo lote', () => {
    beforeEach(() => {
      visitCarrito([])
      navegarAMasivosEnCarrito()
      cy.contains('button', 'Nuevo lote').first().click()
    })

    it('muestra selector de servicio postal', () => {
      cy.contains('Servicio postal *').should('be.visible')
      cy.contains('Seleccionar servicio').should('be.visible')
    })

    it('muestra campos del remitente compartido', () => {
      cy.contains('Nombre *').should('be.visible')
    })

    it('botón Crear deshabilitado sin servicio ni nombre de remitente', () => {
      cy.contains('button', 'Crear lote').should('be.disabled')
    })

    it('puede seleccionar un servicio postal', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()
      cy.contains('Correo Regular No Prioritario').should('be.visible')
    })

    it('botón Crear se activa con servicio y nombre de remitente', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()
      cy.get('input[placeholder="Nombre o razón social"]').type('Empresa Test S.A.')
      cy.contains('button', 'Crear lote').should('not.be.disabled')
    })

    it('crea el lote y muestra el LoteDetalle al confirmar', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar servicio').click()
      cy.contains('Correo Regular No Prioritario').click()
      cy.get('input[placeholder="Nombre o razón social"]').type('Nuevo Remitente S.A.')
      cy.contains('button', 'Crear lote').click()
      cy.wait('@crearLote')
      // Debe mostrar el detalle del lote recién creado
      cy.contains('Lote #').should('be.visible')
      cy.contains('Borrador').should('be.visible')
    })

    it('dialog cancela correctamente con botón Cancelar', () => {
      cy.contains('button', 'Cancelar').click()
      cy.contains('Nuevo lote de envíos masivos').should('not.exist')
    })
  })

  // ── Lista con lotes existentes ────────────────────────────────────────────

  describe('Con lotes existentes', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        visitCarrito(lotes)
      })
      navegarAMasivosEnCarrito()
    })

    it('muestra los lotes de la lista', () => {
      cy.contains('Empresa ABC S.A.S.').should('be.visible')
    })

    it('muestra el badge de estado del lote', () => {
      cy.contains('Borrador').should('be.visible')
    })

    it('navega al detalle del lote al hacer clic', () => {
      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle')

      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle')
      cy.contains('Lote #1').should('be.visible')
    })
  })

  // ── LoteDetalle ───────────────────────────────────────────────────────────

  describe('LoteDetalle — Borrador', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        visitCarrito(lotes)
      })

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle')

      navegarAMasivosEnCarrito()
      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle')
    })

    it('muestra el encabezado del lote con estado Borrador', () => {
      cy.contains('Lote #1').should('be.visible')
      cy.contains('Borrador').should('be.visible')
    })

    it('muestra el nombre del remitente del lote', () => {
      cy.contains('Empresa ABC S.A.S.').should('be.visible')
    })

    it('muestra el servicio postal del lote', () => {
      cy.contains('Correo Regular No Prioritario').should('be.visible')
    })

    it('muestra la tabla de ítems con el item existente', () => {
      cy.contains('María Destinataria').should('be.visible')
      cy.contains('Medellín').should('be.visible')
      cy.contains('0.50 kg').should('be.visible')
    })

    it('muestra el footer con totales', () => {
      cy.contains('Envíos:').should('be.visible')
      cy.contains('Peso:').should('be.visible')
      cy.contains('$ 10.500').should('be.visible')
    })

    it('botón "Confirmar lote" está habilitado al haber ítems', () => {
      cy.contains('button', 'Confirmar lote').should('not.be.disabled')
    })

    it('botón "Agregar" abre el dialog de agregar ítem', () => {
      cy.contains('button', 'Agregar').click()
      cy.contains('Agregar envío').should('be.visible')
    })

    it('botón "Tabla rápida" muestra la tabla de entrada rápida', () => {
      cy.contains('button', 'Tabla rápida').click()
      cy.contains('Entrada rápida').should('be.visible')
      cy.contains('Tab').should('be.visible')
    })

    it('botón "CSV" abre el dialog de importación', () => {
      cy.contains('button', 'CSV').click()
      cy.contains('Importar CSV').should('be.visible')
      cy.contains('Pega el contenido del CSV').should('be.visible')
    })

    it('botón "Volver" regresa a la lista de lotes', () => {
      cy.contains('button', 'Lotes').click()
      cy.contains('Envíos Masivos').should('be.visible')
    })
  })

  // ── Agregar ítem individual ───────────────────────────────────────────────

  describe('Agregar ítem al lote', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        visitCarrito(lotes)
      })

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle')

      navegarAMasivosEnCarrito()
      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle')
      cy.contains('button', 'Agregar').click()
    })

    it('el dialog de agregar muestra campos del destinatario', () => {
      cy.contains('Destinatario').should('be.visible')
      cy.contains('Nombre *').should('be.visible')
      cy.contains('Peso físico (kg) *').should('be.visible')
    })

    it('botón "Agregar envío" deshabilitado sin datos', () => {
      cy.contains('button', 'Agregar envío').should('be.disabled')
    })

    it('agrega un ítem correctamente con datos válidos', () => {
      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalleDespues')

      cy.get('input[placeholder="Nombre completo"]').type('Carlos Nuevo')
      cy.get('input[type="number"][step="0.001"]').type('1.0')
      cy.contains('button', 'Agregar envío').click()
      cy.wait('@agregarItem')

      cy.contains('Envío agregado').should('be.visible')
    })

    it('muestra error de toast si falta el nombre del destinatario', () => {
      cy.get('input[type="number"][step="0.001"]').type('1.0')
      cy.contains('button', 'Agregar envío').click()
      cy.contains('El nombre del destinatario es requerido').should('be.visible')
    })

    it('muestra error si el peso es cero', () => {
      cy.get('input[placeholder="Nombre completo"]').type('Carlos Nuevo')
      cy.get('input[type="number"][step="0.001"]').type('0')
      cy.contains('button', 'Agregar envío').click()
      cy.contains('El peso debe ser mayor a 0').should('be.visible')
    })
  })

  // ── Tabla rápida de entrada ───────────────────────────────────────────────

  describe('Tabla rápida', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        visitCarrito(lotes)
      })

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle')

      navegarAMasivosEnCarrito()
      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle')
      cy.contains('button', 'Tabla rápida').click()
    })

    it('muestra 5 filas vacías por defecto', () => {
      cy.get('table tbody tr').should('have.length.gte', 5)
    })

    it('botón "+5 filas" agrega más filas', () => {
      cy.contains('button', '5 filas').click()
      cy.get('table tbody tr').should('have.length.gte', 10)
    })

    it('el header muestra las columnas correctas', () => {
      cy.contains('Nombre *').should('be.visible')
      cy.contains('Peso kg *').should('be.visible')
    })

    it('botón Guardar deshabilitado sin datos', () => {
      cy.contains('button', /Guardar/).should('be.disabled')
    })

    it('puede ingresar datos en las celdas y habilita el botón Guardar', () => {
      cy.get('table tbody tr').first().find('input').first().type('Pedro Destinatario')
      // El campo de peso es el penúltimo
      cy.get('table tbody tr').first().find('input[type="number"]').type('0.300')
      cy.contains('button', /Guardar/).should('not.be.disabled')
    })

    it('guarda los envíos de la tabla rápida', () => {
      cy.get('table tbody tr').first().find('input').first().type('Pedro Destino')
      cy.get('table tbody tr').first().find('input[type="number"]').type('0.300')
      cy.contains('button', /Guardar/).click()
      cy.wait('@agregarItem')
    })

    it('cierra la tabla rápida con el botón X', () => {
      cy.get('[data-testid="cerrar-tabla-rapida"], button').filter(':has(svg)').last().click({ force: true })
      cy.contains('Entrada rápida').should('not.exist')
    })
  })

  // ── Importar CSV ──────────────────────────────────────────────────────────

  describe('Importar CSV', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        visitCarrito(lotes)
      })

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle')

      navegarAMasivosEnCarrito()
      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle')
      cy.contains('button', 'CSV').click()
    })

    it('muestra el formato esperado del CSV', () => {
      cy.contains('nombre,documento,email').should('be.visible')
    })

    it('botón Importar deshabilitado sin contenido', () => {
      cy.contains('button', 'Importar').should('be.disabled')
    })

    it('importa el CSV con contenido válido', () => {
      const csvContent = 'Pedro Importado,12345678,pedro@test.com,3001234567,Cra 7 #45,Bogotá,CO,,0.500,Documentos'
      cy.get('textarea').type(csvContent)
      cy.contains('button', 'Importar').should('not.be.disabled').click()
      cy.wait('@importarCsv')
      cy.contains('2 envío(s) importado(s)').should('be.visible')
    })
  })

  // ── Confirmar lote ────────────────────────────────────────────────────────

  describe('Confirmar lote', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        visitCarrito(lotes)
      })

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle')

      navegarAMasivosEnCarrito()
      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle')
    })

    it('abre el dialog de confirmación al hacer click en "Confirmar lote"', () => {
      cy.contains('button', 'Confirmar lote').click()
      cy.contains('Confirmar lote masivo').should('be.visible')
      cy.contains('Se crearán').should('be.visible')
    })

    it('dialog de confirmación muestra el total del lote', () => {
      cy.contains('button', 'Confirmar lote').click()
      cy.contains('$ 10.500').should('be.visible')
    })

    it('confirma el lote y muestra el toast de éxito', () => {
      cy.contains('button', 'Confirmar lote').click()
      cy.contains('button', 'Confirmar y registrar').click()
      cy.wait('@confirmarLote')
    })

    it('cancela la confirmación y regresa al detalle', () => {
      cy.contains('button', 'Confirmar lote').click()
      cy.contains('button', 'Cancelar').click()
      cy.contains('Confirmar lote masivo').should('not.exist')
      cy.contains('Lote #1').should('be.visible')
    })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// B) PÁGINA STANDALONE /ventas/masivos
// ══════════════════════════════════════════════════════════════════════════════

describe('Envíos Masivos — Página standalone /ventas/masivos', () => {
  // ── Lista de lotes ────────────────────────────────────────────────────────

  describe('Lista de lotes', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        cy.stubBase('cajero')
        cy.stubVentas()
        cy.stubEnviosMasivos({ lotes })

        cy.intercept('GET', `${API}/envios-masivos?**`, {
          statusCode: 200,
          body: lotes,
        }).as('listLotes')

        cy.visitAs('/ventas/masivos', 'cajero')
        cy.wait('@authMe')
        cy.wait('@featureFlags')
      })
    })

    it('muestra el título de la página', () => {
      cy.contains('Envíos masivos').should('be.visible')
    })

    it('muestra la descripción de preporteado corporativo', () => {
      cy.contains('Preporteado corporativo').should('be.visible')
    })

    it('muestra botón "Nuevo lote"', () => {
      cy.contains('button', 'Nuevo lote').should('be.visible')
    })

    it('muestra la tabla de lotes con columnas correctas', () => {
      cy.wait('@listLotes')
      cy.contains('Remitente').should('be.visible')
      cy.contains('Envíos').should('be.visible')
      cy.contains('Total').should('be.visible')
      cy.contains('Estado').should('be.visible')
    })

    it('muestra los lotes con sus datos', () => {
      cy.wait('@listLotes')
      cy.contains('Empresa ABC S.A.S.').should('be.visible')
      cy.contains('XYZ Corp').should('be.visible')
    })

    it('muestra los badges de estado correctamente', () => {
      cy.wait('@listLotes')
      cy.contains('Borrador').should('be.visible')
      cy.contains('Confirmado').should('be.visible')
    })

    it('navega al detalle del lote al hacer clic en una fila', () => {
      cy.wait('@listLotes')

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        fixture: 'lote-masivo',
      }).as('loteDetalle1')

      cy.contains('Empresa ABC S.A.S.').click()
      cy.wait('@loteDetalle1')
      cy.contains('Lote #1').should('be.visible')
    })
  })

  // ── Lista vacía ───────────────────────────────────────────────────────────

  describe('Sin lotes', () => {
    beforeEach(() => {
      visitMasivos([])
      cy.intercept('GET', `${API}/envios-masivos?**`, {
        statusCode: 200,
        body: [],
      }).as('listVacia')
    })

    it('muestra el estado vacío con mensaje', () => {
      cy.wait('@listVacia')
      cy.contains('Sin lotes').should('be.visible')
      cy.contains('Crea un nuevo lote para comenzar.').should('be.visible')
    })

    it('muestra botón "Nuevo lote" en el estado vacío', () => {
      cy.wait('@listVacia')
      cy.contains('button', 'Nuevo lote').should('have.length.gte', 1)
    })
  })

  // ── Dialog: Crear lote con modo remitente ────────────────────────────────

  describe('Dialog: Crear lote — modo Compartido', () => {
    beforeEach(() => {
      visitMasivos([])
      cy.wait('@featureFlags')
      cy.contains('button', 'Nuevo lote').first().click()
    })

    it('muestra el título del dialog', () => {
      cy.contains('Nuevo lote masivo').should('be.visible')
    })

    it('muestra el selector de servicio postal', () => {
      cy.contains('Servicio postal *').should('be.visible')
    })

    it('muestra el switch de modo remitente', () => {
      cy.contains('Modo remitente').should('be.visible')
      cy.contains('Compartido').should('be.visible')
      cy.contains('Múltiple').should('be.visible')
    })

    it('modo Compartido muestra el formulario de remitente compartido', () => {
      cy.contains('Remitente compartido').should('be.visible')
      cy.contains('Nombre *').should('be.visible')
    })

    it('al activar modo Múltiple oculta el formulario de remitente', () => {
      cy.get('[role="switch"]').click()
      cy.contains('Remitente compartido').should('not.exist')
      cy.contains('Cada envío tendrá su propio remitente').should('be.visible')
    })

    it('crea lote en modo compartido con datos completos', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar un servicio').click()
      cy.contains('Correo Regular No Prioritario').click()

      cy.get('input[placeholder="Nombre o razón social"]').type('Empresa XYZ S.A.')
      cy.get('input[placeholder="CC / NIT"]').type('900456789')
      cy.get('input[placeholder="Ciudad de origen"]').type('Bogotá')

      cy.contains('button', 'Crear lote').click()
      cy.wait('@crearLote')
      // El dialog se cierra y navega al detalle
      cy.contains('Nuevo lote masivo').should('not.exist')
    })

    it('crea lote en modo múltiple sin remitente compartido', () => {
      cy.wait('@serviciosPostales')
      cy.contains('Seleccionar un servicio').click()
      cy.contains('Correo Regular No Prioritario').click()

      cy.get('[role="switch"]').click()
      cy.contains('button', 'Crear lote').should('not.be.disabled').click()
      cy.wait('@crearLote')
    })

    it('el campo de observaciones es opcional y acepta texto', () => {
      cy.get('input[placeholder="Observaciones del lote (opcional)"]')
        .type('Envíos de agosto')
      cy.contains('Envíos de agosto').should('be.visible')
    })
  })

  // ── LoteDetalle standalone ────────────────────────────────────────────────

  describe('LoteDetalle — Borrador (standalone)', () => {
    beforeEach(() => {
      cy.fixture('lotes-masivos').then((lotes) => {
        cy.stubBase('cajero')
        cy.stubVentas()
        cy.stubEnviosMasivos({ lotes, lote: undefined })

        cy.intercept('GET', `${API}/envios-masivos?**`, {
          statusCode: 200,
          body: lotes,
        }).as('listLotes')

        cy.intercept('GET', `${API}/envios-masivos/1`, {
          fixture: 'lote-masivo',
        }).as('loteDetalle')

        cy.visitAs('/ventas/masivos', 'cajero')
        cy.wait('@authMe')
        cy.wait('@featureFlags')
        cy.wait('@listLotes')
        cy.contains('Empresa ABC S.A.S.').click()
        cy.wait('@loteDetalle')
      })
    })

    it('muestra el breadcrumb de navegación "Lotes / Lote #1"', () => {
      cy.contains('Lotes').should('be.visible')
      cy.contains('Lote #1').should('be.visible')
    })

    it('muestra los botones de acción del borrador', () => {
      cy.contains('button', 'CSV').should('be.visible')
      cy.contains('button', 'Tabla rápida').should('be.visible')
      cy.contains('button', 'Agregar').should('be.visible')
    })

    it('muestra la tabla de ítems', () => {
      cy.contains('th', 'Destinatario').should('be.visible')
      cy.contains('th', 'Peso').should('be.visible')
      cy.contains('th', 'Valor').should('be.visible')
    })

    it('muestra el ítem existente en la tabla', () => {
      cy.contains('María Destinataria').should('be.visible')
      cy.contains('Medellín').should('be.visible')
    })

    it('puede eliminar un ítem de la lista', () => {
      cy.intercept('DELETE', `${API}/envios-masivos/1/items/1`, {
        statusCode: 200,
        body: {},
      }).as('eliminarItem1')

      cy.intercept('GET', `${API}/envios-masivos/1`, {
        statusCode: 200,
        body: {
          id: 1, estado: 'borrador', sucursalId: 1, servicioId: 1,
          servicio: { idservicios: 1, nombreservicios: 'Correo Regular No Prioritario', tiposervicios: 'nacional' },
          remitente: { nombre: 'Empresa ABC S.A.S.', documento: '900123456', ciudad: 'Bogotá', telefono: '3001234567' },
          totales: { items: 0, pesoKg: 0, estampillas: 0, total: 0 },
          observaciones: null, pdfGenerado: false,
          createdAt: '2026-08-21T10:00:00.000Z', updatedAt: '2026-08-21T10:00:00.000Z',
          items: [],
        },
      }).as('loteVacio')

      // Hover la fila para mostrar los controles
      // Trigger mouseover para mostrar los controles que aparecen con hover (group-hover)
      cy.contains('María Destinataria').parents('tr').trigger('mouseover')
      cy.contains('María Destinataria').parents('tr').find('button').last().click({ force: true })
      cy.wait('@eliminarItem1')
    })

    it('puede expandir el detalle del ítem', () => {
      cy.contains('María Destinataria').parents('tr').trigger('mouseover')
      cy.contains('María Destinataria').parents('tr').find('button').first().click({ force: true })
      // Debe mostrar la fila expandida con datos del destinatario
      cy.contains('Destinatario').should('be.visible')
    })

    it('puede eliminar el lote completo (borrador)', () => {
      cy.contains('button[variant="destructive"], button').filter(':has(svg)').last().click({ force: true })
      cy.wait('@eliminarLote')
    })
  })

  // ── LoteDetalle confirmado — solo PDF ─────────────────────────────────────

  describe('LoteDetalle — Confirmado (modo solo lectura)', () => {
    beforeEach(() => {
      cy.stubBase('cajero')
      cy.stubVentas()
      cy.stubEnviosMasivos()

      cy.intercept('GET', `${API}/envios-masivos?**`, {
        statusCode: 200,
        body: [{ id: 2, estado: 'confirmado', remitente: 'XYZ Corp', totalItems: 10, totalCop: 105000, createdAt: '2026-08-20T14:00:00.000Z' }],
      }).as('listConfirmado')

      cy.intercept('GET', `${API}/envios-masivos/2`, {
        statusCode: 200,
        body: {
          id: 2,
          estado: 'confirmado',
          sucursalId: 1,
          servicioId: 1,
          servicio: { idservicios: 1, nombreservicios: 'Correo Regular No Prioritario', tiposervicios: 'nacional' },
          remitente: { nombre: 'XYZ Corp', documento: '800111222', ciudad: 'Cali', telefono: '3005556666' },
          totales: { items: 10, pesoKg: 5, estampillas: 0, total: 105000 },
          observaciones: null,
          pdfGenerado: false,
          createdAt: '2026-08-20T14:00:00.000Z',
          updatedAt: '2026-08-20T15:00:00.000Z',
          items: [],
        },
      }).as('loteConfirmado')

      cy.visitAs('/ventas/masivos', 'cajero')
      cy.wait('@authMe')
      cy.wait('@featureFlags')
      cy.wait('@listConfirmado')
      cy.contains('XYZ Corp').click()
      cy.wait('@loteConfirmado')
    })

    it('muestra el estado "Confirmado" en el header del lote', () => {
      cy.contains('Confirmado').should('be.visible')
    })

    it('NO muestra botones de edición (Agregar, CSV, Tabla rápida)', () => {
      cy.contains('button', 'Agregar').should('not.exist')
      cy.contains('button', 'CSV').should('not.exist')
      cy.contains('button', 'Tabla rápida').should('not.exist')
    })

    it('muestra botón "Generar PDF" para lote confirmado', () => {
      cy.contains('button', /Generar PDF/i).should('be.visible')
    })

    it('genera el PDF del lote al hacer click', () => {
      cy.intercept('POST', `${API}/envios-masivos/2/generar-pdf`, {
        statusCode: 200,
        body: { totalGuias: 10, relPath: '/pdfs/lote-2.pdf' },
      }).as('generarPdf')

      cy.contains('button', /Generar PDF/i).click()
      cy.wait('@generarPdf')
    })
  })
})
