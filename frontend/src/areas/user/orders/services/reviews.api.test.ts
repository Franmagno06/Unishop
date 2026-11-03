import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../../../../shared/lib/session'
import { getReviews } from '../../listings/services/reviews.service'
import { getMyOrders, reviewOrder } from './orders.service'

// Avaliações na API real (fora do modo de demonstração): o fetch é simulado com o formato do backend.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const fetchMock = vi.fn()
const lastCall = () => fetchMock.mock.calls.at(-1) as [string, RequestInit]

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  setToken('t', 'student')
})
afterEach(() => {
  vi.unstubAllGlobals()
  clearToken()
})

const apiOrder = (reviewed: boolean | undefined) => ({
  id: 9,
  number: 'UNI-2026-0009',
  status: 'completed',
  negotiation: 'site_payment',
  listingId: 3,
  title: 'Livro',
  description: 'Bom estado',
  imageUrl: null,
  seller: { name: 'Ana', whatsapp: '85999990000' },
  totalInCents: 4500,
  createdAt: '2026-11-02T12:00:00Z',
  paymentMethod: 'pix',
  ...(reviewed === undefined ? {} : { reviewed }),
})

describe('avaliações na API real', () => {
  it('GET /listings/:id/reviews devolve a lista do servidor', async () => {
    const review = {
      id: 1,
      listingId: 3,
      authorName: 'Bruno',
      rating: 4.5,
      comment: 'Ótimo',
      createdAt: '2026-11-02T12:00:00Z',
    }
    fetchMock.mockResolvedValue(json(200, { data: [review] }))
    await expect(getReviews(3)).resolves.toEqual([review])
    expect(lastCall()[0]).toMatch(/\/listings\/3\/reviews$/)
  })

  it('POST /orders/:id/review envia nota e comentário sem espaços sobrando', async () => {
    fetchMock.mockResolvedValue(json(201, { data: { id: 1 } }))
    await reviewOrder(9, { rating: 4.5, comment: '  Muito bom  ' })
    expect(lastCall()[0]).toMatch(/\/orders\/9\/review$/)
    expect(lastCall()[1].method).toBe('POST')
    expect(JSON.parse(String(lastCall()[1].body))).toEqual({
      rating: 4.5,
      comment: 'Muito bom',
    })
  })

  it('409 ALREADY_REVIEWED vira mensagem clara em português', async () => {
    fetchMock.mockResolvedValue(json(409, { error: { code: 'ALREADY_REVIEWED', message: 'x' } }))
    await expect(reviewOrder(9, { rating: 5, comment: '' })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_REVIEWED',
      message: 'Você já avaliou este produto.',
    })
  })

  it('409 INVALID_STATE vira "só pedido concluído"', async () => {
    fetchMock.mockResolvedValue(json(409, { error: { code: 'INVALID_STATE', message: 'x' } }))
    await expect(reviewOrder(9, { rating: 5, comment: '' })).rejects.toMatchObject({
      code: 'INVALID_STATE',
      message: 'Só é possível avaliar um pedido concluído.',
    })
  })

  it('outros erros chegam como vieram', async () => {
    fetchMock.mockResolvedValue(json(403, { error: { code: 'FORBIDDEN', message: 'Sem acesso.' } }))
    await expect(reviewOrder(9, { rating: 5, comment: '' })).rejects.toMatchObject({ status: 403 })
  })

  it('o pedido leva o `reviewed` da API (ausente = não avaliado)', async () => {
    fetchMock.mockResolvedValue(json(200, { data: [apiOrder(true)] }))
    await expect(getMyOrders()).resolves.toMatchObject([{ id: 9, reviewed: true }])
    fetchMock.mockResolvedValue(json(200, { data: [apiOrder(undefined)] }))
    await expect(getMyOrders()).resolves.toMatchObject([{ id: 9, reviewed: false }])
  })
})
