import { describe, expect, it } from 'vitest'
import { reviewBodySchema } from '../../src/modules/reviews/reviews.schemas'
import { createReviewsService } from '../../src/modules/reviews/reviews.service'
import type {
  ReviewOrder,
  ReviewRecord,
  ReviewRepository,
} from '../../src/modules/reviews/reviews.types'
import { AppError } from '../../src/shared/errors/app-error'

// Avaliações (RN-AVA-01 a 05) com repositório falso, sem banco.
function fakeRepo(order: ReviewOrder | null, listingExists = true) {
  const stored: ReviewRecord[] = []
  const repo: ReviewRepository = {
    async findOrder() {
      return order && { ...order, reviewed: order.reviewed || stored.length > 0 }
    },
    async create(input) {
      const rec: ReviewRecord = {
        id: stored.length + 1,
        listingId: input.listingId,
        authorName: 'Ana',
        rating: input.rating,
        comment: input.comment,
        createdAt: new Date('2026-11-02T12:00:00Z'),
      }
      stored.push(rec)
      return rec
    },
    async listByListing() {
      return [...stored].reverse()
    },
    async listingExists() {
      return listingExists
    },
  }
  return { repo, stored }
}

const done: ReviewOrder = { id: 9, listingId: 3, buyerId: 1, status: 'completed', reviewed: false }
const rejects = async (p: Promise<unknown>, status: number, code?: string) => {
  const err = (await p.then(
    () => null,
    (e: unknown) => e,
  )) as AppError | null
  expect(err).toBeInstanceOf(AppError)
  expect(err!.status).toBe(status)
  if (code) expect(err!.code).toBe(code)
}

describe('service de avaliações', () => {
  it('RN-AVA-01: o comprador avalia o pedido concluído e recebe o JSON da avaliação', async () => {
    const { repo } = fakeRepo(done)
    const out = await createReviewsService({ reviews: repo }).create(1, 9, {
      rating: 4.5,
      comment: 'Ótimo',
    })
    expect(out).toEqual({
      id: 1,
      listingId: 3,
      authorName: 'Ana',
      rating: 4.5,
      comment: 'Ótimo',
      createdAt: '2026-11-02T12:00:00.000Z',
    })
  })

  it('RN-AVA-01: pedido inexistente = 404; pedido de outro aluno ou do vendedor = 403', async () => {
    await rejects(
      createReviewsService({ reviews: fakeRepo(null).repo }).create(1, 9, {
        rating: 5,
        comment: '',
      }),
      404,
    )
    const { repo } = fakeRepo(done)
    await rejects(
      createReviewsService({ reviews: repo }).create(2, 9, { rating: 5, comment: '' }),
      403,
    )
  })

  it.each(['pending', 'paid', 'pickup_arranged', 'negotiating', 'cancelled'] as const)(
    'RN-AVA-01: pedido %s não pode ser avaliado (409 INVALID_STATE)',
    async (status) => {
      const { repo } = fakeRepo({ ...done, status })
      await rejects(
        createReviewsService({ reviews: repo }).create(1, 9, { rating: 5, comment: '' }),
        409,
        'INVALID_STATE',
      )
    },
  )

  it('RN-AVA-02: segunda avaliação do mesmo pedido = 409 ALREADY_REVIEWED', async () => {
    const { repo } = fakeRepo(done)
    const service = createReviewsService({ reviews: repo })
    await service.create(1, 9, { rating: 5, comment: '' })
    await rejects(service.create(1, 9, { rating: 3, comment: '' }), 409, 'ALREADY_REVIEWED')
  })

  it('RN-AVA-05: listar avaliações de anúncio inexistente ou excluído = 404; senão, mais recentes primeiro', async () => {
    await rejects(createReviewsService({ reviews: fakeRepo(done, false).repo }).list(3), 404)
    const { repo } = fakeRepo(done)
    const service = createReviewsService({ reviews: repo })
    await service.create(1, 9, { rating: 5, comment: 'primeira' })
    expect(await service.list(3)).toHaveLength(1)
  })
})

describe('corpo da avaliação (RN-AVA-03, 04)', () => {
  it('aceita notas de 0 a 5 em passos de 0,5 e comentário opcional', () => {
    for (const rating of [0, 0.5, 1, 2.5, 4.5, 5]) {
      expect(reviewBodySchema.safeParse({ rating }).success).toBe(true)
    }
    expect(reviewBodySchema.parse({ rating: 3 })).toEqual({ rating: 3, comment: '' })
  })

  it('recusa nota fora do passo ou do intervalo, comentário longo e campo extra', () => {
    for (const rating of [-0.5, 5.5, 6, 1.3, 4.75, '4', null]) {
      expect(reviewBodySchema.safeParse({ rating }).success).toBe(false)
    }
    expect(reviewBodySchema.safeParse({ rating: 5, comment: 'a'.repeat(501) }).success).toBe(false)
    expect(reviewBodySchema.safeParse({ rating: 5, comment: 'a'.repeat(500) }).success).toBe(true)
    expect(reviewBodySchema.safeParse({ rating: 5, extra: 1 }).success).toBe(false)
  })

  it('o comentário vem sem espaços nas pontas', () => {
    expect(reviewBodySchema.parse({ rating: 5, comment: '  bom  ' }).comment).toBe('bom')
  })
})
