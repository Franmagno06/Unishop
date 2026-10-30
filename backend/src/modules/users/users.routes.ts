import { Router } from 'express'
import type { Authenticate } from '../../shared/middlewares/authenticate'
import { uploadImage } from '../../shared/middlewares/upload'
import { validateBody } from '../../shared/middlewares/validate'
import { createUsersController } from './users.controller'
import { deleteAccountSchema, updateProfileSchema } from './users.schemas'
import type { UsersService } from './users.service'

export function createUsersRoutes(
  service: UsersService,
  authenticate: Authenticate,
  options: { avatar?: boolean } = {},
) {
  const c = createUsersController(service)
  const router = Router()

  router.get('/me', authenticate(), c.me) // RF012.1
  router.patch('/me', authenticate(), validateBody(updateProfileSchema), c.update) // RN-PER-01, 03, 07
  if (options.avatar) router.put('/me/avatar', authenticate(), uploadImage(), c.avatar) // RN-PER-05
  router.delete('/me', authenticate(), validateBody(deleteAccountSchema), c.remove) // RN-PER-06
  return router
}
