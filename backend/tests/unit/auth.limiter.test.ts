import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createAuthRoutes } from '../../src/modules/auth/auth.routes'
import type { AuthService } from '../../src/modules/auth/auth.service'
import type { Authenticate } from '../../src/shared/middlewares/authenticate'

// O limite de /auth (10 por minuto por IP) vale para as rotas POST. O GET /auth/me restaura a sessão a
// cada recarga e, atrás do Wi-Fi do campus (um IP só), não pode gastar esse orçamento (RN-ACE-11).
function build() {
  let hits = 0
  const limiter: express.RequestHandler = (_req, _res, next) => {
    hits++
    next()
  }
  const authenticate = (() => (_req, res) => {
    res.json({ ok: true })
  }) as Authenticate
  const routes = createAuthRoutes({} as AuthService, authenticate, limiter)
  const app = express().use(express.json()).use('/auth', routes.auth)
  return { app, hits: () => hits }
}

describe('limite de /auth', () => {
  it('RN-ACE-11: GET /auth/me não passa pelo limitador', async () => {
    const { app, hits } = build()
    await request(app).get('/auth/me')
    await request(app).get('/auth/me')
    expect(hits()).toBe(0)
  })

  it.each(['register', 'login', 'google', 'forgot-password', 'reset-password'])(
    'RN-ACE-08: POST /auth/%s passa pelo limitador',
    async (route) => {
      const { app, hits } = build()
      await request(app).post(`/auth/${route}`).send({})
      expect(hits()).toBe(1)
    },
  )
})
