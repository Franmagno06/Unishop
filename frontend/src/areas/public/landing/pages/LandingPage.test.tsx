import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { clearToken, setToken } from '../../../../shared/lib/session'
import { Footer } from '../../layout/Footer'
const getRecentListings = vi.fn()
vi.mock('../services/recent.service', () => ({
  getRecentListings: (...args: unknown[]) => getRecentListings(...args),
}))

import { LandingPage } from './LandingPage'

const renderPage = (
  ui = <LandingPage />,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  getRecentListings.mockReset()
  getRecentListings.mockResolvedValue([])
})
afterEach(() => clearToken())

describe('LandingPage · anúncios recentes (RF001.4)', () => {
  it('enquanto carrega mostra o aviso de carregamento, não a lista vazia', () => {
    getRecentListings.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByRole('status', { name: /Carregando anúncios recentes/ })).toBeInTheDocument()
    expect(screen.queryByText('Ainda não há anúncios.')).not.toBeInTheDocument()
  })

  it('mostra os anúncios que a API devolveu', async () => {
    getRecentListings.mockResolvedValue([
      { id: 1, title: 'Calculadora HP 12C', category: 'Eletrônicos', priceInCents: 12000, imageUrl: null },
    ])
    renderPage()
    expect(await screen.findByText('Calculadora HP 12C')).toBeInTheDocument()
  })

  it('sem anúncios mostra "Ainda não há anúncios."', async () => {
    renderPage()
    expect(await screen.findByText('Ainda não há anúncios.')).toBeInTheDocument()
  })

  it('uma atualização que falha não tira da tela os anúncios que já estavam lá', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    getRecentListings.mockResolvedValueOnce([
      { id: 1, title: 'Calculadora HP 12C', category: 'Eletrônicos', priceInCents: 12000, imageUrl: null },
    ])
    renderPage(<LandingPage />, client)
    expect(await screen.findByText('Calculadora HP 12C')).toBeInTheDocument()

    getRecentListings.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x'))
    await act(async () => {
      await client.refetchQueries({ queryKey: ['landing', 'recent'] })
    })
    expect(screen.getByText('Calculadora HP 12C')).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível carregar os anúncios.')).not.toBeInTheDocument()
  })

  it('erro da API mostra o aviso com "Tentar de novo" e o resto da página segue visível', async () => {
    getRecentListings.mockRejectedValueOnce(new ApiError(500, 'INTERNAL_ERROR', 'x'))
    renderPage()
    expect(await screen.findByText('Não foi possível carregar os anúncios.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /O comércio da Unifor/ })).toBeInTheDocument()

    getRecentListings.mockResolvedValue([
      { id: 2, title: 'Fone JBL', category: 'Eletrônicos', priceInCents: 9000, imageUrl: null },
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Fone JBL')).toBeInTheDocument()
  })
})

describe('LandingPage · visitante', () => {
  it('mostra o título, o botão de criar conta e as seções', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: /O comércio da Unifor/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
    for (const name of ['Como funciona', 'Dúvidas frequentes', 'Anúncios recentes']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  it('a seção de segurança cita o domínio institucional correto (RN-ACE-02)', () => {
    renderPage()
    expect(screen.getByText('Cadastro exige e-mail @edu.unifor.br.')).toBeInTheDocument()
  })
})

describe('LandingPage · usuário logado', () => {
  it('troca "Criar minha conta" por "Categorias"', () => {
    setToken('jwt', 'student')
    renderPage()

    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Categorias' })).toHaveAttribute('href', '/categorias')
  })

  it('vale também para o administrador', () => {
    setToken('jwt', 'admin')
    renderPage()
    expect(screen.getByRole('link', { name: 'Categorias' })).toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('visitante vê o link "Criar conta"', () => {
    renderPage(<Footer />)
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastro')
  })

  it('quem já está logado não vê "Criar conta"', () => {
    setToken('jwt', 'student')
    renderPage(<Footer />)
    expect(screen.queryByRole('link', { name: 'Criar conta' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dúvidas frequentes' })).toBeInTheDocument()
  })
})
