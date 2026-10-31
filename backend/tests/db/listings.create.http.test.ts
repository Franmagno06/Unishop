import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildDbApp } from '../helpers/db-app'
import { createListing, createUser, resetDb, testDb } from '../helpers/db'

// Anunciar item (RN-ANU-01 a 04, 07, 12; RN-EST-01) e galeria de imagens, com o banco real.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')

let ctx = buildDbApp()
let seller: Awaited<ReturnType<typeof createUser>>
let other: Awaited<ReturnType<typeof createUser>>
let admin: Awaited<ReturnType<typeof createUser>>

beforeEach(async () => {
  await resetDb()
  ctx = buildDbApp()
  seller = await createUser({ whatsapp: '85999990000' })
  other = await createUser()
  admin = await createUser({ role: 'admin' })
})

const valid = {
  title: 'Cálculo I — Guidorizzi',
  categoryId: '1',
  description: 'Livro em ótimo estado, poucas anotações.',
  priceInCents: '4500',
  quantity: '2',
}

function post(
  fields: Record<string, string> = valid,
  user: { id: number; role?: 'admin' } = seller,
) {
  const req = request(ctx.app).post('/api/v1/listings').set(ctx.auth(user))
  for (const [key, value] of Object.entries(fields)) req.field(key, value)
  return req.attach('image', PNG, { filename: 'foto.png', contentType: 'image/png' })
}

const count = () => testDb.listing.count()

describe('POST /listings', () => {
  it('RN-ANU-01: cria o anúncio ativo com a 1ª imagem em ordem 1', async () => {
    const res = await post()
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({
      title: 'Cálculo I — Guidorizzi',
      priceInCents: 4500,
      quantity: 2,
      status: 'active',
      categoryId: 1,
      categoryName: 'Livros e apostilas',
      isOwn: true,
    })
    expect(res.body.data.images).toHaveLength(1)

    const row = await testDb.listing.findUniqueOrThrow({
      where: { id: res.body.data.id },
      include: { images: true },
    })
    expect(row.price.toString()).toBe('45')
    expect(row.status).toBe('ativo')
    expect(row.userId).toBe(seller.id)
    expect(row.images.map((i) => i.position)).toEqual([1])
    expect(ctx.storage.uploaded).toHaveLength(1)
    expect(row.images[0]?.publicId).toBe(ctx.storage.uploaded[0]?.publicId)
  })

  it('RN-ANU-01: o WhatsApp nasce com o do perfil e pode ser trocado no anúncio', async () => {
    const inherited = await post()
    expect(inherited.body.data.whatsapp).toBe('85999990000')

    const edited = await post({ ...valid, whatsapp: '(85) 98888-7777' })
    expect(edited.body.data.whatsapp).toBe('85988887777')
  })

  it('RN-ANU-01: sem WhatsApp no perfil nem no corpo dá 400 e nada é enviado ao storage', async () => {
    const noPhone = await createUser({ whatsapp: null })
    const res = await post(valid, noPhone)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await count()).toBe(0)
    expect(ctx.storage.uploaded).toHaveLength(0)
  })

  it('RN-ANU-01: admin não anuncia (403) e visitante recebe 401', async () => {
    const asAdmin = await post(valid, { id: admin.id, role: 'admin' })
    expect(asAdmin.status).toBe(403)
    expect(asAdmin.body.error.code).toBe('FORBIDDEN')

    const visitor = await request(ctx.app)
      .post('/api/v1/listings')
      .field('title', 'x')
      .attach('image', PNG, 'a.png')
    expect(visitor.status).toBe(401)
    expect(await count()).toBe(0)
    expect(ctx.storage.uploaded).toHaveLength(0)
  })

  it.each([
    ['preço zero', { priceInCents: '0' }],
    ['preço acima de R$ 99.999,99', { priceInCents: '10000000' }],
    ['preço que não é inteiro', { priceInCents: '45.5' }],
    ['quantidade zero', { quantity: '0' }],
    ['quantidade acima de 999', { quantity: '1000' }],
    ['título com 2 caracteres', { title: 'ab' }],
    ['título com mais de 150 caracteres', { title: 'a'.repeat(151) }],
    ['descrição com 9 caracteres', { description: '123456789' }],
    ['descrição com mais de 2000 caracteres', { description: 'a'.repeat(2001) }],
    ['descrição com HTML', { description: 'Veja <script>alert(1)</script> isto aqui' }],
    ['categoria inexistente', { categoryId: '99' }],
    ['categoria que não é número', { categoryId: 'livros' }],
    ['WhatsApp com poucos dígitos', { whatsapp: '12345' }],
  ])('RN-ANU-12: %s dá 400 e nada é gravado nem enviado', async (_nome, over) => {
    const res = await post({ ...valid, ...over })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(await count()).toBe(0)
    expect(ctx.storage.uploaded).toHaveLength(0)
  })

  it('RN-ANU-03: sem imagem dá 400 e arquivo que não é JPG/PNG dá 415', async () => {
    const req = request(ctx.app).post('/api/v1/listings').set(ctx.auth(seller))
    for (const [k, v] of Object.entries(valid)) req.field(k, v)
    expect((await req).status).toBe(400)

    const fake = request(ctx.app).post('/api/v1/listings').set(ctx.auth(seller))
    for (const [k, v] of Object.entries(valid)) fake.field(k, v)
    const res = await fake.attach('image', Buffer.from('%PDF-1.4'), {
      filename: 'a.png',
      contentType: 'image/png',
    })
    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('FILE_TYPE_NOT_ALLOWED')
    expect(await count()).toBe(0)
  })

  it('RN-ANU-03: se o banco falhar depois do upload, a imagem é removida do storage', async () => {
    ctx = buildDbApp({
      listings: {
        createWithImage: async () => {
          throw new Error('banco fora do ar')
        },
      },
    })
    const res = await post()
    expect(res.status).toBe(500)
    expect(ctx.storage.uploaded).toHaveLength(1)
    expect(ctx.storage.removed).toEqual([ctx.storage.uploaded[0]?.publicId])
    expect(await count()).toBe(0)
  })

  it('RN-ANU-07: o anúncio novo aparece no topo da listagem', async () => {
    await createListing(seller.id, {
      name: 'Antigo',
      publishedAt: new Date('2026-01-01T10:00:00Z'),
    })
    const created = await post()
    const list = await request(ctx.app).get('/api/v1/listings').set(ctx.auth(other))
    expect(list.body.data[0].id).toBe(created.body.data.id)
  })
})

describe('POST /listings/:id/images', () => {
  let id: number
  beforeEach(async () => {
    id = (await post()).body.data.id
    ctx.storage.uploaded.length = 0
  })

  const add = (target = id, user: { id: number; role?: 'admin' } = seller) =>
    request(ctx.app)
      .post(`/api/v1/listings/${target}/images`)
      .set(ctx.auth(user))
      .attach('image', PNG, { filename: 'b.png', contentType: 'image/png' })

  it('RN-ANU-03: o dono acrescenta imagens em ordem até 5 e a 6ª dá 409 sem enviar ao storage', async () => {
    for (const position of [2, 3, 4, 5]) {
      const res = await add()
      expect(res.status).toBe(201)
      expect(res.body.data.position).toBe(position)
    }
    ctx.storage.uploaded.length = 0
    const sixth = await add()
    expect(sixth.status).toBe(409)
    expect(sixth.body.error.code).toBe('INVALID_STATE')
    expect(ctx.storage.uploaded).toHaveLength(0)
    expect(await testDb.listingImage.count({ where: { listingId: id } })).toBe(5)
  })

  it('RN-ANU-04: terceiro e admin recebem 403; anúncio oculto de outro dá 404; visitante 401', async () => {
    expect((await add(id, other)).status).toBe(403)
    expect((await add(id, { id: admin.id, role: 'admin' })).status).toBe(403)

    const paused = await createListing(seller.id, { status: 'pausado' })
    expect((await add(paused.id, other)).status).toBe(404)
    expect((await add(99999)).status).toBe(404)
    expect(
      (await request(ctx.app).post(`/api/v1/listings/${id}/images`).attach('image', PNG, 'b.png'))
        .status,
    ).toBe(401)
    expect(ctx.storage.uploaded).toHaveLength(0)
  })

  it('uma 2ª imagem inválida (outro formato) dá 415', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/listings/${id}/images`)
      .set(ctx.auth(seller))
      .attach('image', Buffer.from('não sou imagem'), {
        filename: 'b.png',
        contentType: 'image/png',
      })
    expect(res.status).toBe(415)
  })

  it('se o banco falhar depois do upload, a imagem é removida do storage', async () => {
    ctx = buildDbApp({
      listings: {
        addImage: async () => {
          throw new Error('banco fora do ar')
        },
      },
    })
    const res = await add()
    expect(res.status).toBe(500)
    expect(ctx.storage.removed).toEqual([ctx.storage.uploaded[0]?.publicId])
  })
})

describe('DELETE /listings/:id/images/:imageId', () => {
  let id: number
  let images: { id: number; url: string }[]

  beforeEach(async () => {
    id = (await post()).body.data.id
    await request(ctx.app)
      .post(`/api/v1/listings/${id}/images`)
      .set(ctx.auth(seller))
      .attach('image', PNG, { filename: 'b.png', contentType: 'image/png' })
    await request(ctx.app)
      .post(`/api/v1/listings/${id}/images`)
      .set(ctx.auth(seller))
      .attach('image', PNG, { filename: 'c.png', contentType: 'image/png' })
    images = (await request(ctx.app).get(`/api/v1/listings/${id}`).set(ctx.auth(seller))).body.data
      .images
  })

  const remove = (imageId: number, user: { id: number; role?: 'admin' } = seller, target = id) =>
    request(ctx.app).delete(`/api/v1/listings/${target}/images/${imageId}`).set(ctx.auth(user))

  it('RN-ANU-03: remove, apaga do storage e a próxima vira a principal (ordem 1)', async () => {
    const [first, second, third] = images
    const res = await remove(first!.id)
    expect(res.status).toBe(204)
    expect(ctx.storage.removed).toHaveLength(1)

    const rows = await testDb.listingImage.findMany({
      where: { listingId: id },
      orderBy: { position: 'asc' },
    })
    expect(rows.map((r) => [r.id, r.position])).toEqual([
      [second!.id, 1],
      [third!.id, 2],
    ])
    const list = await request(ctx.app).get('/api/v1/listings').set(ctx.auth(other))
    expect(list.body.data[0].imageUrl).toBe(second!.url)
  })

  it('RN-ANU-03: a última imagem não pode ser removida (409)', async () => {
    await remove(images[0]!.id)
    await remove(images[1]!.id)
    const res = await remove(images[2]!.id)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INVALID_STATE')
    expect(await testDb.listingImage.count({ where: { listingId: id } })).toBe(1)
  })

  it('RN-ANU-04: terceiro e admin recebem 403; imagem de outro anúncio ou inexistente dá 404', async () => {
    expect((await remove(images[0]!.id, other)).status).toBe(403)
    expect((await remove(images[0]!.id, { id: admin.id, role: 'admin' })).status).toBe(403)
    expect((await remove(99999)).status).toBe(404)

    const another = await createListing(seller.id)
    const foreign = await testDb.listingImage.create({
      data: { listingId: another.id, url: 'http://x/z.png', publicId: 'z', position: 1 },
    })
    expect((await remove(foreign.id)).status).toBe(404)
    expect(await testDb.listingImage.count({ where: { listingId: id } })).toBe(3)
  })

  it('visitante recebe 401', async () => {
    const res = await request(ctx.app).delete(`/api/v1/listings/${id}/images/${images[0]!.id}`)
    expect(res.status).toBe(401)
  })
})
