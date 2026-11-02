import type { env } from '../../config/env'
import { consoleMailProvider } from './mail/console.provider'
import type { MailProvider } from './mail/mail.provider'
import { createGoogleProvider } from './oauth/google.provider'
import type { OAuthProvider } from './oauth/oauth.provider'
import { buildPaymentGateway } from './payment'
import type { PaymentGateway } from './payment/payment.gateway'
import { createLocalStorageProvider } from './storage/local.provider'
import type { StorageProvider } from './storage/storage.provider'

type ProvidersEnv = Pick<
  typeof env,
  | 'APP_ENV'
  | 'PORT'
  | 'MAIL_DRIVER'
  | 'STORAGE_DRIVER'
  | 'GOOGLE_CLIENT_ID'
  | 'API_PUBLIC_URL'
  | 'PAYMENT_DRIVER'
  | 'PAYMENT_MODE'
  | 'MP_ACCESS_TOKEN'
  | 'MP_WEBHOOK_SECRET'
>

export type Providers = {
  mail: MailProvider
  storage: StorageProvider
  oauth: OAuthProvider
  gateway: PaymentGateway
}

// Ponto único que escolhe cada driver pela variável e aplica as travas por APP_ENV (api.md §6.3, §6.4).
// Console e disco local só em desenvolvimento e teste; os drivers reais de e-mail e de imagem entram
// na etapa de deploy (D7, D8), por isso aqui qualquer outro valor falha com o nome da variável.
export function buildProviders(e: ProvidersEnv, opts: { uploadsDir: string }): Providers {
  const local = e.APP_ENV === 'development' || e.APP_ENV === 'test'

  if (e.MAIL_DRIVER !== 'console' || !local) {
    throw new Error(`MAIL_DRIVER "${e.MAIL_DRIVER}" sem provider em APP_ENV "${e.APP_ENV}".`)
  }
  if (e.STORAGE_DRIVER !== 'local' || !local) {
    throw new Error(`STORAGE_DRIVER "${e.STORAGE_DRIVER}" sem provider em APP_ENV "${e.APP_ENV}".`)
  }
  const apiUrl = e.API_PUBLIC_URL ?? `http://localhost:${e.PORT}`

  return {
    mail: consoleMailProvider,
    storage: createLocalStorageProvider({ dir: opts.uploadsDir, baseUrl: `${apiUrl}/uploads` }),
    oauth: createGoogleProvider(e.GOOGLE_CLIENT_ID),
    gateway: buildPaymentGateway(e),
  }
}
