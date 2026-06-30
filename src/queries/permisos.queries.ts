import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'

// ── Schemas ───────────────────────────────────────────────────────────────────

const ModuloBaseSchema = z.object({
  id:    z.string().uuid(),
  nombre: z.string(),
  orden: z.number(),
})

const PermisoBaseSchema = z.object({
  id:          z.string().uuid(),
  nombre:      z.string(),
  descripcion: z.string().nullable(),
})

export const MatrixSchema = z.object({
  modulos: z.array(z.object({
    id:          z.string().uuid(),
    nombre:      z.string(),
    descripcion: z.string().nullable(),
    orden:       z.number(),
    permisos:    z.array(PermisoBaseSchema),
  })),
  roles: z.array(z.object({
    id:          z.string().uuid(),
    nombre:      z.string(),
    descripcion: z.string().nullable(),
    permisoIds:  z.array(z.string().uuid()),
  })),
})
export type PermisosMatrix = z.infer<typeof MatrixSchema>

export const RolSchema = z.object({
  id:          z.string().uuid(),
  nombre:      z.string(),
  descripcion: z.string().nullable(),
  activo:      z.boolean(),
  createdAt:   z.string(),
  updatedAt:   z.string(),
})
export type Rol = z.infer<typeof RolSchema>

// ── Keys ──────────────────────────────────────────────────────────────────────

export const permisosKeys = {
  all:    () => ['permisos'] as const,
  matrix: () => [...permisosKeys.all(), 'matrix'] as const,
  roles:  () => [...permisosKeys.all(), 'roles'] as const,
}

// ── Hooks de lectura ─────────────────────────────────────────────────────────

export function usePermisosMatrix() {
  return useQuery({
    queryKey: permisosKeys.matrix(),
    queryFn:  () => apiFetch('/permisos/matrix', {}, MatrixSchema),
    staleTime: 2 * 60_000,
  })
}

export function useRoles() {
  return useQuery({
    queryKey: permisosKeys.roles(),
    queryFn:  () => apiFetch('/permisos/roles', {}, z.array(RolSchema)),
    staleTime: 2 * 60_000,
  })
}

// ── Mutaciones ────────────────────────────────────────────────────────────────

export function useAsignarPermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rolId, permisoId }: { rolId: string; permisoId: string }) =>
      apiFetch(`/permisos/roles/${rolId}/permisos`, {
        method: 'POST',
        body:   JSON.stringify({ permisoId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: permisosKeys.matrix() }),
  })
}

export function useRevocarPermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rolId, permisoId }: { rolId: string; permisoId: string }) =>
      apiFetch(`/permisos/roles/${rolId}/permisos/${permisoId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: permisosKeys.matrix() }),
  })
}
