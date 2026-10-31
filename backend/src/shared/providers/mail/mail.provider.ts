export type PasswordResetMail = { to: string; name: string; link: string; expiresInMinutes: number }

// RN-NOT-02: aviso ao vendedor quando o admin exclui o produto.
export type ListingRemovedMail = { to: string; name: string; listingTitle: string }

// Interface do e-mail (api.md §6). Resend/Mailtrap entram na Etapa 10.
export interface MailProvider {
  sendPasswordReset(mail: PasswordResetMail): Promise<void>
  sendListingRemoved(mail: ListingRemovedMail): Promise<void>
}
