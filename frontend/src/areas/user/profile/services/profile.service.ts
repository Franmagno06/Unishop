import { api } from '../../../../shared/lib/api'
import {
  fromApi,
  setCurrentUser,
  type ProfileApiUser,
} from '../../../../shared/lib/current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'

// PATCH /users/me (nome, e-mail, curso, WhatsApp) e DELETE /users/me (backend.md §9). Em modo de
// demonstração as chamadas vão para `profile.mock.ts`. O `import.meta.env.DEV` escrito aqui é o que
// deixa o Vite apagar o código de exemplo do build de produção.
export type UpdateProfileInput = {
  name: string
  email: string
  course: string
  whatsapp: string // só dígitos (RN-PER-07)
  avatarUrl: string | null // a foto só é enviada na Etapa 5 (upload); aqui ainda não vai à API
}

export type UpdateProfileResult = {
  // Só o modo de demonstração pede confirmação do e-mail novo; na API real a troca é direta.
  pendingEmail: string | null
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./profile.mock')).mockProfile.updateProfile(input)
  }
  const saved = await api<{ data: { user: ProfileApiUser } }>('/users/me', {
    method: 'PATCH',
    body: {
      name: input.name,
      email: input.email,
      course: input.course,
      whatsapp: input.whatsapp,
    },
  })
  setCurrentUser(fromApi(saved.data.user))
  return { pendingEmail: null }
}

// RN-PER-06: o servidor anonimiza a conta. O pedido leva a confirmação digitada ("EXCLUIR").
export async function deleteAccount(): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./profile.mock')).mockProfile.deleteAccount()
  }
  await api<void>('/users/me', { method: 'DELETE', body: { confirmation: 'EXCLUIR' } })
}
