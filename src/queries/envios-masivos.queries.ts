import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EstadoLote = 'borrador' | 'confirmado' | 'anulado'

export interface RemitentePayload {
  nombre:       string
  documento?:   string
  email?:       string
  telefono?:    string
  direccion?:   string
  ciudad?:      string
  codigoPostal?: string
}

export interface CrearLotePayload {
  sucursalId:    number
  cajaId:        number
  servicioId:    number
  clienteId?:    number
  remitente:     RemitentePayload
  observaciones?: string
}

export interface ItemMasivoCalculo {
  pesoFisicoKg:     number
  pesoTarificadoKg: number
  valorServicio:    number
  valorEstampillas: number
  valorTotal:       number
}

export interface ItemMasivo {
  id:          number
  fila:        number
  envioId:     number | null
  destinatario: {
    nombre:       string
    documento?:   string | null
    email?:       string | null
    telefono?:    string | null
    direccion?:   string | null
    ciudad?:      string | null
    pais:         string
    codigoPostal?: string | null
  }
  calculo:     ItemMasivoCalculo
  contenido?:  string | null
  observaciones?: string | null
}

export interface LoteMasivoTotales {
  items:       number
  pesoKg:      number
  estampillas: number
  total:       number
}

export interface LoteMasivo {
  id:         number
  estado:     EstadoLote
  sucursalId: number
  servicioId: number
  servicio?:  { idservicios: number; nombreservicios: string; tiposervicios: string }
  clienteId?: number | null
  remitente:  RemitentePayload & { codigoPostal?: string | null }
  totales:    LoteMasivoTotales
  observaciones?: string | null
  createdAt:  string
  updatedAt:  string
  items?:     ItemMasivo[]
}

export interface LoteMasivoResumen {
  id:         number
  estado:     EstadoLote
  remitente:  string
  totalItems: number
  totalCop:   number
  createdAt:  string
}

export interface AgregarItemPayload {
  destinatarioNombre:    string
  destinatarioDocumento?: string
  destinatarioEmail?:    string
  destinatarioTelefono?: string
  destinatarioDireccion?: string
  destinatarioCiudad?:   string
  destinatarioPais:      string
  destinatarioCp?:       string
  pesoFisicoKg:          number
  contenido?:            string
  observaciones?:        string
}

export interface ImportarCsvResult {
  importados: number
  errores:    Array<{ fila: number; error: string }>
}

export interface ConfirmarLoteResult {
  loteId:         number
  enviosCreados:  number
  movimiento:     unknown
  saldoActual:    string
  alertas:        string[]
}

// ── Keys ──────────────────────────────────────────────────────────────────────

const KEYS = {
  lotes:     (sucursalId: number, estado?: string) =>
    ['envios-masivos', 'lotes', sucursalId, estado ?? 'all'] as const,
  lote:      (id: number) => ['envios-masivos', 'lote', id] as const,
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useLotesMasivos(sucursalId: number, estado?: EstadoLote) {
  const params = new URLSearchParams({ sucursalId: String(sucursalId) })
  if (estado) params.set('estado', estado)
  return useQuery({
    queryKey: KEYS.lotes(sucursalId, estado),
    queryFn:  () => apiFetch<LoteMasivoResumen[]>(`/envios-masivos?${params}`),
    enabled:  sucursalId > 0,
  })
}

export function useLoteMasivo(id: number) {
  return useQuery({
    queryKey: KEYS.lote(id),
    queryFn:  () => apiFetch<LoteMasivo>(`/envios-masivos/${id}`),
    enabled:  id > 0,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCrearLoteMasivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CrearLotePayload) =>
      apiFetch<LoteMasivo>('/envios-masivos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['envios-masivos', 'lotes', vars.sucursalId] })
    },
  })
}

export function useAgregarItemMasivo(loteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AgregarItemPayload) =>
      apiFetch<{ item: ItemMasivo; cotizacion: { pesoTarificado: number; valorServicio: number } }>(
        `/envios-masivos/${loteId}/items`,
        { method: 'POST', body: JSON.stringify(data) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lote(loteId) }),
  })
}

export function useActualizarItemMasivo(loteId: number, itemId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AgregarItemPayload>) =>
      apiFetch<{ item: ItemMasivo; cotizacion: { pesoTarificado: number; valorServicio: number } }>(
        `/envios-masivos/${loteId}/items/${itemId}`,
        { method: 'PUT', body: JSON.stringify(data) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lote(loteId) }),
  })
}

export function useEliminarItemMasivo(loteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (itemId: number) =>
      apiFetch<void>(`/envios-masivos/${loteId}/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lote(loteId) }),
  })
}

export function useImportarCsvMasivo(loteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (csv: string) =>
      apiFetch<ImportarCsvResult>(`/envios-masivos/${loteId}/csv`, {
        method: 'POST',
        body:   JSON.stringify({ csv }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lote(loteId) }),
  })
}

export function useConfirmarLoteMasivo(loteId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cajaId: number) =>
      apiFetch<ConfirmarLoteResult>(
        `/envios-masivos/${loteId}/confirmar?cajaId=${cajaId}`,
        { method: 'PATCH' },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lote(loteId) })
      qc.invalidateQueries({ queryKey: ['envios-masivos', 'lotes'] })
    },
  })
}

export function useAnularLoteMasivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (loteId: number) =>
      apiFetch<void>(`/envios-masivos/${loteId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['envios-masivos'] }),
  })
}
