import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorAlert, InfoAlert, SuccessAlert } from './Alert'

describe('ErrorAlert', () => {
  it('é anunciado na hora (role alert) e mostra título e mensagem', () => {
    render(<ErrorAlert title="Não foi possível entrar">E-mail ou senha incorretos.</ErrorAlert>)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível entrar')
    expect(alert).toHaveTextContent('E-mail ou senha incorretos.')
  })

  it('funciona sem título', () => {
    render(<ErrorAlert>Falhou.</ErrorAlert>)
    expect(screen.getByRole('alert')).toHaveTextContent('Falhou.')
    expect(screen.queryByText('Não foi possível entrar')).not.toBeInTheDocument()
  })

  it('o ícone é decorativo (escondido de leitores de tela)', () => {
    const { container } = render(<ErrorAlert>x</ErrorAlert>)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('usa a cor de erro e a faixa à esquerda, como nos grandes sites', () => {
    render(<ErrorAlert>x</ErrorAlert>)
    expect(screen.getByRole('alert').className).toMatch(/border-l-danger/)
    expect(screen.getByRole('alert').className).toMatch(/bg-danger-soft/)
  })

  it('quebra mensagens longas sem estourar a caixa', () => {
    render(<ErrorAlert>{'a'.repeat(300)}</ErrorAlert>)
    expect(screen.getByRole('alert').querySelector('p')).toHaveClass('break-words')
  })
})

describe('SuccessAlert', () => {
  it('é anunciado com educação (role status), sem interromper', () => {
    render(<SuccessAlert>Conta criada!</SuccessAlert>)
    expect(screen.getByRole('status')).toHaveTextContent('Conta criada!')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('InfoAlert', () => {
  it('é informação fixa, sem papel de alerta nem de status', () => {
    render(<InfoAlert title="Aviso">Texto informativo.</InfoAlert>)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByText('Texto informativo.')).toBeInTheDocument()
    expect(screen.getByText('Aviso')).toBeInTheDocument()
  })
})
