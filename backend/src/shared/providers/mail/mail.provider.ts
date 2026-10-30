export type PasswordResetMail = { to: string; name: string; link: string; expiresInMinutes: number }

// Interface do e-mail (api.md §6). Resend/Mailtrap entram na Etapa 10.
export interface MailProvider {
  sendPasswordReset(mail: PasswordResetMail): Promise<void>
}
