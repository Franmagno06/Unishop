import { ONLINE_WINDOW_MS } from '../../config/constants'
import type { AccountStatus } from '../../modules/auth/auth.types'

// RN-ADM-03: inclusivo, igual ao SQL do bd.md §9.4 (>= now() - 5 min). Só conta ativa pode estar logada.
export function isOnline(lastSeen: Date | null, status: AccountStatus, now: Date): boolean {
  if (status !== 'active' || lastSeen === null) return false
  return lastSeen.getTime() >= now.getTime() - ONLINE_WINDOW_MS
}
