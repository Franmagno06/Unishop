import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ListingDetail } from '../types/listing.types'
import { ImageGallery } from './ImageGallery'
import { OrderChoiceDialog } from './OrderChoiceDialog'
import { AdminOrderNotice, OrderPanel, OwnListingNotice } from './OrderPanel'
import { SellerCard } from './SellerCard'

const listing: ListingDetail = {
  id: 1,
  title: 'Cálculo I — Guidorizzi, vol. 1',
  priceInCents: 4500,
  description: 'Livro em ótimo estado.',
  quantity: 1,
  categoryId: 1,
  images: ['/a.png', '/b.png', '/c.png'],
  seller: { name: 'Ana Lima', course: 'Engenharia Civil' },
  isOwn: false,
}

describe('ImageGallery', () => {
  it('mostra a 1ª foto na principal e uma miniatura por foto, com a 1ª marcada', () => {
    render(<ImageGallery images={listing.images} title="Livro" />)

    expect(screen.getByRole('img', { name: 'Livro: foto 1 de 3' })).toHaveAttribute('src', '/a.png')
    const thumbs = within(screen.getByRole('list', { name: 'Fotos do anúncio' })).getAllByRole('button')
    expect(thumbs).toHaveLength(3)
    expect(thumbs[0]).toHaveAttribute('aria-current', 'true')
    expect(thumbs[1]).not.toHaveAttribute('aria-current')
  })

  it('clicar numa miniatura troca a foto principal', async () => {
    render(<ImageGallery images={listing.images} title="Livro" />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver foto 3 de 3' }))

    expect(screen.getByRole('img', { name: 'Livro: foto 3 de 3' })).toHaveAttribute('src', '/c.png')
    expect(screen.getByRole('button', { name: 'Ver foto 3 de 3' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: 'Ver foto 1 de 3' })).not.toHaveAttribute('aria-current')
  })

  it('funciona pelo teclado: Tab até a miniatura e Enter', async () => {
    render(<ImageGallery images={listing.images} title="Livro" />)
    screen.getByRole('button', { name: 'Ver foto 2 de 3' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('img', { name: 'Livro: foto 2 de 3' })).toHaveAttribute('src', '/b.png')
  })

  it('com uma só foto não mostra miniaturas', () => {
    render(<ImageGallery images={['/a.png']} title="Livro" />)
    expect(screen.queryByRole('list', { name: 'Fotos do anúncio' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Livro: foto 1 de 1' })).toBeInTheDocument()
  })

  it('sem foto, mostra o bloco azul-claro e avisa "sem foto"', () => {
    render(<ImageGallery images={[]} title="Livro" />)
    expect(screen.getByRole('img', { name: 'Anúncio sem foto' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('SellerCard', () => {
  it('mostra iniciais, nome e o selo com o curso', () => {
    render(<SellerCard seller={{ name: 'Ana Lima', course: 'Engenharia Civil' }} />)
    expect(screen.getByText('AL')).toBeInTheDocument()
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('Aluno(a) verificado(a) · Engenharia Civil')).toBeInTheDocument()
  })

  it('sem curso, mostra só o selo; nome único vira uma letra', () => {
    render(<SellerCard seller={{ name: 'Madonna', course: null }} />)
    expect(screen.getByText('M')).toBeInTheDocument()
    expect(screen.getByText('Aluno(a) verificado(a)')).toBeInTheDocument()
  })

  it('nome muito longo e sem espaços não estoura a caixa', () => {
    render(<SellerCard seller={{ name: 'A'.repeat(120), course: null }} />)
    expect(screen.getByText('A'.repeat(120))).toHaveClass('break-words')
  })
})

describe('OrderPanel e avisos', () => {
  it('o botão traz o preço e chama onOrder', async () => {
    const onOrder = vi.fn()
    render(<OrderPanel priceInCents={4500} quantity={1} onOrder={onOrder} />)

    expect(screen.getByRole('heading', { name: 'Realize o pedido' })).toBeInTheDocument()
    expect(screen.getByText('Cartão de crédito')).toBeInTheDocument()
    expect(screen.getByText('Pix')).toBeInTheDocument()
    expect(screen.getByText('Contato')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Fazer pedido — R\$\s45,00$/ }))
    expect(onOrder).toHaveBeenCalledTimes(1)
  })

  it('só mostra "N unidades disponíveis" quando há mais de uma', () => {
    const { rerender } = render(<OrderPanel priceInCents={100} quantity={1} onOrder={vi.fn()} />)
    expect(screen.queryByText(/unidades disponíveis/)).not.toBeInTheDocument()
    rerender(<OrderPanel priceInCents={100} quantity={3} onOrder={vi.fn()} />)
    expect(screen.getByText('3 unidades disponíveis')).toBeInTheDocument()
  })

  it('dono e administrador veem avisos, sem botão de pedido', () => {
    render(
      <>
        <OwnListingNotice />
        <AdminOrderNotice />
      </>,
    )
    expect(screen.getByRole('heading', { name: 'Este é o seu anúncio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pedidos indisponíveis para administradores' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('OrderChoiceDialog', () => {
  it('fechado, não aparece', () => {
    render(<OrderChoiceDialog open={false} listing={listing} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('aberto, mostra o resumo do produto e as duas opções', () => {
    render(<OrderChoiceDialog open listing={listing} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'Como você quer fazer o pedido?' })
    expect(within(dialog).getByText('Cálculo I — Guidorizzi, vol. 1')).toBeInTheDocument()
    expect(within(dialog).getByText('R$ 45,00 · vendido por Ana Lima')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Seguir para o pagamento/ })).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: /Entrar em contato com o vendedor/ }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Converse com Ana Lima no WhatsApp/)).toBeInTheDocument()
  })

  it('as opções ainda não levam a lugar nenhum: não são links e só mostram o aviso', async () => {
    render(<OrderChoiceDialog open listing={listing} onClose={vi.fn()} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Seguir para o pagamento/ }))
    expect(screen.getByRole('status')).toHaveTextContent('ainda não está disponível')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('o X, o Cancelar e o Esc fecham', async () => {
    const onClose = vi.fn()
    render(<OrderChoiceDialog open listing={listing} onClose={onClose} />)

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('sem foto, usa o bloco azul-claro no resumo', () => {
    render(<OrderChoiceDialog open listing={{ ...listing, images: [] }} onClose={vi.fn()} />)
    expect(within(screen.getByRole('dialog')).queryByRole('img')).not.toBeInTheDocument()
  })
})
