import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetCurrentUser, setCurrentUser } from '../../lib/current-user'
import { clearToken, getToken, setToken, type Role } from '../../lib/session'
import { ProfileMenu } from './ProfileMenu'

function renderMenu(role: Role = 'student') {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            <p>Tela inicial</p>
            <ProfileMenu role={role} />
            <button type="button">Outro botão da página</button>
          </>
        ),
      },
      { path: '/perfil', element: <p>Tela do perfil</p> },
      { path: '/admin/usuarios', element: <p>Painel do admin</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

const avatar = () => screen.getByRole('button', { name: 'Minha conta' })
const menuOpen = () => avatar().getAttribute('aria-expanded') === 'true'

beforeEach(() =>
  setCurrentUser({
    name: 'Aluno Teste',
    email: 'aluno.teste@edu.unifor.br',
    course: '',
    whatsapp: '',
    avatarUrl: null,
  }),
)

afterEach(() => {
  clearToken()
  resetCurrentUser()
})

describe('ProfileMenu · aparência', () => {
  it('é um avatar com as iniciais do aluno ("AT"), fechado no começo', () => {
    renderMenu()

    expect(avatar()).toHaveTextContent('AT')
    expect(menuOpen()).toBe(false)
    expect(screen.queryByRole('link', { name: 'Ver perfil' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('aberto, mostra "Ver perfil" e "Sair", com o "Sair" em vermelho', async () => {
    renderMenu()
    await userEvent.click(avatar())

    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute('href', '/perfil')
    const logout = screen.getByRole('button', { name: 'Sair' })
    expect(logout.className).toMatch(/text-danger/)
    expect(logout.className).toMatch(/hover:bg-danger-soft/)
    expect(screen.getByRole('link', { name: 'Ver perfil' }).className).not.toMatch(/text-danger/)
  })

  it('os ícones são decorativos', async () => {
    renderMenu()
    await userEvent.click(avatar())
    for (const item of [screen.getByRole('link', { name: 'Ver perfil' }), screen.getByRole('button', { name: 'Sair' })]) {
      expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('liga o botão ao cartão (aria-controls) e dá nome ao grupo', async () => {
    renderMenu()
    await userEvent.click(avatar())

    const group = screen.getByRole('group', { name: 'Minha conta' })
    expect(avatar()).toHaveAttribute('aria-controls', group.id)
  })

  it('para o administrador, o primeiro item é "Painel admin" (não "Ver perfil")', async () => {
    renderMenu('admin')
    await userEvent.click(avatar())

    expect(screen.getByRole('link', { name: 'Painel admin' })).toHaveAttribute('href', '/admin/usuarios')
    expect(screen.queryByRole('link', { name: 'Ver perfil' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })
})

describe('ProfileMenu · mouse', () => {
  it('abre ao passar o mouse no avatar', async () => {
    renderMenu()
    await userEvent.hover(avatar())

    expect(menuOpen()).toBe(true)
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('fecha depois de tirar o mouse (com um pequeno atraso)', async () => {
    renderMenu()
    await userEvent.hover(avatar())
    await userEvent.unhover(avatar())

    await waitFor(() => expect(menuOpen()).toBe(false))
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('o cursor pode ir do avatar para o cartão sem o menu fechar', async () => {
    renderMenu()
    await userEvent.hover(avatar())
    await userEvent.hover(screen.getByRole('button', { name: 'Sair' }))

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(menuOpen()).toBe(true)
  })

  it('clicar no avatar com o mouse (que já abriu ao passar) mantém aberto, não fecha', async () => {
    renderMenu()
    await userEvent.hover(avatar())
    await userEvent.click(avatar())

    expect(menuOpen()).toBe(true)
  })
})

describe('ProfileMenu · toque e clique (sem "passar o mouse")', () => {
  it('um toque abre e outro toque fecha', async () => {
    const user = userEvent.setup()
    renderMenu()

    await user.pointer({ keys: '[TouchA]', target: avatar() })
    expect(menuOpen()).toBe(true)

    await user.pointer({ keys: '[TouchA]', target: avatar() })
    expect(menuOpen()).toBe(false)
  })

  it('tocar fora fecha o menu', async () => {
    const user = userEvent.setup()
    renderMenu()
    await user.pointer({ keys: '[TouchA]', target: avatar() })
    expect(menuOpen()).toBe(true)

    await user.pointer({ keys: '[TouchA]', target: screen.getByText('Tela inicial') })

    expect(menuOpen()).toBe(false)
  })

  it('clicar fora fecha o menu', async () => {
    renderMenu()
    await userEvent.click(avatar())
    expect(menuOpen()).toBe(true)

    await userEvent.click(screen.getByText('Tela inicial'))

    await waitFor(() => expect(menuOpen()).toBe(false))
  })
})

describe('ProfileMenu · teclado', () => {
  it('Enter abre; Enter de novo fecha', async () => {
    renderMenu()
    avatar().focus()

    await userEvent.keyboard('{Enter}')
    expect(menuOpen()).toBe(true)

    await userEvent.keyboard('{Enter}')
    expect(menuOpen()).toBe(false)
  })

  it('Espaço também abre', async () => {
    renderMenu()
    avatar().focus()
    await userEvent.keyboard(' ')
    expect(menuOpen()).toBe(true)
  })

  it('Tab percorre os itens na ordem: Ver perfil, depois Sair', async () => {
    renderMenu()
    avatar().focus()
    await userEvent.keyboard('{Enter}')

    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveFocus()
  })

  it('Esc fecha o menu e devolve o foco ao avatar', async () => {
    renderMenu()
    avatar().focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.tab()
    expect(screen.getByRole('link', { name: 'Ver perfil' })).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(menuOpen()).toBe(false)
    expect(avatar()).toHaveFocus()
  })

  it('sair do menu com Tab (para o próximo item da página) fecha o menu', async () => {
    renderMenu()
    avatar().focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.tab() // Ver perfil
    await userEvent.tab() // Sair
    await userEvent.tab() // sai do menu

    expect(screen.getByRole('button', { name: 'Outro botão da página' })).toHaveFocus()
    expect(menuOpen()).toBe(false)
  })

  it('Esc com o menu fechado não faz nada de estranho', async () => {
    renderMenu()
    avatar().focus()
    await userEvent.keyboard('{Escape}')
    expect(menuOpen()).toBe(false)
    expect(avatar()).toHaveFocus()
  })
})

describe('ProfileMenu · ações', () => {
  it('"Ver perfil" leva ao perfil e fecha o menu', async () => {
    const router = renderMenu()
    await userEvent.click(avatar())

    await userEvent.click(screen.getByRole('link', { name: 'Ver perfil' }))

    expect(router.state.location.pathname).toBe('/perfil')
    expect(screen.getByText('Tela do perfil')).toBeInTheDocument()
  })

  it('"Painel admin" leva ao painel', async () => {
    const router = renderMenu('admin')
    await userEvent.click(avatar())
    await userEvent.click(screen.getByRole('link', { name: 'Painel admin' }))
    expect(router.state.location.pathname).toBe('/admin/usuarios')
  })

  it('"Sair" apaga a sessão e volta à tela inicial', async () => {
    setToken('jwt', 'student')
    const router = createMemoryRouter(
      [
        { path: '/', element: <p>Tela inicial</p> },
        { path: '/categorias', element: <ProfileMenu role="student" /> },
      ],
      { initialEntries: ['/', '/categorias'], initialIndex: 1 },
    )
    render(
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )
    await userEvent.click(avatar())

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(getToken()).toBeNull()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByText('Tela inicial')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Minha conta' })).not.toBeInTheDocument()
  })
})
