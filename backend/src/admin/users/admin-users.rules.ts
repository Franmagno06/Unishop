import { ONLINE_WINDOW_MS } from '../../config/constants'
import { AppError } from '../../shared/errors/app-error'
import type { AccountStatus } from '../../modules/auth/auth.types'

// RN-ADM-03: inclusivo, igual ao SQL do bd.md §9.4 (>= now() - 5 min). Só conta ativa pode estar logada.
export function isOnline(lastSeen: Date | null, status: AccountStatus, now: Date): boolean {
  if (status !== 'active' || lastSeen === null) return false
  return lastSeen.getTime() >= now.getTime() - ONLINE_WINDOW_MS
}

export type ProtectionInput = {
  actorId: number
  action: 'suspend' | 'delete'
  target: { id: number; role: 'student' | 'admin'; status: 'active' | 'suspended' }
  /** Admins com conta ativa, lidos e travados dentro da transação (FOR UPDATE). */
  activeAdminIds: number[]
}

// RN-ADM-12 (Decisão 2, opção a): ninguém suspende nem exclui a si mesmo, e o último admin ativo
// (contando os ativos SEM o alvo) fica protegido. Reativar nunca passa por aqui.
export function assertAdminProtection(input: ProtectionInput): void {
  const { actorId, action, target, activeAdminIds } = input
  const verb = action === 'suspend' ? 'suspender' : 'excluir'
  if (target.id === actorId) {
    throw new AppError(409, 'ADMIN_PROTECTED', `Você não pode ${verb} a própria conta.`)
  }
  if (target.role === 'admin' && target.status === 'active') {
    const others = activeAdminIds.filter((id) => id !== target.id)
    if (others.length === 0) {
      throw new AppError(
        409,
        'ADMIN_PROTECTED',
        `Não é possível ${verb} o último administrador ativo.`,
      )
    }
  }
}
