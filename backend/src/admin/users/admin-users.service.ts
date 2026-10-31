import { NEW_USERS_WINDOW_DAYS, ONLINE_WINDOW_MS } from '../../config/constants'
import { AppError, notFound } from '../../shared/errors/app-error'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import { buildAuditDetails } from '../audit-logs/audit-logs.details'
import { assertAdminProtection, isOnline } from './admin-users.rules'
import type {
  AdminUserDetail,
  AdminUserRecord,
  AdminUserRow,
  AdminUsersRepository,
  AdminUserView,
} from './admin-users.types'

export function createAdminUsersService({
  users,
  now = () => new Date(),
}: {
  users: AdminUsersRepository
  now?: () => Date
}) {
  const toView = (u: AdminUserRecord, at: Date): AdminUserView => ({
    ...u,
    isOnline: isOnline(u.lastAccessAt, u.status, at),
  })

  // RN-ADM-02, 03
  async function list(filters: { search?: string | undefined }, pagination: Pagination) {
    const at = now()
    const { items, total } = await users.listStudents(filters, pagination)
    const data: AdminUserRow[] = items.map((u) => ({
      ...toView(u, at),
      listingsCount: u.listingsCount,
    }))
    return { data, meta: buildMeta(pagination, total) }
  }

  // RN-ADM-02: as janelas partem do relógio injetado, não do relógio do banco.
  async function stats() {
    const at = now()
    return users.stats(
      new Date(at.getTime() - ONLINE_WINDOW_MS),
      new Date(at.getTime() - NEW_USERS_WINDOW_DAYS * 24 * 60 * 60_000),
    )
  }

  // RN-ADM-04: consulta; o admin não edita dados do aluno.
  async function get(id: number): Promise<AdminUserDetail> {
    const detail = await users.findDetail(id)
    if (!detail) throw notFound('Usuário não encontrado.')
    return { ...detail, user: toView(detail.user, now()) }
  }

  // RN-ADM-04, 05, 10, 12. Validações na ordem da Decisão 2: alvo inexistente (404), a si mesmo,
  // mesmo status (INVALID_STATE, Q5) e último admin ativo. As que dependem do estado rodam com as linhas travadas.
  async function updateStatus(
    actorId: number,
    targetId: number,
    to: 'active' | 'suspended',
  ): Promise<AdminUserView> {
    const action = to === 'suspended' ? 'suspend_user' : 'reactivate_user'
    const result = await users.changeStatus(targetId, to, {
      guard(target) {
        if (to === 'suspended' && target.id === actorId) {
          assertAdminProtection({ actorId, action: 'suspend', target, activeAdminIds: [] })
        }
        if (target.status === to) {
          throw new AppError(409, 'INVALID_STATE', 'A conta já está nesse estado.')
        }
        if (to === 'suspended') {
          assertAdminProtection({
            actorId,
            action: 'suspend',
            target,
            activeAdminIds: target.activeAdminIds,
          })
        }
      },
      audit: (target) => ({
        adminId: actorId,
        action,
        entity: 'user',
        entityId: targetId,
        details: buildAuditDetails(action, { kind: 'status', from: target.status, to }),
      }),
    })
    if (result === 'not_found') throw notFound('Usuário não encontrado.')
    return toView(result, now())
  }

  return { list, stats, get, updateStatus }
}
export type AdminUsersService = ReturnType<typeof createAdminUsersService>
