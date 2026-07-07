import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  SucursalResponse, PaginatedSucursales,
  SucursalQueryParams, CreateSucursalInput, UpdateSucursalInput,
} from '@/types/api'

export const SUCURSAL_KEYS = {
  all:    ()                          => ['sucursales'] as const,
  list:   (p: SucursalQueryParams)    => ['sucursales', 'list', p] as const,
  detail: (id: number)                => ['sucursales', id] as const,
}

export function useSucursales(params: SucursalQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.regional_id != null) qs.set('regional_id', String(params.regional_id))
  if (params.ciudad_id != null)   qs.set('ciudad_id',   String(params.ciudad_id))
  if (params.tipo)                qs.set('tipo',         params.tipo)
  if (params.buscar)              qs.set('buscar',       params.buscar)
  if (params.activo != null)      qs.set('activo',       String(params.activo))
  if (params.pagina)              qs.set('pagina',       String(params.pagina))
  if (params.limite)              qs.set('limite',       String(params.limite))

  return useQuery({
    queryKey:        SUCURSAL_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedSucursales>(`/sucursales?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useSucursal(id: number) {
  return useQuery({
    queryKey: SUCURSAL_KEYS.detail(id),
    queryFn:  () => apiFetch<SucursalResponse>(`/sucursales/${id}`),
    enabled:  !!id,
  })
}

export function useCreateSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSucursalInput) =>
      apiFetch<SucursalResponse>('/sucursales', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUCURSAL_KEYS.all() }),
  })
}

export function useUpdateSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSucursalInput }) =>
      apiFetch<SucursalResponse>(`/sucursales/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: SUCURSAL_KEYS.all() })
      qc.invalidateQueries({ queryKey: SUCURSAL_KEYS.detail(id) })
    },
  })
}

export function useDeleteSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<SucursalResponse>(`/sucursales/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUCURSAL_KEYS.all() }),
  })
}
