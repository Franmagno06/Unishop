import { createHmac, timingSafeEqual } from 'node:crypto'
import { AppError } from '../../errors/app-error'
import type { VerifiedWebhook, WebhookInput } from './payment.gateway'

const WINDOW_MS = 5 * 60_000 // api.md §5.6: aviso com mais de 5 minutos é possível replay

const header = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const invalid = () => new AppError(401, 'UNAUTHENTICATED', 'Assinatura inválida.')

// Assinatura do webhook do Mercado Pago (api.md §5.6). Ordem fixa: cabeçalhos presentes (senão
// 400) → HMAC SHA-256 do manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` comparado em
// tempo constante → `ts` dentro da janela. O corpo do aviso nunca entra na conta.
export function verifyWebhookSignature(
  args: WebhookInput & { secret: string; now: Date },
): VerifiedWebhook {
  const signature = header(args.headers['x-signature'])
  const requestId = header(args.headers['x-request-id'])
  if (!signature || !requestId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Cabeçalhos do aviso ausentes.')
  }

  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k, v.join('=')]
    }),
  ) as Record<string, string | undefined>
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) throw invalid()

  const rawId = args.query['data.id']
  const dataId = rawId === undefined ? '' : String(rawId)
  // O Mercado Pago assina o id em minúsculas quando ele é alfanumérico.
  const manifest = `${dataId ? `id:${dataId.toLowerCase()};` : ''}request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', args.secret).update(manifest).digest()
  const received = /^[0-9a-f]{64}$/i.test(v1) ? Buffer.from(v1, 'hex') : Buffer.alloc(0)
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw invalid()

  const age = Math.abs(args.now.getTime() - Number(ts))
  if (!Number.isFinite(age) || age > WINDOW_MS) throw invalid()

  const type = String(args.query.type ?? args.query.topic ?? '')
  return { paymentId: type === 'payment' && dataId ? dataId : null }
}
