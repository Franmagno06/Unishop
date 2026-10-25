import { useSyncExternalStore } from 'react'
import { getCurrentUser, subscribeCurrentUser, type CurrentUser } from '../lib/current-user'

// Dados do aluno logado; atualiza o cabeçalho e as telas do perfil quando algo muda.
export function useCurrentUser(): CurrentUser {
  return useSyncExternalStore(subscribeCurrentUser, getCurrentUser)
}
