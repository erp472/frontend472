import { queryClient } from '@/lib/query-client'
import { onRealtimeMessage } from './socket'

type RealtimeEvent =
  | 'cajas.status'
  | 'cajas.sesion.abierta'
  | 'cajas.sesion.cerrada'
  | 'cajas.movimiento'
  | 'cajas.consignacion'
  | 'cajas.custodia'
  | 'connection.ack'
  | string

function handleEvent(event: RealtimeEvent, _data: unknown) {
  switch (event) {
    case 'cajas.sesion.abierta':
    case 'cajas.sesion.cerrada':
    case 'cajas.status':
      queryClient.invalidateQueries({ queryKey: ['cajas', 'status'] })
      break

    case 'cajas.movimiento':
      queryClient.invalidateQueries({ queryKey: ['cajas', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['cajas', 'saldo'] })
      queryClient.invalidateQueries({ queryKey: ['cajas', 'movimientos'] })
      break

    case 'cajas.consignacion':
      queryClient.invalidateQueries({ queryKey: ['cajas', 'consignaciones'] })
      queryClient.invalidateQueries({ queryKey: ['cajas', 'status'] })
      break

    case 'cajas.custodia':
      queryClient.invalidateQueries({ queryKey: ['cajas'] })
      break

    case 'ventas.venta_confirmada': {
      const d = _data as { sucursalId?: number } | undefined
      queryClient.invalidateQueries({ queryKey: ['ventas', 'dia'] })
      if (d?.sucursalId) {
        queryClient.invalidateQueries({ queryKey: ['ventas', 'dia', d.sucursalId] })
      }
      queryClient.invalidateQueries({ queryKey: ['inventario', 'alertas'] })
      break
    }

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
