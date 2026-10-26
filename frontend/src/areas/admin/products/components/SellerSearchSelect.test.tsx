import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { SellerOption } from '../types/product.types'
import { SellerSearchSelect } from './SellerSearchSelect'

const ana: SellerOption = { id: 2, name: 'Ana Lima', email: 'ana.lima@edu.unifor.br' }

function Harness({ onChange = vi.fn() }: { onChange?: (seller: SellerOption) => void }) {
  const [value, setValue] = useState<SellerOption | null>(ana)
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SellerSearchSelect
        label="Vendedor responsável *"
        value={value}
        onChange={(seller) => {
          setValue(seller)
          onChange(seller)
        }}
      />
    </QueryClientProvider>
  )
}

const combobox = () => screen.getByRole('combobox', { name: 'Vendedor responsável *' })

describe('SellerSearchSelect (RN-ADM-08)', () => {
  it('nasce com o vendedor atual escrito e a lista fechada', () => {
    render(<Harness />)
    expect(combobox()).toHaveValue('Ana Lima — ana.lima@edu.unifor.br')
    expect(combobox()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('digitar filtra a lista e clicar escolhe o vendedor', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.clear(combobox())
    await userEvent.type(combobox(), 'bruno')

    // A lista anterior fica na tela até a busca nova chegar: espera só o Bruno sobrar.
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    const option = screen.getByRole('option', { name: /Bruno Sales — bruno\.sales@edu\.unifor\.br/ })
    await userEvent.click(option)

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 3, name: 'Bruno Sales' }))
    expect(combobox()).toHaveValue('Bruno Sales — bruno.sales@edu.unifor.br')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('setas e Enter escolhem sem o mouse; Esc fecha e devolve o vendedor atual', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(combobox())
    await screen.findAllByRole('option')

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0]).toMatchObject({ id: 2 }) // 2ª da lista: Ana Lima

    await userEvent.clear(combobox())
    await userEvent.type(combobox(), 'zzz')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(combobox()).toHaveValue('Ana Lima — ana.lima@edu.unifor.br')
  })

  it('sem resultado avisa "Nenhum vendedor encontrado."', async () => {
    render(<Harness />)
    await userEvent.clear(combobox())
    await userEvent.type(combobox(), 'zzzz-ninguem')
    expect(await screen.findByText('Nenhum vendedor encontrado.')).toBeInTheDocument()
  })

  it('sair do campo sem escolher volta ao vendedor atual', async () => {
    render(<Harness />)
    await userEvent.clear(combobox())
    await userEvent.type(combobox(), 'car')
    await userEvent.tab()
    expect(combobox()).toHaveValue('Ana Lima — ana.lima@edu.unifor.br')
  })
})
