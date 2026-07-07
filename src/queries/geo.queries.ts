import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import type { PaisResponse, DepartamentoResponse, CiudadResponse } from '@/types/api'

export const GEO_KEYS = {
  paises:        ()          => ['geo', 'paises'] as const,
  departamentos: (paisId: number) => ['geo', 'departamentos', paisId] as const,
  ciudades:      (deptoId: number) => ['geo', 'ciudades', deptoId] as const,
}

export function usePaises() {
  return useQuery({
    queryKey: GEO_KEYS.paises(),
    queryFn:  () => apiFetch<PaisResponse[]>('/geo/paises'),
    staleTime: 10 * 60 * 1000,
  })
}

export function useDepartamentos(paisId: number | null | undefined) {
  return useQuery({
    queryKey: GEO_KEYS.departamentos(paisId!),
    queryFn:  () => apiFetch<DepartamentoResponse[]>(`/geo/paises/${paisId}/departamentos`),
    enabled:  !!paisId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useCiudades(departamentoId: number | null | undefined) {
  return useQuery({
    queryKey: GEO_KEYS.ciudades(departamentoId!),
    queryFn:  () => apiFetch<CiudadResponse[]>(`/geo/departamentos/${departamentoId}/ciudades`),
    enabled:  !!departamentoId,
    staleTime: 10 * 60 * 1000,
  })
}
