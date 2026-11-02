import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createPaymentsRoutes } from '../../src/modules/payments/payments.routes'
import type { PaymentsService } from '../../src/modules/payments/payments.service'
import { errorHandler } from '../../src/shared/middlewares/error-handler'
import { createGeneralLimiter, createUserLimiter } from '../../src/shared/middlewares/rate-limiter'
import type { Authenticate } from '../../src/shared/middlewares/authenticate'

// backend.md §6: 100 por minuto por IP no geral e 30 por minuto por usuário em /payments.
const asUser: Authenticate = () => (req, _res, next) => {
  req.user = { id: Number(req.header('x-user')), role: 'student' } as never
  next()
}

describe('limite geral por IP', () => {
  const build = () => {
    const app = express()
    app.use('/api/v1', createGeneralLimiter(3))
    app.get('/api/v1/:x', (_req, res) => void res.json({ ok: true }))
    app.get('/api/v1/health/db', (_req, res) => void res.json({ ok: true }))
    app.use(errorHandler)
    return app
  }

  it('devolve 429 TOO_MANY_REQUESTS depois do teto', async () => {
    const app = build()
    for (let i = 0; i < 3; i++)
      expect((await request(app).get('/api/v1/categories')).status).toBe(200)
    const res = await request(app).get('/api/v1/categories')
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS')
  })

  it('o /health não gasta o limite (monitor de disponibilidade)', async () => {
    const app = build()
    for (let i = 0; i < 6; i++)
      expect((await request(app).get('/api/v1/health/db')).status).toBe(200)
  })
})

describe('limite de /payments por usuário', () => {
  const build = (limit: number) => {
    const service = {
      createPix: async () => ({ code: 'x', expiresAt: 'y' }),
      handleWebhook: async () => undefined,
    } as unknown as PaymentsService
    const app = express().use(express.json())
    app.use(
      '/payments',
      createPaymentsRoutes(service, asUser, {
        webhookLimiter: (_req, _res, next) => next(),
        userLimiter: createUserLimiter(limit),
      }),
    )
    app.use(errorHandler)
    return app
  }
  const pix = (app: express.Express, user: number) =>
    request(app).post('/payments/pix').set('x-user', String(user)).send({ orderId: 1 })

  it('conta por usuário: o teto de um não bloqueia o outro', async () => {
    const app = build(2)
    expect((await pix(app, 1)).status).toBe(201)
    expect((await pix(app, 1)).status).toBe(201)
    const blocked = await pix(app, 1)
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS')
    expect((await pix(app, 2)).status).toBe(201)
  })

  it('o webhook não passa pelo limite por usuário', async () => {
    const app = build(1)
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/payments/webhook').send({})
      expect(res.status).toBe(200)
    }
  })
})
