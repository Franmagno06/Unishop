import { NEW_USERS_WINDOW_DAYS, ONLINE_WINDOW_MS } from '../../config/constants'
import { notFound } from '../../shared/errors/app-error'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import { isOnline } from './admin-users.rules'
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

  return { list, stats, get }
}
export type AdminUsersService = ReturnType<typeof createAdminUsersService>
