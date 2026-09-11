import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  EquipoResponse, PaginatedEquipos,
  EquipoQueryParams, CreateEquipoInput, UpdateEquipoInput,
} from '@/types/api'

export const EQUIPO_KEYS = {
  all:    ()                       => ['equipos'] as const,
  list:   (p: EquipoQueryParams)   => ['equipos', 'list', p] as const,
  detail: (id: number)             => ['equipos', id] as const,
}

export function useEquipos(params: EquipoQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.sucursal_id != null)      qs.set('sucursal_id',      String(params.sucursal_id))
  if (params.sistema_operativo)        qs.set('sistema_operativo', params.sistema_operativo)
  if (params.buscar)                   qs.set('buscar',            params.buscar)
  if (params.activo != null)           qs.set('activo',            String(params.activo))
  if (params.pagina)                   qs.set('pagina',            String(params.pagina))
  if (params.limite)                   qs.set('limite',            String(params.limite))

  return useQuery({
    queryKey:        EQUIPO_KEYS.list(params),
    queryFn:         () => apiFetch<PaginatedEquipos>(`/equipos?${qs}`),
    placeholderData: keepPreviousData,
  })
}

export function useCreateEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEquipoInput) =>
      apiFetch<EquipoResponse>('/equipos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: EQUIPO_KEYS.all() }),
  })
}

export function useUpdateEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEquipoInput }) =>
      apiFetch<EquipoResponse>(`/equipos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: EQUIPO_KEYS.all() })
      qc.invalidateQueries({ queryKey: EQUIPO_KEYS.detail(id) })
    },
  })
}

export function useDeleteEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<EquipoResponse>(`/equipos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: EQUIPO_KEYS.all() }),
  })
}
