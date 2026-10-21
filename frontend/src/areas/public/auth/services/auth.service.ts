import { api } from '../../../../shared/lib/api'
import type {
  ForgotPasswordValues,
  LoginValues,
  RegisterValues,
  ResetPasswordValues,
} from '../schemas/auth.schemas'
import type { LoginResponse, RegisterResponse } from '../types/auth.types'
import { MOCK_MODE } from './mock-mode'

// Os campos do login seguem o exemplo do backend.md §9. Os do cadastro e da recuperação de senha
// ainda não estão em nenhum contrato (o openapi.yaml não existe): conferir com o Pedro quando ele sair.
// Em modo de demonstração (MOCK_MODE) as chamadas vão para a API simulada. O `import.meta.env.DEV`
// escrito aqui (e não só dentro de MOCK_MODE) é o que deixa o Vite apagar o código de exemplo do
// build de produção: constante vinda de outro módulo não é eliminada.
export async function login(values: LoginValues): Promise<LoginResponse> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./auth.mock')).mockAuth.login(values)
  return api<LoginResponse>('/auth/login', { method: 'POST', body: values })
}

export async function register(values: RegisterValues): Promise<RegisterResponse> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./auth.mock')).mockAuth.register(values)
  return api<RegisterResponse>('/auth/register', { method: 'POST', body: values })
}

// POST /auth/forgot-password: responde 202 igual exista ou não a conta (backend.md §9, RN-ACE-10).
export async function forgotPassword(values: ForgotPasswordValues): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./auth.mock')).mockAuth.forgotPassword(values)
  return api<void>('/auth/forgot-password', { method: 'POST', body: values })
}

// POST /auth/reset-password: 200, ou 400 TOKEN_EXPIRED / TOKEN_INVALID.
export type ResetPasswordRequest = ResetPasswordValues & { token: string }

export async function resetPassword(values: ResetPasswordRequest): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) return (await import('./auth.mock')).mockAuth.resetPassword(values)
  return api<void>('/auth/reset-password', { method: 'POST', body: values })
}
