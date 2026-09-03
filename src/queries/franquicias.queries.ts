import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface Franquicia {
  id: number
  codigo: string
  nombre: string
  activo: boolean
}

export interface FranquiciaCatalogo extends Franquicia {
  sucursalesActivas: number[]
}

export const FRANQUICIA_KEYS = {
  all:      ()                  => ['franquicias'] as const,
  sucursal: (sucursalId: number) => ['franquicias', 'sucursal', sucursalId] as const,
  catalogo: ()                  => ['franquicias', 'catalogo'] as const,
}

/** Franquicias habilitadas en el punto — las que el cajero puede seleccionar.
 *  Sin sucursalId el backend usa la sucursal del usuario autenticado. */
export function useFranquicias(sucursalId?: number | null, enabled = true) {
  return useQuery({
    queryKey:  FRANQUICIA_KEYS.sucursal(sucursalId ?? 0),
    queryFn:   () => apiFetch<Franquicia[]>(sucursalId ? `/franquicias?sucursalId=${sucursalId}` : '/franquicias'),
    enabled,
    staleTime: 5 * 60_000,
  })
}

// ── Catálogo — solo Tesorería ─────────────────────────────────────────────────

export function useCatalogoFranquicias(enabled = true) {
  return useQuery({
    queryKey: FRANQUICIA_KEYS.catalogo(),
    queryFn:  () => apiFetch<FranquiciaCatalogo[]>('/franquicias/catalogo'),
    enabled,
  })
}

export function useCrearFranquicia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { codigo: string; nombre: string; activo?: boolean }) =>
      apiFetch<Franquicia>('/franquicias', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FRANQUICIA_KEYS.all() }),
  })
}

export function useActualizarFranquicia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; nombre?: string; activo?: boolean }) =>
      apiFetch<Franquicia>(`/franquicias/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FRANQUICIA_KEYS.all() }),
  })
}

export function useEliminarFranquicia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ id: number }>(`/franquicias/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: FRANQUICIA_KEYS.all() }),
  })
}

export function useActivarFranquiciaEnSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, sucursalId, activo }: { id: number; sucursalId: number; activo: boolean }) =>
      apiFetch<{ franquiciaId: number; sucursalId: number; activo: boolean }>(
        `/franquicias/${id}/sucursales/${sucursalId}`,
        { method: 'PUT', body: JSON.stringify({ activo }) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: FRANQUICIA_KEYS.all() }),
  })
}
