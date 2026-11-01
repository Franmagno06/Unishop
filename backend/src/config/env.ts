import 'dotenv/config'
import { z } from 'zod'

const bool = z.enum(['true', 'false']).transform((v) => v === 'true')

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    APP_ENV: z.enum(['development', 'test', 'preview', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    DATABASE_URL_UNPOOLED: z.string().optional(),
    FRONTEND_URL: z
      .string()
      .min(1)
      .transform((v) => v.split(',').map((o) => o.trim())),

    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default('2h'),
    ALLOWED_EMAIL_DOMAIN: z.string().default('edu.unifor.br'),

    GOOGLE_CLIENT_ID: z.string().optional(),
    MP_ACCESS_TOKEN: z.string().optional(),
    MP_WEBHOOK_SECRET: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().optional(),
    CLOUDINARY_URL: z.string().optional(),

    SERVICE_FEE_PERCENT: z.coerce.number().min(0).default(0),
    PIX_EXPIRATION_MINUTES: z.coerce.number().int().positive().default(30),
    EMAIL_VERIFICATION_REQUIRED: bool.default(false),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),

    CRON_SECRET: z.string().optional(),

    PAYMENT_MODE: z.enum(['sandbox', 'production']).default('sandbox'),
    PAYMENT_DRIVER: z.enum(['mock', 'mercadopago']).default('mock'),
    MAIL_DRIVER: z.enum(['console', 'mailtrap', 'resend']).default('console'),
    STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
    CLOUDINARY_UPLOAD_FOLDER: z.string().default('unishop-dev'),
    API_PUBLIC_URL: z.string().optional(), // base das URLs de imagem do driver local; padrão http://localhost:PORT
    ANTIBOT_DRIVER: z.enum(['noop', 'turnstile']).default('noop'),

    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    // Travas de pagamento (api.md §6.3). Usam APP_ENV, não NODE_ENV (na Vercel o Preview é "production").
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (e.PAYMENT_MODE === 'production' && e.APP_ENV !== 'production') {
      fail('PAYMENT_MODE', 'Credencial real de pagamento só com APP_ENV=production.')
    }
    if (e.PAYMENT_DRIVER === 'mock' && e.APP_ENV === 'production') {
      fail('PAYMENT_DRIVER', 'O gateway falso (mock) é proibido em APP_ENV=production.')
    }
    if (e.PAYMENT_DRIVER === 'mercadopago') {
      if (!e.MP_ACCESS_TOKEN) fail('MP_ACCESS_TOKEN', 'Obrigatória com PAYMENT_DRIVER=mercadopago.')
      if (!e.MP_WEBHOOK_SECRET)
        fail('MP_WEBHOOK_SECRET', 'Obrigatória com PAYMENT_DRIVER=mercadopago.')
    }
  })

// Se faltar ou for inválida alguma variável, o servidor não sobe.
const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', z.flattenError(parsed.error).fieldErrors)
  process.exit(1)
}

export const env = parsed.data
