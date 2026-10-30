// `null` apaga o valor; chave ausente não mexe no campo.
export type ProfilePatch = {
  name?: string
  email?: string
  course?: string | null
  whatsapp?: string | null
}

export interface ProfileRepository {
  /** Uma transação curta: grava o perfil e, se o WhatsApp mudou, copia para os anúncios ativos (RN-PER-03). */
  updateProfile(id: number, patch: ProfilePatch): Promise<void>
  /** Exclusão lógica (RN-PER-06): apaga os dados pessoais e marca a conta como excluída. */
  anonymize(id: number): Promise<void>
}

export type MyProfile = {
  id: number
  name: string
  email: string
  course: string | null
  whatsapp: string | null
  avatarUrl: string | null
  role: 'student' | 'admin'
}
