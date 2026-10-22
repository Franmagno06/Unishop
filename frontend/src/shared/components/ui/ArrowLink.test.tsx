import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ArrowLink } from './ArrowLink'

function renderLink() {
  const router = createMemoryRouter(
    [
      { path: '/categorias/1', element: <ArrowLink to="/categorias">Categorias</ArrowLink> },
      { path: '/categorias', element: <p>Lista de categorias</p> },
    ],
    { initialEntries: ['/categorias/1'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('ArrowLink', () => {
  it('é um link para o destino fixo, com o texto e uma seta decorativa', () => {
    renderLink()

    const link = screen.getByRole('link', { name: 'Categorias' })
    expect(link).toHaveAttribute('href', '/categorias')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('leva sempre ao destino, mesmo vindo de outra tela (não usa o histórico)', async () => {
    const router = renderLink()
    await userEvent.click(screen.getByRole('link', { name: 'Categorias' }))
    expect(router.state.location.pathname).toBe('/categorias')
  })

  it('funciona pelo teclado e tem foco visível', async () => {
    const router = renderLink()
    const link = screen.getByRole('link', { name: 'Categorias' })

    link.focus()
    expect(link.className).toMatch(/focus-visible:outline/)
    await userEvent.keyboard('{Enter}')

    expect(router.state.location.pathname).toBe('/categorias')
  })

  it('aceita classes extras sem perder o estilo base', () => {
    const router = createMemoryRouter([{ path: '/', element: <ArrowLink to="/x" className="mt-4">Voltar</ArrowLink> }])
    render(<RouterProvider router={router} />)
    const link = screen.getByRole('link', { name: 'Voltar' })
    expect(link).toHaveClass('mt-4')
    expect(link).toHaveClass('text-primary')
  })
})
