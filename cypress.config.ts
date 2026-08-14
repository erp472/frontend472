import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 10_000,
    requestTimeout: 10_000,
    video: false,
    screenshotOnRunFailure: true,
    env: {
      API_URL: 'http://localhost:3000',
    },
  },
})
