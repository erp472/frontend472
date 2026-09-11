import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  ComercioResponse, PaginatedComercios,
  ComercioQueryParams, CreateComercioInput, UpdateComercioInput,
} from '@/types/api'

export const COMERCIO_KEYS = {
  all:    ()                          => ['comercios'] as const,
  list:   (p: ComercioQueryParams)    => ['comercios', 'list', p] as const,
  detail: (id: number)                => ['comercios', id] as const,
}

export function useComercios(params: ComercioQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.buscar)          qs.set('buscar', params.buscar)
  if (params.activo != null)  qs.set('activo', String(params.activo))
  if (params.pagina)          qs.set('pagina', String(params.pagina))
  if (params.limite)          qs.set('limite', String(params.limite))

  return useQuery({
    queryKey:        COMERCIO_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedComercios>(`/comercios?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useComercio(id: number) {
  return useQuery({
    queryKey: COMERCIO_KEYS.detail(id),
    queryFn:  () => apiFetch<ComercioResponse>(`/comercios/${id}`),
    enabled:  !!id,
  })
}

export function useCreateComercio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateComercioInput) =>
      apiFetch<ComercioResponse>('/comercios', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMERCIO_KEYS.all() }),
  })
}

export function useUpdateComercio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateComercioInput }) =>
      apiFetch<ComercioResponse>(`/comercios/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: COMERCIO_KEYS.all() })
      qc.invalidateQueries({ queryKey: COMERCIO_KEYS.detail(id) })
    },
  })
}

export function useDeleteComercio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<ComercioResponse>(`/comercios/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMERCIO_KEYS.all() }),
  })
}
