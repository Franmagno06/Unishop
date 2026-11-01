import type { MailProvider } from './mail.provider'

// Só desenvolvimento e teste: imprime o e-mail no terminal. Proibido em produção (api.md §6.3).
export const consoleMailProvider: MailProvider = {
  async sendPasswordReset({ to, link }) {
    console.log(`[e-mail:console] redefinição de senha para ${to}: ${link}`)
  },

  // Imprime só o título e o destinatário mascarado (sem nome nem e-mail completo).
  async sendListingRemoved({ to, listingTitle }) {
    const masked = `***@${to.split('@')[1] ?? '***'}`
    console.log(`[e-mail:console] produto removido ("${listingTitle}") para ${masked}`)
  },
  async sendSaleConfirmed({ to, orderNumber, productName }) {
    console.log(`[e-mail:console] venda ${orderNumber} (${productName}) confirmada para ${to}`)
  },
  async sendOrderRefunded({ to, orderNumber, reason }) {
    console.log(
      `[e-mail:console] pedido ${orderNumber} cancelado e estornado (${reason}) para ${to}`,
    )
  },
}
