import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiFetchBlob, ApiError } from '@/lib/api'

export type TipoProducto  = 'estampilla' | 'filatelia' | 'empaque' | 'material_oficina' | 'giro' | 'paquete' | 'otro'
export type TipoTrayecto  = 'NACIONAL' | 'URBANO' | 'ESPECIAL'
export type MedioPagoEnvio = 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'consignacion' | 'preporteado' | 'mixto_preporteado'

export interface SeleccionEstampilla {
  denominacion: string
  cantidad:     number
}

export interface PersonaEnvio {
  nombre:        string
  empresa?:      string
  documento?:    string
  tipoDocumento?: string
  email?:        string
  telefono?:     string
  direccion?:    string
  ciudad?:       string
  departamento?: string
  pais?:         string
  codigoPostal?: string
}

export interface CrearEnvioPayload {
  servicioId:       number
  sucursalId:       number
  remitente:        PersonaEnvio
  destinatario:     PersonaEnvio
  pesoFisicoKg:     number
  cantidadPiezas?:  number
  altoCm?:          number
  anchoCm?:         number
  largoCm?:         number
  valorDeclarado?:  number
  seguroAdicional?: boolean
  contenido?:       string
  observaciones?:   string
  medioPago:        MedioPagoEnvio
  montoEstampillas?: number
  montoEfectivo?:    number
  // Tarjeta: baucher siempre, franquicia solo en crédito
  codigoVoucher?:    string
  franquiciaId?:     number
  guiaCp?:           string
  esCorrespondencia?: boolean
  tipoTrayecto?:     TipoTrayecto
  clienteId?:        number
}
export type MedioPagoVenta = 'efectivo' | 'cheque' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia' | 'consignacion' | 'preporteado' | 'mixto_preporteado' | 'estampilla'
export type EstadoVenta = 'activa' | 'confirmada' | 'anulada'
export type TamanoApartado = 'pequeno' | 'mediano' | 'grande'

export interface ProductoCatalogo {
  id: number; codigo: string; nombre: string; tipo: TipoProducto
  precio: number; porcentajeTax: number
  stockActual: number | null; stockMinimo: number | null
  cantidadMinima: number | null; cantidadMaxima: number | null
}

export interface ClienteResumen {
  id: number; tipoDocumento: string; numeroDocumento: string
  nombre: string; apellido: string | null; email: string | null; telefono: string | null
}

export interface DetalleVenta {
  id: number; productoId: number; nombreProducto: string | null
  codigoProducto: string | null; tipoProducto: TipoProducto | null
  cantidad: number; precioUnitario: number; descuento: number
  subtotal: number; porcentajeTax: number
}

export interface Venta {
  id: number; sesionCajaId: number; clienteId: number | null
  subtotal: number; descuento: number; iva: number; total: number
  medioPago: MedioPagoVenta; estado: EstadoVenta
  emailFactura: string | null; createdAt: string
  detalle: DetalleVenta[]
  enviosPendientes: Envio[]
  apartadosPendientes: ApartadoPostal[]
}

export interface VentaDiaDetalle {
  id: number; ventaId: number; productoId: number
  nombreProducto: string; codigoProducto: string | null
  cantidad: number; precioUnitario: number; subtotal: number
}

export interface VentaDia {
  id: number; sesionCajaId: number; total: number
  medioPago: string; estado: string; createdAt: string
  detalle: VentaDiaDetalle[]
}

export interface ApartadoPostal {
  id: number; sucursalId: number; numero: string; tamano: TamanoApartado
  estado: string; clienteId: number | null; ventaId: number | null
  fechaInicio: string | null; fechaFin: string | null
  valor: number | null; incluyeIva: boolean
  diasAlertaVencimiento: number
  diasRestantes: number | null
  alertaVencimiento: boolean
}

export interface ApartadoAdminItem extends ApartadoPostal {
  sucursalNombre: string
  sucursalCodigo: string
}

export interface ServicioCatalogo {
  id: number; codigo: string; nombre: string; tipo: string
  requiereEstampilla: boolean; requiereDimensiones: boolean
  requiereValorDeclarado: boolean; pesoMaximoKg: number | null
  tiempoEntregaDias: number | null; minimoSeguroPostal: number | null
}

export interface CotizacionEnvio {
  pesoFisicoKg: number; pesoVolumetricoKg: number | null; pesoTarificadoKg: number
  valorServicio: number; valorCertificacion?: number
  fechaEntregaEstimada: string | null
  aduanaEstimadoUSD: string | null
  servicio: { nombreservicios: string; tiempoEntregaDias: number | null } | null
}

export interface Envio {
  id: number; numeroGuia: string; tipo: string
  remitenteNombre: string | null; destinatarioNombre: string | null
  destinatarioCiudad: string | null; destinatarioPais: string
  pesoFisicoKg: number; pesoTarificadoKg: number
  valorServicio: number; valorSeguro: number; valorEstampillas: number
  valorCertificacion: number; valorTotal: number; estado: string; createdAt: string
  /** Presente cuando el envío entró al carrito como parte de un lote masivo. */
  loteMasivoId?: number | null
}

export interface GuiaPersona {
  nombre: string | null; documento: string | null
  telefono: string | null; email: string | null
  direccion: string | null; ciudad: string | null
  departamento?: string | null
  codigoPostal: string | null; pais: string
}

export interface GuiaEnvio {
  /** Ausente en el borrador, que aún no existe como envío en el backend. */
  envioId?:     number
  numeroGuia:   string
  codigoBarras: string
  tipo:         'nacional' | 'internacional'
  tipoServicio: string
  remitente:    GuiaPersona
  destinatario: GuiaPersona
  peso: {
    fisicoKg: number; tarificadoKg: number
    altoCm: number | null; anchoCm: number | null; largoCm: number | null
    volumetricoKg?: number | null
  }
  valores: {
    servicio: number; manejo: number; seguro: number
    declarado: number | null; total: number
  }
  estado:     string
  generadoEn: string
  codigoServicio?:        string | null
  contenido?:             string | null
  observaciones?:         string | null
  ordenServicio?:         number | null
  fechaEntregaEstimada?:  string | null
  centroOperativo?:       string | null
  centroOperativoCodigo?: string | null
}

export interface CrearEnvioResult {
  guia:                 GuiaEnvio
  envio:                Envio
  movimiento:           { id: number; tipo: string; monto: string }
  saldoActual:          number
  alertas:              string[]
  seleccionEstampillas: SeleccionEstampilla[]
}

export interface TarifaEspecial {
  id: number; productoId: number; minCantidad: number; maxCantidad: number | null; precio: number
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

export interface LoteMasivoPagado {
  loteId: number; totalItems: number; total: number
}

export interface ConfirmarVentaResult {
  venta: Venta; movimiento: MovimientoVenta
  saldoActual: number; alertas: string[]
  cambio: number | null
  guias: GuiaEnvio[]
  lotesMasivos: LoteMasivoPagado[]
}

export interface DireccionFrecuente {
  id:           number
  clienteId:    number
  rol:          'remitente' | 'destinatario'
  nombre:       string
  empresa:      string | null
  telefono:     string | null
  email:        string | null
  direccion:    string | null
  ciudad:       string | null
  departamento: string | null
  pais:         string
  codigoPostal: string | null
  documento:    string | null
  usos:         number
  ultimoUso:    string
}

export const VENTAS_KEYS = {
  catalogo:            (sucursalId: number, tipo?: string) => ['ventas', 'catalogo', sucursalId, tipo] as const,
  direccionesFrecuentes: (clienteId: number, rol?: string) => ['ventas', 'direcciones-frecuentes', clienteId, rol] as const,
  cliente:         (tipo: string, numero: string) => ['ventas', 'cliente', tipo, numero] as const,
  carrito:         (ventaId: number) => ['ventas', 'carrito', ventaId] as const,
  turno:           (cajaId: number, fecha?: string) => ['ventas', 'turno', cajaId, fecha] as const,
  resumen:         (cajaId: number) => ['ventas', 'resumen', cajaId] as const,
  apartados:       (sucursalId: number, tamano?: string) => ['ventas', 'apartados', sucursalId, tamano] as const,
  apartadosAdmin:  (f: object) => ['ventas', 'apartados-admin', f] as const,
  servicios:       (sucursalId: number) => ['ventas', 'servicios', sucursalId] as const,
  cotizacion:      (params: object) => ['ventas', 'cotizacion', params] as const,
  tarifasEspecial: (productoId: number) => ['ventas', 'tarifas-especial', productoId] as const,
  dia:             (sucursalId: number) => ['ventas', 'dia', sucursalId] as const,
  puntoAdmision:   (sucursalId: number) => ['ventas', 'punto-admision', sucursalId] as const,
  saldoAFavor:     (clienteId: number) => ['ventas', 'saldo-a-favor', clienteId] as const,
}

export function useTarifasEspecial(productoId: number) {
  return useQuery({
    queryKey: VENTAS_KEYS.tarifasEspecial(productoId),
    queryFn:  () => apiFetch<TarifaEspecial[]>(`/ventas/catalogo/especiales/${productoId}/tarifas`),
    enabled:  productoId > 0,
    staleTime: 5 * 60_000,
  })
}

export function useSetTarifasEspecial(productoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tarifas: Array<{ minCantidad: number; maxCantidad: number | null; precio: number }>) =>
      apiFetch<TarifaEspecial[]>(`/ventas/catalogo/especiales/${productoId}/tarifas`, {
        method: 'PUT',
        body: JSON.stringify(tarifas),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENTAS_KEYS.tarifasEspecial(productoId) }),
  })
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
    queryKey: VENTAS_KEYS.carrito(ventaId),
    queryFn:  () => apiFetch<Venta>(`/ventas/${ventaId}/carrito`),
    enabled:  ventaId > 0,
    retry:    (count, error) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return false
      return count < 2
    },
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

export interface ApartadosDisponiblesResponse {
  totalDisponibles: number
  lista:            ApartadoPostal[]
}

export function useApartadosDisponibles(sucursalId: number, tamano?: string) {
  const params = new URLSearchParams({ sucursalId: String(sucursalId) })
  if (tamano) params.set('tamano', tamano)
  return useQuery({
    queryKey: VENTAS_KEYS.apartados(sucursalId, tamano),
    queryFn:  async () => {
      const raw = await apiFetch<ApartadosDisponiblesResponse | ApartadoPostal[]>(
        `/ventas/apartados/disponibles?${params}`,
      )
      // normaliza array plano (dist viejo) y objeto { totalDisponibles, lista } (fuente actual)
      if (Array.isArray(raw)) {
        return { totalDisponibles: raw.length, lista: raw } as ApartadosDisponiblesResponse
      }
      return raw
    },
    enabled:  sucursalId > 0,
  })
}

export type EstadoApartado = 'disponible' | 'reservado' | 'ocupado' | 'vencido' | 'mantenimiento'

export function useApartadosPorSucursal(sucursalId: number, tamano?: string) {
  const params = new URLSearchParams({ sucursalId: String(sucursalId) })
  if (tamano) params.set('tamano', tamano)
  return useQuery({
    queryKey: ['ventas', 'apartados-todos', sucursalId, tamano],
    queryFn:  () => apiFetch<ApartadoPostal[]>(`/ventas/apartados/todos?${params}`),
    enabled:  sucursalId > 0,
  })
}

export function usePaisesDestino(servicioId: number) {
  return useQuery({
    queryKey: ['ventas', 'paises-destino', servicioId],
    queryFn:  () => apiFetch<string[]>(`/ventas/servicios-postales/${servicioId}/paises-destino`),
    enabled:  servicioId > 0,
    staleTime: 10 * 60_000,
  })
}

export interface PuntoAdmision { codigo: string; nombre: string }

export function usePuntoAdmision(sucursalId: number) {
  return useQuery({
    queryKey: VENTAS_KEYS.puntoAdmision(sucursalId),
    queryFn:  () => apiFetch<PuntoAdmision>(`/ventas/sucursal/${sucursalId}/punto-admision`),
    enabled:  sucursalId > 0,
    staleTime: Infinity,
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
  ciudadDestino?: string
  tipoTrayecto?: TipoTrayecto
}) {
  const qs = new URLSearchParams()
  qs.set('servicioId', String(params.servicioId))
  qs.set('pesoFisicoKg', String(params.pesoFisicoKg))
  if (params.altoCm !== undefined) qs.set('altoCm', String(params.altoCm))
  if (params.anchoCm !== undefined) qs.set('anchoCm', String(params.anchoCm))
  if (params.largoCm !== undefined) qs.set('largoCm', String(params.largoCm))
  if (params.paisDestino) qs.set('paisDestino', params.paisDestino)
  if (params.ciudadDestino) qs.set('ciudadDestino', params.ciudadDestino)
  if (params.tipoTrayecto) qs.set('tipoTrayecto', params.tipoTrayecto)
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

export function useEliminarEnvioDelCarrito(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (envioId: number) =>
      apiFetch<void>(`/ventas/${ventaId}/carrito/envio/${envioId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
    },
  })
}

export interface ConfirmarVentaPayload {
  medioPago:        MedioPagoVenta
  efectivoRecibido?: number
  emailFactura?:     string
  montoEstampillas?: number
  montoEfectivo?:    number
  estampillasUtilizadas?: { codigo: string; valor: number }[]
  // Tarjeta: baucher siempre, franquicia solo en crédito
  codigoVoucher?:    string
  franquiciaId?:     number
}

export function useConfirmarVenta(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ConfirmarVentaPayload) =>
      apiFetch<ConfirmarVentaResult>(`/ventas/${ventaId}/confirmar?cajaId=${cajaId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
      qc.invalidateQueries({ queryKey: ['ventas', 'turno', cajaId] })
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
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
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
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
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
    },
  })
}

export interface AgregarApartadoPayload {
  sucursalId:     number
  numeroApartado: string
  tamano:         TamanoApartado
  meses:          number
  fechaInicio:    string
  comentarios?:   string
}

export function useAgregarApartadoAlCarrito(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clienteId, ...data }: { clienteId: number } & AgregarApartadoPayload) =>
      apiFetch<{ apartado: ApartadoPostal; cotizacion: { base: number; iva: number; total: number } }>(
        `/ventas/${ventaId}/carrito/apartado?cajaId=${cajaId}&clienteId=${clienteId}`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
      qc.invalidateQueries({ queryKey: ['ventas', 'apartados', result.apartado.sucursalId] })
    },
  })
}

export function useEliminarApartadoDelCarrito(ventaId: number | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (apartadoId: number) =>
      apiFetch<void>(`/ventas/${ventaId}/carrito/apartado/${apartadoId}`, { method: 'DELETE' }),
    onSuccess: () => {
      if (ventaId != null) qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
    },
  })
}

export function useCrearEnvio(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CrearEnvioPayload) =>
      apiFetch<CrearEnvioResult>(`/ventas/punto/${cajaId}/envio`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
      if (variables.clienteId) {
        qc.invalidateQueries({ queryKey: VENTAS_KEYS.direccionesFrecuentes(variables.clienteId) })
      }
    },
  })
}

export interface AgregarEnvioResult {
  guia:                 GuiaEnvio
  envio:                Envio
  cotizacion:           { pesoTarificadoKg: number; valorServicio: number }
  numeroGuia:           string
  estado:               string
  seleccionEstampillas: SeleccionEstampilla[]
}

export function useAgregarEnvioAlCarrito(ventaId: number, cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CrearEnvioPayload) =>
      apiFetch<AgregarEnvioResult>(`/ventas/${ventaId}/carrito/envio?cajaId=${cajaId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.carrito(ventaId) })
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.resumen(cajaId) })
      if (variables.clienteId) {
        qc.invalidateQueries({ queryKey: VENTAS_KEYS.direccionesFrecuentes(variables.clienteId) })
      }
    },
  })
}

// ── Admin CRUD Apartados ──────────────────────────────────────────────────────

export function useAdminApartados(filters: { sucursalId?: number; estado?: string; tamano?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.sucursalId) params.set('sucursalId', String(filters.sucursalId))
  if (filters.estado)     params.set('estado',     filters.estado)
  if (filters.tamano)     params.set('tamano',     filters.tamano)
  return useQuery({
    queryKey: VENTAS_KEYS.apartadosAdmin(filters),
    queryFn:  () => apiFetch<ApartadoAdminItem[]>(`/ventas/admin/apartados?${params}`),
  })
}

export function useCreateApartadoAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sucursalId: number; numero: string; tamano: string; diasAlertaVencimiento?: number }) =>
      apiFetch<ApartadoPostal>('/ventas/admin/apartados', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ventas', 'apartados-admin'] }),
  })
}

export function useUpdateApartadoAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; tamano?: string; estado?: string; diasAlertaVencimiento?: number }) =>
      apiFetch<ApartadoPostal>(`/ventas/admin/apartados/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ventas', 'apartados-admin'] }),
  })
}

export function useDeleteApartadoAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/ventas/admin/apartados/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ventas', 'apartados-admin'] }),
  })
}

// ── Alertas de apartados (Dashboard Supervisor) ───────────────────────────────

export interface AlertaApartado {
  id:             number
  numero:         string
  sucursalId:     number
  sucursalNombre: string
  estado:         string
  fechaFin:       string | null
  diasRestantes:  number | null
}

export interface AlertasApartadosResponse {
  proximos: AlertaApartado[]
  vencidos: AlertaApartado[]
}

export function useAlertasApartados(sucursalId?: number) {
  return useQuery({
    queryKey:       ['ventas', 'alertas-apartados', sucursalId],
    queryFn:        () => apiFetch<AlertasApartadosResponse>(
      `/ventas/alertas/apartados${sucursalId ? `?sucursalId=${sucursalId}` : ''}`,
    ),
    staleTime:      5 * 60_000,
    refetchInterval: 10 * 60_000,
  })
}

// ── Anulaciones pendientes (Dashboard Supervisor) ────────────────────────────

export interface AnulacionPendiente {
  id:                number
  referenciaId:      number
  referenciaTipo:    string
  motivo:            string
  estado:            string
  solicitanteNombre: string | null
  sucursalId:        number | null
  createdAt:         string
}

export function useAnulacionesPendientes(sucursalId?: number) {
  return useQuery({
    queryKey:       ['ventas', 'anulaciones-pendientes', sucursalId],
    queryFn:        () => apiFetch<AnulacionPendiente[]>(
      `/ventas/alertas/anulaciones${sucursalId ? `?sucursalId=${sucursalId}` : ''}`,
    ),
    staleTime:      60_000,
    refetchInterval: 5 * 60_000,
  })
}

// ── Resúmenes del turno para múltiples cajas (Dashboard Supervisor) ───────────

export function useResumenesPunto(cajaIds: number[]) {
  return useQueries({
    queries: cajaIds.map(id => ({
      queryKey:  VENTAS_KEYS.resumen(id),
      queryFn:   () => apiFetch<ResumenTurno>(`/ventas/punto/${id}/resumen`),
      enabled:   id > 0,
      staleTime: 60_000,
    })),
  })
}

export function useDireccionesFrecuentes(clienteId: number, rol?: 'remitente' | 'destinatario') {
  const params = new URLSearchParams()
  if (rol) params.set('rol', rol)
  const qs = params.toString() ? `?${params}` : ''
  return useQuery({
    queryKey: VENTAS_KEYS.direccionesFrecuentes(clienteId, rol),
    queryFn:  () => apiFetch<DireccionFrecuente[]>(`/ventas/clientes/${clienteId}/direcciones${qs}`),
    enabled:  clienteId > 0,
    staleTime: 60_000,
  })
}

export interface GuardarDireccionPayload {
  rol:          'remitente' | 'destinatario'
  nombre:       string
  empresa?:     string
  telefono?:    string
  email?:       string
  direccion?:   string
  ciudad?:      string
  departamento?: string
  pais?:        string
  codigoPostal?: string
  documento?:   string
}

export function useGuardarDireccionFrecuente(clienteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: GuardarDireccionPayload) =>
      apiFetch<void>(`/ventas/clientes/${clienteId}/direcciones`, {
        method: 'POST',
        body: JSON.stringify({ pais: 'CO', ...data }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENTAS_KEYS.direccionesFrecuentes(clienteId) })
    },
  })
}

export function useDireccionesPorDocumento(documento: string, rol?: 'remitente' | 'destinatario') {
  const params = new URLSearchParams({ documento })
  if (rol) params.set('rol', rol)
  return useQuery({
    queryKey: ['ventas', 'direcciones-doc', documento, rol],
    queryFn:  () => apiFetch<DireccionFrecuente[]>(`/ventas/direcciones?${params}`),
    enabled:  documento.trim().length >= 3,
    staleTime: 60_000,
  })
}

export function useVentasDia(sucursalId: number) {
  return useQuery({
    queryKey:        VENTAS_KEYS.dia(sucursalId),
    queryFn:         () => apiFetch<VentaDia[]>(`/ventas/sucursal/${sucursalId}/dia`),
    enabled:         sucursalId > 0,
    staleTime:       30_000,
    refetchInterval: 60_000,
  })
}

export function useSaldoAFavor(clienteId: number) {
  return useQuery({
    queryKey: VENTAS_KEYS.saldoAFavor(clienteId),
    queryFn:  () => apiFetch<{ saldo: number }>(`/ventas/clientes/${clienteId}/saldo-a-favor`),
    enabled:  clienteId > 0,
    staleTime: 30_000,
  })
}

export function useConversionMoneda() {
  return useMutation({
    mutationFn: ({ valorCop, trmDia }: { valorCop: number; trmDia: number }) =>
      apiFetch<{ valorCop: number; valorUsd: number; trmDia: number }>(
        `/ventas/conversion-moneda?valorCop=${valorCop}&trmDia=${trmDia}`,
      ),
  })
}

export async function descargarGuiaEnvioPdf(envioId: number, numeroGuia?: string) {
  const blob = await apiFetchBlob(`/ventas/envios/${envioId}/guia-pdf`)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `guia-${numeroGuia ?? envioId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

/** Abre el PDF oficial del backend en una pestaña, listo para imprimir. */
export async function abrirGuiaEnvioPdf(envioId: number) {
  const blob = await apiFetchBlob(`/ventas/envios/${envioId}/guia-pdf`)
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  win?.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
  if (!win) URL.revokeObjectURL(url)
}

export async function abrirReciboPdf(ventaId: number, efectivoRecibido?: number) {
  const qs   = efectivoRecibido != null ? `?efectivo=${efectivoRecibido}` : ''
  const blob = await apiFetchBlob(`/ventas/${ventaId}/recibo-pdf${qs}`)
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  // Liberar el object URL después de que el browser lo cargue
  win?.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
  if (!win) URL.revokeObjectURL(url)
}
