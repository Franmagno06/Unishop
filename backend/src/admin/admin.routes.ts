import { Router } from 'express'
import { authorizeRole, type Authenticate } from '../shared/middlewares/authenticate'

// RN-ADM-01: authenticate + authorizeRole('admin') aplicados UMA vez; valem para todas as sub-rotas.
// Nenhuma sub-rota repete essa proteção.
export function createAdminRoutes(
  authenticate: Authenticate,
  sub: { users?: Router; listings?: Router; auditLogs?: Router } = {},
): Router {
  const router = Router()
  router.use(authenticate(), authorizeRole('admin'))
  if (sub.users) router.use('/users', sub.users)
  if (sub.listings) router.use('/listings', sub.listings)
  if (sub.auditLogs) router.use('/audit-logs', sub.auditLogs)
  return router
}
