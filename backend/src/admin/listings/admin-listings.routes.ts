import { Router } from 'express'
import { validateBody, validateQuery } from '../../shared/middlewares/validate'
import { createAdminListingsController } from './admin-listings.controller'
import { listAdminListingsQuerySchema, updateAdminListingSchema } from './admin-listings.schemas'
import type { AdminListingsService } from './admin-listings.service'

// A proteção (authenticate + admin) vem de admin.routes.ts, uma vez só (RN-ADM-01).
export function createAdminListingsRoutes(service: AdminListingsService) {
  const c = createAdminListingsController(service)
  const router = Router()
  router.get('/', validateQuery(listAdminListingsQuerySchema), c.list) // RN-ADM-07
  router.get('/stats', c.stats) // RN-ADM-07 (antes de /:id)
  router.get('/:id', c.get) // RF023
  router.patch('/:id', validateBody(updateAdminListingSchema), c.update) // RN-ADM-08, 10
  router.delete('/:id', c.remove) // RN-ADM-09, 10, RN-NOT-02
  return router
}
