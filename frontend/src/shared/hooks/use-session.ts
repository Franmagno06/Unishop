import { useSyncExternalStore } from 'react'
import { getRole, getToken, subscribe, type Role } from '../lib/session'

// Quem está logado agora. Atualiza sozinho quando a sessão muda (login, sair, sessão vencida).
export function useSession(): { isLoggedIn: boolean; role: Role | null } {
  const token = useSyncExternalStore(subscribe, getToken)
  const role = useSyncExternalStore(subscribe, getRole)
  return { isLoggedIn: token !== null, role }
}
