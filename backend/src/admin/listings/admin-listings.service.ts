import { AppError, hasOpenPaidOrders, notFound } from '../../shared/errors/app-error'
import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import type { MailProvider } from '../../shared/providers/mail/mail.provider'
import { buildAuditDetails } from '../audit-logs/audit-logs.details'
import { assertAdminCanTransition, startOfSalesMonth } from './admin-listings.rules'
import type { AdminListingFilters, AdminListingsRepository } from './admin-listings.types'

export function createAdminListingsService({
  listings,
  mail,
  now = () => new Date(),
}: {
  listings: AdminListingsRepository
  mail: MailProvider
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

  // RN-ADM-09, 10, RN-NOT-02: o e-mail sai depois do commit; falha no envio não desfaz a exclusão
  // (e o log de aplicação leva só o id do anúncio, nunca e-mail nem nome). Etapa 10: waitUntil.
  async function remove(actorId: number, id: number): Promise<void> {
    const result = await listings.softDelete(id, {
      audit: ({ cancelledOrderIds }) => ({
        adminId: actorId,
        action: 'delete_listing',
        entity: 'listing',
        entityId: id,
        details: buildAuditDetails('delete_listing', { kind: 'delete', cancelledOrderIds }),
      }),
    })
    if (result === 'not_found') throw notFound('Produto não encontrado.')
    if (result === 'blocked') {
      throw hasOpenPaidOrders('Há pedido pago ou com retirada combinada em aberto.')
    }
    await mail
      .sendListingRemoved({
        to: result.seller.email,
        name: result.seller.name,
        listingTitle: result.title,
      })
      .catch(() => console.error({ event: 'listing_removed_mail_failed', listingId: id }))
  }

  return { list, stats, get, updateStatus, remove }
}
export type AdminListingsService = ReturnType<typeof createAdminListingsService>
