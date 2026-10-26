import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { pageItems } from './page-items'
import { Pagination } from './Pagination'

describe('pageItems', () => {
  it('até 5 páginas mostra todas', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('com muitas páginas mostra a primeira, a atual com vizinhas e a última, com "…" nos saltos', () => {
    expect(pageItems(1, 202)).toEqual([1, 2, 'gap', 202])
    expect(pageItems(50, 202)).toEqual([1, 'gap', 49, 50, 51, 'gap', 202])
    expect(pageItems(202, 202)).toEqual([1, 'gap', 201, 202])
    expect(pageItems(3, 10)).toEqual([1, 2, 3, 4, 'gap', 10])
  })
})

describe('Pagination', () => {
  it('mostra o resumo, marca a página atual e troca de página', async () => {
    const onChange = vi.fn()
    render(<Pagination page={2} totalPages={9} onChange={onChange} summary="Mostrando 7 de 60 usuários" />)

    expect(screen.getByText('Mostrando 7 de 60 usuários')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('button', { name: 'Próxima ›' }))
    expect(onChange).toHaveBeenLastCalledWith(3)
    await userEvent.click(screen.getByRole('button', { name: '‹ Anterior' }))
    expect(onChange).toHaveBeenLastCalledWith(1)
  })

  it('na primeira página "Anterior" fica desabilitado, e na última, "Próxima"', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onChange={vi.fn()} summary="x" />)
    expect(screen.getByRole('button', { name: '‹ Anterior' })).toBeDisabled()
    rerender(<Pagination page={3} totalPages={3} onChange={vi.fn()} summary="x" />)
    expect(screen.getByRole('button', { name: 'Próxima ›' })).toBeDisabled()
  })

  it('com uma página só, mostra apenas o resumo', () => {
    render(<Pagination page={1} totalPages={1} onChange={vi.fn()} summary="Mostrando 3 de 3 produtos" />)
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
