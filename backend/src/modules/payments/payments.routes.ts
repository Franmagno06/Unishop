import { Router, type RequestHandler } from 'express'
import { z } from 'zod'
import { authorizeRole, type Authenticate } from '../../shared/middlewares/authenticate'
import { validateBody } from '../../shared/middlewares/validate'
import type { MockPaymentGateway } from '../../shared/providers/payment/mock.provider'
import { AppError } from '../../shared/errors/app-error'
import type { PaymentsService } from './payments.service'

const orderId = z.number().int().positive()

// O backend só recebe o TOKEN do cartão, gerado no navegador pelo SDK do gateway (RN-PAG-02).
// Número, validade e CVV nunca chegam aqui: campos extras são recusados.
const cardBodySchema = z
  .object({
    orderId,
    token: z.string().trim().min(1).max(200),
    paymentMethodId: z.string().trim().min(1).max(30),
    issuerId: z.string().trim().max(20).optional(),
    installments: z.number().int().min(1).max(12).default(1),
  })
  .strict()

const pixBodySchema = z.object({ orderId })

type Options = {
  /** Limite próprio e folgado do webhook (300/min/IP, backend.md §6). */
  webhookLimiter: RequestHandler
  /** Limite por usuário logado (30 por minuto, backend.md §6). Vai depois do `authenticate`. */
  userLimiter?: RequestHandler
  /** Só com o gateway falso em desenvolvimento ou teste: simula o aviso de pagamento aprovado. */
  devSimulator?: MockPaymentGateway
}

export function createPaymentsRoutes(
  service: PaymentsService,
  authenticate: Authenticate,
  { webhookLimiter, userLimiter, devSimulator }: Options,
) {
  const router = Router()
  const student = [authenticate(), authorizeRole('student'), ...(userLimiter ? [userLimiter] : [])]

  router.post('/card', ...student, validateBody(cardBodySchema), async (req, res) => {
    res.json({ data: await service.payWithCard(req.user!.id, req.body) }) // RN-PAG-02, 07
  })

  router.post('/pix', ...student, validateBody(pixBodySchema), async (req, res) => {
    res.status(201).json({ data: await service.createPix(req.user!.id, req.body.orderId) }) // RN-PAG-04
  })

  // Sem JWT: quem prova que é o gateway é a assinatura (RN-PAG-05). Resposta de erro sem detalhe.
  router.post('/webhook', webhookLimiter, async (req, res) => {
    const body = (req.body ?? {}) as { type?: string; data?: { id?: string | number } }
    const query: Record<string, unknown> = { ...req.query }
    if (query['data.id'] === undefined && body.data?.id !== undefined)
      query['data.id'] = body.data.id
    if (query.type === undefined && query.topic === undefined && body.type) query.type = body.type
    await service.handleWebhook({ headers: req.headers, query })
    res.status(200).json({ received: true })
  })

  if (devSimulator) {
    // SÓ DESENVOLVIMENTO: no lugar de pagar o Pix de verdade, aprova a cobrança falsa do pedido e
    // processa como se o webhook tivesse chegado. Nunca é registrada com o gateway real.
    router.post('/dev/orders/:id/approve', ...student, async (req, res) => {
      const id = Number(req.params.id)
      const gatewayId = Number.isInteger(id) ? await service.pendingGatewayId(id) : null
      if (!gatewayId) throw new AppError(404, 'NOT_FOUND', 'Não há cobrança pendente neste pedido.')
      devSimulator.setStatus(gatewayId, 'approved')
      await service.syncFromGateway(gatewayId)
      res.json({ data: { ok: true } })
    })
  }
  return router
}
