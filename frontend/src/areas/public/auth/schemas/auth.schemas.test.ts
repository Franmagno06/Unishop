import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './auth.schemas'

const validRegister = {
  name: 'Ana Souza',
  email: 'ana@edu.unifor.br',
  password: 'Senha1234',
  passwordConfirmation: 'Senha1234',
  acceptTerms: true,
}

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe('registerSchema (RN-ACE-01 a 06)', () => {
  it('aceita um cadastro válido', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true)
  })

  it('recusa e-mail fora de @edu.unifor.br (RN-ACE-02)', () => {
    const result = registerSchema.safeParse({ ...validRegister, email: 'ana@gmail.com' })
    expect(messages(result)).toContain('Use seu e-mail institucional @edu.unifor.br.')
  })

  it('aceita o domínio em maiúsculas', () => {
    expect(
      registerSchema.safeParse({ ...validRegister, email: 'Ana@EDU.UNIFOR.BR' }).success,
    ).toBe(true)
  })

  it.each([
    ['curta', 'Ab1'],
    ['sem maiúscula', 'senha1234'],
    ['sem número', 'SenhaSenha'],
  ])('recusa senha %s (RN-ACE-04)', (_label, password) => {
    const result = registerSchema.safeParse({
      ...validRegister,
      password,
      passwordConfirmation: password,
    })
    expect(result.success).toBe(false)
  })

  it('recusa senha acima de 72 caracteres', () => {
    const password = 'A1' + 'a'.repeat(71)
    expect(
      registerSchema.safeParse({ ...validRegister, password, passwordConfirmation: password })
        .success,
    ).toBe(false)
  })

  it('recusa confirmação diferente da senha', () => {
    const result = registerSchema.safeParse({ ...validRegister, passwordConfirmation: 'Outra1234' })
    expect(messages(result)).toContain('As senhas não são iguais.')
  })

  it('exige o aceite dos Termos (RN-ACE-06)', () => {
    const result = registerSchema.safeParse({ ...validRegister, acceptTerms: false })
    expect(messages(result)).toContain('Aceite os Termos e a Política para continuar.')
  })

  it('recusa nome com menos de 3 caracteres', () => {
    expect(registerSchema.safeParse({ ...validRegister, name: 'An' }).success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('aceita e-mail fora do domínio (conta admin do seed)', () => {
    expect(loginSchema.safeParse({ email: 'admin@unishop.local', password: 'x' }).success).toBe(
      true,
    )
  })

  it('exige e-mail válido e senha', () => {
    expect(loginSchema.safeParse({ email: 'não-é-email', password: '' }).success).toBe(false)
  })
})
