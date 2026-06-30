import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { PermisoEntry, RolEntry } from '@/types/api'

// ── Cache keys ────────────────────────────────────────────────────────────────

export const PERMISOS_KEYS = {
  roles:       ()        => ['permisos', 'roles'] as const,
  rol:         (id: string) => ['permisos', 'roles', id] as const,
  rolPermisos: (id: string) => ['permisos', 'roles', id, 'permisos'] as const,
  permisos:    ()        => ['permisos', 'permisos'] as const,
  permiso:     (id: string) => ['permisos', 'permisos', id] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: PERMISOS_KEYS.roles(),
    queryFn:  () => apiFetch<RolEntry[]>('/permisos/roles'),
  })
}

export function useRol(id: string) {
  return useQuery({
    queryKey: PERMISOS_KEYS.rol(id),
    queryFn:  () => apiFetch<RolEntry>(`/permisos/roles/${id}`),
    enabled:  !!id,
  })
}

export function useRolPermisos(rolId: string) {
  return useQuery({
    queryKey: PERMISOS_KEYS.rolPermisos(rolId),
    queryFn:  () => apiFetch<PermisoEntry[]>(`/permisos/roles/${rolId}/permisos`),
    enabled:  !!rolId,
  })
}

export function usePermisos() {
  return useQuery({
    queryKey: PERMISOS_KEYS.permisos(),
    queryFn:  () => apiFetch<PermisoEntry[]>('/permisos/permisos'),
  })
}

// ── Rol mutations ─────────────────────────────────────────────────────────────

export function useCreateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) =>
      apiFetch<RolEntry>('/permisos/roles', { method: 'POST', body: JSON.stringify({ nombre }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() }),
  })
}

export function useUpdateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiFetch<RolEntry>(`/permisos/roles/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() }),
  })
}

export function useDeleteRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; eliminado: boolean }>(`/permisos/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() }),
  })
}

// ── Permiso mutations ─────────────────────────────────────────────────────────

export function useCreatePermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) =>
      apiFetch<PermisoEntry>('/permisos/permisos', { method: 'POST', body: JSON.stringify({ nombre }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEYS.permisos() }),
  })
}

export function useUpdatePermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      apiFetch<PermisoEntry>(`/permisos/permisos/${id}`, { method: 'PATCH', body: JSON.stringify({ nombre }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEYS.permisos() }),
  })
}

export function useDeletePermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; eliminado: boolean }>(`/permisos/permisos/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: PERMISOS_KEYS.permisos() }),
  })
}

// ── Asignación ────────────────────────────────────────────────────────────────

export function useAsignarPermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rolId, permisoId }: { rolId: string; permisoId: string }) =>
      apiFetch(`/permisos/roles/${rolId}/permisos`, {
        method: 'POST',
        body:   JSON.stringify({ permisoId }),
      }),
    onSuccess: (_data, { rolId }) => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.rolPermisos(rolId) })
    },
  })
}

export function useRevocarPermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ rolId, permisoId }: { rolId: string; permisoId: string }) =>
      apiFetch(`/permisos/roles/${rolId}/permisos/${permisoId}`, { method: 'DELETE' }),
    onSuccess: (_data, { rolId }) => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.rolPermisos(rolId) })
    },
  })
}
