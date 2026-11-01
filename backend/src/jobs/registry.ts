import type { PrismaClient } from '../generated/prisma/client'
import type { PaymentsService } from '../modules/payments/payments.service'
import type { OrderRepository } from '../modules/orders/orders.types'
import type { OrdersService } from '../modules/orders/orders.service'

// Jobs agendados (backend.md §14). Cada job é uma função idempotente: rodar duas vezes dá o mesmo
// resultado. Em produção são chamados por endpoint (`/api/v1/internal/jobs/:name`); em
// desenvolvimento, pelo node-cron do `dev-server.ts`. Este arquivo NÃO importa node-cron.
export type JobResult = Record<string, number>
export type Job = () => Promise<JobResult>
export type JobRegistry = Record<string, Job>

type Deps = {
  db: PrismaClient
  orders: OrderRepository
  ordersService: OrdersService
  paymentsService: PaymentsService
  expirationMinutes: number
  now?: () => Date
}

export function createJobRegistry({
  db,
  orders,
  ordersService,
  paymentsService,
  expirationMinutes,
  now = () => new Date(),
}: Deps): JobRegistry {
  return {
    // RN-PAG-04, 12: Pendente com 30 minutos sem pagamento aprovado é cancelado (Pix vencido ou cartão
    // abandonado) e a cobrança em aberto é cancelada no gateway.
    async 'expire-pix-payments'() {
      const cutoff = new Date(now().getTime() - expirationMinutes * 60_000)
      const ids = await orders.findExpiredIds(cutoff)
      let expired = 0
      for (const id of ids) {
        const order = await orders.findById(id)
        if (!order) continue
        const after = await ordersService.expireIfDue(order)
        if (after.status === 'cancelled') expired++
      }
      return { expired }
    },

    // RN-PAG-05, 13: corrige webhook perdido e refaz estornos que falharam (até 10 tentativas).
    async 'reconcile-pending-payments'() {
      return paymentsService.reconcilePending()
    },

    // RN-ACE-10: apaga links de senha e e-mail vencidos.
    async 'cleanup-expired-tokens'() {
      const res = await db.userToken.deleteMany({ where: { expiresAt: { lt: now() } } })
      return { deleted: res.count }
    },
  }
}
