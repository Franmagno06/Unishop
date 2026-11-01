import type { Prisma } from '../../generated/prisma/client'
import type { Db } from '../../shared/database/prisma'
import {
  ACCOUNT_STATUS_FROM_DB,
  ACCOUNT_STATUS_TO_DB,
  LISTING_STATUS_FROM_DB,
  ROLE_FROM_DB,
} from '../../shared/database/status-maps'
import { anonymizeAccountTx } from '../../shared/database/account-anonymization'
import { escapeLike } from '../../shared/utils/like'
import { decimalToCents } from '../../shared/utils/money'
import { toSkipTake } from '../../shared/utils/pagination'
import { writeAuditLog } from '../audit-logs/audit-logs.repository'
import type { AuditWriter } from '../audit-logs/audit-logs.types'
import type {
  AdminUserRecord,
  AdminUsersRepository,
  AdminUserRowRecord,
  TargetSnapshot,
} from './admin-users.types'

const userSelect = {
  id: true,
  name: true,
  email: true,
  course: true,
  whatsapp: true,
  photoUrl: true,
  role: true,
  accountStatus: true,
  createdAt: true,
  lastSeen: true,
} satisfies Prisma.UserSelect
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>

function toRecord(row: UserRow): AdminUserRecord {
  const role = ROLE_FROM_DB[row.role]
  const status = ACCOUNT_STATUS_FROM_DB[row.accountStatus]
  if (!role || !status || status === 'deleted') {
    throw new Error(`Valor inesperado no banco para o usuário ${row.id}`)
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    course: row.course,
    whatsapp: row.whatsapp,
    avatarUrl: row.photoUrl,
    role,
    status,
    createdAt: row.createdAt,
    lastAccessAt: row.lastSeen,
  }
}

// Decisão 2, opção (a): FOR UPDATE nos admins ativos, em ordem de id, no início da transação.
// Isolada para trocar por advisory lock se o gestor decidir. Duas transações que mexem em admins
// esperam uma pela outra; ao seguir, o PostgreSQL relê as linhas e não vê mais o admin suspenso.
export async function lockActiveAdminIds(tx: Prisma.TransactionClient): Promise<number[]> {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id_usuario AS id FROM usuario
     WHERE tipo_usuario = 'admin' AND status_conta = 'ativa'
     ORDER BY id_usuario
       FOR UPDATE`
  return rows.map((r) => r.id)
}

// Ordem das travas: admins ativos (por id) e depois o alvo. Devolve o estado lido com tudo travado.
async function lockTarget(
  tx: Prisma.TransactionClient,
  targetId: number,
): Promise<TargetSnapshot | 'not_found'> {
  const activeAdminIds = await lockActiveAdminIds(tx)
  const [target] = await tx.$queryRaw<{ id: number; role: string; status: string }[]>`
    SELECT id_usuario AS id, tipo_usuario AS role, status_conta AS status
      FROM usuario WHERE id_usuario = ${targetId} FOR UPDATE`
  const role = target && ROLE_FROM_DB[target.role]
  const status = target && ACCOUNT_STATUS_FROM_DB[target.status]
  if (!target || !role || !status || status === 'deleted') return 'not_found'
  return { id: target.id, role, status, activeAdminIds }
}

export function createPrismaAdminUsersRepository(
  db: Db,
  { writeAuditLog: audit = writeAuditLog }: { writeAuditLog?: AuditWriter } = {},
): AdminUsersRepository {
  return {
    // RN-ADM-02: só alunos ativos e suspensos; contagem de anúncios na mesma consulta (sem N+1).
    async listStudents(filters, pagination) {
      const search = filters.search ? escapeLike(filters.search) : undefined
      const where: Prisma.UserWhereInput = {
        role: 'aluno',
        accountStatus: { in: ['ativa', 'suspensa'] },
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
      }
      const [rows, total] = await db.$transaction([
        db.user.findMany({
          where,
          select: {
            ...userSelect,
            _count: { select: { listings: { where: { deletedAt: null } } } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          ...toSkipTake(pagination),
        }),
        db.user.count({ where }),
      ])
      const items: AdminUserRowRecord[] = rows.map((r) => ({
        ...toRecord(r),
        listingsCount: r._count.listings,
      }))
      return { items, total }
    },

    // Uma consulta só (bd.md §9.4); o bigint do COUNT vira number.
    async stats(onlineSince, weekAgo) {
      const [row] = await db.$queryRaw<{ total: bigint; online: bigint; new_this_week: bigint }[]>`
        SELECT COUNT(*) FILTER (WHERE status_conta <> 'excluida')                                AS total,
               COUNT(*) FILTER (WHERE status_conta = 'ativa' AND ultimo_acesso >= ${onlineSince}) AS online,
               COUNT(*) FILTER (WHERE status_conta <> 'excluida' AND data_cadastro >= ${weekAgo}) AS new_this_week
          FROM usuario
         WHERE tipo_usuario = 'aluno'`
      return {
        total: Number(row?.total ?? 0),
        online: Number(row?.online ?? 0),
        newThisWeek: Number(row?.new_this_week ?? 0),
      }
    },

    async findDetail(id) {
      const row = await db.user.findFirst({
        where: { id, accountStatus: { not: 'excluida' } },
        select: {
          ...userSelect,
          listings: {
            where: { deletedAt: null },
            orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
            select: {
              id: true,
              name: true,
              price: true,
              status: true,
              category: { select: { name: true } },
              images: { where: { position: 1 }, take: 1, select: { url: true } },
            },
          },
        },
      })
      if (!row) return null
      const [sales, purchases] = await db.$transaction([
        db.order.count({ where: { sellerId: id, status: 'concluido' } }),
        db.order.count({ where: { buyerId: id, status: 'concluido' } }),
      ])
      const listings = row.listings.map((l) => {
        const status = LISTING_STATUS_FROM_DB[l.status]
        if (!status) throw new Error(`Status de anúncio desconhecido: ${l.status}`)
        return {
          id: l.id,
          title: l.name,
          priceInCents: decimalToCents(l.price),
          categoryName: l.category.name,
          status,
          imageUrl: l.images[0]?.url ?? null,
        }
      })
      return {
        user: toRecord(row),
        listings,
        stats: { listings: listings.length, sales, purchases },
      }
    },

    async deleteUser(targetId, hooks) {
      return db.$transaction(async (tx) => {
        const target = await lockTarget(tx, targetId)
        if (target === 'not_found') return 'not_found' as const
        hooks.guard(target)
        const result = await anonymizeAccountTx(tx, targetId, new Date())
        if (result.status !== 'ok') return result.status
        await audit(tx, hooks.audit(target, result))
        return 'ok' as const
      })
    },

    async changeStatus(targetId, to, hooks) {
      return db.$transaction(async (tx) => {
        const snapshot = await lockTarget(tx, targetId)
        if (snapshot === 'not_found') return 'not_found' as const
        hooks.guard(snapshot)
        const row = await tx.user.update({
          where: { id: targetId },
          data: { accountStatus: ACCOUNT_STATUS_TO_DB[to] },
          select: userSelect,
        })
        await audit(tx, hooks.audit(snapshot))
        return toRecord(row)
      })
    },
  }
}
