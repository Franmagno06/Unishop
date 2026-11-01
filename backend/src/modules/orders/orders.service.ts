import { AppError, forbidden, notFound } from '../../shared/errors/app-error'
import type { PaymentGateway } from '../../shared/providers/payment/payment.gateway'
import type { OrderRecord, OrderRepository } from './orders.types'
import { toOrderJson } from './orders.serializer'

export type OrdersConfig = {
  /** Taxa de serviço em % (RN-PED-02). R$ 0,00 por enquanto. */
  serviceFeePercent: number
  /** Prazo do Pendente sem pagamento aprovado (RN-PAG-04 e 12). */
  expirationMinutes: number
}

type Deps = {
  orders: OrderRepository
  gateway: PaymentGateway
  config: OrdersConfig
  now?: () => Date
}

const invalidState = (message: string) => new AppError(409, 'INVALID_STATE', message)

export function createOrdersService({ orders, gateway, config, now = () => new Date() }: Deps) {
  const ttlMs = config.expirationMinutes * 60_000
  const expiresAt = (order: OrderRecord) => new Date(order.createdAt.getTime() + ttlMs)
  const json = (order: OrderRecord) => toOrderJson(order, expiresAt(order))

  // Cancelamento sob demanda (RN-PAG-12): quem lê um Pendente vencido o cancela. O job
  // `expire-pix-payments` faz o mesmo em lote. A cobrança em aberto é cancelada no gateway (melhor esforço).
  async function expireIfDue(order: OrderRecord): Promise<OrderRecord> {
    if (order.status !== 'pending' || expiresAt(order) > now()) return order
    const gatewayId = await orders.findPendingGatewayId(order.id)
    const expired = await orders.expire(order.id, new Date(now().getTime() - ttlMs))
    if (expired && gatewayId) await gateway.cancelPayment(gatewayId).catch(() => undefined)
    return (await orders.findById(order.id)) ?? order
  }

  async function open(
    buyerId: number,
    input: { listingId: number; quantity: number },
    negotiation: 'site_payment' | 'whatsapp',
  ) {
    const listing = await orders.findListing(input.listingId)
    // Anúncio inexistente, excluído ou de conta inativa é invisível (RN-ANU-05).
    if (!listing || listing.deleted || !listing.ownerActive)
      throw notFound('Anúncio não encontrado.')
    if (listing.ownerId === buyerId) {
      throw new AppError(403, 'OWN_LISTING', 'Você não pode fazer pedido do seu próprio anúncio.') // RN-ANU-10
    }
    if (listing.status !== 'active') {
      throw new AppError(409, 'LISTING_UNAVAILABLE', 'Este anúncio não está mais disponível.')
    }
    if (input.quantity > listing.quantity) {
      throw new AppError(409, 'OUT_OF_STOCK', 'Não há unidades suficientes deste item.') // RN-EST-02
    }
    const subtotal = listing.priceInCents * input.quantity
    const feeInCents =
      negotiation === 'site_payment' ? Math.round((subtotal * config.serviceFeePercent) / 100) : 0
    const { order, created } = await orders.createOrReuse({
      buyerId,
      listing,
      negotiation,
      quantity: input.quantity,
      feeInCents,
    })
    if (created && negotiation === 'whatsapp') await orders.incrementContacts(listing.id)
    return { order, created }
  }

  async function load(userId: number, id: number, roles: ('buyer' | 'seller')[]) {
    const found = await orders.findById(id)
    if (!found) throw notFound('Pedido não encontrado.')
    const isBuyer = found.buyerId === userId
    const isSeller = found.sellerId === userId
    if (!(isBuyer && roles.includes('buyer')) && !(isSeller && roles.includes('seller'))) {
      throw forbidden('Este pedido não é seu.') // RN-PER: cada um só mexe nos próprios pedidos
    }
    return { order: await expireIfDue(found), isBuyer, isSeller }
  }

  return {
    expireIfDue,

    // RN-PED-01, 02, 10: pedido Pendente, sem reservar estoque.
    async create(buyerId: number, input: { listingId: number; quantity: number }) {
      const { order, created } = await open(buyerId, input, 'site_payment')
      return { created, data: json(await expireIfDue(order)) }
    },

    // RN-PED-05: contato por WhatsApp, sem reservar nem descontar.
    async contact(buyerId: number, input: { listingId: number; quantity: number }) {
      const { order, created } = await open(buyerId, input, 'whatsapp')
      return { created, data: json(order) }
    },

    async mine(buyerId: number) {
      const list = await orders.findByBuyer(buyerId)
      return Promise.all(list.map(async (o) => json(await expireIfDue(o))))
    },

    async received(sellerId: number, listingId?: number) {
      const list = await orders.findBySeller(sellerId, listingId)
      return Promise.all(list.map(async (o) => json(await expireIfDue(o))))
    },

    async get(userId: number, id: number) {
      return json((await load(userId, id, ['buyer', 'seller'])).order)
    },

    // RN-PED-08: o vendedor marca a retirada de um pedido pago.
    async arrangePickup(userId: number, id: number) {
      await load(userId, id, ['seller'])
      if (!(await orders.transition(id, ['paid'], 'pickup_arranged'))) {
        throw invalidState('Só é possível combinar a retirada de um pedido pago.')
      }
      return json((await orders.findById(id))!)
    },

    // RN-PED-08: o comprador confirma o recebimento e conclui.
    async confirmReceipt(userId: number, id: number) {
      await load(userId, id, ['buyer'])
      if (!(await orders.completePickup(id))) {
        throw invalidState('A retirada ainda não foi combinada pelo vendedor.')
      }
      return json((await orders.findById(id))!)
    },

    // RN-EST-03, 06 e RN-PED-13: o vendedor confirma a venda do WhatsApp e o estoque é descontado.
    async complete(userId: number, id: number) {
      await load(userId, id, ['seller'])
      const result = await orders.completeNegotiation(id)
      if (result === 'out_of_stock') {
        throw new AppError(
          409,
          'OUT_OF_STOCK',
          'Não há unidades suficientes para concluir a venda.',
        )
      }
      if (result === 'not_open')
        throw invalidState('Só é possível concluir um pedido em negociação.')
      return json((await orders.findById(id))!)
    },

    // RN-PED-12: comprador cancela Pendente ou Em negociação; vendedor só encerra Em negociação.
    // Pago e Retirada combinada não se cancelam por aqui.
    async cancel(userId: number, id: number) {
      const { order, isBuyer } = await load(userId, id, ['buyer', 'seller'])
      const from = isBuyer ? (['pending', 'negotiating'] as const) : (['negotiating'] as const)
      const gatewayId = await orders.findPendingGatewayId(id)
      if (!(await orders.cancel(id, [...from]))) {
        throw invalidState(
          order.status === 'cancelled'
            ? 'Este pedido já foi cancelado.'
            : 'Este pedido não pode ser cancelado por aqui.',
        )
      }
      if (gatewayId) await gateway.cancelPayment(gatewayId).catch(() => undefined) // cobrança aberta
      return json((await orders.findById(id))!)
    },
  }
}
export type OrdersService = ReturnType<typeof createOrdersService>
