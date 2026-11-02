import { api } from '../../../../shared/lib/api'
import {
  fromApi,
  setCurrentUser,
  type ProfileApiUser,
} from '../../../../shared/lib/current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'
import { ApiError } from '../../../../shared/lib/api'
import { getCurrentUser } from '../../../../shared/lib/current-user'
import { requestEmailChange } from './account.service'

// PATCH /users/me (nome, e-mail, curso, WhatsApp) e DELETE /users/me (backend.md §9). Em modo de
// demonstração as chamadas vão para `profile.mock.ts`. O `import.meta.env.DEV` escrito aqui é o que
// deixa o Vite apagar o código de exemplo do build de produção.
export type UpdateProfileInput = {
  name: string
  email: string
  course: string
  whatsapp: string // só dígitos (RN-PER-07)
  avatarFile: File | null // foto nova (JPG ou PNG, até 4 MB), já conferida pela tela; null = sem mudança
}

export type UpdateProfileResult = {
  // E-mail novo que espera confirmação por link (RN-PER-02); o atual segue valendo até lá.
  pendingEmail: string | null
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./profile.mock')).mockProfile.updateProfile(input)
  }
  // RN-PER-02: o PATCH não troca o e-mail (o servidor recusa um e-mail diferente do atual); a troca
  // vai por link, pedido depois de salvar os outros dados.
  const currentEmail = getCurrentUser().email
  const saved = await api<{ data: { user: ProfileApiUser } }>('/users/me', {
    method: 'PATCH',
    body: {
      name: input.name,
      email: currentEmail,
      course: input.course,
      whatsapp: input.whatsapp,
    },
  })
  setCurrentUser(fromApi(saved.data.user))

  // RN-PER-05: a foto vai em PUT /users/me/avatar (multipart, campo "image"), uma por requisição.
  if (input.avatarFile) {
    try {
      const form = new FormData()
      form.append('image', input.avatarFile)
      const photo = await api<{ data: { user: ProfileApiUser } }>('/users/me/avatar', {
        method: 'PUT',
        body: form,
      })
      setCurrentUser(fromApi(photo.data.user))
    } catch (error) {
      throw savedButFailed(error, 'a foto não foi enviada')
    }
  }

  const newEmail = input.email.trim().toLowerCase()
  if (newEmail === currentEmail.toLowerCase()) return { pendingEmail: null }
  try {
    await requestEmailChange(newEmail)
  } catch (error) {
    throw savedButFailed(error, 'o e-mail não foi trocado')
  }
  return { pendingEmail: newEmail }
}

// O PATCH já gravou nome, curso e WhatsApp: o erro de um passo seguinte diz isso, para o aluno não
// achar que perdeu o que digitou.
function savedButFailed(error: unknown, what: string): unknown {
  if (!(error instanceof ApiError)) return error
  return new ApiError(
    error.status,
    error.code,
    'Seus dados foram salvos, mas ' + what + ': ' + error.message,
    error.fieldErrors,
    error.retryAfter,
  )
}

// RN-PER-06: o servidor anonimiza a conta. O pedido leva a confirmação digitada ("EXCLUIR").
export async function deleteAccount(): Promise<void> {
  if (import.meta.env.DEV && MOCK_MODE) {
    return (await import('./profile.mock')).mockProfile.deleteAccount()
  }
  await api<void>('/users/me', { method: 'DELETE', body: { confirmation: 'EXCLUIR' } })
}
