import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  ServicioResponse, PaginatedServicios,
  ServicioQueryParams, CreateServicioInput, UpdateServicioInput,
} from '@/types/api'

export const SERVICIO_KEYS = {
  all:    ()                        => ['servicios'] as const,
  list:   (p: ServicioQueryParams)  => ['servicios', 'list', p] as const,
  detail: (id: number)              => ['servicios', id] as const,
}

export function useServicios(params: ServicioQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.tipo)           qs.set('tipo',   params.tipo)
  if (params.buscar)         qs.set('buscar', params.buscar)
  if (params.activo != null) qs.set('activo', String(params.activo))
  if (params.pagina)         qs.set('pagina', String(params.pagina))
  if (params.limite)         qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        SERVICIO_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedServicios>(`/servicios?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateServicioInput) =>
      apiFetch<ServicioResponse>('/servicios', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVICIO_KEYS.all() }),
  })
}

export function useUpdateServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateServicioInput }) =>
      apiFetch<ServicioResponse>(`/servicios/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: SERVICIO_KEYS.all() })
      qc.invalidateQueries({ queryKey: SERVICIO_KEYS.detail(id) })
    },
  })
}

export function useDeleteServicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<ServicioResponse>(`/servicios/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVICIO_KEYS.all() }),
  })
}
