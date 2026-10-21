import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Checkbox } from './Checkbox'
import { Field } from './Field'
import { FieldError } from './FieldError'

describe('FieldError', () => {
  it('mostra o texto com ícone decorativo, anunciado com educação', () => {
    const { container } = render(<FieldError id="e1">Informe seu e-mail.</FieldError>)

    const message = screen.getByText('Informe seu e-mail.').closest('p')
    expect(message).toHaveAttribute('id', 'e1')
    expect(message).toHaveAttribute('aria-live', 'polite')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Field', () => {
  it('liga o rótulo ao campo', async () => {
    render(<Field label="E-mail institucional" />)
    await userEvent.type(screen.getByLabelText('E-mail institucional'), 'a@b.c')
    expect(screen.getByLabelText('E-mail institucional')).toHaveValue('a@b.c')
  })

  it('sem erro: não marca o campo como inválido', () => {
    render(<Field label="Nome" />)
    const input = screen.getByLabelText('Nome')
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input.className).toMatch(/border-border/)
  })

  it('com erro: borda vermelha, aria-invalid e mensagem ligada ao campo', () => {
    render(<Field label="Nome" error="O nome precisa ter ao menos 3 caracteres." />)

    const input = screen.getByLabelText('Nome')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.className).toMatch(/border-danger/)
    expect(input).toHaveAccessibleDescription('O nome precisa ter ao menos 3 caracteres.')
  })

  it('a dica some quando há erro, para não competir com ele', () => {
    const { rerender } = render(<Field label="Senha" hint="Use 8 caracteres." />)
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Use 8 caracteres.')

    rerender(<Field label="Senha" hint="Use 8 caracteres." error="Senha curta." />)
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Senha curta.')
  })

  it('junta o aria-describedby de fora com o do erro', () => {
    render(
      <>
        <ul id="regras">
          <li>Regra 1</li>
        </ul>
        <Field label="Senha" aria-describedby="regras" error="Senha curta." />
      </>,
    )
    expect(screen.getByLabelText('Senha')).toHaveAccessibleDescription('Senha curta. Regra 1')
  })
})

describe('Checkbox', () => {
  it('liga o texto ao quadradinho: clicar no texto marca', async () => {
    render(<Checkbox>Aceito os termos</Checkbox>)
    await userEvent.click(screen.getByText('Aceito os termos'))
    expect(screen.getByRole('checkbox', { name: 'Aceito os termos' })).toBeChecked()
  })

  it('sem erro: sem destaque vermelho', () => {
    render(<Checkbox>Aceito</Checkbox>)
    const box = screen.getByRole('checkbox')
    expect(box).not.toHaveAttribute('aria-invalid')
    expect(box.className).not.toMatch(/outline-danger/)
  })

  it('com erro: quadradinho com contorno vermelho e mensagem ligada a ele', () => {
    render(<Checkbox error="Aceite os Termos e a Política para continuar.">Aceito</Checkbox>)

    const box = screen.getByRole('checkbox')
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box.className).toMatch(/outline-danger/)
    expect(box).toHaveAccessibleDescription('Aceite os Termos e a Política para continuar.')
  })
})
