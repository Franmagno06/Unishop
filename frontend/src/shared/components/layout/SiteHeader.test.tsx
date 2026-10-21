import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, setToken } from '../../lib/session'
import { SiteHeader } from './SiteHeader'

function renderHeader(path = '/') {
  const router = createMemoryRouter(
    [
      { path: '/', element: <SiteHeader /> },
      { path: '/categorias', element: <SiteHeader /> },
      { path: '/perfil', element: <SiteHeader /> },
      { path: '/login', element: <p>Tela de login</p> },
    ],
    { initialEntries: [path] },
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

// A navegação aparece duas vezes (desktop e linha do celular); o CSS esconde uma delas.
const navLinks = () => screen.getAllByRole('navigation', { name: 'Principal' })[0]!
const linkNames = () =>
  Array.from(navLinks().querySelectorAll('a')).map((link) => link.textContent)

afterEach(() => clearToken())

describe('SiteHeader · visitante', () => {
  it('mostra Início, Categorias e Segurança, mais Entrar e Criar conta', () => {
    renderHeader()

    expect(linkNames()).toEqual(['Início', 'Categorias', 'Segurança'])
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
  })

  it('não mostra o avatar nem "+ Anunciar item"', () => {
    renderHeader()

    expect(screen.queryByRole('button', { name: 'Minha conta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '+ Anunciar item' })).not.toBeInTheDocument()
  })

  it('"Segurança" rola a tela inicial até a seção', () => {
    renderHeader()
    expect(screen.getAllByRole('link', { name: 'Segurança' })[0]).toHaveAttribute('href', '/#seguranca')
  })
})

describe('SiteHeader · aluno logado', () => {
  it('mostra Início, Categorias e Meus anúncios, "+ Anunciar item" e o avatar', () => {
    setToken('jwt', 'student')
    renderHeader()

    expect(linkNames()).toEqual(['Início', 'Categorias', 'Meus anúncios'])
    expect(screen.getByRole('link', { name: '+ Anunciar item' })).toHaveAttribute('href', '/anunciar')
    expect(screen.getByRole('button', { name: 'Minha conta' })).toBeInTheDocument()
  })

  it('não mostra mais "Entrar" nem "Criar conta"', () => {
    setToken('jwt', 'student')
    renderHeader()

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
  })

  it('"Meus anúncios" leva ao perfil (onde ficam os anúncios do aluno)', () => {
    setToken('jwt', 'student')
    renderHeader()
    expect(screen.getAllByRole('link', { name: 'Meus anúncios' })[0]).toHaveAttribute('href', '/perfil')
  })
})

describe('SiteHeader · administrador logado', () => {
  it('não anuncia: sem "+ Anunciar item" e sem "Meus anúncios"; tem o avatar', () => {
    setToken('jwt', 'admin')
    renderHeader()

    expect(linkNames()).toEqual(['Início', 'Categorias'])
    expect(screen.queryByRole('link', { name: '+ Anunciar item' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Minha conta' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
  })
})

describe('SiteHeader · muda sozinho com a sessão', () => {
  it('visitante vira logado quando a sessão começa, e volta a visitante quando termina', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()

    act(() => setToken('jwt', 'student'))
    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Minha conta' })).toBeInTheDocument()

    act(() => clearToken())
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Minha conta' })).not.toBeInTheDocument()
  })

  it('"Sair" no menu devolve o cabeçalho de visitante, sem recarregar', async () => {
    setToken('jwt', 'student')
    renderHeader('/categorias')

    await userEvent.click(screen.getByRole('button', { name: 'Minha conta' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('link', { name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Minha conta' })).not.toBeInTheDocument()
  })
})

describe('SiteHeader · página atual', () => {
  it('marca a página atual com aria-current', () => {
    renderHeader('/categorias')
    const current = screen.getAllByRole('link', { name: 'Categorias' })[0]
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('link', { name: 'Início' })[0]).not.toHaveAttribute('aria-current')
  })
})
