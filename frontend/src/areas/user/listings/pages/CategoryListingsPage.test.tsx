import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeIntersectionObserver } from '../../../../test/intersection-observer'
import { getListings } from '../services/listings.service'
import { CategoryListingsPage } from './CategoryListingsPage'

// Usa o serviço de verdade (dados de exemplo), mas deixa trocar a resposta em estados específicos.
vi.mock('../services/listings.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/listings.service')>()
  return { ...actual, getListings: vi.fn(actual.getListings) }
})

let io: ReturnType<typeof installFakeIntersectionObserver>

beforeEach(() => {
  io = installFakeIntersectionObserver()
})
afterEach(() => vi.unstubAllGlobals())

function renderPage(path = '/categorias/1') {
  const router = createMemoryRouter(
    [
      { path: '/categorias/:id', element: <CategoryListingsPage /> },
      { path: '/categorias', element: <h1>Categorias</h1> },
    ],
    { initialEntries: [path] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const cards = () => screen.queryAllByRole('link', { name: /R\$/ })
const waitForCards = async (count: number) => waitFor(() => expect(cards()).toHaveLength(count))
const prices = () =>
  cards().map((card) => Number(/R\$\s*([\d.]+),(\d\d)/.exec(card.textContent ?? '')!.slice(1).join('').replace('.', '')))
const loadNext = async () => {
  io.reachEnd()
}

describe('CategoryListingsPage · tela', () => {
  it('mostra o link de volta, o título, o total e os 12 primeiros anúncios', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Livros e apostilas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
    expect(await screen.findByText('48 anúncios de alunos da Unifor')).toBeInTheDocument()
    await waitForCards(12)
    expect(screen.getByRole('heading', { level: 2, name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeInTheDocument()
  })

  it('cada card é um link para o produto', async () => {
    renderPage()
    await waitForCards(12)
    expect(cards()[0]).toHaveAttribute('href', expect.stringMatching(/^\/produtos\/\d+$/))
  })

  it('o título da aba é o nome da categoria', async () => {
    renderPage('/categorias/2')
    await screen.findByRole('heading', { level: 1, name: 'Eletrônicos' })
    expect(document.title).toBe('Eletrônicos · Unishop')
  })

  it('mostra os filtros e o "Ordenar por"', async () => {
    renderPage()
    expect(screen.getByRole('group', { name: 'Filtrar por forma de contato' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('recent')
  })
})

describe('CategoryListingsPage · rolagem infinita', () => {
  it('ao chegar perto do fim carrega mais 12, e assim até os 48', async () => {
    renderPage()
    await waitForCards(12)

    await loadNext()
    await waitForCards(24)
    await loadNext()
    await waitForCards(36)
    await loadNext()
    await waitForCards(48)
  })

  it('no fim, avisa que viu todos e para de vigiar', async () => {
    renderPage()
    await waitForCards(12)
    for (const count of [24, 36, 48]) {
      await loadNext()
      await waitForCards(count)
    }

    expect(await screen.findByText('Você viu todos os 48 anúncios.')).toBeInTheDocument()
    expect(io.active()).toHaveLength(0)
  })

  it('o aviso para leitores de tela diz quantos já carregaram', async () => {
    renderPage()
    await waitForCards(12)
    expect(screen.getByRole('status')).toHaveTextContent('12 de 48 anúncios carregados')

    await loadNext()
    await waitForCards(24)
    expect(screen.getByRole('status')).toHaveTextContent('24 de 48 anúncios carregados')
  })

  it('não repete anúncios entre as páginas', async () => {
    renderPage()
    await waitForCards(12)
    await loadNext()
    await waitForCards(24)

    const hrefs = cards().map((card) => card.getAttribute('href'))
    expect(new Set(hrefs).size).toBe(24)
  })

  it('enquanto carrega a próxima página mostra cards "carregando" e não pede duas vezes', async () => {
    renderPage()
    await waitForCards(12)
    vi.mocked(getListings).mockImplementationOnce(() => new Promise(() => {}))
    const callsBefore = vi.mocked(getListings).mock.calls.length

    await loadNext()
    await waitFor(() => expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(16))
    await loadNext()
    await loadNext()

    expect(vi.mocked(getListings).mock.calls.length).toBe(callsBefore + 1)
    expect(cards()).toHaveLength(12)
  })

  it('o botão escondido "Carregar mais anúncios" só aparece com o foco e pede a próxima página', async () => {
    renderPage()
    await waitForCards(12)

    const button = screen.getByRole('button', { name: 'Carregar mais anúncios' })
    expect(button).toHaveClass('sr-only')
    expect(button).toHaveClass('focus:not-sr-only')

    await userEvent.click(button)
    await waitForCards(24)
  })

  it('o botão some quando não há mais páginas', async () => {
    renderPage('/categorias/6') // 9 anúncios: uma página só
    await waitForCards(9)
    expect(screen.queryByRole('button', { name: 'Carregar mais anúncios' })).not.toBeInTheDocument()
    expect(await screen.findByText('Você viu todos os 9 anúncios.')).toBeInTheDocument()
  })

  it('uma página só: não vigia o fim da lista', async () => {
    renderPage('/categorias/6')
    await waitForCards(9)
    expect(io.active()).toHaveLength(0)
  })
})

describe('CategoryListingsPage · filtro por forma de contato', () => {
  it('clicar num chip filtra, atualiza a URL e o total', async () => {
    const router = renderPage()
    await waitForCards(12)

    await userEvent.click(screen.getByRole('button', { name: 'No campus' }))

    expect(await screen.findByText('16 anúncios de alunos da Unifor')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?contato=campus')
    expect(screen.getByRole('button', { name: 'No campus' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cards().every((card) => /Bloco \w · Horário/.test(card.textContent ?? ''))).toBe(true))
  })

  it('mudar o filtro troca a entrada do histórico: o Voltar do navegador não passa por cada chip', async () => {
    const router = renderPage()
    await waitForCards(12)

    await userEvent.click(screen.getByRole('button', { name: 'No campus' }))
    await waitFor(() => expect(router.state.location.search).toBe('?contato=campus'))
    expect(router.state.historyAction).toBe('REPLACE')

    await userEvent.click(screen.getByRole('button', { name: 'WhatsApp' }))
    await waitFor(() => expect(router.state.location.search).toBe('?contato=whatsapp'))
    expect(router.state.historyAction).toBe('REPLACE')
  })

  it('"Todos" tira o filtro da URL', async () => {
    const router = renderPage('/categorias/1?contato=site')
    await waitFor(() => expect(cards().length).toBeGreaterThan(0))

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
    expect(await screen.findByText('48 anúncios de alunos da Unifor')).toBeInTheDocument()
  })

  it('abre já filtrada quando a URL traz ?contato=', async () => {
    renderPage('/categorias/1?contato=whatsapp')

    expect(screen.getByRole('button', { name: 'WhatsApp' })).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(cards().every((card) => /WhatsApp/.test(card.textContent ?? ''))).toBe(true))
  })

  it('valor inválido na URL é ignorado (volta a "Todos")', async () => {
    renderPage('/categorias/1?contato=telefone&ordem=xyz')
    await waitForCards(12)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('recent')
  })

  it('trocar o filtro recomeça pela primeira página', async () => {
    renderPage()
    await waitForCards(12)
    await loadNext()
    await waitForCards(24)

    await userEvent.click(screen.getByRole('button', { name: 'No campus' }))

    await waitFor(() => expect(cards().length).toBeLessThanOrEqual(12))
  })

  it('sem anúncios com o filtro: avisa e "Limpar filtros" volta a lista', async () => {
    vi.mocked(getListings).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 12, hasNext: false })
    const router = renderPage('/categorias/1?contato=campus')

    expect(await screen.findByRole('heading', { name: 'Nenhum anúncio encontrado' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum anúncio desta categoria tem essa forma de contato.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await waitFor(() => expect(router.state.location.search).toBe(''))
    await waitForCards(12)
  })

  it('categoria sem nenhum anúncio: oferece ver outras categorias', async () => {
    vi.mocked(getListings).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 12, hasNext: false })
    renderPage()

    expect(await screen.findByText('Ainda não há anúncios nesta categoria.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver outras categorias' })).toHaveAttribute('href', '/categorias')
  })
})

describe('CategoryListingsPage · ordenar por (RN-ANU-06)', () => {
  it('"Menor preço" mostra primeiro o mais barato e a URL guarda a escolha', async () => {
    const router = renderPage()
    await waitForCards(12)

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Menor preço')

    await waitFor(() => expect(router.state.location.search).toBe('?ordem=menor-preco'))
    expect(router.state.historyAction).toBe('REPLACE')
    await waitFor(() => {
      const list = prices()
      expect(list).toEqual([...list].sort((a, b) => a - b))
      expect(list[0]).toBeLessThanOrEqual(list.at(-1)!)
    })
  })

  it('"Maior preço" mostra primeiro o mais caro', async () => {
    renderPage('/categorias/1?ordem=maior-preco')
    expect(screen.getByLabelText('Ordenar por')).toHaveValue('price_desc')

    await waitFor(() => {
      const list = prices()
      expect(list.length).toBe(12)
      expect(list).toEqual([...list].sort((a, b) => b - a))
    })
  })

  it('"Mais recentes" é o padrão e sai da URL', async () => {
    const router = renderPage('/categorias/1?ordem=menor-preco')
    await waitForCards(12)

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Mais recentes')

    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('ordem e filtro funcionam juntos', async () => {
    const router = renderPage('/categorias/1?contato=campus')
    await waitFor(() => expect(cards().length).toBeGreaterThan(0))

    await userEvent.selectOptions(screen.getByLabelText('Ordenar por'), 'Menor preço')

    await waitFor(() => expect(router.state.location.search).toBe('?contato=campus&ordem=menor-preco'))
  })
})

describe('CategoryListingsPage · categoria que não existe', () => {
  it.each(['/categorias/99', '/categorias/abc', '/categorias/0'])('%s mostra "Categoria não encontrada"', async (path) => {
    vi.mocked(getListings).mockClear()
    renderPage(path)

    expect(await screen.findByRole('heading', { name: 'Categoria não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todas as categorias' })).toHaveAttribute('href', '/categorias')
    expect(cards()).toHaveLength(0)
  })

  it('id que não é número nem chega a consultar os anúncios', async () => {
    vi.mocked(getListings).mockClear()
    renderPage('/categorias/abc')

    await screen.findByRole('heading', { name: 'Categoria não encontrada' })
    expect(getListings).not.toHaveBeenCalled()
  })

  it('o link "← Categorias" continua disponível', async () => {
    renderPage('/categorias/99')
    await screen.findByRole('heading', { name: 'Categoria não encontrada' })
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
  })
})

describe('CategoryListingsPage · carregando e erros', () => {
  it('na primeira carga mostra 8 cards "carregando" e avisa o leitor de tela', async () => {
    vi.mocked(getListings).mockImplementationOnce(() => new Promise(() => {}))
    renderPage()

    await waitFor(() => expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(8))
    expect(screen.getByRole('status')).toHaveTextContent('Carregando anúncios…')
    expect(cards()).toHaveLength(0)
  })

  it('erro na primeira carga: mensagem e "Tentar de novo"', async () => {
    vi.mocked(getListings).mockRejectedValueOnce(new Error('falhou'))
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar os anúncios')).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: 'Tentar de novo' }))

    await waitForCards(12)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('erro ao carregar mais: mantém o que já apareceu, avisa e deixa tentar de novo', async () => {
    renderPage()
    await waitForCards(12)
    vi.mocked(getListings).mockRejectedValueOnce(new Error('falhou'))

    await loadNext()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível carregar mais anúncios')
    expect(cards()).toHaveLength(12)

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitForCards(24)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('com erro ao carregar mais, a rolagem não fica pedindo sem parar', async () => {
    renderPage()
    await waitForCards(12)
    vi.mocked(getListings).mockRejectedValueOnce(new Error('falhou'))
    await loadNext()
    await screen.findByRole('alert')
    const calls = vi.mocked(getListings).mock.calls.length

    await act(async () => io.reachEnd())
    await act(async () => io.reachEnd())

    expect(vi.mocked(getListings).mock.calls.length).toBe(calls)
  })
})
