import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

describe('MockModeNotice', () => {
  it('não aparece fora do modo de demonstração', async () => {
    vi.resetModules()
    vi.doMock('../services/mock-mode', () => ({ MOCK_MODE: false }))
    const { MockModeNotice } = await import('./MockModeNotice')

    const { container } = render(<MockModeNotice page="login" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('no modo de demonstração mostra a conta de teste no login', async () => {
    vi.resetModules()
    vi.doMock('../services/mock-mode', () => ({ MOCK_MODE: true }))
    const { MockModeNotice } = await import('./MockModeNotice')

    render(<MockModeNotice page="login" />)
    expect(screen.getByText('Modo de demonstração (sem servidor)')).toBeInTheDocument()
    expect(screen.getByText(/aluno\.teste@edu\.unifor\.br · senha Senha1234/)).toBeInTheDocument()
    expect(screen.getByText(/administrador\.teste@edu\.unifor\.br · senha Admin1234/)).toBeInTheDocument()
  })

  it('no cadastro explica o e-mail que simula "já cadastrado"', async () => {
    vi.resetModules()
    vi.doMock('../services/mock-mode', () => ({ MOCK_MODE: true }))
    const { MockModeNotice } = await import('./MockModeNotice')

    render(<MockModeNotice page="register" />)
    expect(screen.getByText(/e-mail já cadastrado/)).toBeInTheDocument()
  })
})
