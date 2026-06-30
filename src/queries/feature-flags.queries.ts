import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'

// ── Schemas ───────────────────────────────────────────────────────────────────

export const EntornoSchema = z.enum(['all', 'dev', 'staging', 'prod'])
export type Entorno = z.infer<typeof EntornoSchema>

export const FeatureFlagSchema = z.object({
  id:          z.string().uuid(),
  codigo:      z.string(),
  descripcion: z.string().nullable(),
  activo:      z.boolean(),
  entorno:     EntornoSchema,
  createdAt:   z.string(),
  updatedAt:   z.string(),
})
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>

export const FeatureFlagActivoSchema = z.object({
  codigo:  z.string(),
  entorno: EntornoSchema,
})
export type FeatureFlagActivo = z.infer<typeof FeatureFlagActivoSchema>

// ── Keys ──────────────────────────────────────────────────────────────────────

export const ffKeys = {
  all:    ()            => ['feature-flags'] as const,
  list:   (e?: string)  => [...ffKeys.all(), 'list', e ?? 'all'] as const,
  detail: (id: string)  => [...ffKeys.all(), 'detail', id] as const,
  activos:(e: string)   => [...ffKeys.all(), 'activos', e] as const,
}

// ── Hooks de lectura ─────────────────────────────────────────────────────────

export function useFeatureFlags(entorno?: string) {
  return useQuery({
    queryKey: ffKeys.list(entorno),
    queryFn:  () => apiFetch('/feature-flags', {}, z.array(FeatureFlagSchema)),
    staleTime: 60_000,
  })
}

export function useFeatureFlagsActivos(entorno = 'dev') {
  return useQuery({
    queryKey: ffKeys.activos(entorno),
    queryFn:  () =>
      apiFetch(`/feature-flags/activos?entorno=${entorno}`, {}, z.array(FeatureFlagActivoSchema)),
    staleTime: 5 * 60_000,
  })
}

// ── Mutaciones ────────────────────────────────────────────────────────────────

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
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiFetch(`/feature-flags/${id}`, { method: 'PATCH', body: JSON.stringify({ activo }) }, FeatureFlagSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; descripcion?: string; activo?: boolean; entorno?: Entorno }) =>
      apiFetch(`/feature-flags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, FeatureFlagSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/feature-flags/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ffKeys.all() }),
  })
}
