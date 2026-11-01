import { z } from 'zod'
import { LIMITS } from '../../config/constants'
import { courseField, emailField, whatsappField } from '../../shared/schemas/profile-fields'

// RN-PER-01: mesmas validações do cadastro. Chaves desconhecidas (role, id) são descartadas.
export const updateProfileSchema = z.object({
  name: z.string().trim().min(LIMITS.nameMin).max(LIMITS.nameMax).optional(),
  email: emailField.optional(),
  course: courseField.optional(),
  whatsapp: whatsappField.optional(),
})

// RN-PER-02: o e-mail novo só vale depois do link enviado a ele.
export const emailChangeRequestSchema = z.object({ email: emailField })
export const emailChangeConfirmSchema = z.object({ token: z.string().min(1).max(200) })

// RN-PER-06: o servidor também exige a confirmação digitada.
export const deleteAccountSchema = z.object({
  confirmation: z.literal('EXCLUIR', { error: 'Digite EXCLUIR para confirmar.' }),
})
