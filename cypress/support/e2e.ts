import './commands'

// Ignorar errores de WebSocket (el servidor realtime no corre en pruebas)
// e intentos de Tauri IPC que no tienen backend real.
Cypress.on('uncaught:exception', (err) => {
  const ignorados = [
    'WebSocket',
    '__TAURI_IPC__',
    'invoke',
    'startRealtime',
    'ECONNREFUSED',
    'Failed to fetch',
    'NetworkError',
  ]
  if (ignorados.some((msg) => err.message.includes(msg))) return false
})
