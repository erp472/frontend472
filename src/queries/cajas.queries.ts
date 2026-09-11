import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoCard = 'abierta' | 'cerrada' | 'sin_sesion'
export type TipoAlerta = 'reposicion_caja' | 'limite_efectivo_caja'
export type TipoCaja = 'general' | 'pos' | 'menor' | 'pagos'
export type TipoDenominacion = 'billete' | 'moneda'

/**
 * La Caja Fuerte y la Caja Menor son bolsillos de la caja principal: las custodia el
 * supervisor del punto. Solo las que atienden público —venden (pos) o prestan
 * servicios (pagos)— abren turno y reciben un cajero propio. El backend rechaza
 * cualquier asignación sobre las demás con CajaNoAsignableError.
 */
export function esCajaOperativa(tipo: TipoCaja): boolean {
  return tipo === 'pos' || tipo === 'pagos'
}

export interface Denominacion {
  denominacion: number
  tipo:         TipoDenominacion
  cantidad:     number
  valorTotal:   number
}

export interface CapacidadPunto {
  capacidadTotal:     number
  auxiliaresAbiertas: number
  puedeAbrirMas:      boolean
  cuantasPuedeAbrir:  number
}

export interface CajaPadre {
  id:          number
  sucursalId:  number
  nombre:      string
  baseGeneral: string
  horaReset:   string | null
}

export interface Caja {
  id:           number
  sucursalId:   number
  cajaPadreId:  number | null
  codigo:       string
  nombre:       string
  tipo:         TipoCaja
  baseDia:      string
  limiteAlerta: string | null
  activo:       boolean
}

export type MedioPagoCaja =
  | 'efectivo' | 'tarjeta_debito' | 'tarjeta_credito' | 'transferencia'
  | 'consignacion' | 'cheque' | 'preporteado' | 'mixto_preporteado' | 'estampilla'

/**
 * Los montos llegan en null para el rol CAJERO: la bóveda y las bases del punto
 * son información del custodio principal, no de una caja auxiliar.
 */
export interface PanelPunto {
  baseGeneral:               string | null
  cajaGeneral:               string | null   // total del punto (Caja Fuerte + todos los bolsillos)
  cajaFuerteGeneral:         string | null   // solo la sesión tipo:general (safe físico)
  basePagos:                 string | null
  cajaPagos:                 string | null
  cajaFuertePagos:           string | null
  acumuladoMonedaCirculante: string | null
  /** Σ reposiciones en estado en_transito del punto */
  tTransito:                 string | null
  /** Base restante que puede asignarse a nuevas cajas auxiliares (BR-CAJ-011) */
  baseDisponible:            string | null
  debeReset:                 boolean
  horaReset:                 string | null
}

export interface CardAuxiliar {
  cajaId:        number
  sesionId:      number | null
  codigo:        string
  nombre:        string
  tipo:          TipoCaja
  cajeroId:      number | null
  /** Quién opera la caja ahora: cajero asignado → cajero fijo → quien la abrió. */
  cajeroNombre:  string | null
  cajeroEmail:   string | null
  cajeroFijoId:  number | null
  estado:        EstadoCard
  /** Efectivo físico del bolsillo de este cajero (o del safe si tipo:general).
   *  Los pagos con tarjeta/transferencia/preporteado NO suman aquí — ver saldoPorMedioPago. */
  saldoActual:   string | null
  baseDia:       string
  limiteAlerta:  string | null
  /** Nivel óptimo de liquidez configurado por tesorería */
  tTarget:         string | null
  /** Monto sugerido de reposición (tTarget − saldoActual); null si no aplica */
  deltaReposicion: string | null
  /** Entradas/salidas de efectivo de la sesión: saldoActual = base + ingresos − egresos */
  ingresosSesion: string
  egresosSesion:  string
  /** Facturación neta de la sesión por medio de pago, incluida la que no entra al cajón */
  saldoPorMedioPago: Record<MedioPagoCaja, string>
  girosCount:    number
  girosValor:    string
  alertas:       TipoAlerta[]
  /** Operaciones habilitadas por el supervisor en esta caja */
  servicios:     ServicioCaja[]
}

export type ServicioCajaCodigo =
  | 'giro_nacional_emision'
  | 'giro_nacional_pago'
  | 'giro_nacional_anulacion'
  | 'giro_internacional_emision'
  | 'giro_internacional_pago'
  | 'estampillas'
  | 'empaques'
  | 'certificaciones'
  | 'apartado_postal'
  | 'recaudo_facturas'

export interface ServicioCaja {
  codigo: ServicioCajaCodigo
  nombre: string
  activo: boolean
}

/**
 * Operaciones habilitadas en una caja, para ocultarle al cajero lo que el
 * supervisor apagó. Mientras carga se deja pasar todo: el bloqueo real vive en el
 * backend (403), así que un falso positivo aquí no abre un hueco de seguridad.
 */
export function useServiciosCaja(cajaId: number) {
  const { data, isLoading } = useQuery({
    queryKey:  ['cajas', 'servicios', cajaId],
    queryFn:   () => apiFetch<ServicioCaja[]>(`/cajas/${cajaId}/servicios`),
    enabled:   cajaId > 0,
    staleTime: 60_000,
  })

  const servicioActivo = (codigo: ServicioCajaCodigo) =>
    data?.find(s => s.codigo === codigo)?.activo ?? true

  return { servicios: data ?? [], servicioActivo, isLoading }
}

/** El supervisor habilita/inhabilita una operación en una caja concreta. */
export function useToggleServicioCaja(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ codigo, activo }: { codigo: ServicioCajaCodigo; activo: boolean }) =>
      apiFetch<ServicioCaja & { cajaId: number }>(`/cajas/${cajaId}/servicios/${codigo}`, {
        method: 'PATCH',
        body:   JSON.stringify({ activo }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas'] }),
  })
}

export interface StatusPunto {
  sucursalId:  number
  cajaPadreId: number
  panel:       PanelPunto
  cajas:       CardAuxiliar[]
}

export interface SesionResumen {
  id:               number
  cajaId:           number
  usuarioAperturaId: number
  montoApertura:    string
  montoCierre:      string | null
  fechaApertura:    string
  fechaCierre:      string | null
  estado:           'abierta' | 'cerrada' | 'forzada'
  saldoActual:      string | null
  alertas:          TipoAlerta[]
}

export interface Movimiento {
  id:             number
  sesionCajaId:   number
  tipo:           string
  monto:          string
  medioPago:      string | null
  referenciaId:   number | null
  referenciaTipo: string | null
  descripcion:    string | null
  createdAt:      string
}

export interface Consignacion {
  id:              number
  sesionCajaId:    number
  medio:           string
  bancoNombre:     string | null
  monto:           string
  estado:          'pendiente' | 'aprobada' | 'rechazada'
  fechaAprobacion: string | null
  createdAt:       string
}

export interface ServicioSucursalItem {
  id:     number
  codigo: string
  nombre: string
  tipo:   string
  activo: boolean
}

export interface CajaPosPanel {
  id:          number
  codigo:      string
  nombre:      string
  tipo:        TipoCaja
  sesionActiva: boolean
  sesionId:    number | null
}

export interface SucursalPanelItem {
  sucursalId:  number
  codigo:      string
  nombre:      string
  tipo:        string
  regional:    string
  ciudad:      string | null
  departamento: string | null
  cajas:       CajaPosPanel[]
  servicios:   ServicioSucursalItem[]
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const CAJAS_KEYS = {
  padres:           ()                    => ['cajas', 'padres']                          as const,
  padre:            (id: number)          => ['cajas', 'padres', id]                      as const,
  auxiliares:       (sucursalId: number)  => ['cajas', 'auxiliares', sucursalId]          as const,
  auxiliar:         (id: number)          => ['cajas', 'auxiliares', 'item', id]          as const,
  status:           (sucursalId: number)  => ['cajas', 'status', sucursalId]              as const,
  saldo:            (sesionId: number)    => ['cajas', 'saldo', sesionId]                 as const,
  movimientos:      (sesionId: number)    => ['cajas', 'movimientos', sesionId]           as const,
  historial:        (cajaId: number)      => ['cajas', 'historial', cajaId]               as const,
  panel:            ()                    => ['cajas', 'panel-admin']                     as const,
  capacidad:        (cajaPadreId: number) => ['cajas', 'capacidad', cajaPadreId]          as const,
  habilitadas:      (sucursalId: number)  => ['cajas', 'habilitadas', sucursalId]         as const,
  saldoFuerte:      (cajaPadreId: number) => ['cajas', 'saldo-fuerte', cajaPadreId]       as const,
  reposicionSugerida:(sesionId: number)   => ['cajas', 'reposicion-sugerida', sesionId]   as const,
  diagnostico:      (cajaPadreId: number) => ['cajas', 'diagnostico', cajaPadreId]        as const,
  sesionesHistorico: (p: Record<string, unknown>) => ['cajas', 'sesiones-historico', p]   as const,
}

export interface SesionHistorial {
  id:                number
  cajaId:            number
  usuarioAperturaId: number
  cajeroAsignadoId:  number | null
  montoApertura:     string
  montoCierre:       string | null
  fechaApertura:     string
  fechaCierre:       string | null
  estado:            'abierta' | 'cerrada' | 'forzada'
  observaciones:     string | null
}

// ── Queries — Superadmin: CajaPadre CRUD ─────────────────────────────────────

export function useListCajasPadres() {
  return useQuery({
    queryKey: CAJAS_KEYS.padres(),
    queryFn:  () => apiFetch<CajaPadre[]>('/cajas'),
  })
}

export function useCajaPadre(id: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.padre(id),
    queryFn:  () => apiFetch<CajaPadre>(`/cajas/${id}`),
    enabled:  id > 0,
  })
}

// ── Mutations — Superadmin: CajaPadre CRUD ───────────────────────────────────

export function useCreateCajaPadre() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sucursalId: number; nombre: string; baseGeneral?: string; horaReset?: string }) =>
      apiFetch<CajaPadre>('/cajas', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.padres() })
      qc.invalidateQueries({ queryKey: ['cajas', 'diagnostico'] })
    },
  })
}

export function useUpdateCajaPadre(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre?: string; baseGeneral?: string; horaReset?: string }) =>
      apiFetch<CajaPadre>(`/cajas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.padres() })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.padre(id) })
      qc.invalidateQueries({ queryKey: ['cajas', 'diagnostico'] })
    },
  })
}

export function useDeleteCajaPadre(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/cajas/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.padres() })
      qc.invalidateQueries({ queryKey: ['cajas', 'diagnostico'] })
    },
  })
}

// ── Queries — Superadmin: Caja (auxiliar) CRUD ───────────────────────────────

export function useListCajas(sucursalId: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.auxiliares(sucursalId),
    queryFn:  () => apiFetch<Caja[]>(`/cajas/auxiliares?sucursalId=${sucursalId}`),
    enabled:  sucursalId > 0,
  })
}

export function useCaja(id: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.auxiliar(id),
    queryFn:  () => apiFetch<Caja>(`/cajas/auxiliares/${id}`),
    enabled:  id > 0,
  })
}

// ── Mutations — Superadmin: Caja (auxiliar) CRUD ─────────────────────────────

export function useCreateCaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      sucursalId: number; cajaPadreId?: number; codigo: string; nombre: string
      tipo: TipoCaja; baseDia?: string; limiteAlerta?: string
    }) => apiFetch<Caja>('/cajas/auxiliares', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.auxiliares(vars.sucursalId) })
      qc.invalidateQueries({ queryKey: ['cajas', 'diagnostico'] })
    },
  })
}

export function useUpdateCaja(id: number, sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      nombre?: string; tipo?: TipoCaja; baseDia?: string
      limiteAlerta?: string | null; activo?: boolean
    }) => apiFetch<Caja>(`/cajas/auxiliares/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.auxiliares(sucursalId) })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.auxiliar(id) })
      qc.invalidateQueries({ queryKey: ['cajas', 'diagnostico'] })
    },
  })
}

export function useDeleteCaja(id: number, sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/cajas/auxiliares/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.auxiliares(sucursalId) })
      qc.invalidateQueries({ queryKey: ['cajas', 'diagnostico'] })
    },
  })
}

// ── Queries — Operación ───────────────────────────────────────────────────────

/** Status del punto buscando por sucursalId (viene del session store) */
export function useStatusPunto(sucursalId: number, refetchInterval = 30_000) {
  return useQuery({
    queryKey:        CAJAS_KEYS.status(sucursalId),
    queryFn:         () => apiFetch<StatusPunto>(`/cajas/sucursal/${sucursalId}/status`),
    refetchInterval,
    enabled:         sucursalId > 0,
  })
}

export function useSaldoSesion(sesionId: number) {
  return useQuery({
    queryKey:        CAJAS_KEYS.saldo(sesionId),
    queryFn:         () => apiFetch<SesionResumen>(`/cajas/punto/${sesionId}/saldo`),
    refetchInterval: 15_000,
    enabled:         sesionId > 0,
  })
}

export function useMovimientos(sesionId: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.movimientos(sesionId),
    queryFn:  () => apiFetch<Movimiento[]>(`/cajas/punto/${sesionId}/movimientos`),
    enabled:  sesionId > 0,
  })
}

export function useHistorialSesiones(cajaId: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.historial(cajaId),
    queryFn:  () => apiFetch<SesionHistorial[]>(`/cajas/auxiliares/${cajaId}/historial`),
    enabled:  cajaId > 0,
  })
}

export interface DiferenciaHistorial {
  id:        number
  tipo:      'faltante' | 'sobrante'
  monto:     string
  estado:    string
  createdAt: string
}

export interface SesionConAlertas extends SesionHistorial {
  diferencias: DiferenciaHistorial[]
}

export const CAJAS_ALERTAS_KEY = (cajaId: number) =>
  ['cajas', 'alertas', cajaId] as const

export function useHistorialAlertas(cajaId: number) {
  return useQuery({
    queryKey: CAJAS_ALERTAS_KEY(cajaId),
    queryFn:  () => apiFetch<SesionConAlertas[]>(`/cajas/auxiliares/${cajaId}/alertas`),
    enabled:  cajaId > 0,
    staleTime: 60_000,
  })
}

// ── Mutations — Operación ─────────────────────────────────────────────────────

export function useAbrirSesionPrincipal(cajaPadreId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (montoApertura: string) =>
      apiFetch<SesionResumen>(`/cajas/principales/${cajaPadreId}/sesion/abrir`, {
        method: 'POST',
        body:   JSON.stringify({ montoApertura }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas'] }),
  })
}

export function useCerrarSesionPrincipal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sesionId: number } & CierrePayload) => {
      const { sesionId, ...payload } = data
      return apiFetch<SesionResumen>(`/cajas/principales/${sesionId}/sesion/cerrar`, {
        method: 'POST',
        body:   JSON.stringify(payload),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas'] }),
  })
}

export function useAbrirCajaDirecta(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { baseAsignada: string; cajeroAsignadoId?: number }) =>
      apiFetch<SesionResumen>(`/cajas/auxiliares/${cajaId}/abrir`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas', 'status'] }),
  })
}

export function useAbrirAuxiliar(sesionPrincipalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { cajaAuxiliarId: number; baseAsignada: string }) =>
      apiFetch(`/cajas/principales/${sesionPrincipalId}/auxiliar/abrir`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas', 'status'] }),
  })
}

export interface CierrePayload {
  totalArqueo:    string
  denominaciones?: Denominacion[]
  observaciones?: string
}

export function useCerrarAuxiliar(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CierrePayload) =>
      apiFetch(`/cajas/punto/${sesionId}/cierre`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.saldo(sesionId) })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.movimientos(sesionId) })
    },
  })
}

export function useCierreMultipleConArqueo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CierrePayload & { sesionId: number }) => {
      const { sesionId, ...payload } = data
      return apiFetch(`/cajas/punto/${sesionId}/cierre`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas', 'status'] }),
  })
}


export interface CambioCustodiaResult {
  reposicionId: number
  codigoRemesa: string
  montoEmitido: string
  saldoOrigen:  string
  alertas:      TipoAlerta[]
  estado:       'en_transito'
}

export function useCambioCustodia(sesionOrigenId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sesionDestinoId: number; monto: string; motivo?: string }) =>
      apiFetch<CambioCustodiaResult>(`/cajas/punto/${sesionOrigenId}/cambio-custodia`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo', sesionOrigenId] })
      qc.invalidateQueries({ queryKey: ['cajas', 'movimientos', sesionOrigenId] })
    },
  })
}

export function useConfirmarCustodia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { codigoRemesa: string; montoRecibido: string }) =>
      apiFetch(`/cajas/reposiciones/${data.codigoRemesa}/confirmar`, {
        method: 'POST',
        body: JSON.stringify({ montoRecibido: data.montoRecibido }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas'] }),
  })
}

export function useRegistrarDiferencia(sesionId: number, esAuxiliar = true) {
  const qc = useQueryClient()
  const path = esAuxiliar
    ? `/cajas/punto/${sesionId}/diferencia`
    : `/cajas/principales/${sesionId}/diferencia`
  return useMutation({
    mutationFn: (data: { tipo: 'diferencia_faltante' | 'diferencia_sobrante'; valor: string; causa: string; observacion?: string }) =>
      apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.saldo(sesionId) })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.movimientos(sesionId) })
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
    },
  })
}

export const CAJAS_CONSIG_KEY = (sesionId: number) => ['cajas', 'consignaciones', sesionId] as const

export function useConsignaciones(sesionId: number) {
  return useQuery({
    queryKey: CAJAS_CONSIG_KEY(sesionId),
    queryFn:  () => apiFetch<Consignacion[]>(`/cajas/principales/${sesionId}/consignaciones`),
    enabled:  sesionId > 0,
    staleTime: 30_000,
  })
}

export function useRegistrarConsignacion(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      medio: 'banco' | 'transportadora'
      bancoNombre?: string
      tipoCuenta?: 'ahorros' | 'corriente'
      numeroCuenta?: string
      monto: string
      proposito?: string
    }) =>
      apiFetch<Consignacion>(`/cajas/principales/${sesionId}/consignacion`, {
        method: 'POST',
        body:   JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
      qc.invalidateQueries({ queryKey: CAJAS_CONSIG_KEY(sesionId) })
    },
  })
}

export function useAprobarConsignacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: 'aprobada' | 'rechazada' }) =>
      apiFetch<Consignacion>(`/cajas/consignacion/${id}/estado`, {
        method: 'PATCH',
        body:   JSON.stringify({ estado }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas'] }),
  })
}

export function usePagoAdministrativo(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      tipoPago: string
      valor: string
      nit?: string
      lugar?: string
      numeroCaso?: string
      observacion?: string
    }) =>
      apiFetch(`/cajas/principales/${sesionId}/pago-administrativo`, {
        method: 'POST',
        body:   JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.movimientos(sesionId) })
    },
  })
}

export function useMedioPagoAuxiliar(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      tipo: 'transferencia' | 'cheque'
      valor: string
      descripcion?: string
      numeroCheque?: string
    }) =>
      apiFetch(`/cajas/punto/${sesionId}/medio-pago`, {
        method: 'POST',
        body:   JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.saldo(sesionId) })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.movimientos(sesionId) })
    },
  })
}

// ── Panel Admin — sucursales + POS + servicios ────────────────────────────────

export interface TrasladoBovedaResult {
  movimiento:   Movimiento
  saldoAntes:   string
  saldoDespues: string
  alertas:      TipoAlerta[]
}

export function useTrasladoBoveda(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (monto: string) =>
      apiFetch<TrasladoBovedaResult>(`/cajas/punto/${sesionId}/traslado-boveda`, {
        method: 'POST',
        body:   JSON.stringify({ monto }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'status'] })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.saldo(sesionId) })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.movimientos(sesionId) })
    },
  })
}

export function useResetAutomatico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cajaPadreId: number) =>
      apiFetch<{ cajaPadreId: number; auxiliaresCerradas: number }>(
        `/cajas/principales/${cajaPadreId}/reset-automatico`,
        { method: 'POST' },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas'] }),
  })
}

export function usePanelAdmin() {
  return useQuery({
    queryKey: CAJAS_KEYS.panel(),
    queryFn:  () => apiFetch<SucursalPanelItem[]>('/cajas/panel-admin'),
  })
}

export function useCapacidadPunto(cajaPadreId: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.capacidad(cajaPadreId),
    queryFn:  () => apiFetch<CapacidadPunto>(`/cajas/principales/${cajaPadreId}/capacidad`),
    enabled:  cajaPadreId > 0,
  })
}

export type ProblemaPunto =
  | 'sin_caja_fuerte'
  | 'sin_supervisor'
  | 'base_fuerte_excede_punto'
  | 'reparto_excede_fuerte'

export interface DiagnosticoPunto {
  baseGeneral:    string
  baseFuerte:     string
  sumaOperativas: string
  baseMenor:      string
  sumaRepartida:  string
  disponible:     string
  problemas:      ProblemaPunto[]
}

export function useDiagnosticoPunto(cajaPadreId: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.diagnostico(cajaPadreId),
    queryFn:  () => apiFetch<DiagnosticoPunto>(`/cajas/principales/${cajaPadreId}/diagnostico`),
    enabled:  cajaPadreId > 0,
  })
}

export function useToggleServicioSucursal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sucursalId, servicioId, activo }: { sucursalId: number; servicioId: number; activo: boolean }) =>
      apiFetch<{ sucursalId: number; servicioId: number; activo: boolean }>(
        `/cajas/panel-admin/${sucursalId}/servicios/${servicioId}`,
        { method: 'PATCH', body: JSON.stringify({ activo }) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAJAS_KEYS.panel() }),
  })
}

// ── Balance de Pagos ──────────────────────────────────────────────────────────

export interface BalancePagosRow {
  regional:                 string
  punto:                    string
  fecha:                    string
  reposicionBanco:          string
  reposicionTransportadora: string
  reposicionCheque:         string
  cantidadColpensiones:     number
}

export function useBalancePagos(fechaInicio: string, fechaFin: string) {
  return useQuery({
    queryKey: ['cajas', 'balance-pagos', fechaInicio, fechaFin],
    queryFn:  () =>
      apiFetch<BalancePagosRow[]>(
        `/cajas/reportes/balance-pagos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
      ),
    enabled:   !!fechaInicio && !!fechaFin && fechaInicio < fechaFin,
    staleTime: 60_000,
  })
}

export function useAsignarCajero() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sesionId, cajeroId }: { sesionId: number; cajeroId: number | null }) =>
      apiFetch<unknown>(`/cajas/sesiones/${sesionId}/cajero-asignado`, {
        method: 'PATCH',
        body:   JSON.stringify({ cajeroId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas'] })
    },
  })
}

// ── RF-3.03: resolver diferencias ─────────────────────────────────────────────

export function useResolverDiferencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado, observaciones }: { id: number; estado: 'aprobada' | 'rechazada'; observaciones?: string }) =>
      apiFetch(`/cajas/diferencias/${id}/resolver`, {
        method: 'PATCH',
        body:   JSON.stringify({ estado, observaciones }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cajas', 'alertas'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'diferencias-pendientes'] })
    },
  })
}

// ── Diferencias pendientes por sucursal — Dashboard Supervisor ────────────────

export interface DiferenciaPendiente {
  id:             number
  sesionCajaId:   number
  tipoDiferencia: 'faltante' | 'sobrante'
  monto:          string
  cajaNombre:     string
  createdAt:      string
}

export function useDiferenciasPendientes(sucursalId: number) {
  return useQuery({
    queryKey: ['cajas', 'diferencias-pendientes', sucursalId] as const,
    queryFn:  () => apiFetch<DiferenciaPendiente[]>(`/cajas/sucursal/${sucursalId}/diferencias-pendientes`),
    enabled:  sucursalId > 0,
    staleTime: 60_000,
  })
}

// ── Registro histórico de diferencias — informativo ──────────────────────────

import type { DiferenciaRegistro, DiferenciaRegistroFiltros } from '@/types/api'

export function useDiferenciasBySucursal(sucursalId: number, filtros: DiferenciaRegistroFiltros = {}) {
  const params = new URLSearchParams()
  if (filtros.tipo)   params.set('tipo',   filtros.tipo)
  if (filtros.estado) params.set('estado', filtros.estado)
  if (filtros.desde)  params.set('desde',  filtros.desde)
  if (filtros.hasta)  params.set('hasta',  filtros.hasta)
  if (filtros.limite) params.set('limite', String(filtros.limite))
  if (filtros.pagina) params.set('pagina', String(filtros.pagina))
  const qs = params.toString()

  return useQuery({
    queryKey: ['cajas', 'diferencias-registro', sucursalId, filtros] as const,
    queryFn:  () => apiFetch<DiferenciaRegistro[]>(`/cajas/sucursal/${sucursalId}/diferencias${qs ? `?${qs}` : ''}`),
    enabled:  sucursalId > 0,
    staleTime: 60_000,
  })
}

// ── Cierre automático — Dashboard Supervisor ──────────────────────────────────

export interface SesionCierreAutomatico {
  sesionId:     number
  cajaId:       number
  cajaNombre:   string
  cajaPadreId:  number | null
  horaReset:    string | null
  abiertaDesde: string
}

export function useAlertasCierreAutomatico(sucursalId: number) {
  return useQuery({
    queryKey: ['cajas', 'cierre-automatico', sucursalId] as const,
    queryFn:  () => apiFetch<SesionCierreAutomatico[]>(`/cajas/alertas/cierre-automatico?sucursalId=${sucursalId}`),
    enabled:  sucursalId > 0,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })
}

// ── Consolidado Comercio — Dashboard Gerencia ─────────────────────────────────

export type MedioPagoConsolidado =
  | 'efectivo' | 'tarjetaDebito' | 'tarjetaCredito'
  | 'transferencia' | 'consignacion' | 'preporteado' | 'mixtoPreporteado'

export interface SesionConsolidado {
  sesionId:       number
  cajaId:         number
  cajaNombre:     string
  sucursalNombre: string
  cajeroNombre:   string | null
  cajeroEmail:    string | null
  total:          string
  porMedio:       Record<MedioPagoConsolidado, string>
}

export interface ConsolidadoComercio {
  comercioId:    number
  total:         string
  porMedio:      Record<MedioPagoConsolidado, string>
  numRegionales: number
  sesiones:      SesionConsolidado[]
}

export function useConsolidadoComercio(comercioId = 1) {
  return useQuery({
    queryKey:        ['cajas', 'consolidado-comercio', comercioId] as const,
    queryFn:         () => apiFetch<ConsolidadoComercio>(`/cajas/consolidado-comercio?comercioId=${comercioId}`),
    staleTime:       2 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

// ── Histórico de movimientos — supervisión ────────────────────────────────────

export type CategoriaHistorico = 'recaudos' | 'facturacion' | 'anulaciones' | 'ajustes'

export interface HistoricoMovimiento {
  id:             number
  fecha:          string
  categoria:      CategoriaHistorico
  tipo:           string
  monto:          string
  medioPago:      string | null
  descripcion:    string | null
  sesionId:       number
  sesionAbierta:  boolean
  cajaId:         number
  cajaNombre:     string
  sucursalId:     number
  sucursalNombre: string
  regionalNombre: string
  cajero:         string | null
  ventaId:        number | null
  ventaEstado:    string | null
  puedeAnular:    boolean
}

export interface HistoricoFiltros {
  categoria?: CategoriaHistorico
  sucursalId?: number
  cajaId?:    number
  desde?:     string
  hasta?:     string
  pagina?:    number
  limite?:    number
}

export interface HistoricoPage {
  items:        HistoricoMovimiento[]
  total:        number
  pagina:       number
  limite:       number
  totalPaginas: number
}

export function useHistoricoMovimientos(filtros: HistoricoFiltros) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filtros)) {
    if (v !== undefined && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()

  return useQuery({
    queryKey:  ['cajas', 'historico-movimientos', qs] as const,
    queryFn:   () => apiFetch<HistoricoPage>(`/cajas/historico-movimientos?${qs}`),
    staleTime: 30_000,
  })
}

// ── Nuevos endpoints de dominio ───────────────────────────────────────────────

export interface GrupoCajas {
  tipo:     TipoCaja
  total:    number
  activas:  number
  inactivas: number
  cajas:    { cajaId: number; activaEnSesion: boolean }[]
}

export type CajasHabilitadasResult = Partial<Record<TipoCaja, GrupoCajas>>

export function useCajasHabilitadas(sucursalId: number) {
  return useQuery({
    queryKey:        CAJAS_KEYS.habilitadas(sucursalId),
    queryFn:         () => apiFetch<CajasHabilitadasResult>(`/cajas/sucursal/${sucursalId}/habilitadas`),
    enabled:         sucursalId > 0,
    staleTime:       60_000,
    refetchInterval: 2 * 60_000,
  })
}

export interface SaldoCajaFuerte {
  saldo:        string
  sesionId?:    number
  cajaPadreId?: number
  sesionActiva: boolean
}

export function useSaldoCajaFuerte(cajaPadreId: number) {
  return useQuery({
    queryKey:        CAJAS_KEYS.saldoFuerte(cajaPadreId),
    queryFn:         () => apiFetch<SaldoCajaFuerte>(`/cajas/principales/${cajaPadreId}/saldo-fuerte`),
    enabled:         cajaPadreId > 0,
    staleTime:       30_000,
    refetchInterval: 60_000,
  })
}

export interface ReposicionSugerida {
  montoRecomendado: string
  saldoActual:      string
  baseDia:          string
  estado:           'pendiente'
  tipoMovimiento:   'reposicion'
}

export function useReposicionSugerida(sesionId: number) {
  return useQuery({
    queryKey: CAJAS_KEYS.reposicionSugerida(sesionId),
    queryFn:  () => apiFetch<ReposicionSugerida>(`/cajas/punto/${sesionId}/reposicion-sugerida`),
    enabled:  sesionId > 0,
    staleTime: 30_000,
  })
}

export function useMonedaCirculante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sesionId, acumuladoCentavos }: { sesionId: number; acumuladoCentavos: string }) =>
      apiFetch<{ ajuste: { id: number; tipo: string; monto: string } | null; mensaje?: string }>(
        `/cajas/principales/${sesionId}/moneda-circulante`,
        { method: 'POST', body: JSON.stringify({ acumuladoCentavos }) },
      ),
    onSuccess: (_, { sesionId }) => {
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.saldo(sesionId) })
      qc.invalidateQueries({ queryKey: CAJAS_KEYS.movimientos(sesionId) })
    },
  })
}

// ── Reporte histórico de sesiones ─────────────────────────────────────────────

export interface SesionHistoricoItem {
  id:             number
  cajaId:         number
  cajaNombre:     string
  sucursalId:     number
  sucursalNombre: string
  regionalNombre: string
  montoApertura:  string
  montoCierre:    string | null
  fechaApertura:  string
  fechaCierre:    string | null
  estado:         string
  cierreForzado:  boolean
  observaciones:  string | null
}

export interface SesionesHistoricoResult {
  items:        SesionHistoricoItem[]
  total:        number
  pagina:       number
  limite:       number
  totalPaginas: number
}

export function useSesionesHistorico(params: {
  sucursalId?: number
  cajaId?:     number
  desde?:      string
  hasta?:      string
  pagina?:     number
  limite?:     number
}) {
  const { sucursalId, cajaId, desde, hasta, pagina = 1, limite = 50 } = params
  const qs = new URLSearchParams()
  if (sucursalId) qs.set('sucursalId', String(sucursalId))
  if (cajaId)     qs.set('cajaId',     String(cajaId))
  if (desde)      qs.set('desde',      desde)
  if (hasta)      qs.set('hasta',      hasta)
  qs.set('pagina', String(pagina))
  qs.set('limite', String(limite))

  return useQuery({
    queryKey: CAJAS_KEYS.sesionesHistorico({ sucursalId, cajaId, desde, hasta, pagina, limite }),
    queryFn:  () => apiFetch<SesionesHistoricoResult>(`/cajas/reporte/sesiones?${qs.toString()}`),
    staleTime: 60_000,
  })
}
