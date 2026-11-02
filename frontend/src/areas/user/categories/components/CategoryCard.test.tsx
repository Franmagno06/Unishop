import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { CategoryCard } from './CategoryCard'

function renderCard(activeListingCount: number, imageUrl: string | null = null) {
  return render(
    <MemoryRouter>
      <CategoryCard category={{ id: 3, name: 'Alimentos', activeListingCount, imageUrl }} />
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

  it('RN-CAT-02: mostra a foto do primeiro anúncio da categoria quando a API traz a capa', () => {
    const { container } = renderCard(2, 'http://x/bolo.jpg')
    const image = container.querySelector('img')
    expect(image).toHaveAttribute('src', 'http://x/bolo.jpg')
    expect(image).toHaveAttribute('alt', '') // decorativa: o nome da categoria já descreve o card
    expect(image).toHaveAttribute('loading', 'lazy')
  })

  it('sem capa (categoria sem anúncio) mantém o bloco azul-claro do Figma, sem imagem quebrada', () => {
    const { container } = renderCard(0, null)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.bg-primary-soft')).not.toBeNull()
  })

  it('usa o singular quando há 1 anúncio', () => {
    renderCard(1)
    expect(screen.getByText('1 anúncio')).toBeInTheDocument()
  })
})
