import { Router } from 'express'
import type { Authenticate } from '../../shared/middlewares/authenticate'
import { validateQuery } from '../../shared/middlewares/validate'
import { createListingsController } from './listings.controller'
import { listListingsQuerySchema, recentQuerySchema } from './listings.schemas'
import type { ListingsService } from './listings.service'

export function createListingsRoutes(service: ListingsService, authenticate: Authenticate) {
  const c = createListingsController(service)
  const router = Router()

  // Única rota de catálogo pública (RF001.4): carrossel da tela inicial, sem contato.
  router.get('/recent', validateQuery(recentQuerySchema), c.recent)
  // Daqui para baixo, só aluno logado (RN-CAT-04). `/recent` precisa vir antes de `/:id`.
  router.get('/', authenticate(), validateQuery(listListingsQuerySchema), c.list) // RN-ANU-05 a 07
  router.get('/:id', authenticate(), c.get) // RF008, RN-ANU-05, 11
  return router
}
