import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  RegionalResponse, PaginatedRegionales,
  RegionalQueryParams, CreateRegionalInput, UpdateRegionalInput,
} from '@/types/api'

export type MedioPagoConsolidado =
  | 'efectivo' | 'tarjetaDebito' | 'tarjetaCredito'
  | 'transferencia' | 'consignacion' | 'preporteado' | 'mixtoPreporteado'

export interface ConsolidadoRegional {
  regionalId:    number
  total:         string
  porMedio:      Record<MedioPagoConsolidado, string>
  numSucursales: number
}

export interface SucursalesActivasResult {
  total:      number
  activas:    number
  inactivas:  number
  pctActivas: number
}

export const REGIONAL_KEYS = {
  all:              ()              => ['regionales'] as const,
  list:             (p: RegionalQueryParams) => ['regionales', 'list', p] as const,
  detail:           (id: number)   => ['regionales', id] as const,
  consolidado:      (id: number)   => ['regionales', id, 'consolidado'] as const,
  sucursalesActivas:(id: number)   => ['regionales', id, 'sucursales-activas'] as const,
}

export function useRegionales(params: RegionalQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.comercio_id != null) qs.set('comercio_id', String(params.comercio_id))
  if (params.buscar)              qs.set('buscar', params.buscar)
  if (params.activo != null)      qs.set('activo', String(params.activo))
  if (params.pagina)              qs.set('pagina', String(params.pagina))
  if (params.limite)              qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        REGIONAL_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedRegionales>(`/regionales?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useRegional(id: number) {
  return useQuery({
    queryKey: REGIONAL_KEYS.detail(id),
    queryFn:  () => apiFetch<RegionalResponse>(`/regionales/${id}`),
    enabled:  !!id,
  })
}

export function useCreateRegional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRegionalInput) =>
      apiFetch<RegionalResponse>('/regionales', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: REGIONAL_KEYS.all() }),
  })
}

export function useUpdateRegional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRegionalInput }) =>
      apiFetch<RegionalResponse>(`/regionales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: REGIONAL_KEYS.all() })
      qc.invalidateQueries({ queryKey: REGIONAL_KEYS.detail(id) })
    },
  })
}

export function useDeleteRegional() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<RegionalResponse>(`/regionales/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: REGIONAL_KEYS.all() }),
  })
}

export function useConsolidadoRegional(id: number) {
  return useQuery({
    queryKey:        REGIONAL_KEYS.consolidado(id),
    queryFn:         () => apiFetch<ConsolidadoRegional>(`/regionales/${id}/consolidado`),
    enabled:         id > 0,
    staleTime:       2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

export function useSucursalesActivasRegional(id: number) {
  return useQuery({
    queryKey:        REGIONAL_KEYS.sucursalesActivas(id),
    queryFn:         () => apiFetch<SucursalesActivasResult>(`/regionales/${id}/sucursales-activas`),
    enabled:         id > 0,
    staleTime:       60_000,
    refetchInterval: 5 * 60_000,
  })
}
