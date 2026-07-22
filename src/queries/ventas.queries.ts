import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type TipoProducto = 'estampilla' | 'filatelia' | 'empaque' | 'material_oficina' | 'giro' | 'paquete' | 'otro'
export type MedioPagoVenta = 'efectivo' | 'cheque' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'consignacion' | 'preporteado' | 'mixto_preporteado'
export type EstadoVenta = 'activa' | 'anulada'
export type TamanoApartado = 'pequeno' | 'mediano' | 'grande'

export interface ProductoCatalogo {
  id: number; codigo: string; nombre: string; tipo: TipoProducto
  precio: number; porcentajeTax: number
  stockActual: number | null; stockMinimo: number | null
}

export interface ClienteResumen {
  id: number; tipoDocumento: string; numeroDocumento: string
  nombre: string; apellido: string | null; email: string | null; telefono: string | null
}

export interface DetalleVenta {
  id: number; productoId: number; nombreProducto: string | null
  tipoProducto: TipoProducto | null; cantidad: number
  precioUnitario: number; descuento: number; subtotal: number
}

export interface Venta {
  id: number; sesionCajaId: number; clienteId: number | null
  subtotal: number; descuento: number; iva: number; total: number
  medioPago: MedioPagoVenta; estado: EstadoVenta
  emailFactura: string | null; createdAt: string
  detalle: DetalleVenta[]
}

export interface ApartadoPostal {
  id: number; sucursalId: number; numero: string; tamano: TamanoApartado
  estado: string; clienteId: number | null; fechaInicio: string | null
  fechaFin: string | null; valor: number | null; incluyeIva: boolean
}

export interface ServicioCatalogo {
  id: number; codigo: string; nombre: string; tipo: string
  requiereEstampilla: boolean; requiereDimensiones: boolean
  requiereValorDeclarado: boolean; pesoMaximoKg: number | null
  tiempoEntregaDias: number | null
}

export interface CotizacionEnvio {
  pesoFisicoKg: number; pesoVolumetricoKg: number | null; pesoTarificadoKg: number
  valorServicio: number
}

export interface Envio {
  id: number; numeroGuia: string; tipo: string
  remitenteNombre: string | null; destinatarioNombre: string | null
  destinatarioCiudad: string | null; destinatarioPais: string
  pesoFisicoKg: number; pesoTarificadoKg: number
  valorServicio: number; valorTotal: number; estado: string; createdAt: string
}

export interface ResumenLinea { cantidad: number; total: number }

export interface ResumenTurno {
  sesionCajaId: number
  sellos: ResumenLinea; productos: ResumenLinea
  apartados: ResumenLinea; servicios: ResumenLinea
  anulaciones: ResumenLinea; totalGeneral: number
}

export interface MovimientoVenta {
  id: number; sesionCajaId: number; tipo: string; monto: string
  medioPago: string | null; referenciaId: number | null
  referenciaTipo: string | null; createdAt: string
}

export interface ConfirmarVentaResult {
  venta: Venta; movimiento: MovimientoVenta
  saldoActual: number; alertas: string[]
  cambio: number | null
}

export const VENTAS_KEYS = {
  catalogo:   (sucursalId: number, tipo?: string) => ['ventas', 'catalogo', sucursalId, tipo] as const,
  cliente:    (tipo: string, numero: string) => ['ventas', 'cliente', tipo, numero] as const,
  carrito:    (ventaId: number) => ['ventas', 'carrito', ventaId] as const,
  turno:      (cajaId: number, fecha?: string) => ['ventas', 'turno', cajaId, fecha] as const,
  resumen:    (cajaId: number) => ['ventas', 'resumen', cajaId] as const,
  apartados:  (sucursalId: number, tamano?: string) => ['ventas', 'apartados', sucursalId, tamano] as const,
  servicios:  (sucursalId: number) => ['ventas', 'servicios', sucursalId] as const,
  cotizacion: (params: object) => ['ventas', 'cotizacion', params] as const,
}

export function useCatalogoProductos(sucursalId: number, tipo?: string) {
  const params = new URLSearchParams({ sucursalId: String(sucursalId) })
  if (tipo) params.set('tipo', tipo)
  return useQuery({
    queryKey: VENTAS_KEYS.catalogo(sucursalId, tipo),
    queryFn:  () => apiFetch<ProductoCatalogo[]>(`/ventas/catalogo/productos?${params}`),
    enabled:  sucursalId > 0,
  })
}

export function useBuscarCliente(tipo: string, numero: string) {
  return useQuery({
    queryKey: VENTAS_KEYS.cliente(tipo, numero),
    queryFn:  () => apiFetch<ClienteResumen>(`/ventas/clientes/buscar?tipo=${encodeURIComponent(tipo)}&numero=${encodeURIComponent(numero)}`),
    enabled:  Boolean(tipo && numero),
  })
}

export function useCarrito(ventaId: number) {
  return useQuery({
    queryKey:        VENTAS_KEYS.carrito(ventaId),
    queryFn:         () => apiFetch<Venta>(`/ventas/${ventaId}/carrito`),
    enabled:         ventaId > 0,
    refetchInterval: 5_000,
  })
}

export function useResumenTurno(cajaId: number) {
  return useQuery({
    queryKey:        VENTAS_KEYS.resumen(cajaId),
    queryFn:         () => apiFetch<ResumenTurno>(`/ventas/punto/${cajaId}/resumen`),
    enabled:         cajaId > 0,
    refetchInterval: 15_000,
  })
}

export function useVentasTurno(cajaId: number, fecha?: string) {
  const params = new URLSearchParams()
  if (fecha) params.set('fecha', fecha)
  const qs = params.toString() ? `?${params}` : ''
  return useQuery({
    queryKey: VENTAS_KEYS.turno(cajaId, fecha),
    queryFn:  () => apiFetch<MovimientoVenta[]>(`/ventas/punto/${cajaId}/turno${qs}`),
    enabled:  cajaId > 0,
  })
}

export function useApartadosDisponibles(sucursalId: number, tamano?: string) {
  const params = new URLSearchParams({ sucursalId: String(sucursalId) })
  if (tamano) params.set('tamano', tamano)
  return useQuery({
    queryKey: VENTAS_KEYS.apartados(sucursalId, tamano),
    queryFn:  () => apiFetch<ApartadoPostal[]>(`/ventas/apartados/disponibles?${params}`),
    enabled:  sucursalId > 0,
  })
}

export function useServiciosPostales(sucursalId: number) {
  return useQuery({
    queryKey: VENTAS_KEYS.servicios(sucursalId),
    queryFn:  () => apiFetch<ServicioCatalogo[]>(`/ventas/servicios-postales?sucursalId=${sucursalId}`),
    enabled:  sucursalId > 0,
  })
}

export function useCotizarEnvio(params: {
  servicioId: number
  pesoFisicoKg: number
  altoCm?: number
  anchoCm?: number
  largoCm?: number
  paisDestino?: string
}) {
  const qs = new URLSearchParams()
  qs.set('servicioId', String(params.servicioId))
  qs.set('pesoFisicoKg', String(params.pesoFisicoKg))
  if (params.altoCm !== undefined) qs.set('altoCm', String(params.altoCm))
  if (params.anchoCm !== undefined) qs.set('anchoCm', String(params.anchoCm))
  if (params.largoCm !== undefined) qs.set('largoCm', String(params.largoCm))
  if (params.paisDestino) qs.set('paisDestino', params.paisDestino)
  return useQuery({
    queryKey: VENTAS_KEYS.cotizacion(params),
    queryFn:  () => apiFetch<CotizacionEnvio>(`/ventas/servicios-postales/cotizar?${qs}`),
    enabled:  params.servicioId > 0 && params.pesoFisicoKg > 0,
  })
}

export function useIniciarVenta(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { tipoDocumento: string; numeroDocumento: string }) =>
      apiFetch<{ venta: Venta; cliente: ClienteResumen | null }>(`/ventas/punto/${cajaId}/iniciar`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) }),
  })
}

export function useAgregarProducto(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { productoId: number; cantidad: number; descuento?: number }) =>
      apiFetch<Venta>(`/ventas/${ventaId}/carrito/producto?cajaId=${cajaId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) }),
  })
}

export function useEliminarProducto(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (detalleId: number) =>
      apiFetch<void>(`/ventas/${ventaId}/carrito/${detalleId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) }),
  })
}

export function useConfirmarVenta(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { medioPago: MedioPagoVenta; efectivoRecibido?: number; emailFactura: string }) =>
      apiFetch<ConfirmarVentaResult>(`/ventas/${ventaId}/confirmar?cajaId=${cajaId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
      qc.invalidateQueries({ queryKey: ['ventas', 'turno', cajaId] })
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
    },
  })
}

export function useAnularVenta(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { motivo: string }) =>
      apiFetch<Venta>(`/ventas/${ventaId}/anular?cajaId=${cajaId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
      qc.invalidateQueries({ queryKey: ['ventas', 'turno', cajaId] })
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
    },
  })
}

export function useContratarApartado(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clienteId, ...data }: { clienteId: number } & Record<string, unknown>) =>
      apiFetch<{ apartado: ApartadoPostal; saldoActual: number; alertas: unknown[] }>(
        `/ventas/punto/${cajaId}/apartado?clienteId=${clienteId}`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['ventas', 'apartados', result.apartado.sucursalId] })
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
    },
  })
}

export function useCrearEnvio(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<Envio>(`/ventas/punto/${cajaId}/envio`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) }),
  })
}
