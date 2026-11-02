import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'

const completeProfile = vi.fn()
vi.mock('../services/account.service', () => ({
  completeProfile: (...args: unknown[]) => completeProfile(...args),
}))

import { CompleteProfilePage } from './CompleteProfilePage'

function renderPage(state?: { from: string }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  queryClient.setQueryData(['auth', 'me', 'jwt'], { user: null, needsTermsAcceptance: true })
  const router = createMemoryRouter(
    [
      { path: '/completar-cadastro', element: <CompleteProfilePage /> },
      { path: '/categorias', element: <p>Categorias</p> },
      { path: '/produtos/:id', element: <p>Produto</p> },
    ],
    { initialEntries: [{ pathname: '/completar-cadastro', state }] },
  )
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { router, queryClient }
}

const accept = () => userEvent.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Continuar' }))

beforeEach(() => {
  completeProfile.mockReset()
  completeProfile.mockResolvedValue({ user: { id: 1 }, needsTermsAcceptance: false })
})

describe('CompleteProfilePage · RN-ACE-06, 14', () => {
  it('RN-ACE-06: não deixa continuar sem aceitar os Termos e a Política', async () => {
    renderPage()
    await submit()
    expect(await screen.findByText('Aceite os Termos e a Política para continuar.')).toBeInTheDocument()
    expect(completeProfile).not.toHaveBeenCalled()
  })

  it('curso e WhatsApp são opcionais: só o aceite basta', async () => {
    renderPage()
    await accept()
    await submit()
    await waitFor(() => expect(completeProfile).toHaveBeenCalled())
    expect(completeProfile.mock.calls[0]?.[0]).toEqual({ course: '', whatsapp: '' })
  })

  it('RN-PER-07: WhatsApp com menos de 10 dígitos mostra o erro e não envia', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/WhatsApp/), '8599')
    await accept()
    await submit()
    expect(await screen.findByText(/10 ou 11 dígitos/)).toBeInTheDocument()
    expect(completeProfile).not.toHaveBeenCalled()
  })

  it('RN-PER-07: envia só os dígitos do WhatsApp e o curso', async () => {
    renderPage()
    await userEvent.type(screen.getByLabelText(/Curso/), 'Ciência da Computação')
    await userEvent.type(screen.getByLabelText(/WhatsApp/), '(85) 99999-0000')
    await accept()
    await submit()
    await waitFor(() => expect(completeProfile).toHaveBeenCalled())
    expect(completeProfile.mock.calls[0]?.[0]).toEqual({
      course: 'Ciência da Computação',
      whatsapp: '85999990000',
    })
  })

  it('RN-ACE-14: depois de salvar marca o aceite em dia no cache e volta ao destino guardado', async () => {
    const { router, queryClient } = renderPage({ from: '/produtos/7' })
    await accept()
    await submit()
    expect(await screen.findByText('Produto')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/produtos/7')
    expect(queryClient.getQueryData(['auth', 'me', 'jwt'])).toMatchObject({ needsTermsAcceptance: false })
  })

  it('sem destino guardado vai às Categorias', async () => {
    renderPage()
    await accept()
    await submit()
    expect(await screen.findByText('Categorias')).toBeInTheDocument()
  })

  it('erro do servidor aparece na tela e não navega', async () => {
    completeProfile.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Informe o WhatsApp com DDD.'))
    const { router } = renderPage()
    await accept()
    await submit()
    expect(await screen.findByText('Informe o WhatsApp com DDD.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/completar-cadastro')
  })
})
