import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type {
  CreateFeatureFlagInput,
  FeatureFlagResponse,
  RolDisponible,
  UpdateFeatureFlagInput,
} from '@/types/api'

// ── Cache keys ────────────────────────────────────────────────────────────────

export const FEATURE_FLAGS_KEYS = {
  all:    ()           => ['feature-flags'] as const,
  detail: (id: number) => ['feature-flags', id] as const,
  roles:  ()           => ['feature-flags', 'roles-disponibles'] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFeatureFlags() {
  return useQuery({
    queryKey: FEATURE_FLAGS_KEYS.all(),
    queryFn:  () => apiFetch<FeatureFlagResponse[]>('/feature-flags'),
  })
}

export function useFeatureFlag(id: number) {
  return useQuery({
    queryKey: FEATURE_FLAGS_KEYS.detail(id),
    queryFn:  () => apiFetch<FeatureFlagResponse>(`/feature-flags/${id}`),
    enabled:  !!id,
  })
}

// Roles reales del backend (/permisos/roles) — RolEntry de permisos.queries.ts
// está desactualizado (asume otro contrato), por eso se define aparte aquí.
export function useRolesDisponibles() {
  return useQuery({
    queryKey: FEATURE_FLAGS_KEYS.roles(),
    queryFn:  () => apiFetch<RolDisponible[]>('/permisos/roles'),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateFeatureFlagInput) =>
      apiFetch<FeatureFlagResponse>('/feature-flags', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() }),
  })
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFeatureFlagInput }) =>
      apiFetch<FeatureFlagResponse>(`/feature-flags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() })
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.detail(id) })
    },
  })
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ id: number; eliminado: boolean }>(`/feature-flags/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() }),
  })
}

// ── Segmentación por rol ──────────────────────────────────────────────────────

export function useAsignarRolFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rolId }: { id: number; rolId: number }) =>
      apiFetch<FeatureFlagResponse>(`/feature-flags/${id}/roles`, {
        method: 'POST',
        body:   JSON.stringify({ rolId }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() })
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.detail(id) })
    },
  })
}

export function useRevocarRolFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rolId }: { id: number; rolId: number }) =>
      apiFetch<FeatureFlagResponse>(`/feature-flags/${id}/roles/${rolId}`, { method: 'DELETE' }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() })
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.detail(id) })
    },
  })
}

// ── Segmentación por usuario ──────────────────────────────────────────────────

export function useAsignarUsuarioFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, usuarioId }: { id: number; usuarioId: number }) =>
      apiFetch<FeatureFlagResponse>(`/feature-flags/${id}/usuarios`, {
        method: 'POST',
        body:   JSON.stringify({ usuarioId }),
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() })
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.detail(id) })
    },
  })
}

export function useRevocarUsuarioFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, usuarioId }: { id: number; usuarioId: number }) =>
      apiFetch<FeatureFlagResponse>(`/feature-flags/${id}/usuarios/${usuarioId}`, { method: 'DELETE' }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.all() })
      qc.invalidateQueries({ queryKey: FEATURE_FLAGS_KEYS.detail(id) })
    },
  })
}
