import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface AuditEvento {
  id:           number
  tabla:        string
  operacion:    'INSERT' | 'UPDATE' | 'DELETE'
  registroId:   number
  datosAntes:   Record<string, unknown> | null
  datosDespues: Record<string, unknown> | null
  ipOrigen:     string | null
  macOrigen:    string | null
  createdAt:    string
  usuario:      { id: number; nombre: string; email: string } | null
}

export interface AuditMeta {
  total:   number
  pagina:  number
  limite:  number
  paginas: number
}

export interface AuditStatsHoy {
  total:           number
  inserciones:     number
  actualizaciones: number
  eliminaciones:   number
  errores:         number
}

export interface AuditParams {
  tabla?:      string
  operacion?:  'INSERT' | 'UPDATE' | 'DELETE' | ''
  usuario_id?: number
  desde?:      string
  hasta?:      string
  pagina?:     number
  limite?:     number
}

export const AUDIT_KEYS = {
  all:   ()             => ['audit'] as const,
  list:  (p: AuditParams) => ['audit', 'list', p] as const,
  stats: ()             => ['audit', 'stats'] as const,
}

export function useAuditEventos(params: AuditParams = {}) {
  const qs = new URLSearchParams()
  if (params.tabla)      qs.set('tabla',      params.tabla)
  if (params.operacion)  qs.set('operacion',  params.operacion)
  if (params.usuario_id) qs.set('usuario_id', String(params.usuario_id))
  if (params.desde)      qs.set('desde',      params.desde)
  if (params.hasta)      qs.set('hasta',      params.hasta)
  if (params.pagina)     qs.set('pagina',     String(params.pagina))
  if (params.limite)     qs.set('limite',     String(params.limite ?? 50))

  return useQuery<{ datos: AuditEvento[]; meta: AuditMeta }>({
    queryKey:        AUDIT_KEYS.list(params),
    queryFn:         () => apiFetch(`/audit?${qs.toString()}`),
    placeholderData: keepPreviousData,
  })
}

export function useAuditStats() {
  return useQuery<AuditStatsHoy>({
    queryKey:  AUDIT_KEYS.stats(),
    queryFn:   () => apiFetch('/audit/stats'),
    refetchInterval: 60_000,
  })
}
