import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { env } from '@/lib/env'

export const ACCIONES = [
  'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PRINT', 'EXPORT', 'DENIED',
] as const

export type AuditAccion = (typeof ACCIONES)[number]

export interface AuditEvento {
  id:           string
  auditKey:     string
  tipo:         'ADM' | 'OPE' | 'FIN' | 'CBS'
  tabla:        string
  operacion:    'INSERT' | 'UPDATE' | 'DELETE'
  accion:       AuditAccion
  registroId:   string | null
  datosAntes:   Record<string, unknown> | null
  datosDespues: Record<string, unknown> | null
  ipOrigen:     string | null
  resultado:    'OK' | 'ERROR' | null
  errorMsg:     string | null
  /** Correlaciona con los cambios de fila (`db_changes`) del mismo request. */
  requestId:    string | null
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
  accion?:     AuditAccion | ''
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

export function buildAuditExportUrl(params: AuditParams = {}): string {
  const base = env.VITE_API_URL.replace(/\/$/, '')
  const qs = new URLSearchParams()
  if (params.tabla)      qs.set('tabla',      params.tabla)
  if (params.accion)     qs.set('accion',     params.accion)
  if (params.usuario_id) qs.set('usuario_id', String(params.usuario_id))
  if (params.desde)      qs.set('desde',      params.desde)
  if (params.hasta)      qs.set('hasta',      params.hasta)
  const q = qs.toString()
  return `${base}/audit/export${q ? `?${q}` : ''}`
}

export function useAuditEventos(params: AuditParams = {}) {
  const qs = new URLSearchParams()
  if (params.tabla)      qs.set('tabla',      params.tabla)
  if (params.accion)     qs.set('accion',     params.accion)
  if (params.usuario_id) qs.set('usuario_id', String(params.usuario_id))
  if (params.desde)      qs.set('desde',      params.desde)
  if (params.hasta)      qs.set('hasta',      params.hasta)
  if (params.pagina)     qs.set('pagina',     String(params.pagina))
  if (params.limite)     qs.set('limite',     String(params.limite ?? 50))

  return useQuery<{ datos: AuditEvento[]; meta: AuditMeta }>({
    queryKey:        AUDIT_KEYS.list(params),
    queryFn:         () => apiFetch(`/audit?${qs.toString()}`),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
}

export function useAuditStats() {
  return useQuery<AuditStatsHoy>({
    queryKey:  AUDIT_KEYS.stats(),
    queryFn:   () => apiFetch('/audit/stats'),
    refetchInterval: 60_000,
  })
}
