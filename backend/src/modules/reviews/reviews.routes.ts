import { Router } from 'express'
import { authorizeRole, type Authenticate } from '../../shared/middlewares/authenticate'
import { validateBody } from '../../shared/middlewares/validate'
import { idParamSchema, reviewBodySchema } from './reviews.schemas'
import type { ReviewsService } from './reviews.service'

// Duas fatias de rota, montadas em /orders e em /listings (backend.md §9). A de pedidos vai ANTES do
// roteador de pedidos, que exige aluno em tudo; aqui cada rota declara a própria proteção.
export function createReviewsRoutes(service: ReviewsService, authenticate: Authenticate) {
  const forOrders = Router()
  // RN-AVA-01 a 04: só aluno (admin não avalia), comprador de pedido concluído.
  forOrders.post(
    '/:id/review',
    authenticate(),
    authorizeRole('student'),
    validateBody(reviewBodySchema),
    async (req, res) => {
      const { id } = idParamSchema.parse(req.params)
      res.status(201).json({ data: await service.create(req.user!.id, id, req.body) })
    },
  )

  const forListings = Router()
  // RN-AVA-05: qualquer usuário logado (aluno ou admin).
  forListings.get('/:id/reviews', authenticate(), async (req, res) => {
    const { id } = idParamSchema.parse(req.params)
    res.json({ data: await service.list(id) })
  })

  return { forOrders, forListings }
}
