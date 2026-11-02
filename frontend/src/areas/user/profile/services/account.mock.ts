import type { ProfileApiUser } from '../../../../shared/lib/current-user'
import type { AccountState } from './account.service'

// Dados de exemplo (modo de demonstração, VITE_USE_MOCKS=true). O caminho real fica em account.service.ts.
const DELAY_MS = 250
const wait = (ms = DELAY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const mockAccount = {
  async requestEmailChange(): Promise<void> {
    await wait()
  },

  async confirmEmailChange(): Promise<ProfileApiUser> {
    await wait()
    return {
      id: 1,
      name: 'Aluno Teste',
      email: 'novo.email@edu.unifor.br',
      course: null,
      whatsapp: null,
      avatarUrl: null,
      role: 'student',
      pendingEmail: null,
    }
  },

  async completeProfile(): Promise<AccountState> {
    await wait()
    return { user: null, needsTermsAcceptance: false }
  },
}
