import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { clearToken, setToken } from '../../../../shared/lib/session'
import { getCategories } from '../../categories/services/categories.service'
import { createListing, getListings } from '../services/listings.service'
import { CreateListingPage } from './CreateListingPage'

vi.mock('../services/listings.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/listings.service')>()
  return { ...actual, createListing: vi.fn(actual.createListing) }
})

beforeEach(() => {
  setToken('t', 'student')
})
afterEach(() => {
  clearToken()
  vi.mocked(createListing).mockClear()
})

function renderPage() {
  const router = createMemoryRouter(
    [
      { path: '/anunciar', element: <CreateListingPage /> },
      { path: '/categorias/:id', element: <h1>Lista da categoria</h1> },
      { path: '/perfil', element: <h1>Perfil</h1> },
      { path: '/admin/usuarios', element: <h1>Painel</h1> },
    ],
    { initialEntries: ['/anunciar'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const png = (name = 'capa.png') => new File(['x'], name, { type: 'image/png' })

async function ready() {
  await screen.findByRole('button', { name: 'Publicar' })
  // o select só tem as categorias depois de carregar
  await screen.findByRole('option', { name: 'Livros e apostilas' })
}

async function fillValid(overrides: { title?: string } = {}) {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText('Nome do item *'))
  await user.paste(overrides.title ?? 'Cálculo II — Stewart')
  await user.selectOptions(screen.getByLabelText('Categoria *'), 'Livros e apostilas')
  await user.click(screen.getByLabelText('Descrição *'))
  await user.paste('Livro em ótimo estado, sem rasuras.')
  await user.click(screen.getByLabelText('Preço (R$) *'))
  await user.paste('45,50')
  await user.upload(screen.getByLabelText(/Arraste fotos/), png())
  return user
}

describe('CreateListingPage · tela', () => {
  it('mostra o título, o link de volta ao perfil e os dois cartões do Figma', async () => {
    renderPage()
    await ready()

    expect(screen.getByRole('heading', { level: 1, name: 'Anunciar item' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao perfil' })).toHaveAttribute('href', '/perfil')
    expect(screen.getByRole('heading', { name: 'Dados do item' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Contato' })).toBeInTheDocument()
    expect(screen.getByText('* Campos obrigatórios')).toBeInTheDocument()
    expect(document.title).toBe('Anunciar item · Unishop')
  })

  it('lista as 6 categorias no select', async () => {
    renderPage()
    await ready()
    const options = within(screen.getByLabelText('Categoria *')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Selecione uma categoria',
      'Livros e apostilas',
      'Eletrônicos',
      'Alimentos',
      'Materiais de curso',
      'Vestuário',
      'Outros',
    ])
  })

  it('nasce com o WhatsApp do perfil (formatado), a quantidade 1 e a dica de privacidade', async () => {
    renderPage()
    await ready()
    expect(screen.getByLabelText('WhatsApp *')).toHaveValue('(85) 9 9999-0000')
    expect(screen.getByLabelText('Quantidade *')).toHaveValue('1')
    expect(screen.getByText(/só aparece para alunos logados/)).toBeInTheDocument()
  })

  it('o WhatsApp é formatado enquanto se digita', async () => {
    renderPage()
    await ready()
    const user = userEvent.setup()
    const field = screen.getByLabelText('WhatsApp *')
    await user.clear(field)
    await user.type(field, '85988887777')
    expect(field).toHaveValue('(85) 9 8888-7777')
  })

  it('enviar vazio mostra os erros de todos os campos e não publica', async () => {
    renderPage()
    await ready()
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Quantidade *'))
    await user.clear(screen.getByLabelText('WhatsApp *'))
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    for (const message of [
      'Informe o nome do item.',
      'Escolha uma categoria.',
      'Informe a descrição.',
      'Informe o preço.',
      'Informe a quantidade.',
      'Informe o WhatsApp.',
      'Envie pelo menos 1 foto.',
    ]) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(createListing).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nome do item *')).toHaveFocus() // foco no primeiro erro
  })

  it('marca o campo inválido para o leitor de tela', async () => {
    renderPage()
    await ready()
    await userEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    const title = screen.getByLabelText('Nome do item *')
    await waitFor(() => expect(title).toHaveAttribute('aria-invalid', 'true'))
  })

  it('preço e quantidade fora do limite são recusados', async () => {
    renderPage()
    await ready()
    const user = await fillValid()
    await user.clear(screen.getByLabelText('Preço (R$) *'))
    await user.paste('100000')
    await user.clear(screen.getByLabelText('Quantidade *'))
    await user.paste('1000')
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByText(/no máximo R\$ 99\.999,99/)).toBeInTheDocument()
    expect(screen.getByText('A quantidade deve ser de 1 a 999.')).toBeInTheDocument()
    expect(createListing).not.toHaveBeenCalled()
  })

  it('publica: envia centavos inteiros e só dígitos no WhatsApp, e abre o pop-up com a categoria', async () => {
    renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    const dialog = await screen.findByRole('dialog', { name: 'Anúncio publicado!' })
    expect(within(dialog).getByText(/“Cálculo II — Stewart” já está visível para os alunos na categoria Livros e apostilas\./)).toBeInTheDocument()

    expect(createListing).toHaveBeenCalledTimes(1)
    expect(vi.mocked(createListing).mock.calls[0]![0]).toMatchObject({
      title: 'Cálculo II — Stewart',
      categoryId: 1,
      priceInCents: 4550,
      quantity: 1,
      whatsapp: '85999990000',
    })
    expect(vi.mocked(createListing).mock.calls[0]![0].images).toHaveLength(1)
  })

  it('o anúncio novo vai para o topo da categoria e a contagem sobe (RN-ANU-07)', async () => {
    const before = (await getCategories()).find((c) => c.id === 1)!.activeListingCount
    renderPage()
    await ready()
    const user = await fillValid({ title: 'Anúncio recém publicado' })
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByRole('dialog')

    const first = (await getListings({ categoryId: 1 })).items[0]!
    expect(first.title).toBe('Anúncio recém publicado')
    expect(first.priceInCents).toBe(4550)
    expect((await getCategories()).find((c) => c.id === 1)!.activeListingCount).toBe(before + 1)
  })

  it('"Fechar" limpa o formulário (mantendo o WhatsApp) e devolve o foco ao botão de publicar', async () => {
    renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nome do item *')).toHaveValue('')
    expect(screen.getByLabelText('Descrição *')).toHaveValue('')
    expect(screen.getByLabelText('Quantidade *')).toHaveValue('1')
    expect(screen.getByLabelText('WhatsApp *')).toHaveValue('(85) 9 9999-0000')
    expect(screen.queryByRole('list', { name: 'Fotos escolhidas' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveFocus()
  })

  it('Esc também fecha o pop-up', async () => {
    renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('"Meu anúncio" leva à lista da categoria', async () => {
    const router = renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    await user.click(await screen.findByRole('link', { name: 'Meu anúncio' }))

    expect(router.state.location.pathname).toBe('/categorias/1')
  })

  it('enquanto envia, o botão fica desativado e diz "Publicando…" (sem envio duplo)', async () => {
    let finish!: (value: Awaited<ReturnType<typeof createListing>>) => void
    vi.mocked(createListing).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    const busy = await screen.findByRole('button', { name: 'Publicando…' })
    expect(busy).toBeDisabled()

    finish({ id: 1, title: 'X', categoryId: 1, categoryName: 'Livros e apostilas' })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('falha do servidor: mostra o alerta, mantém o que foi digitado e não abre o pop-up', async () => {
    vi.mocked(createListing).mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'boom'))
    renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível publicar o anúncio agora')
    expect(screen.getByLabelText('Nome do item *')).toHaveValue('Cálculo II — Stewart')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })

  it('sem conexão: mensagem própria', async () => {
    vi.mocked(createListing).mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
    renderPage()
    await ready()
    const user = await fillValid()
    await user.click(screen.getByRole('button', { name: 'Publicar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com o servidor')
  })

  it('administrador não anuncia: vê o aviso e o caminho para o painel', async () => {
    setToken('t', 'admin')
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Administradores não anunciam' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Painel' })).toHaveAttribute('href', '/admin/usuarios')
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument()
  })
})
