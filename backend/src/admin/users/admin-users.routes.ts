import { Router } from 'express'
import { validateQuery } from '../../shared/middlewares/validate'
import { createAdminUsersController } from './admin-users.controller'
import { listAdminUsersQuerySchema } from './admin-users.schemas'
import type { AdminUsersService } from './admin-users.service'

// A proteção (authenticate + admin) vem de admin.routes.ts, uma vez só (RN-ADM-01).
export function createAdminUsersRoutes(service: AdminUsersService) {
  const c = createAdminUsersController(service)
  const router = Router()
  router.get('/', validateQuery(listAdminUsersQuerySchema), c.list) // RN-ADM-02, 03
  router.get('/stats', c.stats) // RN-ADM-02 (antes de /:id)
  router.get('/:id', c.get) // RN-ADM-04
  return router
}
