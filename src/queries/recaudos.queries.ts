import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoRecaudo = 'exitoso' | 'fallido' | 'anulado'

export interface Convenio {
  id:          number
  codigo:      string
  nombre:      string
  descripcion: string | null
  activo:      boolean
}

export interface Recaudo {
  id:             number
  convenioId:     number
  sucursalId:     number
  sesionCajaId:   number | null
  usuarioId:      number
  clienteId:      number | null
  referenciaPago: string
  codigoBarras:   string | null
  monto:          number
  estado:         EstadoRecaudo
  createdAt:      string
}

export interface RegistrarRecaudoPayload {
  convenioId:       number
  referenciaPago:   string
  codigoBarras?:    string
  monto:            number
  comisionOperador: number
}

export interface RegistrarRecaudoResult {
  recaudo:     Recaudo
  movimiento:  { id: number; tipo: string; monto: string }
  saldoActual: string
  alertas:     string[]
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const RECAUDOS_KEYS = {
  convenios: (sucursalId: number) => ['recaudos', 'convenios', sucursalId] as const,
  sesion:    (sesionId: number)   => ['recaudos', 'sesion',   sesionId]   as const,
  detalle:   (id: number)         => ['recaudos', 'detalle',  id]         as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useConvenios(sucursalId: number) {
  return useQuery({
    queryKey: RECAUDOS_KEYS.convenios(sucursalId),
    queryFn:  () => apiFetch<Convenio[]>(`/recaudos/convenios?sucursalId=${sucursalId}`),
    enabled:  sucursalId > 0,
    staleTime: 5 * 60_000,
  })
}

export function useRecaudosSesion(sesionId: number) {
  return useQuery({
    queryKey:        RECAUDOS_KEYS.sesion(sesionId),
    queryFn:         () => apiFetch<Recaudo[]>(`/recaudos/sesion/${sesionId}`),
    enabled:         sesionId > 0,
    staleTime:       30_000,
    refetchInterval: 60_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useRegistrarRecaudo(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RegistrarRecaudoPayload) =>
      apiFetch<RegistrarRecaudoResult>(`/recaudos/punto/${cajaId}/registrar`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recaudos', 'sesion'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo', data.recaudo.sesionCajaId ?? 0] })
    },
  })
}

export function useAnularRecaudo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<Recaudo>(`/recaudos/${id}/anular`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recaudos', 'sesion'] })
    },
  })
}
