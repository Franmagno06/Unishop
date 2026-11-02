import { describe, expect, it, vi } from 'vitest'
import { parseEnv } from '../../src/config/env'
import { buildProviders } from '../../src/shared/providers'
import { createSmtpMailProvider } from '../../src/shared/providers/mail/smtp.provider'
import {
  createCloudinaryStorageProvider,
  parseCloudinaryUrl,
} from '../../src/shared/providers/storage/cloudinary.provider'

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

describe('smtp.provider', () => {
  it('monta o e-mail de redefinição com remetente, assunto e HTML escapado', async () => {
    const sendMail = vi.fn().mockResolvedValue({})
    const mail = createSmtpMailProvider({
      transport: { sendMail },
      from: 'Unishop <app@gmail.com>',
    })
    await mail.sendPasswordReset({
      to: 'aluno@edu.unifor.br',
      name: '<b>Ana</b>',
      link: 'https://app/reset?t=1&x=2',
      expiresInMinutes: 30,
    })
    const sent = sendMail.mock.calls[0][0]
    expect(sent.from).toBe('Unishop <app@gmail.com>')
    expect(sent.to).toBe('aluno@edu.unifor.br')
    expect(sent.subject).toBe('Redefinição de senha do Unishop')
    expect(sent.html).toContain('&lt;b&gt;Ana&lt;/b&gt;')
    expect(sent.text).toContain('https://app/reset?t=1&x=2')
  })

  it('falha do transporte vira EXTERNAL_SERVICE_ERROR sem vazar a mensagem do SMTP', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('535 senha-secreta recusada'))
    const mail = createSmtpMailProvider({ transport: { sendMail }, from: 'x@gmail.com' })
    await expect(
      mail.sendListingRemoved({ to: 'a@edu.unifor.br', name: 'Ana', listingTitle: 'Livro' }),
    ).rejects.toMatchObject({ status: 502, code: 'EXTERNAL_SERVICE_ERROR' })
    await mail
      .sendListingRemoved({ to: 'a@edu.unifor.br', name: 'Ana', listingTitle: 'Livro' })
      .catch((err) => expect(String(err.message)).not.toMatch(/secreta/))
  })
})

describe('cloudinary.provider', () => {
  it('lê o CLOUDINARY_URL', () => {
    expect(parseCloudinaryUrl('cloudinary://key:segredo@minha-nuvem')).toEqual({
      cloud_name: 'minha-nuvem',
      api_key: 'key',
      api_secret: 'segredo',
    })
    expect(() => parseCloudinaryUrl('http://x')).toThrow(/CLOUDINARY_URL/)
  })

  it('envia a imagem para a pasta do ambiente e devolve publicId e URL https', async () => {
    const upload = vi.fn().mockResolvedValue({
      public_id: 'unishop-prod/anuncios/abc',
      secure_url: 'https://res.cloudinary.com/x/abc.png',
    })
    const storage = createCloudinaryStorageProvider({
      rootFolder: 'unishop-prod',
      client: { upload, destroy: vi.fn() },
    })
    const out = await storage.upload({ buffer: PNG, folder: 'anuncios' })
    expect(out).toEqual({
      publicId: 'unishop-prod/anuncios/abc',
      url: 'https://res.cloudinary.com/x/abc.png',
    })
    expect(upload).toHaveBeenCalledWith(
      PNG,
      expect.objectContaining({ folder: 'unishop-prod/anuncios' }),
    )
  })

  it('recusa o que não é JPG ou PNG antes de chamar o Cloudinary', async () => {
    const upload = vi.fn()
    const storage = createCloudinaryStorageProvider({
      rootFolder: 'unishop-prod',
      client: { upload, destroy: vi.fn() },
    })
    await expect(
      storage.upload({ buffer: Buffer.from('nao e imagem'), folder: 'a' }),
    ).rejects.toThrow()
    expect(upload).not.toHaveBeenCalled()
  })

  it('remover é idempotente: "not found" não é erro, outro resultado é', async () => {
    const destroy = vi
      .fn()
      .mockResolvedValueOnce({ result: 'ok' })
      .mockResolvedValueOnce({ result: 'not found' })
      .mockResolvedValueOnce({ result: 'erro' })
    const storage = createCloudinaryStorageProvider({
      rootFolder: 'r',
      client: { upload: vi.fn(), destroy },
    })
    await storage.remove('r/a')
    await storage.remove('r/a')
    await expect(storage.remove('r/a')).rejects.toThrow()
  })
})

describe('buildProviders com drivers reais', () => {
  const prod = {
    APP_ENV: 'production',
    PORT: 3000,
    MAIL_DRIVER: 'smtp',
    STORAGE_DRIVER: 'cloudinary',
    PAYMENT_DRIVER: 'mercadopago',
    PAYMENT_MODE: 'sandbox',
    MP_ACCESS_TOKEN: 'TEST-token',
    MP_WEBHOOK_SECRET: 'webhook',
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: 465,
    SMTP_USER: 'app@gmail.com',
    SMTP_PASS: 'senha-de-app',
    CLOUDINARY_URL: 'cloudinary://key:segredo@nuvem',
    CLOUDINARY_UPLOAD_FOLDER: 'unishop-prod',
  } as const

  it('aceita smtp e cloudinary em production', () => {
    const p = buildProviders(prod, { uploadsDir: 'x' })
    expect(typeof p.mail.sendPasswordReset).toBe('function')
    expect(typeof p.storage.upload).toBe('function')
  })

  it('o JSON dos providers não mostra a senha nem a chave', () => {
    const p = buildProviders(prod, { uploadsDir: 'x' })
    expect(JSON.stringify(p)).not.toMatch(/senha-de-app|segredo/)
  })
})

describe('modo demonstração de e-mail', () => {
  const prod = {
    APP_ENV: 'production',
    PORT: 3000,
    MAIL_DRIVER: 'console',
    STORAGE_DRIVER: 'cloudinary',
    PAYMENT_DRIVER: 'mercadopago',
    PAYMENT_MODE: 'sandbox',
    MP_ACCESS_TOKEN: 'TEST-token',
    MP_WEBHOOK_SECRET: 'webhook',
    CLOUDINARY_URL: 'cloudinary://key:segredo@nuvem',
  } as const

  it('console em production só com ALLOW_CONSOLE_MAIL', () => {
    expect(() => buildProviders(prod, { uploadsDir: 'x' })).toThrow(/MAIL_DRIVER/)
    const p = buildProviders({ ...prod, ALLOW_CONSOLE_MAIL: true }, { uploadsDir: 'x' })
    expect(typeof p.mail.sendPasswordReset).toBe('function')
  })
})

describe('env: variáveis dos drivers reais', () => {
  const base = {
    DATABASE_URL: 'postgresql://x',
    FRONTEND_URL: 'https://app.vercel.app',
    JWT_SECRET: 'a'.repeat(32),
    CRON_SECRET: 'b'.repeat(32),
    APP_ENV: 'production',
    PAYMENT_DRIVER: 'mercadopago',
    MP_ACCESS_TOKEN: 'TEST-x',
    MP_WEBHOOK_SECRET: 'w',
    MAIL_DRIVER: 'smtp',
    STORAGE_DRIVER: 'cloudinary',
    SMTP_USER: 'app@gmail.com',
    SMTP_PASS: 'senha-de-app',
    CLOUDINARY_URL: 'cloudinary://key:segredo@nuvem',
  }

  it('passa completo', () => {
    expect(parseEnv(base).success).toBe(true)
  })

  it('smtp exige usuário e senha; cloudinary exige a URL', () => {
    const r1 = parseEnv({ ...base, SMTP_PASS: undefined })
    expect(r1.success).toBe(false)
    const r2 = parseEnv({ ...base, CLOUDINARY_URL: undefined })
    expect(r2.success).toBe(false)
  })
})
