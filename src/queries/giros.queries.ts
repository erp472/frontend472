import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from '@/lib/api'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TipoGiro      = 'nacional' | 'moneygram' | 'ria' | 'ifs'
export type OperacionGiro = 'emision' | 'pago'
export type EstadoGiro    = 'pendiente' | 'aprobado' | 'pagado' | 'anulado' | 'rechazado'

export interface GiroResumen {
  id:                   number
  tipo:                 TipoGiro
  operacion:            OperacionGiro
  estado:               EstadoGiro
  montoCop:             number
  fleteCop:             number
  montoTotalCop:        number
  pin:                  string | null
  numeroReferencia:     string | null
  beneficiarioNombre:   string | null
  beneficiarioNumeroDoc: string | null
  remitentNombre:       string | null
  createdAt:            string
}

// ── Zod schemas (para validación en el lado cliente antes de enviar) ──────────

export const PersonaGiroSchema = z.object({
  tipoDoc:     z.string().min(1).optional(),
  numeroDoc:   z.string().min(1, 'Requerido').max(30),
  nombre:      z.string().min(1, 'Requerido'),
  fechaExpDoc: z.string().optional(),
  ciudad:      z.string().optional(),
  direccion:   z.string().optional(),
  email:       z.string().email('Email inválido').optional().or(z.literal('')),
  telefono:    z.string().optional(),
  mensaje:     z.string().optional(),
  huella:      z.boolean().optional(),
  pep:         z.boolean().optional(),
  sospechoso:  z.boolean().optional(),
})

export const EmitirNacionalSchema = z.object({
  montoCop:    z.number({ invalid_type_error: 'Ingrese un monto' }).positive('Debe ser positivo'),
  remitente:   PersonaGiroSchema.optional(),
  beneficiario: PersonaGiroSchema,
})

export const PagarNacionalSchema = z.object({
  pin:                   z.string().length(6, 'El PIN debe tener 6 dígitos'),
  nombreBeneficiario:    z.string().min(1, 'Requerido'),
  numeroDocBeneficiario: z.string().min(1, 'Requerido'),
})

export const EmitirInternacionalSchema = z.object({
  montoCop:         z.number({ invalid_type_error: 'Ingrese un monto' }).positive('Debe ser positivo'),
  trmDia:           z.number({ invalid_type_error: 'Ingrese la TRM' }).positive('Debe ser positivo'),
  operador:         z.enum(['moneygram', 'ria', 'ifs']).optional(),
  monedaDestino:    z.string().optional(),
  pin:              z.string().optional(),
  numeroReferencia: z.string().optional(),
  remitente:        PersonaGiroSchema.optional(),
  beneficiario:     PersonaGiroSchema.extend({
    fechaNac: z.string().optional(),
    pais:     z.string().min(2).max(3).optional(),
    estado:   z.string().optional(),
  }),
})

export const PagarInternacionalSchema = z.object({
  pin:                   z.string().min(6, 'PIN requerido'),
  nombreBeneficiario:    z.string().min(1, 'Requerido'),
  numeroDocBeneficiario: z.string().min(1, 'Requerido'),
  fechaNacBeneficiario:  z.string().min(1, 'Requerido'),
})

export type EmitirNacionalDto      = z.infer<typeof EmitirNacionalSchema>
export type PagarNacionalDto       = z.infer<typeof PagarNacionalSchema>
export type EmitirInternacionalDto = z.infer<typeof EmitirInternacionalSchema>
export type PagarInternacionalDto  = z.infer<typeof PagarInternacionalSchema>

// ── Queries ───────────────────────────────────────────────────────────────────

export function useGirosBySesion(sesionId: number | undefined) {
  return useQuery({
    queryKey: ['giros', 'sesion', sesionId],
    queryFn:  () => apiFetch<GiroResumen[]>(`/giros/sesion/${sesionId}`),
    enabled:  !!sesionId,
    staleTime: 30_000,
  })
}

export function useGiro(id: number | undefined) {
  return useQuery({
    queryKey: ['giros', id],
    queryFn:  () => apiFetch<GiroResumen>(`/giros/${id}`),
    enabled:  !!id,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useEmitirGiroNacional(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: EmitirNacionalDto) =>
      apiFetch<{ giro: GiroResumen; pin: string; saldoActual: number }>(
        `/giros/punto/${cajaId}/nacional/emitir`,
        { method: 'POST', body: JSON.stringify(dto) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['giros'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'movimientos'] })
    },
  })
}

export function usePagarGiroNacional(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: PagarNacionalDto) =>
      apiFetch<{ giro: GiroResumen; saldoActual: number }>(
        `/giros/punto/${cajaId}/nacional/pagar`,
        { method: 'POST', body: JSON.stringify(dto) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['giros'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'movimientos'] })
    },
  })
}

export function useEmitirGiroInternacional(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: EmitirInternacionalDto) =>
      apiFetch<{ giro: GiroResumen; saldoActual: number }>(
        `/giros/punto/${cajaId}/internacional/emitir`,
        { method: 'POST', body: JSON.stringify(dto) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['giros'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'movimientos'] })
    },
  })
}

export function usePagarGiroInternacional(cajaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: PagarInternacionalDto) =>
      apiFetch<{ giro: GiroResumen; saldoActual: number }>(
        `/giros/punto/${cajaId}/internacional/pagar`,
        { method: 'POST', body: JSON.stringify(dto) },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['giros'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'movimientos'] })
    },
  })
}

export function useAnularGiro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<GiroResumen>(`/giros/${id}/anular`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['giros'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'saldo'] })
      qc.invalidateQueries({ queryKey: ['cajas', 'movimientos'] })
    },
  })
}
