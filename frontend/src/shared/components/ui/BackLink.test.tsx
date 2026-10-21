import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BackLink } from './BackLink'

// Três telas: /inicio (padrão), /login e /cadastro, que tem o BackLink com destino padrão /inicio.
function renderApp(initialEntries: string[], initialIndex?: number) {
  const router = createMemoryRouter(
    [
      { path: '/inicio', element: <p>Tela inicial</p> },
      {
        path: '/login',
        element: (
          <>
            <p>Tela de login</p>
            <Link to="/cadastro">Ir para o cadastro</Link>
          </>
        ),
      },
      { path: '/cadastro', element: <BackLink fallbackTo="/inicio" /> },
    ],
    { initialEntries, initialIndex },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('BackLink', () => {
  it('é um link com nome "Voltar" e ícone decorativo', () => {
    renderApp(['/cadastro'])

    const link = screen.getByRole('link', { name: 'Voltar' })
    expect(link).toHaveAttribute('href', '/inicio')
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('aceita outro texto', () => {
    const router = createMemoryRouter([{ path: '/', element: <BackLink fallbackTo="/x">Voltar ao login</BackLink> }])
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('link', { name: 'Voltar ao login' })).toBeInTheDocument()
  })

  it('aberta direto (sem tela anterior do site), vai para o destino padrão', async () => {
    const router = renderApp(['/cadastro'])

    await userEvent.click(screen.getByRole('link', { name: 'Voltar' }))

    expect(router.state.location.pathname).toBe('/inicio')
    expect(screen.getByText('Tela inicial')).toBeInTheDocument()
  })

  it('vindo de outra tela do site, volta para ela e não para o destino padrão', async () => {
    const router = renderApp(['/login'])
    await userEvent.click(screen.getByRole('link', { name: 'Ir para o cadastro' }))
    expect(router.state.location.pathname).toBe('/cadastro')

    await userEvent.click(screen.getByRole('link', { name: 'Voltar' }))

    expect(router.state.location.pathname).toBe('/login')
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })

  it('com Ctrl pressionado deixa o navegador abrir o link (não usa o histórico)', async () => {
    // uma única sessão do user-event, para o Ctrl continuar pressionado durante o clique
    const user = userEvent.setup()
    const router = renderApp(['/login'])
    await user.click(screen.getByRole('link', { name: 'Ir para o cadastro' }))

    await user.keyboard('{Control>}')
    await user.click(screen.getByRole('link', { name: 'Voltar' }))
    await user.keyboard('{/Control}')

    // o histórico não foi usado: continua no cadastro
    expect(router.state.location.pathname).toBe('/cadastro')
  })

  it('funciona pelo teclado (Enter)', async () => {
    const router = renderApp(['/cadastro'])

    screen.getByRole('link', { name: 'Voltar' }).focus()
    await userEvent.keyboard('{Enter}')

    expect(router.state.location.pathname).toBe('/inicio')
  })
})
