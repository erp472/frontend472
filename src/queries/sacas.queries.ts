import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoSaca              = 'nacional' | 'internacional'
export type TipoConsolidacionSaca = 'consolidada' | 'directa'
export type EstadoSaca            = 'abierta' | 'cerrada'

export interface Saca {
  id:                  number
  numeroPrecinto:      string
  sucursalId:          number
  sesionCajaId:        number | null
  usuarioId:           number
  tipo:                TipoSaca
  tipoConsolidacion:   TipoConsolidacionSaca
  centroOperativoDest: string | null
  estado:              EstadoSaca
  pesoKg:              number | null
  totalEnvios:         number
  transportistaNombre: string | null
  transportistaFirma:  boolean
  fechaDespacho:       string | null
  createdAt:           string
  cerradaAt:           string | null
}

export interface CrearSacaPayload {
  numeroPrecinto:       string
  tipo:                 TipoSaca
  sucursalId:           number
  sesionCajaId?:        number
  tipoConsolidacion?:   TipoConsolidacionSaca
  centroOperativoDest?: string
  transportistaNombre?: string
}

export interface CerrarSacaPayload {
  pesoKg?:              number
  transportistaNombre?: string
  fechaDespacho?:       string
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const SACAS_KEYS = {
  list:   (sucursalId: number, estado?: string) => ['sacas', 'list', sucursalId, estado] as const,
  detail: (id: number)                          => ['sacas', 'detail', id]                as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useSacas(sucursalId: number, estado?: string) {
  const qs = new URLSearchParams({ sucursalId: String(sucursalId) })
  if (estado) qs.set('estado', estado)
  return useQuery({
    queryKey:        SACAS_KEYS.list(sucursalId, estado),
    queryFn:         () => apiFetch<Saca[]>(`/sacas?${qs}`),
    enabled:         sucursalId > 0,
    staleTime:       30_000,
    refetchInterval: 60_000,
  })
}

export function useSaca(id: number) {
  return useQuery({
    queryKey: SACAS_KEYS.detail(id),
    queryFn:  () => apiFetch<Saca>(`/sacas/${id}`),
    enabled:  id > 0,
    staleTime: 30_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCrearSaca(sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CrearSacaPayload) =>
      apiFetch<Saca>('/sacas', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sacas', 'list', sucursalId] }),
  })
}

export function useAgregarEnvioSaca(sacaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (envioId: number) =>
      apiFetch<{ id: number; sacaId: number; envioId: number }>(`/sacas/${sacaId}/envios`, {
        method: 'POST',
        body:   JSON.stringify({ envioId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: SACAS_KEYS.detail(sacaId) }),
  })
}

export function useCerrarSaca(sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CerrarSacaPayload }) =>
      apiFetch<Saca>(`/sacas/${id}/cerrar`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sacas', 'list', sucursalId] })
      qc.invalidateQueries({ queryKey: SACAS_KEYS.detail(data.id) })
    },
  })
}
