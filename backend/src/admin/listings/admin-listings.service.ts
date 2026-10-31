import { notFound } from '../../shared/errors/app-error'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import { startOfSalesMonth } from './admin-listings.rules'
import type { AdminListingFilters, AdminListingsRepository } from './admin-listings.types'

export function createAdminListingsService({
  listings,
  now = () => new Date(),
}: {
  listings: AdminListingsRepository
  now?: () => Date
}) {
  // RN-ADM-07
  async function list(filters: AdminListingFilters, pagination: Pagination) {
    const { items, total } = await listings.list(filters, pagination)
    return { data: items, meta: buildMeta(pagination, total) }
  }

  // RN-ADM-07: a janela do mês parte do relógio injetado, não do relógio do banco.
  async function stats() {
    return listings.stats(startOfSalesMonth(now()))
  }

  // RF023
  async function get(id: number) {
    const detail = await listings.findDetail(id)
    if (!detail) throw notFound('Produto não encontrado.')
    return detail
  }

  return { list, stats, get }
}
export type AdminListingsService = ReturnType<typeof createAdminListingsService>
