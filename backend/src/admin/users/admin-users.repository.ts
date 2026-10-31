import type { Prisma } from '../../generated/prisma/client'
import type { Db } from '../../shared/database/prisma'
import {
  ACCOUNT_STATUS_FROM_DB,
  LISTING_STATUS_FROM_DB,
  ROLE_FROM_DB,
} from '../../shared/database/status-maps'
import { escapeLike } from '../../shared/utils/like'
import { decimalToCents } from '../../shared/utils/money'
import { toSkipTake } from '../../shared/utils/pagination'
import type { AdminUserRecord, AdminUsersRepository, AdminUserRowRecord } from './admin-users.types'

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

export function createPrismaAdminUsersRepository(db: Db): AdminUsersRepository {
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
  }
}
