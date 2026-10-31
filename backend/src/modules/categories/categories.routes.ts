import { Router } from 'express'
import type { Authenticate } from '../../shared/middlewares/authenticate'
import { validateQuery } from '../../shared/middlewares/validate'
import { createCategoriesController } from './categories.controller'
import { listCategoriesQuerySchema } from './categories.schemas'
import type { CategoriesService } from './categories.service'

export function createCategoriesRoutes(service: CategoriesService, authenticate: Authenticate) {
  const c = createCategoriesController(service)
  const router = Router()

  // RN-CAT-04: só aluno logado (ou admin) vê as categorias.
  router.get('/', authenticate(), validateQuery(listCategoriesQuerySchema), c.list)
  return router
}
