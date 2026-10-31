import { Router } from 'express'
import { validateQuery } from '../../shared/middlewares/validate'
import { createAdminListingsController } from './admin-listings.controller'
import { listAdminListingsQuerySchema } from './admin-listings.schemas'
import type { AdminListingsService } from './admin-listings.service'

// A proteção (authenticate + admin) vem de admin.routes.ts, uma vez só (RN-ADM-01).
export function createAdminListingsRoutes(service: AdminListingsService) {
  const c = createAdminListingsController(service)
  const router = Router()
  router.get('/', validateQuery(listAdminListingsQuerySchema), c.list) // RN-ADM-07
  router.get('/stats', c.stats) // RN-ADM-07 (antes de /:id)
  router.get('/:id', c.get) // RF023
  return router
}
