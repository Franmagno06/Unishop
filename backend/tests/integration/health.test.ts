import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../../src/app'

describe('GET /api/v1/health', () => {
  it('responde 200 com status ok, sem consultar o banco', async () => {
    const res = await request(app).get('/api/v1/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
