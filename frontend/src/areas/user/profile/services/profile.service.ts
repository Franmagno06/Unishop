import { getCurrentUser, updateCurrentUser } from '../../../../shared/lib/current-user'

// Dados de exemplo: ainda não há API. Formato assumido de backend.md §9:
// PATCH /users/me (nome, curso, WhatsApp, foto) e DELETE /users/me. Quando a API existir, só este
// arquivo muda. O e-mail novo nunca vale na hora: pede confirmação por link (RN-PER-02).
const DELAY_MS = 300
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type UpdateProfileInput = {
  name: string
  email: string
  course: string
  whatsapp: string // só dígitos (RN-PER-07)
  avatarUrl: string | null
}

export type UpdateProfileResult = {
  // E-mail aguardando confirmação no novo endereço; null se o e-mail não mudou.
  pendingEmail: string | null
}

export async function updateProfile(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  await wait(DELAY_MS)
  const current = getCurrentUser()
  updateCurrentUser({
    name: input.name,
    course: input.course,
    whatsapp: input.whatsapp,
    avatarUrl: input.avatarUrl,
  })
  return { pendingEmail: input.email !== current.email ? input.email : null }
}

// RN-PER-06: o servidor anonimiza a conta. Se houver pedido Pago ou em Retirada combinada em
// aberto, responde 409 HAS_OPEN_PAID_ORDERS (a regra vale só no backend; aqui sempre dá certo).
export async function deleteAccount(): Promise<void> {
  await wait(DELAY_MS)
}
