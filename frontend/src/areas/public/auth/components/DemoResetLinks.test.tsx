import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

async function renderWith(modeOn: boolean, email = 'Aluno.Teste@edu.unifor.br') {
  vi.resetModules()
  vi.doMock('../services/mock-mode', () => ({ MOCK_MODE: modeOn }))
  const { DemoResetLinks } = await import('./DemoResetLinks')
  return render(
    <MemoryRouter>
      <DemoResetLinks email={email} />
    </MemoryRouter>,
  )
}

describe('DemoResetLinks', () => {
  it('fora do modo de demonstração não mostra nada', async () => {
    const { container } = await renderWith(false)
    expect(container).toBeEmptyDOMElement()
  })

  it('no modo de demonstração, o botão da simulação abre a tela de nova senha com um link de uso único', async () => {
    await renderWith(true)

    expect(screen.getByText('Modo de demonstração (sem servidor)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir link (simulação)' })).toHaveAttribute(
      'href',
      '/redefinir-senha/demo.aluno.teste%40edu.unifor.br',
    )
  })

  it('oferece os atalhos para simular link expirado e link inválido', async () => {
    await renderWith(true)

    expect(screen.getByRole('link', { name: 'Simular link expirado' })).toHaveAttribute('href', '/redefinir-senha/expirado')
    expect(screen.getByRole('link', { name: 'Simular link inválido' })).toHaveAttribute('href', '/redefinir-senha/invalido')
  })
})
