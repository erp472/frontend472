import './commands'

// Ignorar errores de WebSocket (el servidor realtime no corre en pruebas)
// e intentos de Tauri IPC que no tienen backend real.
// 'transformCallback' y '__TAURI_INTERNALS__': el menú nativo de Tauri
// intenta registrar callbacks que no existen en el entorno Cypress.
Cypress.on('uncaught:exception', (err) => {
  const ignorados = [
    'WebSocket',
    '__TAURI_IPC__',
    '__TAURI_INTERNALS__',
    'transformCallback',
    'invoke',
    'startRealtime',
    'ECONNREFUSED',
    'Failed to fetch',
    'NetworkError',
  ]
  if (ignorados.some((msg) => err.message.includes(msg))) return false
})
