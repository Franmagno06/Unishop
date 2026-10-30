import type { MailProvider } from './mail.provider'

// Só desenvolvimento e teste: imprime o link no terminal. Proibido em produção (api.md §6.3).
export const consoleMailProvider: MailProvider = {
  async sendPasswordReset({ to, link }) {
    console.log(`[e-mail:console] redefinição de senha para ${to}: ${link}`)
  },
}
