import { AppError } from '../../errors/app-error'
import type { MailProvider } from './mail.provider'
import {
  emailChange,
  listingRemoved,
  orderRefunded,
  passwordReset,
  saleConfirmed,
  type RenderedMail,
} from './templates'

export type SmtpTransport = {
  sendMail(message: {
    from: string
    to: string
    subject: string
    html: string
    text: string
  }): Promise<unknown>
}

// Envio por SMTP (Gmail com senha de app). O erro do servidor nunca vai ao cliente: pode citar usuário ou senha.
export function createSmtpMailProvider(config: {
  transport: SmtpTransport
  from: string
}): MailProvider {
  async function send(to: string, rendered: RenderedMail) {
    try {
      await config.transport.sendMail({ from: config.from, to, ...rendered })
    } catch {
      throw new AppError(502, 'EXTERNAL_SERVICE_ERROR', 'Serviço de e-mail indisponível.')
    }
  }

  return {
    sendPasswordReset: (m) => send(m.to, passwordReset(m)),
    sendListingRemoved: (m) => send(m.to, listingRemoved(m)),
    sendSaleConfirmed: (m) => send(m.to, saleConfirmed(m)),
    sendOrderRefunded: (m) => send(m.to, orderRefunded(m)),
    sendEmailChange: (m) => send(m.to, emailChange(m)),
  }
}
