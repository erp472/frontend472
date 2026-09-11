import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { PermisoEntry, RolEntry, ModuloEntry, MatrixResponse } from '@/types/api'

// ── Cache keys ────────────────────────────────────────────────────────────────

export const PERMISOS_KEYS = {
  matrix:      ()           => ['permisos', 'matrix'] as const,
  roles:       ()           => ['permisos', 'roles'] as const,
  rol:         (id: string) => ['permisos', 'roles', id] as const,
  rolPermisos: (id: string) => ['permisos', 'roles', id, 'permisos'] as const,
  modulos:     ()           => ['permisos', 'modulos'] as const,
  modulo:      (id: string) => ['permisos', 'modulos', id] as const,
  permisos:    ()           => ['permisos', 'permisos'] as const,
}

// ── Matrix ────────────────────────────────────────────────────────────────────

export function useMatrix() {
  return useQuery({
    queryKey: PERMISOS_KEYS.matrix(),
    queryFn:  () => apiFetch<MatrixResponse>('/permisos/matrix'),
  })
}

// ── Roles ─────────────────────────────────────────────────────────────────────

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
    queryFn:  () => apiFetch<RolEntry['permisos']>(`/permisos/roles/${rolId}/permisos`),
    enabled:  !!rolId,
  })
}

export function useCreateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string }) =>
      apiFetch<RolEntry>('/permisos/roles', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useUpdateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nombre?: string; descripcion?: string; activo?: boolean }) =>
      apiFetch<RolEntry>(`/permisos/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useDeleteRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; eliminado: boolean }>(`/permisos/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.roles() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

// ── Módulos ───────────────────────────────────────────────────────────────────

export function useModulos() {
  return useQuery({
    queryKey: PERMISOS_KEYS.modulos(),
    queryFn:  () => apiFetch<ModuloEntry[]>('/permisos/modulos'),
  })
}

export function useCreateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string; orden?: number }) =>
      apiFetch<ModuloEntry>('/permisos/modulos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.modulos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useUpdateModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nombre?: string; descripcion?: string; orden?: number; activo?: boolean }) =>
      apiFetch<ModuloEntry>(`/permisos/modulos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.modulos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useDeleteModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; eliminado: boolean }>(`/permisos/modulos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.modulos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

// ── Permisos (acciones) ───────────────────────────────────────────────────────

export function usePermisos() {
  return useQuery({
    queryKey: PERMISOS_KEYS.permisos(),
    queryFn:  () => apiFetch<PermisoEntry[]>('/permisos/permisos'),
  })
}

export function useCreatePermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string; moduloId: string }) =>
      apiFetch<PermisoEntry>('/permisos/permisos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.permisos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.modulos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useUpdatePermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; nombre?: string; descripcion?: string; activo?: boolean }) =>
      apiFetch<PermisoEntry>(`/permisos/permisos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.permisos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useDeletePermiso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; eliminado: boolean }>(`/permisos/permisos/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.permisos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.modulos() })
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

// ── Asignación rol ↔ permiso ──────────────────────────────────────────────────

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
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
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
      qc.invalidateQueries({ queryKey: PERMISOS_KEYS.matrix() })
    },
  })
}

export function useUpdateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      apiFetch(`/permisos/roles/${id}`, {
        method: 'PATCH',
        body:   JSON.stringify({ nombreroles: nombre }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: permisosKeys.matrix() }),
  })
}

export function useDeleteRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/permisos/roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: permisosKeys.matrix() }),
  })
}

export function useCreateRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { codigoroles: string; nombreroles: string }) =>
      apiFetch('/permisos/roles', {
        method: 'POST',
        body:   JSON.stringify(data),
      }, RolSchema),
    onSuccess: () => qc.invalidateQueries({ queryKey: permisosKeys.matrix() }),
  })
}
