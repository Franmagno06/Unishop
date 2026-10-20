import { api } from '../../../../shared/lib/api'
import type { LoginValues, RegisterValues } from '../schemas/auth.schemas'

export type AuthUser = { id: number; name: string; role: 'student' | 'admin' }
export type LoginResponse = { data: { token: string; user: AuthUser } }

// Os campos do login seguem o exemplo do backend.md §9. Os do cadastro ainda não estão em
// nenhum contrato (o openapi.yaml não existe): conferir com o Pedro quando ele sair.
export function login(values: LoginValues): Promise<LoginResponse> {
  return api<LoginResponse>('/auth/login', { method: 'POST', body: values })
}

export function register(values: RegisterValues): Promise<{ data: { user: AuthUser } }> {
  return api('/auth/register', { method: 'POST', body: values })
}
