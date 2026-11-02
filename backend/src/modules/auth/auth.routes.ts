import { Router, type RequestHandler } from 'express'
import type { Authenticate } from '../../shared/middlewares/authenticate'
import { validateBody } from '../../shared/middlewares/validate'
import { createAuthController } from './auth.controller'
import {
  changePasswordSchema,
  completeProfileSchema,
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth.schemas'
import type { AuthService } from './auth.service'

// O Express 5 já repassa o erro de handler assíncrono ao errorHandler.
export function createAuthRoutes(
  service: AuthService,
  authenticate: Authenticate,
  limiter: RequestHandler,
) {
  const c = createAuthController(service)

  // O limite por IP vale só para as rotas POST: o GET /me restaura a sessão a cada recarga.
  const auth = Router()
  auth.post('/register', limiter, validateBody(registerSchema), c.register) // RN-ACE-01 a 07
  auth.post('/login', limiter, validateBody(loginSchema), c.login) // RN-ACE-08, 09, 12, 13
  auth.post('/google', limiter, validateBody(googleLoginSchema), c.google) // RN-ACE-14
  auth.post('/forgot-password', limiter, validateBody(forgotPasswordSchema), c.forgotPassword) // RN-ACE-10
  auth.post('/reset-password', limiter, validateBody(resetPasswordSchema), c.resetPassword) // RN-ACE-04, 10
  auth.get('/me', authenticate({ allowPendingTerms: true }), c.me) // RN-ACE-11

  const users = Router()
  users.post(
    '/me/complete-profile',
    authenticate({ allowPendingTerms: true }),
    validateBody(completeProfileSchema),
    c.completeProfile,
  ) // RN-ACE-06, 14
  users.post('/me/password', authenticate(), validateBody(changePasswordSchema), c.changePassword) // RN-ACE-15

  return { auth, users }
}
