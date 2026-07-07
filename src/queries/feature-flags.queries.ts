import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'

// ── Schemas ───────────────────────────────────────────────────────────────────

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
}

// ── Hooks de lectura ─────────────────────────────────────────────────────────

export function useFeatureFlags(entorno?: string) {
  return useQuery({
    queryKey: ffKeys.list(entorno),
    queryFn:  () => apiFetch('/feature-flags', {}, z.array(FeatureFlagSchema)),
    staleTime: 60_000,
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
