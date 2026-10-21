import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CategoryCard } from './CategoryCard'

function renderCard(activeListingCount: number) {
  render(
    <MemoryRouter>
      <CategoryCard category={{ id: 3, name: 'Alimentos', activeListingCount }} />
    </MemoryRouter>,
  )
}

describe('CategoryCard', () => {
  it('é um link para a listagem da categoria, com nome e contagem', () => {
    renderCard(35)

    const link = screen.getByRole('link', { name: /Alimentos/ })
    expect(link).toHaveAttribute('href', '/categorias/3')
    expect(screen.getByRole('heading', { name: 'Alimentos' })).toBeInTheDocument()
    expect(screen.getByText('35 anúncios')).toBeInTheDocument()
  })

  it('usa o singular quando há 1 anúncio', () => {
    renderCard(1)
    expect(screen.getByText('1 anúncio')).toBeInTheDocument()
  })
})
