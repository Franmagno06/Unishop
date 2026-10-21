import { api } from '../../../../shared/lib/api'
import type { LoginValues, RegisterValues } from '../schemas/auth.schemas'
import type { LoginResponse, RegisterResponse } from '../types/auth.types'
import { MOCK_MODE } from './mock-mode'

// Os campos do login seguem o exemplo do backend.md §9. Os do cadastro ainda não estão em
// nenhum contrato (o openapi.yaml não existe): conferir com o Pedro quando ele sair.
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
