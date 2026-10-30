import { getCurrentUser, updateCurrentUser } from '../../../../shared/lib/current-user'
import type { UpdateProfileInput, UpdateProfileResult } from './profile.service'

// Dados de exemplo (modo de demonstração): imita PATCH /users/me e DELETE /users/me, sem API.
const DELAY_MS = 300
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockProfile = {
  async updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
    await wait(DELAY_MS)
    const current = getCurrentUser()
    updateCurrentUser({
      name: input.name,
      course: input.course,
      whatsapp: input.whatsapp,
      avatarUrl: input.avatarUrl,
    })
    return { pendingEmail: input.email !== current.email ? input.email : null }
  },

  async deleteAccount(): Promise<void> {
    await wait(DELAY_MS)
  },
}
