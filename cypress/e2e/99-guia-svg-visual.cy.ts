/**
 * Captura visual de la plantilla SVG de la guía (scratch de verificación).
 */

const MOCKS = ['nacional', 'corto', 'intl'] as const

describe('Guía SVG — captura visual', () => {
  for (const mock of MOCKS) {
    it(`renderiza ${mock}`, () => {
      cy.visit('/guia-demo')
      cy.contains('button', 'SVG template').click()
      cy.contains('button', mock).click()

      // Sube el zoom para que el texto sea legible en la captura
      cy.get('.guia-svg-root svg').should('exist')
      for (let i = 0; i < 5; i++) cy.contains('button', '+').click()

      cy.wait(400)
      cy.get('.guia-svg-root').screenshot(`guia-${mock}`, { overwrite: true })
    })
  }
})
