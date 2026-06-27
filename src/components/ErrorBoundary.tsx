import { Component, type ErrorInfo, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.PROD) {
      apiFetch('/logs/client-error', {
        method: 'POST',
        body: JSON.stringify({
          message: error.message,
          stack: undefined,
          componentStack: info.componentStack?.slice(0, 500),
        }),
      }).catch(() => {})
    } else {
      console.error('[ErrorBoundary]', error, info)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center p-8 text-center">
            <div>
              <h1 className="text-xl font-semibold">Algo salió mal</h1>
              <p className="mt-2 text-muted-foreground">
                Por favor recarga la página o contacta soporte.
              </p>
              <button
                className="mt-4 underline text-sm"
                onClick={() => this.setState({ hasError: false })}
              >
                Reintentar
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
