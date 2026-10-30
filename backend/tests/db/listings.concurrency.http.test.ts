import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// Requisições em paralelo e anúncio vendido (RN-ANU-03, RN-ANU-04, RN-EST-06), com o banco real.
// A trava FOR UPDATE por anúncio e o UPDATE condicional é que decidem quem vence.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
const { app, auth } = buildDbApp()

let seller: Awaited<ReturnType<typeof createUser>>
beforeEach(async () => {
  await resetDb()
  seller = await createUser()
})

const addImage = (id: number) =>
  request(app)
    .post(`/api/v1/listings/${id}/images`)
    .set(auth(seller))
    .attach('image', PNG, { filename: 'b.png', contentType: 'image/png' })

const seedImages = (listingId: number, count: number) =>
  testDb.listingImage.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      listingId,
      url: `http://x/${i + 1}.png`,
      publicId: `p${i + 1}`,
      position: i + 1,
    })),
  })

const statuses = (results: { status: number }[]) => results.map((r) => r.status).sort()

describe('imagens em paralelo', () => {
  it('RN-ANU-03: duas inclusões ao mesmo tempo com 4 imagens: só uma entra, a outra dá 409', async () => {
    const listing = await createListing(seller.id)
    await seedImages(listing.id, 4)

    const results = await Promise.all([addImage(listing.id), addImage(listing.id)])
    expect(statuses(results)).toEqual([201, 409])
    const positions = await testDb.listingImage.findMany({
      where: { listingId: listing.id },
      orderBy: { position: 'asc' },
    })
    expect(positions.map((p) => p.position)).toEqual([1, 2, 3, 4, 5])
  })

  it('RN-ANU-03: duas remoções ao mesmo tempo com 2 imagens: o anúncio nunca fica sem imagem', async () => {
    const listing = await createListing(seller.id)
    await seedImages(listing.id, 2)
    const [a, b] = await testDb.listingImage.findMany({
      where: { listingId: listing.id },
      orderBy: { position: 'asc' },
    })
    const remove = (imageId: number) =>
      request(app).delete(`/api/v1/listings/${listing.id}/images/${imageId}`).set(auth(seller))

    const results = await Promise.all([remove(a!.id), remove(b!.id)])
    expect(statuses(results)).toEqual([204, 409])
    const left = await testDb.listingImage.findMany({ where: { listingId: listing.id } })
    expect(left).toHaveLength(1)
    expect(left[0]?.position).toBe(1)
  })

  it('RN-ANU-03: remover uma imagem do meio renumera a galeria (1, 2, 3 vira 1, 2)', async () => {
    const listing = await createListing(seller.id)
    await seedImages(listing.id, 3)
    const middle = await testDb.listingImage.findFirstOrThrow({
      where: { listingId: listing.id, position: 2 },
    })

    const res = await request(app)
      .delete(`/api/v1/listings/${listing.id}/images/${middle.id}`)
      .set(auth(seller))
    expect(res.status).toBe(204)
    const rows = await testDb.listingImage.findMany({
      where: { listingId: listing.id },
      orderBy: { position: 'asc' },
    })
    expect(rows.map((r) => [r.publicId, r.position])).toEqual([
      ['p1', 1],
      ['p3', 2],
    ])
  })
})

describe('anúncio vendido', () => {
  it('RN-ANU-04: PATCH e mark-sold ao mesmo tempo nunca deixam um vendido com unidades', async () => {
    const listing = await createListing(seller.id, { quantity: 3 })

    await Promise.all([
      request(app).patch(`/api/v1/listings/${listing.id}`).set(auth(seller)).send({ quantity: 5 }),
      request(app).post(`/api/v1/listings/${listing.id}/mark-sold`).set(auth(seller)),
    ])

    const row = await testDb.listing.findUniqueOrThrow({ where: { id: listing.id } })
    expect([row.status, row.quantity]).toEqual(['vendido', 0])
  })

  it('RN-ANU-04: PATCH em anúncio vendido dá 409 e a quantidade segue zerada', async () => {
    const sold = await createListing(seller.id, { status: 'vendido', quantity: 0 })
    const res = await request(app)
      .patch(`/api/v1/listings/${sold.id}`)
      .set(auth(seller))
      .send({ quantity: 5 })
    expect(res.status).toBe(409)
    expect((await testDb.listing.findUniqueOrThrow({ where: { id: sold.id } })).quantity).toBe(0)
  })

  it('RN-ANU-04: a galeria de um anúncio vendido também não muda (409)', async () => {
    const sold = await createListing(seller.id, { status: 'vendido', quantity: 0 })
    await seedImages(sold.id, 2)
    const image = await testDb.listingImage.findFirstOrThrow({ where: { listingId: sold.id } })

    expect((await addImage(sold.id)).status).toBe(409)
    const removed = await request(app)
      .delete(`/api/v1/listings/${sold.id}/images/${image.id}`)
      .set(auth(seller))
    expect(removed.status).toBe(409)
    expect(await testDb.listingImage.count({ where: { listingId: sold.id } })).toBe(2)
  })
})

describe('GET /listings com preço enorme na query', () => {
  it('RN-ANU-06: minPrice com dígitos demais dá 400, não 500', async () => {
    const res = await request(app)
      .get('/api/v1/listings?minPrice=1000000000000000000000000')
      .set(auth(seller))
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
