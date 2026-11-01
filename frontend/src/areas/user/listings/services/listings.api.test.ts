import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../../../../shared/lib/session'
import { getCategories, getCategoryById } from '../../categories/services/categories.service'
import { createListing, getListingById, getListings } from './listings.service'
import {
  deleteListing,
  getManagedListing,
  getMyListings,
  markListingAsSold,
  pauseListing,
  reactivateListing,
} from './my-listings.service'

// Caminho da API real (fora do modo de demonstração): o fetch é simulado com o formato que o
// backend devolve (listings.serializer.ts e categories.controller.ts).
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

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

describe('categorias na API real', () => {
  it('GET /categories devolve a lista com a contagem (RN-CAT-02)', async () => {
    fetchMock.mockResolvedValue(
      json(200, { data: [{ id: 1, name: 'Livros e apostilas', activeListingCount: 3 }] }),
    )
    await expect(getCategories()).resolves.toEqual([
      { id: 1, name: 'Livros e apostilas', activeListingCount: 3 },
    ])
    expect(lastCall()[0]).toMatch(/\/categories$/)
  })

  it('manda a busca codificada em ?search= (RN-CAT-03) e acha a categoria pelo id', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json(200, { data: [{ id: 2, name: 'Eletrônicos', activeListingCount: 0 }] })),
    )
    await getCategories(' eletrôn ')
    expect(lastCall()[0]).toMatch(/\/categories\?search=eletr%C3%B4n$/)

    await expect(getCategoryById(2)).resolves.toMatchObject({ name: 'Eletrônicos' })
    await expect(getCategoryById(99)).resolves.toBeNull()
  })
})

describe('anúncios na API real', () => {
  const summary = {
    id: 7,
    title: 'Calculadora HP 12C',
    priceInCents: 12000,
    categoryId: 2,
    categoryName: 'Eletrônicos',
    imageUrl: 'http://localhost:3000/uploads/a.png',
    publishedAt: '2026-10-30T12:00:00.000Z',
  }

  it('GET /listings manda categoria, ordem, página e limite e converte a página', async () => {
    fetchMock.mockResolvedValue(
      json(200, { data: [summary], meta: { page: 2, limit: 12, total: 25, totalPages: 3 } }),
    )
    const page = await getListings({ categoryId: 2, sort: 'price_asc', page: 2, limit: 12 })

    const url = new URL(lastCall()[0])
    expect(url.pathname).toMatch(/\/listings$/)
    expect(Object.fromEntries(url.searchParams)).toEqual({
      category: '2',
      sort: 'price_asc',
      page: '2',
      limit: '12',
    })
    expect(page).toMatchObject({ total: 25, page: 2, pageSize: 12, hasNext: true })
    expect(page.items[0]).toMatchObject({
      id: 7,
      priceInCents: 12000,
      imageUrl: 'http://localhost:3000/uploads/a.png',
      contact: { mode: 'whatsapp' },
    })
  })

  it('a última página vem sem próxima', async () => {
    fetchMock.mockResolvedValue(
      json(200, { data: [], meta: { page: 3, limit: 12, total: 25, totalPages: 3 } }),
    )
    await expect(getListings({ categoryId: 2, page: 3 })).resolves.toMatchObject({ hasNext: false })
  })

  it('GET /listings/:id vira o detalhe com as URLs das fotos e o vendedor', async () => {
    fetchMock.mockResolvedValue(
      json(200, {
        data: {
          ...summary,
          description: 'Funciona perfeitamente, com capa.',
          quantity: 2,
          status: 'active',
          images: [
            { id: 1, url: 'http://x/1.png' },
            { id: 2, url: 'http://x/2.png' },
          ],
          whatsapp: '85991234567',
          seller: { name: 'Ana Lima', course: 'Engenharia Civil', verified: true },
          isOwn: false,
        },
      }),
    )
    await expect(getListingById(7)).resolves.toEqual({
      id: 7,
      title: 'Calculadora HP 12C',
      priceInCents: 12000,
      description: 'Funciona perfeitamente, com capa.',
      quantity: 2,
      categoryId: 2,
      images: ['http://x/1.png', 'http://x/2.png'],
      seller: { name: 'Ana Lima', course: 'Engenharia Civil' },
      isOwn: false,
    })
  })

  it('anúncio oculto ou inexistente: 404 vira null; outros erros continuam erro', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { error: { code: 'LISTING_NOT_FOUND', message: 'x' } }))
    await expect(getListingById(99)).resolves.toBeNull()

    fetchMock.mockResolvedValueOnce(json(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } }))
    await expect(getListingById(99)).rejects.toMatchObject({ status: 500 })
  })

  it('POST /listings leva a 1ª foto em multipart e cada foto extra vai em /images (RN-ANU-03)', async () => {
    const created = { id: 9, title: 'Livro', categoryId: 1, categoryName: 'Livros e apostilas' }
    fetchMock
      .mockResolvedValueOnce(json(201, { data: created }))
      .mockResolvedValueOnce(json(201, { data: { id: 5 } }))
      .mockResolvedValueOnce(json(201, { data: { id: 6 } }))
    const files = ['a', 'b', 'c'].map((n) => new File([n], `${n}.png`, { type: 'image/png' }))

    const result = await createListing({
      title: 'Livro',
      categoryId: 1,
      description: 'Descrição com mais de dez caracteres.',
      priceInCents: 4500,
      quantity: 1,
      whatsapp: '85991234567',
      images: files,
    })

    expect(result).toEqual(created)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const [firstUrl, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(firstUrl).toMatch(/\/listings$/)
    expect(firstInit.method).toBe('POST')
    const form = firstInit.body as FormData
    expect(form).toBeInstanceOf(FormData)
    expect(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string'))).toEqual({
      title: 'Livro',
      categoryId: '1',
      description: 'Descrição com mais de dez caracteres.',
      priceInCents: '4500',
      quantity: '1',
      whatsapp: '85991234567',
    })
    expect((form.get('image') as File).name).toBe('a.png')
    // multipart: o navegador define o Content-Type; o app não pode fixar application/json
    expect(firstInit.headers).not.toHaveProperty('Content-Type')

    expect(fetchMock.mock.calls[1]?.[0]).toMatch(/\/listings\/9\/images$/)
    expect(fetchMock.mock.calls[2]?.[0]).toMatch(/\/listings\/9\/images$/)
  })

  it('se uma foto extra falhar, o anúncio fica publicado e a tela recebe quantas faltaram', async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { data: { id: 9, title: 'L', categoryId: 1, categoryName: 'C' } }))
      .mockResolvedValueOnce(json(413, {}))
      .mockResolvedValueOnce(json(201, { data: { id: 6 } }))
    const files = ['a', 'b', 'c'].map((n) => new File([n], `${n}.png`, { type: 'image/png' }))
    const result = await createListing({
      title: 'L',
      categoryId: 1,
      description: 'Descrição com mais de dez caracteres.',
      priceInCents: 100,
      quantity: 1,
      whatsapp: '',
      images: files,
    })
    expect(result.failedImages).toBe(1)
    // WhatsApp vazio não é enviado: o servidor usa o do perfil (RN-ANU-01)
    const form = (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(form.has('whatsapp')).toBe(false)
  })

  it('sem foto nenhuma, nem chama a API', async () => {
    await expect(
      createListing({
        title: 'L',
        categoryId: 1,
        description: 'Descrição com mais de dez caracteres.',
        priceInCents: 100,
        quantity: 1,
        whatsapp: '',
        images: [],
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('meus anúncios na API real', () => {
  const owned = {
    id: 3,
    title: 'Livro',
    description: 'Descrição do livro.',
    priceInCents: 4500,
    quantity: 1,
    status: 'active',
    categoryId: 1,
    categoryName: 'Livros e apostilas',
    publishedAt: '2026-10-30T12:00:00.000Z',
    whatsapp: '85991234567',
    imageUrl: null,
    images: [],
    views: 12,
    whatsappContacts: 2,
  }

  it('GET /listings/mine devolve os anúncios do dono com contadores', async () => {
    fetchMock.mockResolvedValue(json(200, { data: [owned] }))
    const list = await getMyListings()
    expect(lastCall()[0]).toMatch(/\/listings\/mine$/)
    expect(list[0]).toMatchObject({
      id: 3,
      status: 'active',
      views: 12,
      whatsappContacts: 2,
      contactLabel: 'WhatsApp',
    })
  })

  it('GET /listings/:id/management devolve o anúncio e, por enquanto, nenhum pedido recebido', async () => {
    fetchMock.mockResolvedValue(json(200, { data: { listing: owned, indicators: { views: 12, contacts: 2, orders: 0 } } }))
    await expect(getManagedListing(3)).resolves.toMatchObject({ listing: { id: 3 }, orders: [] })

    fetchMock.mockResolvedValue(json(404, { error: { code: 'LISTING_NOT_FOUND', message: 'x' } }))
    await expect(getManagedListing(3)).resolves.toBeNull()
  })

  it('pausar, reativar, vender e excluir chamam a rota certa', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(200, { data: owned })))
    await pauseListing(3)
    expect(lastCall()[0]).toMatch(/\/listings\/3\/pause$/)
    await reactivateListing(3)
    expect(lastCall()[0]).toMatch(/\/listings\/3\/reactivate$/)
    await markListingAsSold(3)
    expect(lastCall()[0]).toMatch(/\/listings\/3\/mark-sold$/)

    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await deleteListing(3)
    expect(lastCall()[1].method).toBe('DELETE')
    expect(lastCall()[0]).toMatch(/\/listings\/3$/)
  })

  it('excluir com pedido pago em aberto: o 409 do servidor chega à tela (RN-ANU-09)', async () => {
    fetchMock.mockResolvedValue(
      json(409, { error: { code: 'HAS_OPEN_PAID_ORDERS', message: 'Há pedidos pagos em aberto.' } }),
    )
    await expect(deleteListing(3)).rejects.toMatchObject({ status: 409, code: 'HAS_OPEN_PAID_ORDERS' })
  })
})
