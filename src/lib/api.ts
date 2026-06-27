import secureJsonParse from 'secure-json-parse'
import { z } from 'zod'
import { env, assertHttps } from '@/lib/env'

export class ApiError extends Error {
  readonly status: number
  readonly body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

let _getToken: (() => string | null) | null = null

export function registerTokenProvider(fn: () => string | null) {
  _getToken = fn
}

async function fetchWithBackoff(
  input: RequestInfo,
  init: RequestInit,
  attempt: number,
): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 2) {
      const delay = 2 ** attempt * 1000
      await new Promise((r) => setTimeout(r, delay))
      return fetchWithBackoff(input, init, attempt + 1)
    }
  }
  return res
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  schema?: z.ZodSchema<T>,
): Promise<T> {
  const url = `${env.VITE_API_URL}${path}`
  assertHttps(url)

  const token = _getToken?.()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetchWithBackoff(url, { ...init, headers }, 0)

  if (!res.ok) {
    const raw = await res.text().catch(() => '{}')
    const body = secureJsonParse(raw, undefined, { protoAction: 'remove' })
    const msg =
      (body as { message?: string })?.message ?? `HTTP ${res.status}`
    throw new ApiError(res.status, msg, body)
  }

  const raw = await res.text()
  const data = secureJsonParse(raw, undefined, { protoAction: 'remove' })

  if (schema) {
    const parsed = schema.safeParse(data)
    if (!parsed.success) {
      throw new Error(`[api] Schema inválido en ${path}: ${parsed.error.message}`)
    }
    return parsed.data
  }

  return data as T
}
