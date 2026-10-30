import { notFound } from '../../shared/errors/app-error'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import { toDetailView, toSummaryView } from './listings.serializer'
import type { ListFilters, ListingRepository } from './listings.types'

export function createListingsService({ listings }: { listings: ListingRepository }) {
  // RN-ANU-05 a 07
  async function list(filters: ListFilters, pagination: Pagination) {
    const { items, total } = await listings.findVisiblePage(filters, pagination)
    return { data: items.map(toSummaryView), meta: buildMeta(pagination, total) }
  }

  // RF001.4
  async function recent(limit: number) {
    return (await listings.findRecent(limit)).map(toSummaryView)
  }

  // RF008. Excluído não aparece para ninguém (RN-ANU-09); pausado, vendido ou de dono suspenso só para
  // o próprio dono, os outros recebem 404 (RN-ANU-05). A visualização conta só para quem não é o dono.
  async function get(viewerId: number, id: number) {
    const listing = await listings.findById(id)
    if (!listing || listing.deletedAt) throw notFound('Anúncio não encontrado.')

    const isOwn = listing.owner.id === viewerId
    const visible = listing.status === 'active' && listing.owner.accountActive
    if (!isOwn && !visible) throw notFound('Anúncio não encontrado.')

    if (!isOwn) await listings.incrementViews(id) // RN-ANU-11
    return toDetailView(listing, isOwn)
  }

  return { list, recent, get }
}
export type ListingsService = ReturnType<typeof createListingsService>
