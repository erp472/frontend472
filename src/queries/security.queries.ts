import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface SecurityAlerta {
  _id:              string
  id:               string
  audit_key:        string
  mitre:            string
  nist_csf:         string
  severidad:        AlertSeverity
  descripcion:      string
  ip?:              string
  usuario_id?:      number
  origen_audit_key?: string
  metadata?:        Record<string, unknown>
  timestamp:        string
}

export interface SecurityStatsHoy {
  total:        number
  porSeveridad: Partial<Record<AlertSeverity, number>>
  porMitre:     Record<string, number>
}

export const SECURITY_KEYS = {
  alerts: (severidad?: AlertSeverity) => ['security', 'alerts', severidad] as const,
  stats:  ()                          => ['security', 'stats'] as const,
}

export function useSecurityAlertas(severidad?: AlertSeverity) {
  const qs = severidad ? `?severidad=${severidad}` : ''
  return useQuery<{ alertas: SecurityAlerta[] }>({
    queryKey:        SECURITY_KEYS.alerts(severidad),
    queryFn:         () => apiFetch(`/security/alerts${qs}`),
    refetchInterval: 60_000,
  })
}

export function useSecurityStats() {
  return useQuery<SecurityStatsHoy>({
    queryKey:        SECURITY_KEYS.stats(),
    queryFn:         () => apiFetch('/security/stats'),
    refetchInterval: 60_000,
  })
}
