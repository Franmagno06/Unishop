import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { api } from './api'
import type { ProfileApiUser } from './current-user'
import { MOCK_MODE } from './mock-mode'
import { getToken, subscribe } from './session'

// GET /auth/me (RN-ACE-11): passa mesmo com o aceite dos Termos pendente, ao contrário de
// GET /users/me. Em demonstração (MOCK_MODE) não há aceite pendente.
export type AuthMe = { user: ProfileApiUser | null; needsTermsAcceptance: boolean }

export async function getAuthMe(signal?: AbortSignal): Promise<AuthMe> {
  if (import.meta.env.DEV && MOCK_MODE) return { user: null, needsTermsAcceptance: false }
  const response = await api<{ data: { user: ProfileApiUser; needsTermsAcceptance: boolean } }>(
    '/auth/me',
    { signal },
  )
  return response.data
}

// A chave leva o token: outro login (ou a troca de senha) nunca reaproveita o cache do anterior.
export function useAuthMe(enabled: boolean) {
  const token = useSyncExternalStore(subscribe, getToken)
  return useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: ({ signal }) => getAuthMe(signal),
    enabled,
  })
}
