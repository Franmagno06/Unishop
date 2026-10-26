import { z } from 'zod'

// RN-ADM-04: o admin edita com as validações do cadastro (RN-ACE-01 a 03 e Regras §9). O backend
// repete tudo; o erro final sempre vem dele.
const INSTITUTIONAL_DOMAIN = '@edu.unifor.br'
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024
export const PHOTO_TYPES = ['image/jpeg', 'image/png']

export const adminUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'O nome precisa ter ao menos 3 caracteres.')
    .max(150, 'O nome pode ter no máximo 150 caracteres.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe o e-mail.')
    .max(150, 'O e-mail pode ter no máximo 150 caracteres.')
    .pipe(z.email('Informe um e-mail válido.'))
    .refine((value) => value.endsWith(INSTITUTIONAL_DOMAIN), `Use o e-mail institucional ${INSTITUTIONAL_DOMAIN}.`),
  course: z.string().trim().max(100, 'O curso pode ter no máximo 100 caracteres.'),
  // Opcional; quando preenchido, 10 ou 11 dígitos com DDD (a máscara não conta).
  whatsapp: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || [10, 11].includes(value.replace(/\D/g, '').length),
      'Informe o WhatsApp com DDD (10 ou 11 dígitos).',
    ),
  status: z.enum(['active', 'suspended']),
})

export type AdminUserFormValues = z.infer<typeof adminUserSchema>

// Foto do usuário: JPG ou PNG de até 4 MB (RN-PER-05). Devolve a mensagem de erro ou null.
export function validateUserPhoto(file: Pick<File, 'type' | 'size'>): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'Use uma imagem JPG ou PNG.'
  if (file.size > PHOTO_MAX_BYTES) return 'A foto pode ter no máximo 4 MB.'
  return null
}
