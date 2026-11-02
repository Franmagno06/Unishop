import nodemailer from 'nodemailer'
import type { env } from '../../config/env'
import { consoleMailProvider } from './mail/console.provider'
import type { MailProvider } from './mail/mail.provider'
import { createSmtpMailProvider } from './mail/smtp.provider'
import {
  createCloudinaryClient,
  createCloudinaryStorageProvider,
} from './storage/cloudinary.provider'
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
> &
  Partial<
    Pick<
      typeof env,
      | 'SMTP_HOST'
      | 'SMTP_PORT'
      | 'SMTP_USER'
      | 'SMTP_PASS'
      | 'MAIL_FROM'
      | 'ALLOW_CONSOLE_MAIL'
      | 'CLOUDINARY_URL'
      | 'CLOUDINARY_UPLOAD_FOLDER'
    >
  >

export type Providers = {
  mail: MailProvider
  storage: StorageProvider
  oauth: OAuthProvider
  gateway: PaymentGateway
}

function buildMail(e: ProvidersEnv, local: boolean): MailProvider {
  if (e.MAIL_DRIVER === 'console' && (local || e.ALLOW_CONSOLE_MAIL)) return consoleMailProvider
  if (e.MAIL_DRIVER === 'smtp' && e.SMTP_USER && e.SMTP_PASS) {
    const transport = nodemailer.createTransport({
      host: e.SMTP_HOST ?? 'smtp.gmail.com',
      port: e.SMTP_PORT ?? 465,
      secure: (e.SMTP_PORT ?? 465) === 465,
      auth: { user: e.SMTP_USER, pass: e.SMTP_PASS },
      connectionTimeout: 10_000,
      socketTimeout: 10_000,
    })
    return createSmtpMailProvider({ transport, from: e.MAIL_FROM ?? `Unishop <${e.SMTP_USER}>` })
  }
  throw new Error(`MAIL_DRIVER "${e.MAIL_DRIVER}" sem provider em APP_ENV "${e.APP_ENV}".`)
}

function buildStorage(e: ProvidersEnv, local: boolean, uploadsDir: string): StorageProvider {
  if (e.STORAGE_DRIVER === 'local' && local) {
    const apiUrl = e.API_PUBLIC_URL ?? `http://localhost:${e.PORT}`
    return createLocalStorageProvider({ dir: uploadsDir, baseUrl: `${apiUrl}/uploads` })
  }
  if (e.STORAGE_DRIVER === 'cloudinary' && e.CLOUDINARY_URL) {
    return createCloudinaryStorageProvider({
      rootFolder: e.CLOUDINARY_UPLOAD_FOLDER ?? 'unishop-dev',
      client: createCloudinaryClient(e.CLOUDINARY_URL),
    })
  }
  throw new Error(`STORAGE_DRIVER "${e.STORAGE_DRIVER}" sem provider em APP_ENV "${e.APP_ENV}".`)
}

// Ponto único que escolhe cada driver pela variável e aplica as travas por APP_ENV (api.md §6.3, §6.4).
// Console e disco local só em desenvolvimento e teste; em produção valem SMTP (Gmail) e Cloudinary.
// Qualquer outro valor falha citando o nome da variável.
export function buildProviders(e: ProvidersEnv, opts: { uploadsDir: string }): Providers {
  const local = e.APP_ENV === 'development' || e.APP_ENV === 'test'

  return {
    mail: buildMail(e, local),
    storage: buildStorage(e, local, opts.uploadsDir),
    oauth: createGoogleProvider(e.GOOGLE_CLIENT_ID),
    gateway: buildPaymentGateway(e),
  }
}
