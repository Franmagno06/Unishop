import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'

const valid = {
  name: 'Ana Souza',
  email: 'ana@edu.unifor.br',
  password: 'Senha1234',
  passwordConfirmation: 'Senha1234',
}

function renderRegister() {
  const router = createMemoryRouter(
    [
      { path: '/cadastro', element: <RegisterPage /> },
      { path: '/login', element: <LoginPage /> },
    ],
    { initialEntries: ['/cadastro'] },
  )
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function fillForm(
  values: Partial<typeof valid> & { acceptTerms?: boolean } = {},
) {
  const data = { ...valid, acceptTerms: true, ...values }
  await userEvent.type(screen.getByLabelText('Nome completo'), data.name)
  await userEvent.type(screen.getByLabelText('E-mail institucional'), data.email)
  await userEvent.type(screen.getByLabelText('Senha'), data.password)
  await userEvent.type(screen.getByLabelText('Confirmar senha'), data.passwordConfirmation)
  if (data.acceptTerms) await userEvent.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
}

const submit = () => userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RegisterPage · estrutura', () => {
  it('mostra o título, os campos pedidos e não pede Curso nem WhatsApp', () => {
    renderRegister()

    expect(screen.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeInTheDocument()
    for (const label of ['Nome completo', 'E-mail institucional', 'Senha', 'Confirmar senha']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.queryByLabelText(/curso/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/whatsapp/i)).not.toBeInTheDocument()
  })

  it('configura os campos para o navegador e o teclado do celular', () => {
    renderRegister()

    const email = screen.getByLabelText('E-mail institucional')
    expect(email).toHaveAttribute('type', 'email')
    expect(email).toHaveAttribute('autocomplete', 'email')
    expect(email).toHaveAttribute('inputmode', 'email')
    expect(email).toHaveAttribute('spellcheck', 'false')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute('type', 'password')
  })

  it('liga a lista de requisitos da senha ao campo (RN-ACE-04)', () => {
    renderRegister()
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription(/8 a 72 caracteres/)
    expect(screen.getByRole('list', { name: 'Requisitos da senha' })).toBeInTheDocument()
  })

  it('marca os requisitos enquanto a pessoa digita a senha', async () => {
    renderRegister()
    expect(screen.queryByText('(atendido)')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Senha'), 'senha')
    expect(screen.queryAllByText('(atendido)')).toHaveLength(0)

    await userEvent.type(screen.getByLabelText('Senha'), 'S1234')
    expect(screen.getAllByText('(atendido)')).toHaveLength(3)
  })

  it('abre os Termos e a Política em nova aba, de forma segura', () => {
    renderRegister()

    for (const [name, href] of [
      ['Termos de uso', '/termos'],
      ['Política de privacidade', '/privacidade'],
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('tem o botão Voltar, com a tela inicial como destino padrão', () => {
    renderRegister()
    expect(screen.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', '/')
  })

  it('tem o link para entrar e o botão do Google desabilitado sem Client ID', () => {
    renderRegister()

    expect(screen.getByRole('link', { name: 'Já tem conta? Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('button', { name: 'Continuar com Google' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /Apple/ })).not.toBeInTheDocument()
  })
})

describe('RegisterPage · validação no navegador', () => {
  it('mostra todos os erros ao enviar vazio, sem chamar a API', async () => {
    const fetchMock = mockFetch(201, {})
    renderRegister()

    await submit()

    expect(await screen.findByText('O nome precisa ter ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu e-mail institucional.')).toBeInTheDocument()
    expect(screen.getByText('A senha precisa ter ao menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Confirme a senha.')).toBeInTheDocument()
    expect(screen.getByText('Aceite os Termos e a Política para continuar.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leva o foco ao primeiro campo com erro', async () => {
    renderRegister()
    await submit()
    await screen.findByText('Confirme a senha.')
    expect(screen.getByLabelText('Nome completo')).toHaveFocus()
  })

  it('recusa e-mail fora do domínio @edu.unifor.br (RN-ACE-02)', async () => {
    mockFetch(201, {})
    renderRegister()

    await fillForm({ email: 'ana@gmail.com' })
    await submit()

    const email = screen.getByLabelText('E-mail institucional')
    expect(await screen.findByText('Use seu e-mail institucional @edu.unifor.br.')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
  })

  it('recusa senha sem letra maiúscula (RN-ACE-04)', async () => {
    renderRegister()

    await fillForm({ password: 'senha1234', passwordConfirmation: 'senha1234' })
    await submit()

    expect(await screen.findByText('Inclua ao menos uma letra maiúscula.')).toBeInTheDocument()
  })

  it('recusa senha sem número (RN-ACE-04)', async () => {
    renderRegister()

    await fillForm({ password: 'SenhaSenha', passwordConfirmation: 'SenhaSenha' })
    await submit()

    expect(await screen.findByText('Inclua ao menos um número.')).toBeInTheDocument()
  })

  it('recusa confirmação diferente da senha', async () => {
    renderRegister()

    await fillForm({ passwordConfirmation: 'Outra1234' })
    await submit()

    expect(await screen.findByText('As senhas não são iguais.')).toBeInTheDocument()
  })

  it('exige o aceite dos Termos e da Política (RN-ACE-06)', async () => {
    const fetchMock = mockFetch(201, {})
    renderRegister()

    await fillForm({ acceptTerms: false })
    await submit()

    expect(await screen.findByText('Aceite os Termos e a Política para continuar.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Li e aceito/ })).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('RegisterPage · envio e respostas da API', () => {
  it('envia os dados ao cadastro e leva ao login com o aviso de conta criada', async () => {
    const fetchMock = mockFetch(201, { data: { user: { id: 7, name: 'Ana Souza', role: 'student' } } })
    renderRegister()

    await fillForm()
    await submit()

    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Conta criada! Entre com seu e-mail e senha.')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/auth\/register$/)
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ ...valid, acceptTerms: true })
  })

  it('não manda o cabeçalho de autorização no cadastro', async () => {
    const fetchMock = mockFetch(201, { data: { user: { id: 7, name: 'Ana', role: 'student' } } })
    renderRegister()

    await fillForm()
    await submit()
    await screen.findByRole('heading', { level: 1, name: 'Entrar' })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.headers).not.toHaveProperty('Authorization')
  })

  it('mostra no campo do e-mail quando ele já tem cadastro (409)', async () => {
    mockFetch(409, { error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'x' } })
    renderRegister()

    await fillForm()
    await submit()

    const email = screen.getByLabelText('E-mail institucional')
    expect(await screen.findByText('Este e-mail já tem cadastro. Tente entrar.')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Este e-mail já tem cadastro. Tente entrar.')
    expect(email).toHaveFocus()
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('mostra no campo do e-mail quando o servidor recusa o domínio', async () => {
    mockFetch(403, { error: { code: 'EMAIL_DOMAIN_NOT_ALLOWED', message: 'x' } })
    renderRegister()

    await fillForm()
    await submit()

    expect(await screen.findByText('Use seu e-mail @edu.unifor.br.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail institucional')).toHaveAttribute('aria-invalid', 'true')
  })

  it('mostra um aviso do formulário quando o servidor falha (500)', async () => {
    mockFetch(500, { error: { code: 'INTERNAL_ERROR', message: 'x' } })
    renderRegister()

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O servidor não conseguiu responder. Tente de novo em instantes.',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Servidor indisponível')
    expect(screen.getByLabelText('E-mail institucional')).not.toHaveAttribute('aria-invalid')
  })

  it('mostra um aviso quando não há conexão com o servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderRegister()

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.',
    )
  })

  it('mostra o aviso de excesso de tentativas (429)', async () => {
    mockFetch(429, { error: { code: 'TOO_MANY_REQUESTS', message: 'x', retryAfter: 30 } })
    renderRegister()

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas tentativas. Tente de novo em instantes.',
    )
  })

  it('desabilita o botão e avisa enquanto cria a conta, evitando envio duplo', async () => {
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    renderRegister()

    await fillForm()
    await submit()

    const button = await screen.findByRole('button', { name: 'Criando conta…' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('permite corrigir e enviar de novo depois de um erro', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'x' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { user: { id: 7, name: 'Ana', role: 'student' } } }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderRegister()

    await fillForm()
    await submit()
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await submit()
    expect(await screen.findByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
