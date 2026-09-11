import { queryClient } from '@/lib/query-client'
import { onRealtimeMessage } from './socket'

type RealtimeEvent =
  | 'cajas.status'
  | 'cajas.sesion.abierta'
  | 'cajas.sesion.cerrada'
  | 'cajas.movimiento'
  | 'cajas.consignacion'
  | 'cajas.custodia'
  | 'cajas.servicios'
  | 'tesoreria.movimiento'
  | 'ventas.venta_confirmada'
  | 'ventas.envio_creado'
  | 'inventario.ajuste'
  | 'sacas.cerrada'
  | 'envios-masivos.confirmado'
  | 'audit.event'
  | 'security.alert'
  | 'connection.ack'
  | string

// El efectivo que Tesorería ve custodiado en un punto es la suma de las sesiones
// abiertas de sus cajas, así que cualquier movimiento de caja lo desactualiza.
function invalidarTesoreria() {
  queryClient.invalidateQueries({ queryKey: ['tesoreria'] })
}

// Cualquier peso que se mueva en una sesión cambia el saldo, el consolidado del
// comercio y las alertas de cierre a la vez. Invalidar por prefijo evita que una
// vista nueva quede fuera del tiempo real por olvidar su clave aquí; TanStack solo
// refetchea las consultas activas, así que las pantallas cerradas no cuestan nada.
function invalidarCajas() {
  queryClient.invalidateQueries({ queryKey: ['cajas'] })
}

// Agregados que resumen las ventas de otros cajeros. No se invalida el prefijo
// ['ventas'] entero porque ahí viven el carrito y la cotización en vivo del cajero,
// y recotizar en cada venta del país sería costoso y sin sentido.
function invalidarVentas() {
  for (const k of ['dia', 'resumen', 'turno', 'anulaciones-pendientes']) {
    queryClient.invalidateQueries({ queryKey: ['ventas', k] })
  }
}

function handleEvent(event: RealtimeEvent, _data: unknown) {
  switch (event) {
    case 'cajas.sesion.abierta':
    case 'cajas.sesion.cerrada':
    case 'cajas.status':
    case 'cajas.movimiento':
    case 'cajas.consignacion':
    case 'cajas.custodia':
      invalidarCajas()
      invalidarTesoreria()
      break

    // Habilitar o inhabilitar un servicio no mueve plata; solo cambia lo que el
    // cajero puede operar, así que basta con refrescar cajas.
    case 'cajas.servicios':
      invalidarCajas()
      break

    case 'tesoreria.movimiento':
      invalidarTesoreria()
      break

    case 'ventas.venta_confirmada':
    case 'ventas.envio_creado':
      invalidarVentas()
      queryClient.invalidateQueries({ queryKey: ['inventario', 'alertas'] })
      invalidarCajas()
      invalidarTesoreria()
      break

    case 'inventario.ajuste':
      queryClient.invalidateQueries({ queryKey: ['inventario'] })
      break

    case 'sacas.cerrada':
      queryClient.invalidateQueries({ queryKey: ['sacas'] })
      break

    case 'envios-masivos.confirmado':
      queryClient.invalidateQueries({ queryKey: ['envios-masivos'] })
      break

    case 'audit.event':
      queryClient.invalidateQueries({ queryKey: ['audit', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['audit', 'stats'] })
      break

    case 'security.alert':
      queryClient.invalidateQueries({ queryKey: ['security', 'alerts'] })
      queryClient.invalidateQueries({ queryKey: ['security', 'stats'] })
      break

    default:
      break
  }
}

let teardown: (() => void) | null = null

export function startBridge() {
  if (teardown) teardown()
  teardown = onRealtimeMessage(handleEvent)
}

export function stopBridge() {
  teardown?.()
  teardown = null
}
