import { useSessionStore } from '@/stores/useSessionStore'
import { useFeatureFlagsActivos } from '@/queries/feature-flags.queries'
import { isTauri } from '@/lib/tauri'

/**
 * Fuente única de verdad para control de acceso en el frontend.
 * Combina permisos del rol (desde /auth/me) con feature flags activos.
 *
 * Uso:
 *   const { puede, tiene, flagActivo } = useAcceso()
 *   puede('caja:consultar', 'modulo:caja')   // permiso AND flag
 *   tiene('admin:usuarios')                   // solo permiso
 *   flagActivo('modulo:ventas')               // solo flag
 */
export function useAcceso() {
  const user     = useSessionStore((s) => s.user)
  const permisos = user?.permisos ?? []
  const isAdmin  = user?.rol === 'ADMIN_SISTEMA' || user?.rol === 'ADMIN_NACIONAL'

  const entorno    = import.meta.env.DEV ? 'dev' : (import.meta.env.VITE_ENTORNO ?? 'prod')
  const esTauri    = isTauri()
  const plataforma = esTauri ? 'tauri' : 'web'
  const { data: flags, isLoading: flagsLoading, isFetching: flagsFetching } = useFeatureFlagsActivos({ entorno, plataforma })

  /** ¿El feature flag está activo? ADMIN_SISTEMA siempre pasa (puede gestionar módulos apagados). */
  const flagActivo = (codigo: string): boolean =>
    isAdmin || (flags?.some((f) => f.codigo === codigo) ?? false)

  /** ¿El usuario tiene este permiso? ADMIN_SISTEMA siempre pasa. */
  const tiene = (permiso: string): boolean =>
    isAdmin || permisos.includes(permiso)

  /** ¿Puede acceder? Requiere permiso Y flag activo (si se especifica). */
  const puede = (permiso: string, flag?: string): boolean =>
    tiene(permiso) && (!flag || flagActivo(flag))

  return { puede, tiene, flagActivo, isAdmin, esTauri, permisos, flags, flagsLoading, flagsFetching }
}
