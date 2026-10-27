import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir</button>
      {open ? (
        <ConfirmDialog
          title="Excluir este anúncio?"
          description="Será removido."
          confirmLabel="Excluir"
          onConfirm={onConfirm}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

describe('ConfirmDialog', () => {
  it('abre como diálogo nomeado, com o foco em "Cancelar" (ação destrutiva)', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialog = screen.getByRole('dialog', { name: 'Excluir este anúncio?' })
    expect(dialog).toHaveAccessibleDescription('Será removido.')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('Esc fecha e devolve o foco a quem abriu', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Abrir' })
    await userEvent.click(opener)
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('prende o foco dentro do pop-up com Tab e Shift+Tab', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveFocus()
  })

  it('chama onConfirm só ao clicar em confirmar', async () => {
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    expect(onConfirm).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('trava a rolagem da página enquanto está aberto e libera ao fechar', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(document.body.style.overflow).toBe('hidden')

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
