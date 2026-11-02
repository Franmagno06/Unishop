import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from './session'

vi.mock('./mock-mode', () => ({ MOCK_MODE: false }))
const api = vi.fn()
vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  api: (...args: unknown[]) => api(...args),
}))

import { getCurrentUser, loadCurrentUser, resetCurrentUser, setCurrentUser } from './current-user'

const apiUser = (email: string) => ({
  id: 1, name: 'Ana', email, course: null, whatsapp: null, avatarUrl: null, role: 'student', pendingEmail: null,
})
const user = (email: string) => ({ name: 'Ana', email, course: '', whatsapp: '', avatarUrl: null })

beforeEach(() => {
  api.mockReset()
  clearToken()
  setToken('jwt', 'student')
  resetCurrentUser()
})

describe('current-user · resposta antiga não sobrescreve gravação mais nova (RN-PER-02)', () => {
  it('um GET /users/me que chega depois de setCurrentUser é descartado', async () => {
    let release: (value: unknown) => void = () => {}
    api.mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
    const loading = loadCurrentUser()
    setCurrentUser(user('novo@edu.unifor.br')) // ex.: e-mail confirmado pelo link, enquanto o GET voava
    release({ data: { user: apiUser('antigo@edu.unifor.br') } })
    await loading
    expect(getCurrentUser().email).toBe('novo@edu.unifor.br')
  })

  it('sem gravação no meio, o GET /users/me preenche o usuário normalmente', async () => {
    api.mockResolvedValueOnce({ data: { user: apiUser('ana@edu.unifor.br') } })
    await loadCurrentUser()
    expect(getCurrentUser().email).toBe('ana@edu.unifor.br')
  })
})
