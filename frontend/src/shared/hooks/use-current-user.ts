import { useEffect, useSyncExternalStore } from 'react'
import {
  getCurrentUser,
  getCurrentUserStatus,
  loadCurrentUser,
  reloadCurrentUser,
  subscribeCurrentUser,
  type CurrentUser,
  type CurrentUserStatus,
} from '../lib/current-user'
import { getToken, subscribe as subscribeSession } from '../lib/session'

// Dados do aluno logado; atualiza o cabeçalho e as telas do perfil quando algo muda. Na primeira
// vez que uma tela os pede (ou depois de um login), busca GET /users/me.
export function useCurrentUserState(): {
  user: CurrentUser
  status: CurrentUserStatus
  reload: () => void
} {
  const user = useSyncExternalStore(subscribeCurrentUser, getCurrentUser)
  const status = useSyncExternalStore(subscribeCurrentUser, getCurrentUserStatus)
  const token = useSyncExternalStore(subscribeSession, getToken)

  useEffect(() => {
    if (status === 'loading' && token) void loadCurrentUser()
  }, [status, token])

  return { user, status, reload: () => void reloadCurrentUser() }
}

export function useCurrentUser(): CurrentUser {
  return useCurrentUserState().user
}
