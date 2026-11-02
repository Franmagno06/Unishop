import { z } from 'zod'

// Requisitos da senha (RN-ACE-04), usados pelo cadastro, pela redefinição e pela troca de senha logado
// (RN-ACE-15). Os testes conferem que a lista e o esquema Zod concordam.
export const PASSWORD_RULES = [
  { id: 'length', label: '8 a 72 caracteres', test: (value: string) => value.length >= 8 && value.length <= 72 },
  { id: 'number', label: 'Pelo menos 1 número', test: (value: string) => /\d/.test(value) },
  { id: 'uppercase', label: 'Pelo menos 1 letra maiúscula', test: (value: string) => /[A-Z]/.test(value) },
] as const

// Senha nova: cadastro, redefinição e troca seguem a mesma regra (RN-ACE-04, 10, 15).
export const newPasswordSchema = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')
  .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula.')
  .regex(/\d/, 'Inclua ao menos um número.')
