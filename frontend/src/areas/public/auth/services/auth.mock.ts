import { ApiError } from '../../../../shared/lib/api'
import type { LoginValues, RegisterValues } from '../schemas/auth.schemas'
import type { LoginResponse, RegisterResponse } from '../types/auth.types'
import { TEST_ACCOUNTS } from './test-accounts'

type MockOptions = {
  latencyMs?: number
  maxAttempts?: number
  lockMs?: number
  now?: () => number
}

const normalize = (email: string) => email.trim().toLowerCase()

// Imita as respostas do backend.md §9 (login e cadastro), inclusive o bloqueio de RN-ACE-09:
// 5 senhas erradas seguidas bloqueiam a conta por 15 minutos; a tentativa seguinte já recebe 429.
export function createMockAuth({
  latencyMs = 400,
  maxAttempts = 5,
  lockMs = 15 * 60_000,
  now = Date.now,
}: MockOptions = {}) {
  const attempts = new Map<string, { count: number; lockedUntil: number }>()
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs))

  async function login({ email, password }: LoginValues): Promise<LoginResponse> {
    await wait()
    const key = normalize(email)

    if (key === TEST_ACCOUNTS.suspendedEmail) {
      throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'Conta suspensa.')
    }

    let state = attempts.get(key) ?? { count: 0, lockedUntil: 0 }
    // Bloqueio vencido: a contagem de erros recomeça do zero.
    if (state.lockedUntil !== 0 && state.lockedUntil <= now()) state = { count: 0, lockedUntil: 0 }
    if (state.lockedUntil > now()) {
      const retryAfter = Math.ceil((state.lockedUntil - now()) / 1000)
      throw new ApiError(429, 'ACCOUNT_LOCKED', 'Conta bloqueada.', [], retryAfter)
    }

    const account = [TEST_ACCOUNTS.student, TEST_ACCOUNTS.admin].find(
      (candidate) => candidate.email === key && candidate.password === password,
    )
    if (!account) {
      state.count += 1
      if (state.count >= maxAttempts) state.lockedUntil = now() + lockMs
      attempts.set(key, state)
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.')
    }

    attempts.delete(key)
    const isAdmin = account.email === TEST_ACCOUNTS.admin.email
    return {
      data: {
        token: `mock-token-${isAdmin ? 'admin' : 'student'}`,
        user: { id: isAdmin ? 2 : 1, name: account.name, role: isAdmin ? 'admin' : 'student' },
      },
    }
  }

  async function register(values: RegisterValues): Promise<RegisterResponse> {
    await wait()
    const key = normalize(values.email)

    if (!key.endsWith('@edu.unifor.br')) {
      throw new ApiError(403, 'EMAIL_DOMAIN_NOT_ALLOWED', 'Domínio não permitido.')
    }
    if (key === TEST_ACCOUNTS.student.email) {
      throw new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'E-mail já cadastrado.')
    }
    return { data: { user: { id: 100, name: values.name.trim(), role: 'student' } } }
  }

  return { login, register }
}

export const mockAuth = createMockAuth()
