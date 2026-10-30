import type { Prisma } from '../../generated/prisma/client'
import { listingVisibleWhere } from '../../shared/database/listing-visibility'
import type { Db } from '../../shared/database/prisma'
import { centsToDecimal, decimalToCents } from '../../shared/utils/money'
import { toSkipTake } from '../../shared/utils/pagination'
import type {
  ListFilters,
  ListingDetailRecord,
  ListingRepository,
  ListingSort,
  ListingStatus,
  ListingSummaryRecord,
} from './listings.types'

const STATUS: Record<string, ListingStatus> = {
  ativo: 'active',
  pausado: 'paused',
  vendido: 'sold',
}

const ORDER: Record<ListingSort, Prisma.ListingOrderByWithRelationInput[]> = {
  recent: [{ publishedAt: 'desc' }, { id: 'desc' }],
  price_asc: [{ price: 'asc' }, { publishedAt: 'desc' }, { id: 'desc' }],
  price_desc: [{ price: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }],
}

const summarySelect = {
  id: true,
  name: true,
  price: true,
  categoryId: true,
  publishedAt: true,
  category: { select: { name: true } },
  images: { where: { position: 1 }, select: { url: true }, take: 1 },
} satisfies Prisma.ListingSelect

type SummaryRow = Prisma.ListingGetPayload<{ select: typeof summarySelect }>

const toSummary = (row: SummaryRow): ListingSummaryRecord => ({
  id: row.id,
  title: row.name,
  priceInCents: decimalToCents(row.price),
  categoryId: row.categoryId,
  categoryName: row.category.name,
  imageUrl: row.images[0]?.url ?? null,
  publishedAt: row.publishedAt,
})

// A barra invertida, % e _ têm sentido especial no LIKE: o texto do aluno entra como texto comum.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`)

function whereOf(filters: ListFilters): Prisma.ListingWhereInput {
  const { categoryId, search, minPriceCents, maxPriceCents } = filters
  return {
    ...listingVisibleWhere(),
    ...(categoryId !== undefined && { categoryId }),
    // RN-CAT-03: procura no nome e na descrição.
    ...(search && {
      OR: [
        { name: { contains: escapeLike(search), mode: 'insensitive' } },
        { description: { contains: escapeLike(search), mode: 'insensitive' } },
      ],
    }),
    ...((minPriceCents !== undefined || maxPriceCents !== undefined) && {
      price: {
        ...(minPriceCents !== undefined && { gte: centsToDecimal(minPriceCents) }),
        ...(maxPriceCents !== undefined && { lte: centsToDecimal(maxPriceCents) }),
      },
    }),
  }
}

export function createPrismaListingRepository(db: Db): ListingRepository {
  return {
    async findVisiblePage(filters, pagination) {
      const where = whereOf(filters)
      const [rows, total] = await db.$transaction([
        db.listing.findMany({
          where,
          select: summarySelect,
          orderBy: ORDER[filters.sort],
          ...toSkipTake(pagination),
        }),
        db.listing.count({ where }),
      ])
      return { items: rows.map(toSummary), total }
    },

    async findRecent(limit) {
      const rows = await db.listing.findMany({
        where: listingVisibleWhere(),
        select: summarySelect,
        orderBy: ORDER.recent,
        take: limit,
      })
      return rows.map(toSummary)
    },

    async findById(id) {
      const row = await db.listing.findUnique({
        where: { id },
        include: {
          category: { select: { name: true } },
          images: { orderBy: { position: 'asc' }, select: { id: true, url: true, position: true } },
          user: {
            select: { id: true, name: true, course: true, verified: true, accountStatus: true },
          },
        },
      })
      if (!row) return null
      return {
        id: row.id,
        title: row.name,
        description: row.description,
        priceInCents: decimalToCents(row.price),
        quantity: row.quantity,
        whatsapp: row.whatsapp,
        status: STATUS[row.status] ?? 'paused',
        categoryId: row.categoryId,
        categoryName: row.category.name,
        publishedAt: row.publishedAt,
        deletedAt: row.deletedAt,
        images: row.images,
        owner: {
          id: row.user.id,
          name: row.user.name,
          course: row.user.course,
          verified: row.user.verified,
          accountActive: row.user.accountStatus === 'ativa',
        },
      } satisfies ListingDetailRecord
    },

    async incrementViews(id) {
      await db.listing.update({ where: { id }, data: { views: { increment: 1 } } })
    },
  }
}
