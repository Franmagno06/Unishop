import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { clearToken, setToken } from '../../../../shared/lib/session'
import { Footer } from '../../layout/Footer'
import { LandingPage } from './LandingPage'

const renderPage = (ui = <LandingPage />) => render(<MemoryRouter>{ui}</MemoryRouter>)

afterEach(() => clearToken())

describe('LandingPage · visitante', () => {
  it('mostra o título, o botão de criar conta e as seções', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: /O comércio da Unifor/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar minha conta com e-mail Unifor' })).toHaveAttribute('href', '/cadastro')
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
  it('troca "Criar minha conta" por "Ver categorias"', () => {
    setToken('jwt', 'student')
    renderPage()

    expect(screen.queryByRole('link', { name: 'Criar minha conta com e-mail Unifor' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver categorias' })).toHaveAttribute('href', '/categorias')
  })

  it('vale também para o administrador', () => {
    setToken('jwt', 'admin')
    renderPage()
    expect(screen.getByRole('link', { name: 'Ver categorias' })).toBeInTheDocument()
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
