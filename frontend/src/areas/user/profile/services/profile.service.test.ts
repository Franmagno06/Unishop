import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../../shared/lib/api'
import { resetCurrentUser, setCurrentUser } from '../../../../shared/lib/current-user'

vi.mock('../../../../shared/lib/mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('../../../../shared/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../shared/lib/api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import { updateProfile } from './profile.service'

const apiUser = {
  id: 4, name: 'Ana Souza', email: 'ana@edu.unifor.br', course: null, whatsapp: null, avatarUrl: null,
  role: 'student', pendingEmail: null,
}
const input = {
  name: 'Ana Souza', email: 'ana@edu.unifor.br', course: 'Direito', whatsapp: '85999990000', avatarUrl: null,
}

beforeEach(() => {
  api.mockReset()
  resetCurrentUser()
  setCurrentUser({ name: 'Ana Souza', email: 'ana@edu.unifor.br', course: '', whatsapp: '', avatarUrl: null })
})

describe('updateProfile · RN-PER-02', () => {
  it('o PATCH leva o e-mail atual, nunca o novo (o servidor só troca por link)', async () => {
    api.mockResolvedValue({ data: { user: apiUser } })
    const result = await updateProfile({ ...input, email: 'novo@edu.unifor.br' })
    expect(api).toHaveBeenNthCalledWith(1, '/users/me', {
      method: 'PATCH',
      body: { name: 'Ana Souza', email: 'ana@edu.unifor.br', course: 'Direito', whatsapp: '85999990000' },
    })
    expect(result).toEqual({ pendingEmail: 'novo@edu.unifor.br' })
  })

  it('e-mail alterado: depois do PATCH pede o link com POST /users/me/email-change { email }', async () => {
    api.mockResolvedValue({ data: { user: apiUser } })
    await updateProfile({ ...input, email: '  Novo@EDU.unifor.br ' })
    expect(api).toHaveBeenNthCalledWith(2, '/users/me/email-change', {
      method: 'POST',
      body: { email: 'novo@edu.unifor.br' },
    })
  })

  it('e-mail igual ao atual (mesmo com outras maiúsculas) não pede a troca', async () => {
    api.mockResolvedValue({ data: { user: apiUser } })
    const result = await updateProfile({ ...input, email: 'ANA@edu.unifor.br' })
    expect(api).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ pendingEmail: null })
  })

  it('409 EMAIL_ALREADY_REGISTERED depois do PATCH: o erro diz que os dados foram salvos', async () => {
    api
      .mockResolvedValueOnce({ data: { user: apiUser } })
      .mockRejectedValueOnce(new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.'))
    const error = await updateProfile({ ...input, email: 'outro@edu.unifor.br' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, code: 'EMAIL_ALREADY_REGISTERED' })
    expect((error as ApiError).message).toMatch(/dados foram salvos/i)
    expect((error as ApiError).message).toMatch(/já está cadastrado/)
  })
})
