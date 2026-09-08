/**
 * Lab E2E — autentica vía MongoDB (POST /lab/login), sin JWT del sistema principal.
 * Los mockups no hacen peticiones API, por lo que no se necesitan stubs de red.
 */

describe('Lab — autenticación', () => {
  it('redirige a login cuando no hay sesión', () => {
    cy.visit('/lab')
    cy.url().should('include', '/lab/login')
    cy.get('[data-cy=lab-login-page]').should('exist')
  })

  it('muestra error con credenciales incorrectas', () => {
    cy.visit('/lab/login')
    cy.get('[data-cy=lab-login-usuario]').type('usuario_malo')
    cy.get('[data-cy=lab-login-password]').type('wrong')
    cy.get('[data-cy=lab-login-submit]').click()
    cy.get('[data-cy=lab-login-error]').should('be.visible')
  })

  it('inicia sesión y llega al índice del Lab', () => {
    cy.visit('/lab/login')
    cy.labLogin()
    cy.visit('/lab')
    cy.get('[data-cy=lab-nav-inicio]').should('exist')
    cy.get('[data-cy=lab-logout]').should('exist')
  })
})

describe('Lab — navegación', () => {
  beforeEach(() => {
    cy.visit('/lab/login')
    cy.labLogin()
    cy.visit('/lab')
  })

  it('muestra el índice con los 4 módulos', () => {
    cy.get('[data-cy=lab-module-ui-gallery]').should('exist')
    cy.get('[data-cy=lab-module-poc-sandbox]').should('exist')
    cy.get('[data-cy=lab-module-mockups]').should('exist')
    cy.get('[data-cy=lab-module-guía-postal]').should('exist')
  })

  it('navega a Mockups (pantallas sin API)', () => {
    cy.get('[data-cy=lab-nav-mockups]').click()
    cy.url().should('include', '/lab/mockups')
  })

  it('navega a Guía Postal y muestra datos mock', () => {
    cy.get('[data-cy=lab-nav-guía-postal]').click()
    cy.url().should('include', '/lab/guia')
    cy.contains('RA185194038CO').should('exist')
  })

  it('cierra sesión y redirige a login', () => {
    cy.get('[data-cy=lab-logout]').click()
    cy.url().should('include', '/lab/login')
  })
})

describe('Lab — Mockups (pantallas estáticas)', () => {
  beforeEach(() => {
    cy.labLogin()
    cy.visit('/lab/mockups')
  })

  it('renderiza sin llamar a API de negocio (cajas, ventas, etc.)', () => {
    // Verifica que los mockups se muestran con datos hardcodeados
    cy.intercept(`${Cypress.env('API_URL')}/cajas/**`).as('cajas')
    cy.intercept(`${Cypress.env('API_URL')}/ventas/**`).as('ventas')
    cy.reload()
    cy.wait(1500)
    cy.get('@cajas.all').should('have.length', 0)
    cy.get('@ventas.all').should('have.length', 0)
  })
})
