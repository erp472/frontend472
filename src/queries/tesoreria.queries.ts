import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type TipoMovimientoTesoreria = 'apertura' | 'ingreso' | 'egreso'

export interface CajeroActivo {
  sesionId:   number
  cajaNombre: string
  cajero:     string
  saldo:      string
}

export interface CajaPrincipalTesoreria {
  cajaPadreId:      number
  nombre:           string
  sucursalId:       number
  sucursalNombre:   string
  regionalNombre:   string
  comercioNombre:   string
  supervisorId:     number | null
  supervisorNombre: string | null
  baseAsignada:     string
  efectivoEnPunto:  string
  cajerosActivos:   CajeroActivo[]
  tieneApertura:    boolean
  ultimoMovimiento: string | null
}

export interface MovimientoTesoreria {
  id:               number
  cajaPadreId:      number
  puntoNombre:      string
  sucursalNombre:   string
  tipo:             TipoMovimientoTesoreria
  monto:            string
  codigoAprobacion: string
  descripcion:      string
  saldoResultante:  string
  registradoPor:    string
  createdAt:        string
}

export interface HistorialFiltros {
  cajaPadreId?: number
  tipo?:        TipoMovimientoTesoreria
  desde?:       string
  hasta?:       string
  limite?:      number
  pagina?:      number
}

export const TESORERIA_KEYS = {
  all:         ()                        => ['tesoreria'] as const,
  principales: ()                        => ['tesoreria', 'cajas-principales'] as const,
  movimientos: (f: HistorialFiltros)     => ['tesoreria', 'movimientos', f] as const,
}

export function useCajasPrincipalesTesoreria() {
  return useQuery({
    queryKey: TESORERIA_KEYS.principales(),
    queryFn:  () => apiFetch<CajaPrincipalTesoreria[]>('/tesoreria/cajas-principales'),
  })
}

export function useMovimientosTesoreria(filtros: HistorialFiltros = {}) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return useQuery({
    queryKey: TESORERIA_KEYS.movimientos(filtros),
    queryFn:  () => apiFetch<MovimientoTesoreria[]>(`/tesoreria/movimientos${qs ? `?${qs}` : ''}`),
  })
}

export interface RegistrarMovimientoInput {
  cajaPadreId:      number
  tipo:             TipoMovimientoTesoreria
  monto:            string
  codigoAprobacion: string
  descripcion:      string
}

export function useRegistrarMovimientoTesoreria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cajaPadreId, tipo, ...body }: RegistrarMovimientoInput) =>
      apiFetch<MovimientoTesoreria>(`/tesoreria/cajas-principales/${cajaPadreId}/${tipo}`, {
        method: 'POST',
        body:   JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: TESORERIA_KEYS.all() }),
  })
}
