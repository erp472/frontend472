import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EstadoCard = 'abierta' | 'cerrada' | 'sin_sesion'
export type TipoAlerta = 'reposicion_caja' | 'limite_efectivo_caja'
export type TipoCaja = 'general' | 'pos' | 'menor' | 'pagos'

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

export interface PanelPunto {
  baseGeneral:               string
  cajaGeneral:               string   // total del punto (Caja Fuerte + todos los bolsillos)
  cajaFuerteGeneral:         string   // solo la sesión tipo:general (safe físico)
  acumuladoMonedaCirculante: string
}

export interface CardAuxiliar {
  cajaId:        number
  sesionId:      number | null
  codigo:        string
  nombre:        string
  tipo:          TipoCaja
  cajeroId:      number | null
  estado:        EstadoCard
  /** Balance del bolsillo de este cajero (o del safe si tipo:general) */
  saldoActual:   string | null
  baseDia:       string
  limiteAlerta:  string | null
  ingresosTurno: string
  egresosTurno:  string
  girosCount:    number
  girosValor:    string
  alertas:       TipoAlerta[]
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
  cajaPos:     CajaPosPanel | null
  servicios:   ServicioSucursalItem[]
}

// ── Keys ──────────────────────────────────────────────────────────────────────

export const CAJAS_KEYS = {
  padres:      ()                   => ['cajas', 'padres']                   as const,
  padre:       (id: number)         => ['cajas', 'padres', id]               as const,
  auxiliares:  (sucursalId: number) => ['cajas', 'auxiliares', sucursalId]   as const,
  auxiliar:    (id: number)         => ['cajas', 'auxiliares', 'item', id]   as const,
  status:      (sucursalId: number) => ['cajas', 'status', sucursalId]       as const,
  saldo:       (sesionId: number)   => ['cajas', 'saldo', sesionId]          as const,
  movimientos: (sesionId: number)   => ['cajas', 'movimientos', sesionId]    as const,
  panel:       ()                   => ['cajas', 'panel-admin']              as const,
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
    onSuccess: () => qc.invalidateQueries({ queryKey: CAJAS_KEYS.padres() }),
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
    },
  })
}

export function useDeleteCajaPadre(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/cajas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAJAS_KEYS.padres() }),
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
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: CAJAS_KEYS.auxiliares(vars.sucursalId) }),
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
    },
  })
}

export function useDeleteCaja(id: number, sucursalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/cajas/auxiliares/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAJAS_KEYS.auxiliares(sucursalId) }),
  })
}

// ── Queries — Operación ───────────────────────────────────────────────────────

/** Status del punto buscando por sucursalId (viene del session store) */
export function useStatusPunto(sucursalId: number) {
  return useQuery({
    queryKey:        CAJAS_KEYS.status(sucursalId),
    queryFn:         () => apiFetch<StatusPunto>(`/cajas/sucursal/${sucursalId}/status`),
    refetchInterval: 30_000,
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

// ── Mutations — Operación ─────────────────────────────────────────────────────

export function useAbrirCajaDirecta(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { baseAsignada: string }) =>
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

export function useCerrarAuxiliar(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { totalArqueo: string; observaciones?: string }) =>
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

export function useCierreMultiple() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sesionId: number; totalArqueo: string; observaciones?: string }) =>
      apiFetch(`/cajas/punto/${data.sesionId}/cierre`, {
        method: 'POST',
        body: JSON.stringify({ totalArqueo: data.totalArqueo, observaciones: data.observaciones }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas', 'status'] }),
  })
}

export function useCambioCustodia(sesionOrigenId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { sesionDestinoId: number; monto: string; motivo?: string }) =>
      apiFetch(`/cajas/punto/${sesionOrigenId}/cambio-custodia`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas', 'status'] }),
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

export function useRegistrarConsignacion(sesionId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { medio: 'banco' | 'transportadora'; monto: string; bancoNombre?: string; proposito?: string }) =>
      apiFetch<Consignacion>(`/cajas/principales/${sesionId}/consignacion`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cajas', 'status'] }),
  })
}

// ── Panel Admin — sucursales + POS + servicios ────────────────────────────────

export function usePanelAdmin() {
  return useQuery({
    queryKey: CAJAS_KEYS.panel(),
    queryFn:  () => apiFetch<SucursalPanelItem[]>('/cajas/panel-admin'),
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
