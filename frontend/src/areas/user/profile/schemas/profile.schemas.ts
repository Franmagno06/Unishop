import { z } from 'zod'
import { onlyDigits } from '../../../../shared/utils/whatsapp'

// RN-PER-01, 02, 05 e 07 e limites de Regras §9. O erro final sempre vem do backend.
const INSTITUTIONAL_DOMAIN = '@edu.unifor.br'
export const AVATAR_MAX_BYTES = 4 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png']

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'O nome precisa ter ao menos 3 caracteres.')
    .max(150, 'O nome pode ter no máximo 150 caracteres.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email('Informe um e-mail válido.'))
    .refine((value) => value.endsWith(INSTITUTIONAL_DOMAIN), `Use seu e-mail institucional ${INSTITUTIONAL_DOMAIN}.`),
  course: z.string().trim().max(100, 'O curso pode ter no máximo 100 caracteres.'),
  // Opcional; quando preenchido, 10 ou 11 dígitos com DDD (a máscara não conta).
  whatsapp: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || [10, 11].includes(onlyDigits(value).length),
      'Informe o WhatsApp com DDD (10 ou 11 dígitos).',
    ),
})

export type ProfileValues = z.infer<typeof profileSchema>

// Foto de perfil: JPG ou PNG de até 4 MB (RN-PER-05). Devolve a mensagem de erro ou null.
export function validateAvatarFile(file: Pick<File, 'type' | 'size'>): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return 'Use uma imagem JPG ou PNG.'
  if (file.size > AVATAR_MAX_BYTES) return 'A foto pode ter no máximo 4 MB.'
  return null
}
