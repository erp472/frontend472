import secureJsonParse from 'secure-json-parse'
import { env } from '@/lib/env'

export interface LabSession {
  token:   string
  usuario: string
  rol:     string
}

class LabApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name  = 'LabApiError'
    this.status = status
  }
}

async function labFetch<T>(
  path: string,
  init: RequestInit = {},
  labToken?: string,
): Promise<T> {
  const url     = `${env.VITE_API_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (labToken) headers['Authorization'] = `Bearer ${labToken}`

  const res = await fetch(url, { ...init, headers })

  if (!res.ok) {
    const raw  = await res.text().catch(() => '{}')
    const body = secureJsonParse(raw, undefined, { protoAction: 'remove' }) as { message?: string }
    throw new LabApiError(res.status, body?.message ?? `HTTP ${res.status}`)
  }

  const raw = await res.text()
  if (!raw) return undefined as T
  return secureJsonParse(raw, undefined, { protoAction: 'remove' }) as T
}

export async function labLogin(usuario: string, contraseña: string): Promise<LabSession> {
  return labFetch<LabSession>('/lab/login', {
    method: 'POST',
    body:   JSON.stringify({ usuario, contraseña }),
  })
}

export async function labVerify(token: string): Promise<{ usuario: string; rol: string }> {
  return labFetch('/lab/verify', {}, token)
}

export async function labLogout(token: string): Promise<void> {
  await labFetch('/lab/logout', { method: 'POST' }, token)
}
