import { Router, type Request, type Response } from 'express'
import type { z } from 'zod'
import { authorizeRole, type Authenticate } from '../../shared/middlewares/authenticate'
import { validateBody, validateQuery } from '../../shared/middlewares/validate'
import { newOrderBodySchema, orderIdParamSchema, receivedQuerySchema } from './orders.schemas'
import type { OrdersService } from './orders.service'

type Action = 'arrangePickup' | 'confirmReceipt' | 'complete' | 'cancel'

// Rotas de pedidos (backend.md §9.5). Só aluno: o admin não compra nem vende (RN §3).
// As rotas fixas (`/mine`, `/received`, `/contact`) vêm antes de `/:id`.
export function createOrdersRoutes(service: OrdersService, authenticate: Authenticate) {
  const router = Router()
  router.use(authenticate(), authorizeRole('student'))

  const action = (name: Action) => async (req: Request, res: Response) => {
    const { id } = orderIdParamSchema.parse(req.params)
    res.json({ data: await service[name](req.user!.id, id) })
  }

  router.post('/', validateBody(newOrderBodySchema), async (req, res) => {
    const { created, data } = await service.create(req.user!.id, req.body)
    res.status(created ? 201 : 200).json({ data })
  }) // RN-PED-01, 02, 10
  router.post('/contact', validateBody(newOrderBodySchema), async (req, res) => {
    const { created, data } = await service.contact(req.user!.id, req.body)
    res.status(created ? 201 : 200).json({ data })
  }) // RN-PED-05
  router.get('/mine', async (req, res) => {
    res.json({ data: await service.mine(req.user!.id) })
  }) // RN-PED-06
  router.get('/received', validateQuery(receivedQuerySchema), async (req, res) => {
    const { listingId } = req.validatedQuery as z.output<typeof receivedQuerySchema>
    res.json({ data: await service.received(req.user!.id, listingId) })
  }) // RN-PED-07
  router.get('/:id', async (req, res) => {
    const { id } = orderIdParamSchema.parse(req.params)
    res.json({ data: await service.get(req.user!.id, id) })
  }) // RN-PAG-11
  router.post('/:id/arrange-pickup', action('arrangePickup')) // RN-PED-08
  router.post('/:id/confirm-receipt', action('confirmReceipt')) // RN-PED-08
  router.post('/:id/complete', action('complete')) // RN-EST-03, 06
  router.post('/:id/cancel', action('cancel')) // RN-PED-12
  return router
}
