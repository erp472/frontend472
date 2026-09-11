import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'

// Types defined locally since they don't exist in @/types/api
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FeatureFlagResponse = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RolDisponible = any

// ── Cache keys ────────────────────────────────────────────────────────────────

export const EntornoSchema    = z.enum(['all', 'dev', 'staging', 'prod'])
export const PlataformaSchema = z.enum(['all', 'web', 'tauri'])
export type Entorno    = z.infer<typeof EntornoSchema>
export type Plataforma = z.infer<typeof PlataformaSchema>

export const FeatureFlagSchema = z.object({
  id:          z.number(),
  codigo:      z.string(),
  descripcion: z.string().nullable(),
  activo:      z.boolean(),
  entorno:     EntornoSchema,
  plataforma:  PlataformaSchema,
  createdAt:   z.string(),
  updatedAt:   z.string(),
})
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>

export const FeatureFlagActivoSchema = z.object({
  codigo:     z.string(),
  entorno:    EntornoSchema,
  plataforma: PlataformaSchema,
})
export type FeatureFlagActivo = z.infer<typeof FeatureFlagActivoSchema>

// ── Keys ──────────────────────────────────────────────────────────────────────

export const ffKeys = {
  all:    ()                        => ['feature-flags'] as const,
  list:   (e?: string)              => [...ffKeys.all(), 'list', e ?? 'all'] as const,
  detail: (id: number)              => [...ffKeys.all(), 'detail', id] as const,
  activos:(e: string, p: string)    => [...ffKeys.all(), 'activos', e, p] as const,
  roles:  ()                        => ['feature-flags', 'roles'] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useFeatureFlags() {
  return useQuery({
    queryKey: ffKeys.all(),
    queryFn:  () => apiFetch<FeatureFlagResponse[]>('/feature-flags'),
  })
}

export function useFeatureFlagsActivos(
  opts: { entorno?: string; plataforma?: string } = {},
) {
  const { entorno = 'dev', plataforma = 'all' } = opts
  const params = new URLSearchParams({ entorno, plataforma }).toString()
  return useQuery({
    queryKey: ffKeys.activos(entorno, plataforma),
    queryFn:  () =>
      apiFetch(`/feature-flags/activos?${params}`, {}, z.array(FeatureFlagActivoSchema)),
    staleTime: 0,
  })
}

// Roles reales del backend (/permisos/roles) — RolEntry de permisos.queries.ts
// está desactualizado (asume otro contrato), por eso se define aparte aquí.
export function useRolesDisponibles() {
  return useQuery({
    queryKey: ffKeys.roles(),
    queryFn:  () => apiFetch<RolDisponible[]>('/permisos/roles'),
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { codigo: string; descripcion?: string; activo?: boolean; entorno?: Entorno }) =>
      apiFetch('/feature-flags', { method: 'POST', body: JSON.stringify(data) }, FeatureFlagSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useToggleFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      apiFetch(`/feature-flags/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) }, FeatureFlagSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; descripcion?: string; activo?: boolean; entorno?: Entorno }) =>
      apiFetch(`/feature-flags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, FeatureFlagSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/feature-flags/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useAsignarRolFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rolId }: { id: number; rolId: number }) =>
      apiFetch(`/feature-flags/${id}/roles`, { method: 'POST', body: JSON.stringify({ rolId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useRevocarRolFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rolId }: { id: number; rolId: number }) =>
      apiFetch(`/feature-flags/${id}/roles/${rolId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useAsignarUsuarioFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, usuarioId }: { id: number; usuarioId: number }) =>
      apiFetch(`/feature-flags/${id}/usuarios`, { method: 'POST', body: JSON.stringify({ usuarioId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useRevocarUsuarioFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, usuarioId }: { id: number; usuarioId: number }) =>
      apiFetch(`/feature-flags/${id}/usuarios/${usuarioId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}
