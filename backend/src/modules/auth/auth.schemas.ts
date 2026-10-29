import { z } from 'zod'
import { LIMITS } from '../../config/constants'
import { courseField, emailField as email, whatsappField } from '../../shared/schemas/profile-fields'

// Espelha o frontend (auth.schemas.ts): o servidor valida de novo, o cliente nunca basta (RNF004).

export const newPassword = z
  .string()
  .min(LIMITS.passwordMin, 'A senha precisa ter ao menos 8 caracteres.')
  .max(LIMITS.passwordMax, 'A senha pode ter no máximo 72 caracteres.')
  .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula.')
  .regex(/\d/, 'Inclua ao menos um número.')

const confirmed = <T extends { password: string; passwordConfirmation: string }>(data: T) =>
  data.password === data.passwordConfirmation
const mismatch = { path: ['passwordConfirmation'], message: 'As senhas não são iguais.' }

export const registerSchema = z
  .object({
    name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax),
    email,
    password: newPassword,
    passwordConfirmation: z.string().min(1),
    acceptTerms: z.literal(true, { error: 'Aceite os Termos e a Política para continuar.' }),
  })
  .refine(confirmed, mismatch)

export const loginSchema = z.object({ email, password: z.string().min(1).max(200) })
export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(200),
    password: newPassword,
    passwordConfirmation: z.string().min(1),
  })
  .refine(confirmed, mismatch)

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword,
    confirmation: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmation, {
    path: ['confirmation'],
    message: 'As senhas não são iguais.',
  })

export const googleLoginSchema = z.object({ idToken: z.string().min(1).max(5000) })

export const completeProfileSchema = z.object({
  acceptTerms: z.literal(true, { error: 'Aceite os Termos e a Política para continuar.' }),
  course: courseField.optional(),
  whatsapp: whatsappField.optional(),
})
