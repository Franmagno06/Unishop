import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PASSWORD_RULES, registerSchema } from '../schemas/auth.schemas'
import { PasswordRequirements } from './PasswordRequirements'

function statuses() {
  const list = screen.getByRole('list', { name: 'Requisitos da senha' })
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('PasswordRequirements (RN-ACE-04)', () => {
  it('começa com todos os requisitos pendentes', () => {
    render(<PasswordRequirements id="r" password="" />)

    expect(statuses()).toEqual([
      '8 a 72 caracteres(pendente)',
      'Pelo menos 1 número(pendente)',
      'Pelo menos 1 letra maiúscula(pendente)',
    ])
  })

  it('marca cada requisito conforme a senha atende', () => {
    const { rerender } = render(<PasswordRequirements id="r" password="senha" />)
    expect(statuses().map((s) => s?.includes('(atendido)'))).toEqual([false, false, false])

    rerender(<PasswordRequirements id="r" password="senhasenha" />)
    expect(statuses().map((s) => s?.includes('(atendido)'))).toEqual([true, false, false])

    rerender(<PasswordRequirements id="r" password="Senha1" />)
    expect(statuses().map((s) => s?.includes('(atendido)'))).toEqual([false, true, true])

    rerender(<PasswordRequirements id="r" password="Senha1234" />)
    expect(statuses().map((s) => s?.includes('(atendido)'))).toEqual([true, true, true])
  })

  it('o estado vem por texto, não só por cor ou ícone', () => {
    render(<PasswordRequirements id="r" password="Senha1234" />)
    expect(screen.getAllByText('(atendido)')).toHaveLength(3)
  })

  it('recusa mais de 72 caracteres', () => {
    render(<PasswordRequirements id="r" password={'A1' + 'a'.repeat(71)} />)
    expect(statuses()[0]).toContain('(pendente)')
  })

  it('a lista e o esquema Zod concordam sobre o que é uma senha válida', () => {
    const base = {
      name: 'Ana Souza',
      email: 'ana@edu.unifor.br',
      acceptTerms: true,
    }
    const samples = [
      '',
      'Ab1',
      'senha1234',
      'SenhaSenha',
      'Senha1234',
      'SENHA1234',
      'Senha 1234!',
      'A1' + 'a'.repeat(70),
      'A1' + 'a'.repeat(71),
    ]

    for (const password of samples) {
      const listAccepts = PASSWORD_RULES.every((rule) => rule.test(password))
      const schemaAccepts = registerSchema.safeParse({
        ...base,
        password,
        passwordConfirmation: password,
      }).success
      expect(schemaAccepts, `senha "${password.slice(0, 12)}…"`).toBe(listAccepts)
    }
  })
})
