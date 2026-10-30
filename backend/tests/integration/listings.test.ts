import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import type {
  ListingDetailRecord,
  ListingSummaryRecord,
} from '../../src/modules/listings/listings.types'
import {
  createFakeListings,
  createFakeMail,
  createFakeOAuth,
  createFakeProfiles,
  createFakeStorage,
  createFakeTokens,
  createFakeUsers,
} from '../helpers/fakes'

const PASSWORD = 'Senha123'
const signup = (name: string, email: string) => ({
  name,
  email,
  password: PASSWORD,
  passwordConfirmation: PASSWORD,
  acceptTerms: true,
})
const ana = signup('Ana Souza', 'ana@edu.unifor.br') // id 1: dona dos anúncios 10 e 11
const bruno = signup('Bruno Lima', 'bruno@edu.unifor.br') // id 2: comprador

const detail = (over: Partial<ListingDetailRecord> = {}): ListingDetailRecord => ({
  id: 10,
  title: 'Cálculo I — Guidorizzi',
  description: 'Livro em ótimo estado, poucas anotações.',
  priceInCents: 4500,
  quantity: 2,
  whatsapp: '85999990000',
  status: 'active',
  categoryId: 1,
  categoryName: 'Livros e apostilas',
  publishedAt: new Date('2026-10-01T12:00:00Z'),
  deletedAt: null,
  views: 0,
  contacts: 0,
  images: [
    { id: 1, url: 'http://x/uploads/a.png', position: 1 },
    { id: 2, url: 'http://x/uploads/b.png', position: 2 },
  ],
  owner: {
    id: 1,
    name: 'Ana Souza',
    course: 'Ciência da Computação',
    verified: true,
    accountActive: true,
  },
  ...over,
})

const summary = (id: number): ListingSummaryRecord => ({
  id,
  title: `Item ${id}`,
  priceInCents: 1000 * id,
  categoryId: 1,
  categoryName: 'Livros e apostilas',
  imageUrl: `http://x/uploads/${id}.png`,
  publishedAt: new Date('2026-10-01T12:00:00Z'),
})

let app: ReturnType<typeof createApp>
let fake: ReturnType<typeof createFakeListings>

function build(details: ListingDetailRecord[], summaries: ListingSummaryRecord[] = []) {
  const users = createFakeUsers()
  fake = createFakeListings(details, summaries)
  app = createApp({
    users: users.repo,
    profiles: createFakeProfiles(users.rows).repo,
    tokens: createFakeTokens().repo,
    mail: createFakeMail().provider,
    oauth: createFakeOAuth().provider,
    listings: fake.repo,
    storage: createFakeStorage().provider,
  })
}

async function signIn(user: ReturnType<typeof signup>) {
  await request(app).post('/api/v1/auth/register').send(user)
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: user.email, password: PASSWORD })
  return { Authorization: `Bearer ${res.body.data.token as string}` }
}

// Os ids do fake seguem a ordem de cadastro: a Ana (dona dos anúncios, id 1) entra primeiro e o Bruno vira id 2.
async function signInBuyer() {
  await request(app).post('/api/v1/auth/register').send(ana)
  return signIn(bruno)
}

describe('GET /listings/recent', () => {
  beforeEach(() => build([], [summary(1), summary(2), summary(3)]))

  it('RF001.4: é pública e devolve só campos mínimos, sem WhatsApp nem vendedor', async () => {
    const res = await request(app).get('/api/v1/listings/recent')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(3)
    expect(res.body.data[0]).toEqual({
      id: 1,
      title: 'Item 1',
      priceInCents: 1000,
      categoryId: 1,
      categoryName: 'Livros e apostilas',
      imageUrl: 'http://x/uploads/1.png',
      publishedAt: '2026-10-01T12:00:00.000Z',
    })
    expect(JSON.stringify(res.body)).not.toMatch(/whatsapp|seller/i)
  })

  it('respeita o limit (padrão 10, máximo 20)', async () => {
    expect((await request(app).get('/api/v1/listings/recent?limit=2')).body.data).toHaveLength(2)
    expect((await request(app).get('/api/v1/listings/recent?limit=21')).status).toBe(400)
  })
})

describe('GET /listings', () => {
  beforeEach(() => build([], [summary(1), summary(2), summary(3)]))

  it('RN-CAT-04: visitante recebe 401', async () => {
    expect((await request(app).get('/api/v1/listings')).status).toBe(401)
  })

  it('devolve { data, meta } com a paginação', async () => {
    const auth = await signIn(ana)
    const res = await request(app).get('/api/v1/listings?page=1&limit=2').set(auth)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 })
  })

  it.each([
    ['limit acima de 50', 'limit=51'],
    ['page zero', 'page=0'],
    ['sort desconhecido', 'sort=barato'],
    ['category que não é número', 'category=abc'],
    ['minPrice negativo', 'minPrice=-1'],
    ['faixa invertida', 'minPrice=80&maxPrice=20'],
    ['busca com mais de 100 caracteres', `search=${'a'.repeat(101)}`],
  ])('RN-ANU-06: %s dá 400 VALIDATION_ERROR', async (_nome, query) => {
    const auth = await signIn(ana)
    const res = await request(app).get(`/api/v1/listings?${query}`).set(auth)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /listings/:id', () => {
  it('RN-CAT-04: visitante recebe 401', async () => {
    build([detail()])
    expect((await request(app).get('/api/v1/listings/10')).status).toBe(401)
  })

  it('RF008 e RN-PER-04: devolve galeria, vendedor e o WhatsApp do anúncio a quem está logado', async () => {
    build([detail()])
    const res = await request(app)
      .get('/api/v1/listings/10')
      .set(await signInBuyer())
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({
      id: 10,
      title: 'Cálculo I — Guidorizzi',
      description: 'Livro em ótimo estado, poucas anotações.',
      priceInCents: 4500,
      quantity: 2,
      status: 'active',
      categoryId: 1,
      categoryName: 'Livros e apostilas',
      publishedAt: '2026-10-01T12:00:00.000Z',
      images: [
        { id: 1, url: 'http://x/uploads/a.png' },
        { id: 2, url: 'http://x/uploads/b.png' },
      ],
      whatsapp: '85999990000',
      seller: { name: 'Ana Souza', course: 'Ciência da Computação', verified: true },
      isOwn: false,
    })
  })

  it('RN-ANU-11: soma +1 visualização para quem não é o dono', async () => {
    build([detail()])
    const auth = await signInBuyer()
    await request(app).get('/api/v1/listings/10').set(auth)
    await request(app).get('/api/v1/listings/10').set(auth)
    expect(fake.views.get(10)).toBe(2)
  })

  it('RN-ANU-11: o dono abre o próprio anúncio sem somar visualização e vê isOwn', async () => {
    build([detail()])
    const res = await request(app)
      .get('/api/v1/listings/10')
      .set(await signIn(ana))
    expect(res.body.data.isOwn).toBe(true)
    expect(fake.views.get(10)).toBeUndefined()
  })

  it.each([
    ['pausado', { status: 'paused' as const }],
    ['vendido', { status: 'sold' as const }],
    ['de dono com conta suspensa', { owner: { ...detail().owner, accountActive: false } }],
  ])('RN-ANU-05: anúncio %s dá 404 a terceiros e não soma visualização', async (_nome, over) => {
    build([detail(over)])
    const res = await request(app)
      .get('/api/v1/listings/10')
      .set(await signInBuyer())
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(fake.views.get(10)).toBeUndefined()
  })

  it('RN-ANU-05: o dono vê o próprio anúncio pausado ou vendido', async () => {
    build([detail({ status: 'paused' }), detail({ id: 11, status: 'sold' })])
    const auth = await signIn(ana)
    expect((await request(app).get('/api/v1/listings/10').set(auth)).status).toBe(200)
    expect((await request(app).get('/api/v1/listings/11').set(auth)).status).toBe(200)
  })

  it('RN-ANU-09: anúncio excluído dá 404 para todos, inclusive o dono', async () => {
    build([detail({ deletedAt: new Date() })])
    expect(
      (
        await request(app)
          .get('/api/v1/listings/10')
          .set(await signIn(ana))
      ).status,
    ).toBe(404)
    expect(
      (
        await request(app)
          .get('/api/v1/listings/10')
          .set(await signInBuyer())
      ).status,
    ).toBe(404)
  })

  it('id inexistente ou inválido: 404 e 400', async () => {
    build([detail()])
    const auth = await signInBuyer()
    expect((await request(app).get('/api/v1/listings/999').set(auth)).status).toBe(404)
    expect((await request(app).get('/api/v1/listings/abc').set(auth)).status).toBe(400)
  })
})
