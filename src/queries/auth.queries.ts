import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { userSchema, useSessionStore } from '@/stores/useSessionStore'
import type { User } from '@/stores/useSessionStore'

export const authKeys = {
  me: () => ['session', 'me'] as const,
}

export function useMe() {
  const token = useSessionStore((s) => s.token)

  return useQuery<User>({
    queryKey: authKeys.me(),
    queryFn: () => apiFetch<User>('/auth/me', {}, userSchema),
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
