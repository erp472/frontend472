import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoStock = 'ok' | 'bajo' | 'critico'

export interface SucursalInventarioItem {
  id:             number
  codigo:         string
  nombre:         string
  totalProductos: number
  alertas:        number
}

export interface AlertaSucursal {
  sucursalId:      number
  sucursalNombre:  string
  bajo:            number
  critico:         number
}

export interface StockItem {
  productoId:          number
  productoCodigo:      string
  productoNombre:      string
  productoTipo:        string
  stockActual:         number
  stockMinimo:         number
  estado:              EstadoStock
  ultimaActualizacion: string | null
}

export interface MovimientoItem {
  id:                number
  tipo:              string
  cantidad:          number
  cantidadAnterior:  number
  cantidadPosterior: number
  referenciaId:      number | null
  referenciaTipo:    string | null
  observacion:       string | null
  fecha:             string
  producto: { id: number; codigo: string; nombre: string }
}

export interface StockResponse      { datos: StockItem[];       total: number }
export interface MovimientosResponse { datos: MovimientoItem[]; total: number }

export interface QueryStockParams {
  buscar?:      string
  soloConStock?: boolean
  estado?:      EstadoStock
  pagina?:      number
  limite?:      number
}

export interface EntradaPayload {
  productoId:   number
  cantidad:     number
  observacion?: string
}

export interface QueryMovimientosParams {
  productoId?: number
  tipo?:       'entrada' | 'salida' | 'ajuste' | 'devolucion'
  pagina?:     number
  limite?:     number
}

export interface AjustePayload {
  productoId:    number
  cantidad_nueva: number
  observacion?:  string
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const INVENTARIO_KEYS = {
  sucursales:  ()                                                => ['inventario', 'sucursales'] as const,
  alertas:     ()                                                => ['inventario', 'alertas'] as const,
  stock:       (sucursalId: number, p?: QueryStockParams)       => ['inventario', 'stock',       sucursalId, p] as const,
  movimientos: (sucursalId: number, p?: QueryMovimientosParams) => ['inventario', 'movimientos', sucursalId, p] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useInventarioSucursales() {
  return useQuery({
    queryKey: INVENTARIO_KEYS.sucursales(),
    queryFn:  () => apiFetch<SucursalInventarioItem[]>('/inventario/sucursales'),
    staleTime: 60_000,
  })
}

export function useAlertasStock() {
  return useQuery({
    queryKey:       INVENTARIO_KEYS.alertas(),
    queryFn:        () => apiFetch<AlertaSucursal[]>('/inventario/alertas'),
    staleTime:      60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useStock(sucursalId: number, params: QueryStockParams = {}, enabled = true) {
  const qs = new URLSearchParams()
  if (params.buscar)                        qs.set('buscar',      params.buscar)
  if (params.soloConStock !== undefined)    qs.set('soloConStock', String(params.soloConStock))
  if (params.estado)                        qs.set('estado',      params.estado)
  if (params.pagina !== undefined)          qs.set('pagina',      String(params.pagina))
  if (params.limite !== undefined)          qs.set('limite',      String(params.limite))

  return useQuery({
    queryKey: INVENTARIO_KEYS.stock(sucursalId, params),
    queryFn:  () => apiFetch<StockResponse>(`/inventario/sucursal/${sucursalId}?${qs}`),
    enabled:  enabled && sucursalId > 0,
    staleTime: 30_000,
  })
}

export function useMovimientos(sucursalId: number, params: QueryMovimientosParams = {}, enabled = true) {
  const qs = new URLSearchParams()
  if (params.productoId !== undefined) qs.set('productoId', String(params.productoId))
  if (params.tipo)                     qs.set('tipo',       params.tipo)
  if (params.pagina !== undefined)     qs.set('pagina',     String(params.pagina))
  if (params.limite !== undefined)     qs.set('limite',     String(params.limite))

  return useQuery({
    queryKey: INVENTARIO_KEYS.movimientos(sucursalId, params),
    queryFn:  () => apiFetch<MovimientosResponse>(`/inventario/sucursal/${sucursalId}/movimientos?${qs}`),
    enabled:  enabled && sucursalId > 0,
    staleTime: 20_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useAjusteInventario(sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AjustePayload) =>
      apiFetch<StockItem>(`/inventario/sucursal/${sucursalId}/ajuste`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'stock',       sucursalId] })
      qc.invalidateQueries({ queryKey: ['inventario', 'movimientos', sucursalId] })
      qc.invalidateQueries({ queryKey: ['inventario', 'alertas'] })
      qc.invalidateQueries({ queryKey: ['inventario', 'sucursales'] })
    },
  })
}

// ── Órdenes de inventario ─────────────────────────────────────────────────────

export interface OrdenInventarioItem {
  id:              number
  productoId:      number
  productoCodigo:  string | null
  productoNombre:  string | null
  cantidadEnviada: number
  cantidadRecibida: number | null
  estado:          string
}

export interface OrdenInventario {
  id:             number
  sucursalId:     number
  sucursalNombre: string | null
  estado:         string
  createdAt:      string
  items:          OrdenInventarioItem[]
}

export const ORDENES_KEYS = {
  list:      (sucursalId?: number, estado?: string) => ['inventario', 'ordenes', sucursalId, estado] as const,
  pendientes: (sucursalId?: number)                 => ['inventario', 'ordenes-pendientes', sucursalId] as const,
}

export function useOrdenesPendientes(sucursalId?: number) {
  return useQuery({
    queryKey:       ORDENES_KEYS.pendientes(sucursalId),
    queryFn:        () => apiFetch<OrdenInventario[]>(
      `/inventario/ordenes/pendientes${sucursalId ? `?sucursalId=${sucursalId}` : ''}`,
    ),
    staleTime:      60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useOrdenes(sucursalId?: number, estado?: string) {
  return useQuery({
    queryKey: ORDENES_KEYS.list(sucursalId, estado),
    queryFn:  () => {
      const qs = new URLSearchParams()
      if (sucursalId) qs.set('sucursalId', String(sucursalId))
      if (estado)     qs.set('estado', estado)
      return apiFetch<OrdenInventario[]>(`/inventario/ordenes?${qs}`)
    },
    staleTime: 30_000,
  })
}

export function useCrearOrden() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { sucursalId: number; items: { productoId: number; cantidadEnviada: number }[] }) =>
      apiFetch<OrdenInventario>('/inventario/ordenes', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'ordenes'] })
    },
  })
}

export function useActualizarEstadoOrden() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      apiFetch<OrdenInventario>(`/inventario/ordenes/${id}/estado`, {
        method: 'PATCH',
        body:   JSON.stringify({ estado }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'ordenes'] })
    },
  })
}

export function useEntradaInventario(sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EntradaPayload) =>
      apiFetch<StockItem>(`/inventario/sucursal/${sucursalId}/entrada`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventario', 'stock',       sucursalId] })
      qc.invalidateQueries({ queryKey: ['inventario', 'movimientos', sucursalId] })
      qc.invalidateQueries({ queryKey: ['inventario', 'alertas'] })
      qc.invalidateQueries({ queryKey: ['inventario', 'sucursales'] })
    },
  })
}
