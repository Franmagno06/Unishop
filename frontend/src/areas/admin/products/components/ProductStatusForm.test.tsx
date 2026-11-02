import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import type { AdminProduct } from '../types/product.types'

const updateProduct = vi.fn()
vi.mock('../services/products.service', () => ({
  updateProduct: (...args: unknown[]) => updateProduct(...args),
}))

import { ProductStatusForm } from './ProductStatusForm'

const sold: AdminProduct = {
  id: 2, title: 'Caderno', description: 'Bom estado', priceInCents: 1500, categoryId: 4,
  categoryName: 'Materiais de curso', status: 'sold', whatsapp: '85999990000',
  seller: { id: 3, name: 'Ana', email: 'ana@edu.unifor.br', whatsapp: '' }, images: [], views: 0,
  whatsappContacts: 0, publishedAt: '2026-11-01T10:00:00Z',
}

function renderForm(product = sold) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter>
        <ProductStatusForm product={product} onSaved={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductStatusForm · RN-ADM-08', () => {
  it('Salvar fica desabilitado enquanto o status não mudou (Vendido não é enviado ao servidor)', () => {
    renderForm()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('Vendido sem unidades → Ativo: mostra a mensagem do servidor (409 INVALID_STATE)', async () => {
    updateProduct.mockRejectedValueOnce(
      new ApiError(409, 'INVALID_STATE', 'O anúncio não tem unidades. O vendedor precisa informar a quantidade antes de reativar.'),
    )
    renderForm()
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'active')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText(/não tem unidades/)).toBeInTheDocument()
  })
})
