import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('../../../../shared/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/lib/api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import { loginWithGoogle } from './auth.service'

beforeEach(() => api.mockReset())

describe('loginWithGoogle · RN-ACE-14', () => {
  it('envia o ID token em POST /auth/google e devolve token, usuário e aceite pendente', async () => {
    const response = {
      data: { token: 'jwt', user: { id: 4, name: 'Ana', role: 'student' }, needsTermsAcceptance: true },
    }
    api.mockResolvedValue(response)
    expect(await loginWithGoogle('id-token-do-google')).toEqual(response)
    expect(api).toHaveBeenCalledWith('/auth/google', { method: 'POST', body: { idToken: 'id-token-do-google' } })
  })
})
