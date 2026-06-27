import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(2 ** attempt * 1000, 30_000),
    },
    mutations: {
      retry: false,
    },
  },
})
