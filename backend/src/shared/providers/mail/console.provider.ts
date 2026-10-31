import type { MailProvider } from './mail.provider'

// Só desenvolvimento e teste: imprime o link no terminal. Proibido em produção (api.md §6.3).
export const consoleMailProvider: MailProvider = {
  async sendPasswordReset({ to, link }) {
    console.log(`[e-mail:console] redefinição de senha para ${to}: ${link}`)
  },

  // Imprime só o título e o destinatário mascarado (sem nome nem e-mail completo).
  async sendListingRemoved({ to, listingTitle }) {
    const masked = `***@${to.split('@')[1] ?? '***'}`
    console.log(`[e-mail:console] produto removido ("${listingTitle}") para ${masked}`)
  },
}
