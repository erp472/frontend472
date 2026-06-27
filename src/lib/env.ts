import { z } from 'zod'

const schema = z.object({
  VITE_API_URL: z
    .string()
    .url()
    .default('http://localhost:3000'),
  VITE_WS_URL: z
    .string()
    .url()
    .default('ws://localhost:3000/realtime'),
})

function parseEnv() {
  const result = schema.safeParse({
    VITE_API_URL: import.meta.env['VITE_API_URL'],
    VITE_WS_URL: import.meta.env['VITE_WS_URL'],
  })

  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`[env] Variables de entorno inválidas:\n${msg}`)
  }

  return result.data
}

export const env = parseEnv()

export function assertHttps(url: string): void {
  if (
    import.meta.env.PROD &&
    !url.startsWith('https://') &&
    !url.startsWith('wss://')
  ) {
    throw new Error(`[security] URL insegura en producción: ${url}`)
  }
}
