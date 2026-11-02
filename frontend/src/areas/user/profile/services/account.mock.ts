import type { AccountState } from './account.service'

// Dados de exemplo (modo de demonstração, VITE_USE_MOCKS=true). O caminho real fica em account.service.ts.
const DELAY_MS = 250
const wait = (ms = DELAY_MS) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const mockAccount = {
  async completeProfile(): Promise<AccountState> {
    await wait()
    return { user: null, needsTermsAcceptance: false }
  },
}
