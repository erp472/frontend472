import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoDocumento = 'cedula' | 'pasaporte' | 'tarjeta_identidad' | 'cedula_extranjeria' | 'nit'

export interface TipoCliente {
  id:                  number
  codigo:              string
  nombre:              string
  descuentoPorcentaje: string
  aplicaEstampillas:   boolean
  aplicaGirosSisben:   boolean
  activo:              boolean
  vigenciaInicio:      string | null
  vigenciaFin:         string | null
  createdAt:           string
}

export interface Cliente {
  id:              number
  tipoDocumento:   TipoDocumento
  numeroDocumento: string
  nombre:          string
  apellido:        string | null
  nombreCompleto:  string
  email:           string | null
  telefono:        string | null
  direccion:       string | null
  ciudad:          string | null
  codigoPostal:    string | null
  tipoClienteId:   number | null
  tipoCliente:     TipoCliente | null
  /** 'retail' si no tiene tipo asignado, o el código del tipo */
  canal:           string
  nivelSisben:     number | null
  enviosSisbenAno: number
  activo:          boolean
  createdAt:       string
  updatedAt:       string
}

export interface SearchClienteResult {
  total:  number
  limit:  number
  offset: number
  items:  Cliente[]
}

export interface SearchClienteParams {
  tipoDocumento?:   TipoDocumento
  numeroDocumento?: string
  nombre?:          string
  tipoClienteId?:   number
  limit?:           number
  offset?:          number
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const CLIENTES_KEYS = {
  tipos:   ()                       => ['clientes', 'tipos']            as const,
  search:  (p: SearchClienteParams) => ['clientes', 'search', p]        as const,
  byDoc:   (t: string, n: string)   => ['clientes', 'doc', t, n]        as const,
  byId:    (id: number)             => ['clientes', 'id', id]           as const,
}

// ── Tipos de cliente ───────────────────────────────────────────────────────────

export function useTiposCliente(soloActivos = false) {
  return useQuery({
    queryKey: CLIENTES_KEYS.tipos(),
    queryFn:  () => apiFetch<TipoCliente[]>(`/clientes/tipos${soloActivos ? '?activos=true' : ''}`),
  })
}

export function useCreateTipoCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      codigo: string; nombre: string; descuentoPorcentaje?: string
      aplicaEstampillas?: boolean; aplicaGirosSisben?: boolean
      vigenciaInicio?: string | null; vigenciaFin?: string | null
    }) => apiFetch<TipoCliente>('/clientes/tipos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEYS.tipos() }),
  })
}

export function useUpdateTipoCliente(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      nombre?: string; descuentoPorcentaje?: string
      aplicaEstampillas?: boolean; aplicaGirosSisben?: boolean
      activo?: boolean; vigenciaInicio?: string | null; vigenciaFin?: string | null
    }) => apiFetch<TipoCliente>(`/clientes/tipos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEYS.tipos() }),
  })
}

export function useDeleteTipoCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/clientes/tipos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CLIENTES_KEYS.tipos() }),
  })
}

// ── Clientes ──────────────────────────────────────────────────────────────────

export function useSearchClientes(params: SearchClienteParams, enabled = true) {
  const query = new URLSearchParams()
  if (params.tipoDocumento)   query.set('tipoDocumento',   params.tipoDocumento)
  if (params.numeroDocumento) query.set('numeroDocumento', params.numeroDocumento)
  if (params.nombre)          query.set('nombre',          params.nombre)
  if (params.tipoClienteId)   query.set('tipoClienteId',   String(params.tipoClienteId))
  if (params.limit)           query.set('limit',           String(params.limit))
  if (params.offset)          query.set('offset',          String(params.offset))
  return useQuery({
    queryKey: CLIENTES_KEYS.search(params),
    queryFn:  () => apiFetch<SearchClienteResult>(`/clientes?${query}`),
    enabled,
  })
}

export function useBuscarClientePorDoc(tipoDocumento: string, numeroDocumento: string, enabled = true) {
  return useQuery({
    queryKey: CLIENTES_KEYS.byDoc(tipoDocumento, numeroDocumento),
    queryFn:  () => apiFetch<Cliente | null>(`/clientes/buscar?tipoDocumento=${tipoDocumento}&numeroDocumento=${encodeURIComponent(numeroDocumento)}`),
    enabled:  enabled && !!tipoDocumento && !!numeroDocumento,
    staleTime: 30_000,
  })
}

export function useCliente(id: number) {
  return useQuery({
    queryKey: CLIENTES_KEYS.byId(id),
    queryFn:  () => apiFetch<Cliente>(`/clientes/${id}`),
    enabled:  id > 0,
  })
}

export function useCreateCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      tipoDocumento: TipoDocumento; numeroDocumento: string
      nombre: string; apellido?: string; email?: string; telefono?: string
      direccion?: string; ciudad?: string; codigoPostal?: string
      tipoClienteId?: number | null; nivelSisben?: number | null
    }) => apiFetch<Cliente>('/clientes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes', 'search'] }),
  })
}

export function useUpdateCliente(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      nombre?: string; apellido?: string; email?: string | null
      telefono?: string | null; direccion?: string | null
      ciudad?: string | null; codigoPostal?: string | null
      tipoClienteId?: number | null; nivelSisben?: number | null; activo?: boolean
    }) => apiFetch<Cliente>(`/clientes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTES_KEYS.byId(id) })
      qc.invalidateQueries({ queryKey: ['clientes', 'search'] })
    },
  })
}
