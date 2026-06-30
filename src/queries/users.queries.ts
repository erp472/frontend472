import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  CreateUserInput,
  PaginatedUsers,
  UpdateUserInput,
  UserQueryParams,
  UserResponse,
} from '@/types/api'

// ── Cache keys ────────────────────────────────────────────────────────────────

export const USER_KEYS = {
  all:    ()       => ['users'] as const,
  list:   (p: UserQueryParams) => ['users', 'list', p] as const,
  detail: (id: string) => ['users', id] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useUsers(params: UserQueryParams = {}) {
  const qs = new URLSearchParams()
  if (params.buscar)           qs.set('buscar',      params.buscar)
  if (params.rol)              qs.set('rol',          params.rol)
  if (params.activo != null)   qs.set('activo',       String(params.activo))
  if (params.pagina)           qs.set('pagina',       String(params.pagina))
  if (params.limite)           qs.set('limite',       String(params.limite))

  return useQuery({
    queryKey:       USER_KEYS.list(params),
    queryFn:        () => apiFetch<PaginatedUsers>(`/users?${qs.toString()}`),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: USER_KEYS.detail(id),
    queryFn:  () => apiFetch<UserResponse>(`/users/${id}`),
    enabled:  !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserInput) =>
      apiFetch<UserResponse>('/users', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all() }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      apiFetch<UserResponse>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: USER_KEYS.all() })
      qc.invalidateQueries({ queryKey: USER_KEYS.detail(id) })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all() }),
  })
}
