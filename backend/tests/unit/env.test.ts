import { describe, expect, it } from 'vitest'
import { parseEnv } from '../../src/config/env'

// Travas de ambiente (api.md §6.3, §9): a API não sobe com configuração inválida para o APP_ENV.
const SECRET = 'segredo-do-jwt-com-pelo-menos-32-caracteres'
const CRON = 'cron-secret-com-pelo-menos-32-caracteres!!'
const base = {
  DATABASE_URL: 'postgresql://u:senha-super-secreta@localhost:5432/x',
  FRONTEND_URL: 'http://localhost:5173',
  JWT_SECRET: SECRET,
}
// Um ambiente publicado válido: tudo o que as travas exigem.
const published = {
  ...base,
  APP_ENV: 'production',
  FRONTEND_URL: 'https://unishop.vercel.app',
  CRON_SECRET: CRON,
  MAIL_DRIVER: 'resend',
  STORAGE_DRIVER: 'cloudinary',
  PAYMENT_DRIVER: 'mercadopago',
  PAYMENT_MODE: 'sandbox',
  MP_ACCESS_TOKEN: 'TEST-token-do-mercado-pago',
  MP_WEBHOOK_SECRET: 'segredo-do-webhook',
}

const failedPaths = (raw: Record<string, string>) => {
  const r = parseEnv(raw)
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
}

describe('parseEnv', () => {
  it('desenvolvimento com os padrões é válido', () => {
    expect(parseEnv(base).success).toBe(true)
  })

  it('RN-PAG-10: production com PAYMENT_MODE=sandbox passa (credenciais de teste)', () => {
    expect(parseEnv(published).success).toBe(true)
  })

  it('MAIL_DRIVER=console é proibido em preview e production', () => {
    expect(failedPaths({ ...published, MAIL_DRIVER: 'console' })).toEqual(['MAIL_DRIVER'])
    expect(failedPaths({ ...published, APP_ENV: 'preview', MAIL_DRIVER: 'console' })).toEqual([
      'MAIL_DRIVER',
    ])
  })

  it('STORAGE_DRIVER=local é proibido em preview e production', () => {
    expect(failedPaths({ ...published, STORAGE_DRIVER: 'local' })).toEqual(['STORAGE_DRIVER'])
  })

  it('FRONTEND_URL publicada exige https:// e rejeita "*"', () => {
    expect(failedPaths({ ...published, FRONTEND_URL: 'http://unishop.vercel.app' })).toEqual([
      'FRONTEND_URL',
    ])
    expect(failedPaths({ ...published, FRONTEND_URL: 'https://*.vercel.app' })).toEqual([
      'FRONTEND_URL',
    ])
    expect(
      failedPaths({ ...published, FRONTEND_URL: 'https://a.app,http://localhost:5173' }),
    ).toEqual(['FRONTEND_URL'])
  })

  it('CRON_SECRET publicada exige 32 caracteres ou mais', () => {
    expect(failedPaths({ ...published, CRON_SECRET: 'curto' })).toEqual(['CRON_SECRET'])
    const semCron = Object.fromEntries(
      Object.entries(published).filter(([k]) => k !== 'CRON_SECRET'),
    )
    expect(failedPaths(semCron)).toEqual(['CRON_SECRET'])
  })

  it('PAYMENT_DRIVER=mock é proibido em production; PAYMENT_MODE=production só em production', () => {
    expect(failedPaths({ ...published, PAYMENT_DRIVER: 'mock' })).toEqual(['PAYMENT_DRIVER'])
    expect(failedPaths({ ...published, APP_ENV: 'preview', PAYMENT_MODE: 'production' })).toEqual([
      'PAYMENT_MODE',
    ])
  })

  it('o erro cita só o nome da variável, nunca o valor', () => {
    const r = parseEnv({ ...published, CRON_SECRET: 'curto-xyz', MAIL_DRIVER: 'console' })
    expect(r.success).toBe(false)
    const dump = JSON.stringify(r.success ? {} : r.error.issues)
    expect(dump).not.toContain('curto-xyz')
    expect(dump).not.toContain(SECRET)
    expect(dump).not.toContain('senha-super-secreta')
    expect(dump).not.toContain('TEST-token-do-mercado-pago')
  })
})

describe('DATABASE_POOL_MAX', () => {
  const pool = (v?: string) => {
    const r = parseEnv(v === undefined ? base : { ...base, DATABASE_POOL_MAX: v })
    return r.success ? r.data.DATABASE_POOL_MAX : 'invalido'
  }

  it('padrão 3: a Vercel abre uma instância por requisição simultânea e o pooler tem teto', () => {
    expect(pool()).toBe(3)
  })

  it('aceita de 1 a 20 e recusa o resto', () => {
    expect(pool('1')).toBe(1)
    expect(pool('20')).toBe(20)
    expect(pool('0')).toBe('invalido')
    expect(pool('21')).toBe('invalido')
    expect(pool('abc')).toBe('invalido')
  })
})
