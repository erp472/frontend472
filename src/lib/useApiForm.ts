import { useState } from 'react'
import {
  useForm,
  type DefaultValues,
  type FieldPath,
  type UseFormReturn,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import type { ZodTypeAny } from 'zod'
import { ApiError } from '@/lib/api'

interface UseApiFormOptions<TSchema extends ZodTypeAny, TResponse> {
  schema: TSchema
  defaultValues?: DefaultValues<z.infer<TSchema>>
  onSubmit: (data: z.infer<TSchema>) => Promise<TResponse>
  onSuccess?: (data: TResponse) => void
  onError?: (err: unknown) => void
}

interface UseApiFormReturn<TSchema extends ZodTypeAny, TResponse> {
  form: UseFormReturn<z.infer<TSchema>>
  handleSubmit: () => void
  isPending: boolean
  serverError: string | null
  resetServerError: () => void
  lastResult: TResponse | null
}

/**
 * Puente RHF ↔ apiFetch.
 * Mapea errores 400 del backend a setError por campo cuando el backend
 * devuelve { message: { campo: 'mensaje' } } o array de errores de validación.
 */
export function useApiForm<TSchema extends ZodTypeAny, TResponse = unknown>(
  options: UseApiFormOptions<TSchema, TResponse>,
): UseApiFormReturn<TSchema, TResponse> {
  const { schema, defaultValues, onSubmit, onSuccess, onError } = options

  const form = useForm<z.infer<TSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    ...(defaultValues !== undefined ? { defaultValues } : {}),
    mode: 'onBlur',
  })

  const [isPending, setIsPending] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<TResponse | null>(null)

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsPending(true)
    setServerError(null)

    try {
      const result = await onSubmit(data)
      setLastResult(result)
      onSuccess?.(result)
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped = mapApiErrorToFields<TSchema>(err, form.setError)
        if (!mapped) {
          setServerError(err.message)
        }
      } else {
        setServerError('Error inesperado. Intenta de nuevo.')
      }
      onError?.(err)
    } finally {
      setIsPending(false)
    }
  })

  return {
    form,
    handleSubmit,
    isPending,
    serverError,
    resetServerError: () => setServerError(null),
    lastResult,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type SetError<TSchema extends ZodTypeAny> = UseFormReturn<
  z.infer<TSchema>
>['setError']

/**
 * Intenta mapear el error de API a campos del formulario.
 * Devuelve true si logró mapear al menos un campo.
 *
 * El backend puede enviar:
 *  - { message: string }                     → error global
 *  - { message: string[] }                   → varios mensajes globales
 *  - { message: { campo: 'mensaje' } }        → errores por campo
 *  - { errors: [{ field, message }] }         → array estilo class-validator
 */
function mapApiErrorToFields<TSchema extends ZodTypeAny>(
  err: ApiError,
  setError: SetError<TSchema>,
): boolean {
  if (err.status !== 400 && err.status !== 422) return false

  const body = err.body as Record<string, unknown> | null
  if (!body) return false

  let mapped = false

  // Formato class-validator: { errors: [{ field, message }] }
  if (Array.isArray(body['errors'])) {
    for (const e of body['errors'] as { field?: string; message?: string }[]) {
      if (e.field && e.message) {
        setError(e.field as FieldPath<z.infer<TSchema>>, {
          type: 'server',
          message: e.message,
        })
        mapped = true
      }
    }
    return mapped
  }

  // Formato NestJS: { message: { campo: 'mensaje' } }
  const msg = body['message']
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    for (const [field, message] of Object.entries(msg)) {
      setError(field as FieldPath<z.infer<TSchema>>, {
        type: 'server',
        message: String(message),
      })
      mapped = true
    }
    return mapped
  }

  return false
}
