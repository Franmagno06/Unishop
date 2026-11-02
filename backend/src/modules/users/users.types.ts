// `null` apaga o valor; chave ausente não mexe no campo.
export type ProfilePatch = {
  name?: string
  course?: string | null
  whatsapp?: string | null
}

export interface ProfileRepository {
  /** Uma transação curta: grava o perfil e, se o WhatsApp mudou, copia para os anúncios ativos (RN-PER-03). */
  updateProfile(id: number, patch: ProfilePatch): Promise<void>
  /** Grava a URL da foto de perfil (RN-PER-05). */
  setPhoto(id: number, url: string): Promise<void>
  /**
   * Confirma a troca de e-mail numa transação só (RN-PER-02): consome o token (uso único, ainda dentro
   * da validade), grava o e-mail novo como verificado e invalida todos os outros links pendentes do usuário.
   * 'invalid' = token já usado, vencido ou de outro usuário; 'taken' = o endereço ganhou outro dono
   * (a transação é desfeita e o token não é consumido).
   */
  confirmEmailChange(
    tokenId: number,
    userId: number,
    newEmail: string,
    at: Date,
  ): Promise<'ok' | 'invalid' | 'taken'>
  /** Exclusão lógica (RN-PER-06): apaga os dados pessoais e marca a conta como excluída. */
  anonymize(id: number): Promise<'ok' | 'blocked' | 'not_found'>
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
