import type { Prisma } from '../../generated/prisma/client'
import type { Db } from '../../shared/database/prisma'
import { lockActiveAdminIds } from '../users/admin-users.repository'
import { writeAuditLog } from '../audit-logs/audit-logs.repository'
import type { AuditWriter } from '../audit-logs/audit-logs.types'
import {
  cancelUnpaidOrders,
  hasOpenPaidOrders,
  lockOpenOrders,
} from '../../shared/database/open-orders'
import { LISTING_STATUS_FROM_DB, LISTING_STATUS_TO_DB } from '../../shared/database/status-maps'
import { escapeLike } from '../../shared/utils/like'
import { decimalToCents } from '../../shared/utils/money'
import { toSkipTake } from '../../shared/utils/pagination'
import type {
  AdminListingDetail,
  AdminListingRow,
  AdminListingsRepository,
} from './admin-listings.types'

function statusOf(raw: string) {
  const status = LISTING_STATUS_FROM_DB[raw]
  if (!status) throw new Error(`Status de anúncio desconhecido: ${raw}`)
  return status
}

const rowSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  status: true,
  categoryId: true,
  publishedAt: true,
  category: { select: { name: true } },
  user: { select: { id: true, name: true } },
  images: { where: { position: 1 }, take: 1, select: { url: true } },
} satisfies Prisma.ListingSelect

const detailSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  quantity: true,
  status: true,
  whatsapp: true,
  categoryId: true,
  views: true,
  contacts: true,
  publishedAt: true,
  category: { select: { name: true } },
  user: { select: { id: true, name: true, email: true, whatsapp: true } },
  images: { orderBy: { position: 'asc' }, select: { id: true, url: true, position: true } },
} satisfies Prisma.ListingSelect

type DetailRow = Prisma.ListingGetPayload<{ select: typeof detailSelect }>

function toDetail(row: DetailRow): AdminListingDetail {
  return {
    id: row.id,
    title: row.name,
    description: row.description,
    priceInCents: decimalToCents(row.price),
    quantity: row.quantity,
    categoryId: row.categoryId,
    categoryName: row.category.name,
    status: statusOf(row.status),
    whatsapp: row.whatsapp,
    seller: {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      whatsapp: row.user.whatsapp,
    },
    images: row.images,
    views: row.views,
    whatsappContacts: row.contacts,
    publishedAt: row.publishedAt,
  }
}

// Aceita o cliente ou a transação, para devolver o detalhe depois de uma escrita.
export async function findAdminListingDetail(
  db: Pick<Db, 'listing'> | Prisma.TransactionClient,
  id: number,
): Promise<AdminListingDetail | null> {
  const row = await db.listing.findFirst({ where: { id, deletedAt: null }, select: detailSelect })
  return row ? toDetail(row) : null
}

export function createPrismaAdminListingsRepository(
  db: Db,
  { writeAuditLog: audit = writeAuditLog }: { writeAuditLog?: AuditWriter } = {},
): AdminListingsRepository {
  return {
    async list(filters, pagination) {
      const search = filters.search ? escapeLike(filters.search) : undefined
      const where: Prisma.ListingWhereInput = {
        deletedAt: null,
        ...(filters.categoryId !== undefined && { categoryId: filters.categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      }
      const [rows, total] = await db.$transaction([
        db.listing.findMany({
          where,
          select: rowSelect,
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          ...toSkipTake(pagination),
        }),
        db.listing.count({ where }),
      ])
      const items: AdminListingRow[] = rows.map((r) => ({
        id: r.id,
        title: r.name,
        description: r.description,
        priceInCents: decimalToCents(r.price),
        categoryId: r.categoryId,
        categoryName: r.category.name,
        status: statusOf(r.status),
        imageUrl: r.images[0]?.url ?? null,
        seller: { id: r.user.id, name: r.user.name },
        publishedAt: r.publishedAt,
      }))
      return { items, total }
    },

    // Uma consulta só; o bigint do COUNT vira number.
    async stats(monthStart) {
      const [row] = await db.$queryRaw<{ active: bigint; paused: bigint; sold_in_month: bigint }[]>`
        SELECT COUNT(*) FILTER (WHERE status = 'ativo')                                   AS active,
               COUNT(*) FILTER (WHERE status = 'pausado')                                 AS paused,
               COUNT(*) FILTER (WHERE status = 'vendido' AND vendido_em >= ${monthStart}) AS sold_in_month
          FROM anuncio
         WHERE excluido_em IS NULL`
      return {
        active: Number(row?.active ?? 0),
        paused: Number(row?.paused ?? 0),
        soldInMonth: Number(row?.sold_in_month ?? 0),
      }
    },

    findDetail: (id) => findAdminListingDetail(db, id),

    // Ordem das travas: pedido antes de anuncio (a mesma da liquidação do pagamento).
    async softDelete(id, hooks) {
      return db.$transaction(async (tx) => {
        hooks.guardActor(await lockActiveAdminIds(tx)) // usuario antes de pedido e anuncio
        const orders = await lockOpenOrders(tx, { listingId: id })
        const [row] = await tx.$queryRaw<
          { title: string; deleted: boolean; seller_name: string; seller_email: string }[]
        >`
          SELECT a.nome AS title, (a.excluido_em IS NOT NULL) AS deleted,
                 u.nome AS seller_name, u.email AS seller_email
            FROM anuncio a JOIN usuario u ON u.id_usuario = a.id_usuario
           WHERE a.id_anuncio = ${id}
             FOR UPDATE OF a`
        if (!row || row.deleted) return 'not_found' as const
        if (hasOpenPaidOrders(orders)) return 'blocked' as const
        const now = new Date()
        const { ids: cancelledOrderIds } = await cancelUnpaidOrders(tx, orders, now)
        await tx.listing.update({ where: { id }, data: { deletedAt: now } })
        await audit(tx, hooks.audit({ cancelledOrderIds }))
        return { seller: { name: row.seller_name, email: row.seller_email }, title: row.title }
      })
    },

    // RN-ADM-08, 10: anúncio travado, regra, troca e log na mesma transação.
    async changeStatus(id, to, hooks) {
      return db.$transaction(async (tx) => {
        hooks.guardActor(await lockActiveAdminIds(tx)) // usuario antes de anuncio
        const [row] = await tx.$queryRaw<{ status: string; quantity: number; deleted: boolean }[]>`
          SELECT status, quantidade AS quantity, (excluido_em IS NOT NULL) AS deleted
            FROM anuncio WHERE id_anuncio = ${id} FOR UPDATE`
        if (!row || row.deleted) return 'not_found' as const
        const snapshot = { id, status: statusOf(row.status), quantity: row.quantity }
        const { clearSoldAt } = hooks.guard(snapshot)
        await tx.listing.update({
          where: { id },
          data: { status: LISTING_STATUS_TO_DB[to], ...(clearSoldAt && { soldAt: null }) },
        })
        await audit(tx, hooks.audit(snapshot))
        return (await findAdminListingDetail(tx, id))!
      })
    },
  }
}
