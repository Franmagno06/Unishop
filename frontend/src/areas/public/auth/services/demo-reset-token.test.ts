import { describe, expect, it } from 'vitest'
import { demoResetToken, emailFromDemoToken } from './demo-reset-token'

describe('demo-reset-token', () => {
  it('o token carrega o e-mail (em minúsculas e sem espaços) e volta igual', () => {
    const token = demoResetToken('  Aluno.Teste@edu.unifor.br ')
    expect(token).toBe('demo.aluno.teste%40edu.unifor.br')
    expect(emailFromDemoToken(token)).toBe('aluno.teste@edu.unifor.br')
  })

  it('não é um token do modo de demonstração: devolve null', () => {
    for (const token of ['', 'expirado', 'invalido', 'abc', 'demo.', 'demo.%E0%A4%A']) {
      expect(emailFromDemoToken(token)).toBeNull()
    }
  })
})
