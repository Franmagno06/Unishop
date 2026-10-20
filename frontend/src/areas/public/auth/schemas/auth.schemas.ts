import { z } from 'zod'

// Regras de campo: RN-ACE-01 a 04 e limites de Regras §9. O erro final sempre vem do backend.
export const ALLOWED_EMAIL_DOMAIN = '@edu.unifor.br'

// No login só se confere o formato: a conta admin criada por seed tem e-mail fora do domínio.
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
  password: z.string().min(1, 'Informe sua senha.'),
})

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'O nome precisa ter ao menos 3 caracteres.')
      .max(150, 'O nome pode ter no máximo 150 caracteres.'),
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail institucional.')
      .max(150, 'O e-mail pode ter no máximo 150 caracteres.')
      .pipe(z.email('Informe um e-mail válido.'))
      .refine(
        (value) => value.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN),
        `Use seu e-mail institucional ${ALLOWED_EMAIL_DOMAIN}.`,
      ),
    password: z
      .string()
      .min(8, 'A senha precisa ter ao menos 8 caracteres.')
      .max(72, 'A senha pode ter no máximo 72 caracteres.')
      .regex(/[A-Z]/, 'Inclua ao menos uma letra maiúscula.')
      .regex(/\d/, 'Inclua ao menos um número.'),
    passwordConfirmation: z.string().min(1, 'Confirme a senha.'),
    acceptTerms: z
      .boolean()
      .refine((value) => value, 'Aceite os Termos e a Política para continuar.'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'As senhas não são iguais.',
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
