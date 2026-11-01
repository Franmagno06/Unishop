import { beforeEach, describe, expect, it } from 'vitest'
import {
  cancelUnpaidOrders,
  hasOpenPaidOrders,
  lockOpenOrders,
} from '../../src/shared/database/open-orders'
import { createListing, createOrder, createUser, resetDb, testDb } from '../helpers/db'

// Porta de pedidos em aberto (RN-ANU-09, RN-PER-06, RN-ADM-06, 09), com o banco real.
let seller: Awaited<ReturnType<typeof createUser>>
let listing: Awaited<ReturnType<typeof createListing>>

beforeEach(async () => {
  await resetDb()
  seller = await createUser()
  listing = await createListing(seller.id)
})

// Um comprador por pedido: o índice uq_pedido_aberto só permite um pedido aberto por comprador/anúncio/forma.
const orderWith = async (status: string, listingId = listing.id, sellerId = seller.id) => {
  const buyer = await createUser()
  return createOrder(listingId, buyer.id, sellerId, { status })
}

describe('lockOpenOrders', () => {
  it('RN-ANU-09: por anúncio devolve só pendente, em_negociacao, pago e retirada_combinada', async () => {
    const ids: Record<string, number> = {}
    for (const s of [
      'pendente',
      'em_negociacao',
      'pago',
      'retirada_combinada',
      'concluido',
      'cancelado',
    ]) {
      ids[s] = (await orderWith(s)).id
    }
    const open = await testDb.$transaction((tx) => lockOpenOrders(tx, { listingId: listing.id }))
    expect(open.map((o) => o.status)).toEqual([
      'pendente',
      'em_negociacao',
      'pago',
      'retirada_combinada',
    ])
    expect(open.map((o) => o.id)).toEqual([
      ids.pendente,
      ids.em_negociacao,
      ids.pago,
      ids.retirada_combinada,
    ])
  })

  it('RN-PER-06: por usuário pega pedidos como comprador E como vendedor', async () => {
    const user = await createUser()
    const otherSeller = await createUser()
    const otherListing = await createListing(otherSeller.id)
    const asBuyer = await createOrder(otherListing.id, user.id, otherSeller.id, {
      status: 'pendente',
    })
    const asSeller = await orderWith('pago', (await createListing(user.id)).id, user.id)
    await orderWith('em_negociacao') // de outras pessoas
    const open = await testDb.$transaction((tx) => lockOpenOrders(tx, { userId: user.id }))
    expect(open.map((o) => o.id)).toEqual([asBuyer.id, asSeller.id])
  })
})

describe('hasOpenPaidOrders', () => {
  it('RN-ANU-09: é verdadeiro com pago e com retirada_combinada', () => {
    expect(hasOpenPaidOrders([{ id: 1, status: 'pago' }])).toBe(true)
    expect(hasOpenPaidOrders([{ id: 1, status: 'retirada_combinada' }])).toBe(true)
    expect(
      hasOpenPaidOrders([
        { id: 1, status: 'pendente' },
        { id: 2, status: 'em_negociacao' },
      ]),
    ).toBe(false)
    expect(hasOpenPaidOrders([])).toBe(false)
  })
})

describe('cancelUnpaidOrders', () => {
  it('RN-ANU-09: cancela pendente e em_negociacao, não toca em pago, concluido e cancelado, e devolve os ids', async () => {
    const pendente = await orderWith('pendente')
    const negociacao = await orderWith('em_negociacao')
    const pago = await orderWith('pago')
    const concluido = await orderWith('concluido')
    const cancelado = await orderWith('cancelado')

    const cancelled = await testDb.$transaction(async (tx) => {
      const open = await lockOpenOrders(tx, { listingId: listing.id })
      return cancelUnpaidOrders(tx, open, new Date())
    })
    expect(cancelled.sort()).toEqual([pendente.id, negociacao.id].sort())
    const status = async (id: number) =>
      (await testDb.order.findUniqueOrThrow({ where: { id } })).status
    expect(await status(pendente.id)).toBe('cancelado')
    expect(await status(negociacao.id)).toBe('cancelado')
    expect(await status(pago.id)).toBe('pago')
    expect(await status(concluido.id)).toBe('concluido')
    expect(await status(cancelado.id)).toBe('cancelado')
  })

  it('cancelUnpaidOrders grava atualizado_em', async () => {
    const order = await orderWith('pendente')
    const at = new Date('2026-10-30T10:00:00.000Z')
    await testDb.$transaction(async (tx) => {
      const open = await lockOpenOrders(tx, { listingId: listing.id })
      await cancelUnpaidOrders(tx, open, at)
    })
    const row = await testDb.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(row.updatedAt.toISOString()).toBe(at.toISOString())
  })

  it('sem pedidos para cancelar não faz nada e devolve lista vazia', async () => {
    const cancelled = await testDb.$transaction((tx) =>
      cancelUnpaidOrders(tx, [{ id: 1, status: 'pago' }], new Date()),
    )
    expect(cancelled).toEqual([])
  })
})
