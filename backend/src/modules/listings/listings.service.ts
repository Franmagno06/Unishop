import { IMAGE_LIMITS } from '../../config/constants'
import { AppError, forbidden, notFound } from '../../shared/errors/app-error'
import type { StorageProvider } from '../../shared/providers/storage/storage.provider'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import type { UserRepository } from '../auth/auth.types'
import { toDetailView, toSummaryView } from './listings.serializer'
import type { ListFilters, ListingDetailRecord, ListingRepository } from './listings.types'

export type ListingsDeps = {
  listings: ListingRepository
  users: UserRepository
  storage: StorageProvider
}

const STORAGE_FOLDER = 'listings'

export function createListingsService({ listings, users, storage }: ListingsDeps) {
  // RN-ANU-05 a 07
  async function list(filters: ListFilters, pagination: Pagination) {
    const { items, total } = await listings.findVisiblePage(filters, pagination)
    return { data: items.map(toSummaryView), meta: buildMeta(pagination, total) }
  }

  // RF001.4
  async function recent(limit: number) {
    return (await listings.findRecent(limit)).map(toSummaryView)
  }

  const isVisible = (l: ListingDetailRecord) => l.status === 'active' && l.owner.accountActive

  // RF008. Excluído não aparece para ninguém (RN-ANU-09); pausado, vendido ou de dono suspenso só para
  // o próprio dono, os outros recebem 404 (RN-ANU-05). A visualização conta só para quem não é o dono.
  async function get(viewerId: number, id: number) {
    const listing = await listings.findById(id)
    if (!listing || listing.deletedAt) throw notFound('Anúncio não encontrado.')

    const isOwn = listing.owner.id === viewerId
    if (!isOwn && !isVisible(listing)) throw notFound('Anúncio não encontrado.')

    if (!isOwn) await listings.incrementViews(id) // RN-ANU-11
    return toDetailView(listing, isOwn)
  }

  // RN-ANU-04: só o dono mexe no anúncio. Quem não pode nem vê o anúncio recebe 404, e quem o vê
  // (terceiro ou admin) recebe 403.
  async function loadOwned(userId: number, id: number) {
    const listing = await listings.findById(id)
    if (!listing || listing.deletedAt) throw notFound('Anúncio não encontrado.')
    if (listing.owner.id !== userId) {
      throw isVisible(listing) ? forbidden() : notFound('Anúncio não encontrado.')
    }
    return listing
  }

  const invalid = (field: string, message: string) =>
    new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos.', [{ field, message }])

  // RN-ANU-01 a 03, RN-EST-01. A imagem sobe antes do banco; se o banco falhar, ela é removida.
  async function create(
    userId: number,
    input: {
      title: string
      categoryId: number
      description: string
      priceInCents: number
      quantity: number
      whatsapp?: string | undefined
    },
    image: Buffer,
  ) {
    const owner = await users.findById(userId)
    if (!owner) throw new AppError(401, 'UNAUTHENTICATED', 'Faça login para continuar.')

    // O WhatsApp do anúncio nasce com o do perfil e pode ser trocado (RN-ANU-01).
    const whatsapp = input.whatsapp || owner.whatsapp
    if (!whatsapp) throw invalid('whatsapp', 'Informe o WhatsApp do anúncio.')
    if (!(await listings.categoryExists(input.categoryId))) {
      throw invalid('categoryId', 'Categoria inexistente.')
    }

    const stored = await storage.upload({ buffer: image, folder: STORAGE_FOLDER })
    try {
      const created = await listings.createWithImage(
        { ...input, whatsapp, ownerId: userId },
        stored,
      )
      return toDetailView(created, true)
    } catch (err) {
      await storage.remove(stored.publicId).catch(() => undefined)
      throw err
    }
  }

  // RN-ANU-03, 04: até 5 imagens, uma por requisição.
  async function addImage(userId: number, id: number, image: Buffer) {
    const listing = await loadOwned(userId, id)
    if (listing.images.length >= IMAGE_LIMITS.maxPerListing) throw tooManyImages()

    const stored = await storage.upload({ buffer: image, folder: STORAGE_FOLDER })
    try {
      const added = await listings.addImage(id, stored)
      if (added === 'full') throw tooManyImages()
      return added
    } catch (err) {
      await storage.remove(stored.publicId).catch(() => undefined)
      throw err
    }
  }

  // RN-ANU-03, 04: o anúncio mantém pelo menos 1 imagem.
  async function removeImage(userId: number, id: number, imageId: number) {
    await loadOwned(userId, id)
    const removed = await listings.removeImage(id, imageId)
    if (removed === 'not_found') throw notFound('Imagem não encontrada.')
    if (removed === 'last') {
      throw new AppError(409, 'INVALID_STATE', 'O anúncio precisa ter pelo menos uma imagem.')
    }
    await storage.remove(removed.publicId).catch(() => undefined)
  }

  return { list, recent, get, create, addImage, removeImage }
}
export type ListingsService = ReturnType<typeof createListingsService>

const tooManyImages = () =>
  new AppError(409, 'INVALID_STATE', 'O anúncio já tem o máximo de 5 imagens.')
