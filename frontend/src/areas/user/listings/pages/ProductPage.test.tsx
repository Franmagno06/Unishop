import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../../../../shared/lib/session'
import { resetOrdersForTests } from '../../orders/services/orders.service'
import { createListing, getListingById } from '../services/listings.service'
import { ProductPage } from './ProductPage'

vi.mock('../services/listings.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/listings.service')>()
  return { ...actual, getListingById: vi.fn(actual.getListingById) }
})

beforeEach(() => setToken('t', 'student'))
afterEach(() => {
  clearToken()
  vi.mocked(getListingById).mockClear()
})

function renderPage(path = '/produtos/1') {
  const router = createMemoryRouter(
    [
      { path: '/produtos/:id', element: <ProductPage /> },
      { path: '/pagamento/:pedidoId', element: <h1>Tela de pagamento</h1> },
      { path: '/categorias/:id', element: <h1>Lista da categoria</h1> },
      { path: '/categorias', element: <h1>Categorias</h1> },
      { path: '/login', element: <h1>Login</h1> },
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

const title = () => screen.findByRole('heading', { level: 1, name: 'Cálculo I — Guidorizzi, vol. 1' })

describe('ProductPage · tela (anúncio nº 1, o do Figma)', () => {
  it('mostra categoria, título, preço, descrição, vendedor e o cartão de pedido', async () => {
    renderPage()
    await title()

    expect(await screen.findByText('Livros e apostilas', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Descrição' })).toBeInTheDocument()
    expect(screen.getByText(/Livro em ótimo estado, 5ª edição/)).toBeInTheDocument()
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('Aluno(a) verificado(a) · Engenharia Civil')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Fazer pedido — R\$\s45,00$/ })).toBeInTheDocument()
    expect(document.title).toBe('Cálculo I — Guidorizzi, vol. 1 · Unishop')
  })

  it('o link de volta leva à categoria do anúncio, com o nome dela', async () => {
    const router = renderPage()
    await title()
    const back = await screen.findByRole('link', { name: 'Livros e apostilas' })
    expect(back).toHaveAttribute('href', '/categorias/1')
    await userEvent.click(back)
    expect(router.state.location.pathname).toBe('/categorias/1')
  })

  it('tem a galeria com 3 fotos e dá para trocar a principal', async () => {
    renderPage()
    await title()
    const main = () => screen.getByRole('img', { name: /Cálculo I — Guidorizzi, vol. 1: foto/ })

    expect(main()).toHaveAccessibleName(/foto 1 de 3/)
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 2 de 3' }))
    expect(main()).toHaveAccessibleName(/foto 2 de 3/)
  })

  it('ao ir para outro produto, a galeria volta para a 1ª foto', async () => {
    const router = renderPage('/produtos/1')
    await title()
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 3 de 3' }))

    await act(() => router.navigate('/produtos/2')) // o nº 2 também tem 3 fotos
    await screen.findByRole('heading', { level: 1, name: 'Física I — Halliday, 10ª ed.' })

    expect(screen.getByRole('img', { name: /Halliday.*foto 1 de 3/ })).toBeInTheDocument()
  })

  it('"Fazer pedido" abre o pop-up e fechar devolve o foco ao botão', async () => {
    renderPage()
    await title()
    const button = screen.getByRole('button', { name: /^Fazer pedido — R\$\s45,00$/ })

    await userEvent.click(button)
    const dialog = screen.getByRole('dialog', { name: 'Como você quer fazer o pedido?' })
    expect(within(dialog).getByText('R$ 45,00 · vendido por Ana Lima')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
  })

  it('"Seguir para o pagamento" cria o pedido e abre /pagamento/:id (RN-PED-04 e 10)', async () => {
    resetOrdersForTests()
    const router = renderPage()
    await title()
    await userEvent.click(screen.getByRole('button', { name: /^Fazer pedido — R\$\s45,00$/ }))
    await userEvent.click(screen.getByRole('button', { name: /Seguir para o pagamento/ }))

    expect(await screen.findByRole('heading', { name: 'Tela de pagamento' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/pagamento/417')
  })

  it('clicar de novo no mesmo anúncio reaproveita o pedido aberto (RN-PED-10)', async () => {
    resetOrdersForTests()
    const router = renderPage()
    await title()
    await userEvent.click(screen.getByRole('button', { name: /^Fazer pedido — R\$\s45,00$/ }))
    await userEvent.click(screen.getByRole('button', { name: /Seguir para o pagamento/ }))
    await screen.findByRole('heading', { name: 'Tela de pagamento' })

    await router.navigate('/produtos/1')
    await title()
    await userEvent.click(screen.getByRole('button', { name: /^Fazer pedido — R\$\s45,00$/ }))
    await userEvent.click(screen.getByRole('button', { name: /Seguir para o pagamento/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/pagamento/417'))
  })

  it('mostra o carregando enquanto busca', async () => {
    vi.mocked(getListingById).mockImplementationOnce(() => new Promise(() => {}))
    renderPage()
    expect(await screen.findByText('Carregando anúncio…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
  })
})

describe('ProductPage · outros estados', () => {
  it.each(['/produtos/999999', '/produtos/abc', '/produtos/0', '/produtos/-3'])(
    '%s: "Anúncio indisponível" com caminho para as categorias',
    async (path) => {
      renderPage(path)
      expect(await screen.findByRole('heading', { name: 'Anúncio indisponível' })).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: 'Categorias' }).at(-1)).toHaveAttribute('href', '/categorias')
      expect(screen.queryByRole('button', { name: /Fazer pedido/ })).not.toBeInTheDocument()
    },
  )

  it('erro de rede: mostra o alerta e "Tentar de novo" recarrega', async () => {
    vi.mocked(getListingById).mockRejectedValueOnce(new Error('offline'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o anúncio')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await title()
  })

  it('anúncio com várias unidades avisa quantas há', async () => {
    renderPage('/produtos/5') // o nº 5 do exemplo tem 3 unidades
    expect(await screen.findByText('3 unidades disponíveis')).toBeInTheDocument()
  })

  it('administrador não pede: vê o aviso no lugar do botão (admin não compra)', async () => {
    setToken('t', 'admin')
    renderPage()
    await title()
    expect(screen.getByRole('heading', { name: 'Pedidos indisponíveis para administradores' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fazer pedido/ })).not.toBeInTheDocument()
  })

  it('o dono do anúncio não pede do próprio anúncio (RN-ANU-10) e vê o que digitou', async () => {
    const { id } = await createListing({
      title: 'Meu anúncio publicado',
      categoryId: 2,
      description: 'Descrição\ncom duas linhas.',
      priceInCents: 12345,
      quantity: 2,
      whatsapp: '85999990000',
      images: [],
    })
    renderPage(`/produtos/${id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Meu anúncio publicado' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Este é o seu anúncio' })).toBeInTheDocument()
    expect(screen.getByText('R$ 123,45')).toBeInTheDocument()
    expect(screen.getByText(/Descrição\s+com duas linhas\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fazer pedido/ })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('img', { name: 'Anúncio sem foto' })).toBeInTheDocument())
  })

  it('texto do anúncio com HTML aparece como texto, sem virar elemento (XSS)', async () => {
    const { id } = await createListing({
      title: '<img src=x onerror=alert(1)>',
      categoryId: 1,
      description: '<script>alert(1)</script> descrição',
      priceInCents: 100,
      quantity: 1,
      whatsapp: '85999990000',
      images: [],
    })
    renderPage(`/produtos/${id}`)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('<img src=x onerror=alert(1)>')
    expect(document.querySelector('script')).toBeNull()
    expect(document.querySelector('img[src="x"]')).toBeNull()
  })


  it('visitante: "Fazer pedido" leva ao login guardando o produto, sem abrir o pop-up', async () => {
    clearToken()
    const router = renderPage('/produtos/1')
    await title()

    await userEvent.click(screen.getByRole('button', {name: /^Fazer pedido /}))

    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.state).toEqual({ from: '/produtos/1' })
  } )
})
