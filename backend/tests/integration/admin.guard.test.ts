import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../../src/app'
import { createJwt } from '../../src/config/jwt'
import {
  createFakeMail,
  createFakeOAuth,
  createFakeProfiles,
  createFakeTokens,
  createFakeUsers,
  unreachable,
} from '../helpers/fakes'
import type { AuditLogRepository } from '../../src/admin/audit-logs/audit-logs.types'
import type { AdminUsersRepository } from '../../src/admin/users/admin-users.types'

// Rotas admin cobertas pela proteção única. Cada fatia acrescenta as suas linhas aqui.
const ADMIN_ROUTES: { method: 'get' | 'patch' | 'delete'; path: string }[] = [
  { method: 'get', path: '/api/v1/admin/ping-inexistente' },
  { method: 'get', path: '/api/v1/admin/audit-logs' },
  { method: 'get', path: '/api/v1/admin/users' },
  { method: 'get', path: '/api/v1/admin/users/stats' },
  { method: 'get', path: '/api/v1/admin/users/1' },
  { method: 'patch', path: '/api/v1/admin/users/1' },
]

let app: ReturnType<typeof createApp>
let student: { Authorization: string }
let admin: { Authorization: string }

beforeEach(() => {
  const users = createFakeUsers()
  const base = {
    name: 'Fulano',
    passwordHash: null,
    googleSub: null,
    course: null,
    whatsapp: null,
    photoUrl: null,
    status: 'active' as const,
    verified: true,
    termsAcceptedAt: new Date(),
    failedLoginAttempts: 0,
    lockedUntil: null,
    passwordChangedAt: null,
    lastSeen: null,
  }
  users.rows.push(
    { ...base, id: 1, email: 'aluno@edu.unifor.br', role: 'student' },
    { ...base, id: 2, email: 'admin@unishop.local', role: 'admin' },
  )
  app = createApp({
    users: users.repo,
    profiles: createFakeProfiles(users.rows).repo,
    tokens: createFakeTokens().repo,
    mail: createFakeMail().provider,
    oauth: createFakeOAuth().provider,
    // Repositories que nunca devem ser chamados: a proteção (e a validação) barram antes.
    admin: {
      auditLogs: unreachable<AuditLogRepository>('auditLogs'),
      users: unreachable<AdminUsersRepository>('adminUsers'),
    },
  })
  const jwt = createJwt(process.env.JWT_SECRET!, '2h')
  student = { Authorization: `Bearer ${jwt.sign({ id: 1, role: 'student' })}` }
  admin = { Authorization: `Bearer ${jwt.sign({ id: 2, role: 'admin' })}` }
})

describe('proteção da área admin', () => {
  it.each(ADMIN_ROUTES)(
    'RN-ADM-01: visitante recebe 401 UNAUTHENTICATED em $method $path',
    async (r) => {
      const res = await request(app)[r.method](r.path)
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHENTICATED')
    },
  )

  it.each(ADMIN_ROUTES)(
    'RN-ADM-01: aluno recebe 403 FORBIDDEN em $method $path, inclusive digitando a URL',
    async (r) => {
      const res = await request(app)[r.method](r.path).set(student)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    },
  )

  it('RN-ADM-01: admin passa pela proteção (rota inexistente dá 404 NOT_FOUND, não 401/403)', async () => {
    const res = await request(app).get('/api/v1/admin/ping-inexistente').set(admin)
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('RN-ADM-04: PATCH com campo além de status dá 400 VALIDATION_ERROR (antes do service)', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/users/5')
      .set(admin)
      .send({ status: 'suspended', name: 'Outro' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})
