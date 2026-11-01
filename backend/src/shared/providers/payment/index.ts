import { env } from '../../../config/env'
import { createMercadoPagoProvider } from './mercadopago.provider'
import { createMockPaymentGateway, MOCK_WEBHOOK_SECRET } from './mock.provider'
import type { PaymentGateway } from './payment.gateway'

type PaymentEnv = Pick<
  typeof env,
  | 'APP_ENV'
  | 'PAYMENT_DRIVER'
  | 'PAYMENT_MODE'
  | 'MP_ACCESS_TOKEN'
  | 'MP_WEBHOOK_SECRET'
  | 'API_PUBLIC_URL'
>

// Escolhe o gateway pela variável PAYMENT_DRIVER e aplica as travas de produção (api.md §6.3).
// A trava usa APP_ENV, não NODE_ENV: na Vercel o NODE_ENV é "production" também no Preview.
export function buildPaymentGateway(e: PaymentEnv = env): PaymentGateway {
  if (e.PAYMENT_MODE === 'production' && e.APP_ENV !== 'production') {
    throw new Error('PAYMENT_MODE=production só é permitido com APP_ENV=production.')
  }
  if (e.PAYMENT_DRIVER === 'mock') {
    if (e.APP_ENV === 'production') {
      throw new Error('PAYMENT_DRIVER=mock é proibido em APP_ENV=production.')
    }
    return createMockPaymentGateway(e.MP_WEBHOOK_SECRET ?? MOCK_WEBHOOK_SECRET)
  }
  if (!e.MP_ACCESS_TOKEN || !e.MP_WEBHOOK_SECRET) {
    throw new Error('PAYMENT_DRIVER=mercadopago exige MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET.')
  }
  return createMercadoPagoProvider({
    accessToken: e.MP_ACCESS_TOKEN,
    webhookSecret: e.MP_WEBHOOK_SECRET,
    notificationUrl: e.API_PUBLIC_URL
      ? `${e.API_PUBLIC_URL.replace(/\/$/, '')}/api/v1/payments/webhook`
      : undefined,
  })
}
