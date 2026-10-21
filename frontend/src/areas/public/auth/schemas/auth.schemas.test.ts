import { describe, expect, it } from 'vitest'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.schemas'

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

describe('forgotPasswordSchema', () => {
  it('aceita um e-mail válido, também de fora do domínio (qualquer conta pode recuperar)', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'ana@edu.unifor.br' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: 'admin@unishop.local' }).success).toBe(true)
  })

  it('apara espaços ao redor do e-mail', () => {
    const result = forgotPasswordSchema.safeParse({ email: '  ana@edu.unifor.br ' })
    expect(result.success && result.data.email).toBe('ana@edu.unifor.br')
  })

  it('recusa vazio e formato inválido', () => {
    expect(messages(forgotPasswordSchema.safeParse({ email: '' }))).toContain('Informe seu e-mail.')
    expect(messages(forgotPasswordSchema.safeParse({ email: 'ana@' }))).toContain('Informe um e-mail válido.')
  })
})

describe('resetPasswordSchema (RN-ACE-04, RN-ACE-10)', () => {
  const ok = { password: 'Senha1234', passwordConfirmation: 'Senha1234' }

  it('aceita uma senha forte com a confirmação igual', () => {
    expect(resetPasswordSchema.safeParse(ok).success).toBe(true)
  })

  it.each([
    ['curta', 'Ab1', 'A senha precisa ter ao menos 8 caracteres.'],
    ['sem maiúscula', 'senha1234', 'Inclua ao menos uma letra maiúscula.'],
    ['sem número', 'SenhaSenha', 'Inclua ao menos um número.'],
  ])('recusa senha %s', (_label, password, message) => {
    expect(messages(resetPasswordSchema.safeParse({ password, passwordConfirmation: password }))).toContain(message)
  })

  it('recusa confirmação diferente e confirmação vazia', () => {
    expect(messages(resetPasswordSchema.safeParse({ ...ok, passwordConfirmation: 'Outra1234' }))).toContain('As senhas não são iguais.')
    expect(messages(resetPasswordSchema.safeParse({ ...ok, passwordConfirmation: '' }))).toContain('Confirme a senha.')
  })
})
