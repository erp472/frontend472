import { env } from '@/lib/env'
import { useSessionStore } from '@/stores/useSessionStore'

type MessageHandler = (event: string, data: unknown) => void

const HEARTBEAT_INTERVAL_MS = 25_000
const BASE_DELAY_MS         = 1_000
const MAX_DELAY_MS          = 30_000
const MAX_RETRIES           = 10

let ws:        WebSocket | null = null
let retries    = 0
let destroyed  = false
let hbTimer:   ReturnType<typeof setInterval> | null = null
let retryTimer: ReturnType<typeof setTimeout> | null = null

const handlers = new Set<MessageHandler>()

function clearTimers() {
  if (hbTimer)   { clearInterval(hbTimer);  hbTimer = null }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
}

function connect() {
  if (destroyed) return

  const token = useSessionStore.getState().token
  if (!token) return

  const url = `${env.VITE_WS_URL}?token=${encodeURIComponent(token)}`
  ws = new WebSocket(url)

  ws.onopen = () => {
    retries = 0
    hbTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ping' }))
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data)
      if (!msg?.event) return
      if (msg.event === 'pong') return
      for (const h of handlers) h(msg.event, msg.data)
    } catch { /* ignore malformed frames */ }
  }

  ws.onclose = () => {
    clearTimers()
    if (destroyed) return
    if (retries >= MAX_RETRIES) return

    const delay = Math.min(BASE_DELAY_MS * 2 ** retries, MAX_DELAY_MS)
    retries++
    retryTimer = setTimeout(connect, delay)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

export function startRealtime() {
  destroyed = false
  retries   = 0
  connect()
}

export function stopRealtime() {
  destroyed = true
  clearTimers()
  ws?.close()
  ws = null
}

export function onRealtimeMessage(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}
