import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ListingSummary } from '../types/listing.types'
import { ContactLine } from './ContactLine'
import { ListingCard } from './ListingCard'
import { ListingFilters } from './ListingFilters'
import { ListingGrid } from './ListingGrid'

const listing = (overrides: Partial<ListingSummary> = {}): ListingSummary => ({
  id: 7,
  title: 'Cálculo I — Guidorizzi, vol. 1',
  priceInCents: 4500,
  categoryId: 1,
  contact: { mode: 'site' },
  imageUrl: null,
  publishedAt: '2026-10-21T12:00:00.000Z',
  ...overrides,
})

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('ContactLine', () => {
  it.each([
    [{ mode: 'site' as const }, 'Pagamento no site'],
    [{ mode: 'whatsapp' as const }, 'WhatsApp'],
    [{ mode: 'campus' as const, place: 'Bloco K · Horário EF' }, 'Bloco K · Horário EF'],
  ])('mostra o texto de %j', (contact, text) => {
    render(<ContactLine contact={contact} />)
    expect(screen.getByText(text)).toBeInTheDocument()
  })

  it('campus sem local informado cai no texto "No campus"', () => {
    render(<ContactLine contact={{ mode: 'campus' }} />)
    expect(screen.getByText('No campus')).toBeInTheDocument()
  })

  it('usa um ícone decorativo (não emoji) junto do texto', () => {
    const { container } = render(<ContactLine contact={{ mode: 'site' }} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.textContent).not.toMatch(/[\u{1F4B3}\u{1F4CD}\u{1F4AC}]/u)
  })
})

describe('ListingCard', () => {
  it('é um link para a página do produto, com nome, preço em reais e contato', () => {
    inRouter(<ListingCard listing={listing()} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/produtos/7')
    expect(within(link).getByRole('heading', { level: 2, name: 'Cálculo I — Guidorizzi, vol. 1' })).toBeInTheDocument()
    expect(within(link).getByText('R$ 45,00')).toBeInTheDocument()
    expect(within(link).getByText('Pagamento no site')).toBeInTheDocument()
  })

  it('sem foto, mostra o bloco azul-claro decorativo', () => {
    const { container } = inRouter(<ListingCard listing={listing()} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('[aria-hidden="true"].bg-primary-soft')).not.toBeNull()
  })

  it('com foto, usa a imagem com tamanho definido e carregamento preguiçoso', () => {
    const { container } = inRouter(<ListingCard listing={listing({ imageUrl: 'https://exemplo.test/a.jpg' })} />)
    const image = container.querySelector('img')!
    expect(image).toHaveAttribute('src', 'https://exemplo.test/a.jpg')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('width')
    expect(image).toHaveAttribute('height')
    expect(image).toHaveAttribute('alt', '') // o nome já está no título do card
  })

  it('nome muito longo ou sem espaços não estoura o card', () => {
    inRouter(<ListingCard listing={listing({ title: 'a'.repeat(150) })} />)
    const title = screen.getByRole('heading', { level: 2 })
    expect(title).toHaveClass('line-clamp-2')
    expect(title).toHaveClass('break-words')
  })

  it('preço com centavos e preço alto saem formatados', () => {
    inRouter(<ListingCard listing={listing({ priceInCents: 1999_90 })} />)
    expect(screen.getByText(/1\.999,90/)).toBeInTheDocument()
  })
})

describe('ListingGrid', () => {
  it('mostra um item de lista por anúncio', () => {
    inRouter(<ListingGrid listings={[listing({ id: 1 }), listing({ id: 2, title: 'Outro' })]} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('acrescenta cards "carregando", escondidos de leitores de tela', () => {
    inRouter(<ListingGrid listings={[listing()]} skeletonCount={4} />)

    const items = screen.getAllByRole('listitem', { hidden: true })
    expect(items).toHaveLength(5)
    expect(screen.getAllByRole('listitem')).toHaveLength(1) // só o real está na árvore de acessibilidade
  })

  it('a grade vai de 1 a 4 colunas conforme a largura', () => {
    inRouter(<ListingGrid listings={[listing()]} />)
    const list = screen.getByRole('list')
    for (const cls of ['grid-cols-1', 'min-[480px]:grid-cols-2', 'md:grid-cols-3', 'xl:grid-cols-4', 'gap-6']) {
      expect(list).toHaveClass(cls)
    }
  })
})

describe('ListingFilters', () => {
  function setup(props: Partial<React.ComponentProps<typeof ListingFilters>> = {}) {
    const onContactChange = vi.fn()
    const onSortChange = vi.fn()
    render(
      <ListingFilters contact={undefined} sort="recent" onContactChange={onContactChange} onSortChange={onSortChange} {...props} />,
    )
    return { onContactChange, onSortChange }
  }

  it('mostra os 4 chips e o "Ordenar por"', () => {
    setup()

    const group = screen.getByRole('group', { name: 'Filtrar por forma de contato' })
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Todos',
      'Pagamento no site',
      'No campus',
      'WhatsApp',
    ])
    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument()
  })

  it('"Todos" começa ativo e só um chip fica ativo por vez (aria-pressed)', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    for (const name of ['Pagamento no site', 'No campus', 'WhatsApp']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('o chip do filtro atual aparece ativo', () => {
    setup({ contact: 'campus' })
    expect(screen.getByRole('button', { name: 'No campus' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicar num chip avisa qual foi; "Todos" avisa undefined', async () => {
    const { onContactChange } = setup({ contact: 'whatsapp' })

    await userEvent.click(screen.getByRole('button', { name: 'Pagamento no site' }))
    expect(onContactChange).toHaveBeenLastCalledWith('site')

    await userEvent.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onContactChange).toHaveBeenLastCalledWith(undefined)
  })

  it('o "Ordenar por" oferece as três ordens e avisa a escolhida', async () => {
    const { onSortChange } = setup()
    const select = screen.getByLabelText('Ordenar por')

    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Mais recentes',
      'Menor preço',
      'Maior preço',
    ])
    expect(select).toHaveValue('recent')

    await userEvent.selectOptions(select, 'Menor preço')
    expect(onSortChange).toHaveBeenLastCalledWith('price_asc')
  })

  it('funciona pelo teclado (Tab e Enter nos chips)', async () => {
    const { onContactChange } = setup()
    screen.getByRole('button', { name: 'Todos' }).focus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Pagamento no site' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    expect(onContactChange).toHaveBeenCalledWith('site')
  })
})
