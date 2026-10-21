import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getCategories } from '../services/categories.service'
import { CategoriesPage } from './CategoriesPage'

// Usa o serviço de verdade (dados de exemplo), mas deixa trocar a resposta em estados específicos.
vi.mock('../services/categories.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/categories.service')>()
  return { ...actual, getCategories: vi.fn(actual.getCategories) }
})

function renderPage(initialEntry = '/categorias') {
  const router = createMemoryRouter([{ path: '/categorias', element: <CategoriesPage /> }], {
    initialEntries: [initialEntry],
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('CategoriesPage', () => {
  it('mostra o título e as 6 categorias com a contagem', async () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Categorias' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Livros e apostilas/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(6)
    expect(screen.getByText('48 anúncios')).toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('6 categorias encontradas')
  })

  it('anuncia o carregamento enquanto a lista não chega', () => {
    vi.mocked(getCategories).mockImplementationOnce(() => new Promise(() => {}))
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Carregando categorias…')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('filtra pela busca e guarda o texto na URL (?q=)', async () => {
    const router = renderPage()
    await screen.findByRole('link', { name: /Livros e apostilas/ })

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar item ou categoria' }), 'eletro')

    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(1))
    expect(screen.getByRole('link', { name: /Eletrônicos/ })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=eletro')
  })

  it('abre já filtrada quando a URL traz ?q=', async () => {
    renderPage('/categorias?q=outros')

    expect(await screen.findByRole('link', { name: /Outros/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByRole('searchbox')).toHaveValue('outros')
  })

  it('mostra o estado vazio e "Limpar busca" volta a lista', async () => {
    const router = renderPage('/categorias?q=xyz')

    expect(await screen.findByRole('heading', { name: 'Nenhuma categoria encontrada' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Limpar busca' }))

    await waitFor(() => expect(screen.getAllByRole('link')).toHaveLength(6))
    expect(router.state.location.search).toBe('')
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('mostra o erro e deixa tentar de novo', async () => {
    vi.mocked(getCategories).mockRejectedValueOnce(new Error('falhou'))
    renderPage()

    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('Não foi possível carregar as categorias')).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('link', { name: /Livros e apostilas/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
