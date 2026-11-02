import { describe, expect, it } from 'vitest'
import { buildProviders } from '../../src/shared/providers'
import { consoleMailProvider } from '../../src/shared/providers/mail/console.provider'

// buildProviders (api.md §6.4) e o Google (E4), sem rede.
const dev = {
  APP_ENV: 'development',
  PORT: 3000,
  MAIL_DRIVER: 'console',
  STORAGE_DRIVER: 'local',
  PAYMENT_DRIVER: 'mock',
  PAYMENT_MODE: 'sandbox',
} as const
const opts = { uploadsDir: 'uploads-teste' }

describe('buildProviders', () => {
  it('em desenvolvimento escolhe console, disco local e gateway falso', () => {
    const p = buildProviders(dev, opts)
    expect(p.mail).toBe(consoleMailProvider)
    expect(typeof p.storage.upload).toBe('function')
    expect(p.gateway.driver).toBe('mock')
  })

  it('console e disco local são proibidos fora de desenvolvimento e teste', () => {
    expect(() => buildProviders({ ...dev, APP_ENV: 'preview' }, opts)).toThrow(/MAIL_DRIVER/)
    expect(() =>
      buildProviders({ ...dev, APP_ENV: 'production', MAIL_DRIVER: 'console' }, opts),
    ).toThrow(/MAIL_DRIVER/)
  })

  it('driver de e-mail ou de imagem ainda sem provider falha citando a variável', () => {
    expect(() => buildProviders({ ...dev, MAIL_DRIVER: 'resend' }, opts)).toThrow(/MAIL_DRIVER/)
    expect(() => buildProviders({ ...dev, STORAGE_DRIVER: 'cloudinary' }, opts)).toThrow(
      /STORAGE_DRIVER/,
    )
  })

  it('a mensagem de erro e o JSON dos providers não mostram segredos', () => {
    const secrets = {
      ...dev,
      GOOGLE_CLIENT_ID: 'client-id-secreto.apps.googleusercontent.com',
      MP_ACCESS_TOKEN: 'TEST-token-secreto',
      MP_WEBHOOK_SECRET: 'webhook-secreto',
    }
    const p = buildProviders(secrets, opts)
    expect(JSON.stringify(p)).not.toMatch(/secreto/)
    try {
      buildProviders({ ...secrets, MAIL_DRIVER: 'resend' }, opts)
    } catch (err) {
      expect(String(err)).not.toMatch(/secreto/)
    }
  })
})

describe('Google (E4)', () => {
  it('sem GOOGLE_CLIENT_ID dá 503 EXTERNAL_SERVICE_ERROR', async () => {
    const { oauth } = buildProviders(dev, opts)
    await expect(oauth.verifyIdToken('qualquer')).rejects.toMatchObject({
      status: 503,
      code: 'EXTERNAL_SERVICE_ERROR',
    })
  })

  it('com GOOGLE_CLIENT_ID e token malformado dá 401 TOKEN_INVALID, sem rede', async () => {
    const { oauth } = buildProviders(
      { ...dev, GOOGLE_CLIENT_ID: 'id.apps.googleusercontent.com' },
      opts,
    )
    await expect(oauth.verifyIdToken('nao-e-um-jwt')).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_INVALID',
    })
  })
})
