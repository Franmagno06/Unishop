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

const DB_STATUS: Record<ListingStatus, string> = {
  active: 'ativo',
  paused: 'pausado',
  sold: 'vendido',
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

const lockListing = (tx: Prisma.TransactionClient, id: number) =>
  tx.$queryRaw`SELECT id_anuncio FROM anuncio WHERE id_anuncio = ${id} FOR UPDATE`

export function createPrismaListingRepository(db: Db): ListingRepository {
  async function findById(id: number): Promise<ListingDetailRecord | null> {
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
      views: row.views,
      contacts: row.contacts,
      images: row.images,
      owner: {
        id: row.user.id,
        name: row.user.name,
        course: row.user.course,
        verified: row.user.verified,
        accountActive: row.user.accountStatus === 'ativa',
      },
    }
  }

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

    findById,

    async incrementViews(id) {
      await db.listing.update({ where: { id }, data: { views: { increment: 1 } } })
    },

    async findByOwner(ownerId) {
      const rows = await db.listing.findMany({
        where: { userId: ownerId, deletedAt: null },
        select: { id: true },
        orderBy: ORDER.recent,
      })
      const records = await Promise.all(rows.map((r) => findById(r.id)))
      return records.filter((r): r is ListingDetailRecord => r !== null)
    },

    async update(id, patch) {
      await db.listing.update({
        where: { id },
        data: {
          ...(patch.title !== undefined && { name: patch.title }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.priceInCents !== undefined && { price: centsToDecimal(patch.priceInCents) }),
          ...(patch.quantity !== undefined && { quantity: patch.quantity }),
          ...(patch.whatsapp !== undefined && { whatsapp: patch.whatsapp }),
          ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
        },
      })
    },

    // UPDATE condicional: se outra requisição já trocou o estado, nenhuma linha muda. Vendido zera as
    // unidades que sobraram e grava a data (RF017.9, RN-EST-06).
    async changeStatus(id, from, to) {
      const { count } = await db.listing.updateMany({
        where: { id, deletedAt: null, status: { in: from.map((s) => DB_STATUS[s]) } },
        data: {
          status: DB_STATUS[to],
          ...(to === 'sold' && { quantity: 0, soldAt: new Date() }),
        },
      })
      return count === 1
    },

    // RN-ANU-09: a trava no anúncio e a conferência dos pedidos ficam na mesma transação.
    async softDelete(id) {
      return db.$transaction(async (tx) => {
        await lockListing(tx, id)
        const open = await tx.order.count({
          where: { listingId: id, status: { in: ['pago', 'retirada_combinada'] } },
        })
        if (open > 0) return 'blocked' as const
        await tx.listing.update({ where: { id }, data: { deletedAt: new Date() } })
        return 'ok' as const
      })
    },

    countOrders(id) {
      return db.order.count({ where: { listingId: id } })
    },

    async categoryExists(id) {
      return (await db.category.count({ where: { id } })) > 0
    },

    // RN-ANU-01, 03: anúncio e imagem 1 juntos; sem a imagem, o anúncio não nasce.
    async createWithImage(data, image) {
      const { id } = await db.$transaction(async (tx) => {
        const listing = await tx.listing.create({
          data: {
            name: data.title,
            description: data.description,
            price: centsToDecimal(data.priceInCents),
            quantity: data.quantity,
            whatsapp: data.whatsapp,
            userId: data.ownerId,
            categoryId: data.categoryId,
          },
          select: { id: true },
        })
        await tx.listingImage.create({ data: { listingId: listing.id, position: 1, ...image } })
        return listing
      })
      return (await findById(id))!
    },

    // A trava na linha do anúncio serializa quem mexe nas imagens dele: duas inclusões ou remoções ao
    // mesmo tempo não passam de 5 nem deixam o anúncio sem imagem (RN-ANU-03).
    async addImage(listingId, image) {
      return db.$transaction(async (tx) => {
        await lockListing(tx, listingId)
        const used = new Set(
          (
            await tx.listingImage.findMany({ where: { listingId }, select: { position: true } })
          ).map((r) => r.position),
        )
        const position = [1, 2, 3, 4, 5].find((p) => !used.has(p))
        if (position === undefined) return 'full' as const
        return tx.listingImage.create({
          data: { listingId, position, ...image },
          select: { id: true, url: true, position: true },
        })
      })
    },

    async removeImage(listingId, imageId) {
      return db.$transaction(async (tx) => {
        await lockListing(tx, listingId)
        const images = await tx.listingImage.findMany({
          where: { listingId },
          orderBy: { position: 'asc' },
        })
        const target = images.find((i) => i.id === imageId)
        if (!target) return 'not_found' as const
        if (images.length <= 1) return 'last' as const

        await tx.listingImage.delete({ where: { id: imageId } })
        // Fecha o buraco na ordem, de cima para baixo, para a principal continuar sendo a de ordem 1.
        const rest = images.filter((i) => i.id !== imageId)
        for (const [index, image] of rest.entries()) {
          if (image.position !== index + 1) {
            await tx.listingImage.update({ where: { id: image.id }, data: { position: index + 1 } })
          }
        }
        return { publicId: target.publicId }
      })
    },
  }
}
