import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import {
  createFakeCategories,
  createFakeMail,
  createFakeOAuth,
  createFakeProfiles,
  createFakeTokens,
  createFakeUsers,
} from '../helpers/fakes'

const PASSWORD = 'Senha123'
const ana = {
  name: 'Ana Souza',
  email: 'ana@edu.unifor.br',
  password: PASSWORD,
  passwordConfirmation: PASSWORD,
  acceptTerms: true,
}

const SEIS = [
  { id: 1, name: 'Livros e apostilas', activeListingCount: 4 },
  { id: 2, name: 'Eletrônicos', activeListingCount: 0 },
  { id: 3, name: 'Alimentos', activeListingCount: 2 },
  { id: 4, name: 'Materiais de curso', activeListingCount: 1 },
  { id: 5, name: 'Vestuário', activeListingCount: 0 },
  { id: 6, name: 'Outros', activeListingCount: 7 },
]

let app: ReturnType<typeof createApp>

beforeEach(() => {
  const users = createFakeUsers()
  app = createApp({
    users: users.repo,
    profiles: createFakeProfiles(users.rows).repo,
    tokens: createFakeTokens().repo,
    mail: createFakeMail().provider,
    oauth: createFakeOAuth().provider,
    categories: createFakeCategories(SEIS).repo,
  })
})

async function signIn() {
  await request(app).post('/api/v1/auth/register').send(ana)
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: ana.email, password: PASSWORD })
  return { Authorization: `Bearer ${res.body.data.token as string}` }
}

const list = (auth: object, search?: string) =>
  request(app)
    .get('/api/v1/categories')
    .query(search === undefined ? {} : { search })
    .set(auth)

describe('GET /categories', () => {
  it('RN-CAT-04: visitante recebe 401', async () => {
    const res = await request(app).get('/api/v1/categories')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('RN-CAT-01 e RN-CAT-02: devolve as seis categorias com a contagem, mesmo as zeradas', async () => {
    const res = await list(await signIn())
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(SEIS)
  })

  it('RN-CAT-03: a busca ignora maiúsculas e acentos ("eletronicos" acha "Eletrônicos")', async () => {
    const auth = await signIn()
    const res = await list(auth, 'eletronicos')
    expect(res.body.data).toEqual([SEIS[1]])
    expect((await list(auth, 'LIVROS')).body.data).toEqual([SEIS[0]])
    expect((await list(auth, 'vestuario')).body.data).toEqual([SEIS[4]])
  })

  it('RN-CAT-03: busca vazia ou só com espaços devolve todas; sem resultado devolve lista vazia', async () => {
    const auth = await signIn()
    expect((await list(auth, '')).body.data).toHaveLength(6)
    expect((await list(auth, '   ')).body.data).toHaveLength(6)
    expect((await list(auth, 'xyz')).body.data).toEqual([])
  })

  it('RN-ANU-12: busca com mais de 100 caracteres dá 400 VALIDATION_ERROR', async () => {
    const res = await list(await signIn(), 'a'.repeat(101))
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
