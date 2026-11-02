import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { RecentListing } from '../services/recent.service'
import { RecentListingsCarousel } from './RecentListingsCarousel'

const make = (count: number, extra: Partial<RecentListing> = {}): RecentListing[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1, title: `Anúncio ${i + 1}`, category: 'Livros e apostilas', priceInCents: 4500, imageUrl: null, ...extra,
  }))

// Os indicadores de página são os <span> decorativos do rodapé do carrossel.
const dots = (container: HTMLElement) =>
  container.querySelector('[data-testid="carousel-dots"]')?.children.length ?? 0

describe('RecentListingsCarousel · RF001.4', () => {
  it('com 1 anúncio há uma página e as duas setas ficam desabilitadas', () => {
    const { container } = render(<RecentListingsCarousel listings={make(1)} />)
    expect(dots(container)).toBe(1)
    expect(screen.getByRole('button', { name: 'Anúncios anteriores' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Próximos anúncios' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('com 2 anúncios (uma página inteira) também não há para onde rolar', () => {
    const { container } = render(<RecentListingsCarousel listings={make(2)} />)
    expect(dots(container)).toBe(1)
    expect(screen.getByRole('button', { name: 'Próximos anúncios' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('com 3 anúncios são 2 páginas e a seta de próximos fica ativa', () => {
    const { container } = render(<RecentListingsCarousel listings={make(3)} />)
    expect(dots(container)).toBe(2)
    expect(screen.getByRole('button', { name: 'Próximos anúncios' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('com 11 anúncios são 6 páginas', () => {
    const { container } = render(<RecentListingsCarousel listings={make(11)} />)
    expect(dots(container)).toBe(6)
    expect(screen.getAllByRole('listitem')).toHaveLength(11)
  })

  it('título longo fica limitado a 2 linhas e o preço máximo é formatado', () => {
    render(
      <RecentListingsCarousel
        listings={make(1, { title: 'Título '.repeat(60), priceInCents: 9999999 })}
      />,
    )
    expect(screen.getByRole('heading', { level: 3 })).toHaveClass('line-clamp-2')
    expect(screen.getByText(/99\.999,99/)).toBeInTheDocument()
  })

  it('mostra a foto do anúncio quando a API traz uma', () => {
    const { container } = render(<RecentListingsCarousel listings={make(1, { imageUrl: 'http://x/a.jpg' })} />)
    expect(container.querySelector('img[src="http://x/a.jpg"]')).not.toBeNull()
  })
})
