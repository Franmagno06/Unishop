import { AppError, notFound } from '../../shared/errors/app-error'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import { buildAuditDetails } from '../audit-logs/audit-logs.details'
import { assertAdminCanTransition, startOfSalesMonth } from './admin-listings.rules'
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

  // RN-ADM-08, 10: mesmo status dá 409 (Q5); a troca em si segue a Decisão 4.
  async function updateStatus(actorId: number, id: number, to: 'active' | 'paused') {
    const result = await listings.changeStatus(id, to, {
      guard(listing) {
        if (listing.status === to) {
          throw new AppError(409, 'INVALID_STATE', 'O anúncio já está nesse estado.')
        }
        return assertAdminCanTransition(listing.status, to, listing.quantity)
      },
      audit(listing) {
        const action = listing.status === 'sold' ? 'revert_sold' : 'edit_listing'
        return {
          adminId: actorId,
          action,
          entity: 'listing',
          entityId: id,
          details: buildAuditDetails(action, { kind: 'status', from: listing.status, to }),
        }
      },
    })
    if (result === 'not_found') throw notFound('Produto não encontrado.')
    return result
  }

  return { list, stats, get, updateStatus }
}
export type AdminListingsService = ReturnType<typeof createAdminListingsService>
