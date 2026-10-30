import { z } from 'zod'
import { LIMITS } from '../../config/constants'

// Campos de perfil usados no cadastro, no "completar cadastro" e na edição do perfil.
export const emailField = z
  .string()
  .trim()
  .min(1)
  .max(LIMITS.emailMax)
  .pipe(z.email('Informe um e-mail válido.'))

export const courseField = z.string().trim().max(100, 'O curso pode ter no máximo 100 caracteres.')

// RN-PER-07: chega com ou sem máscara e é guardado só com dígitos (10 ou 11, com DDD). Vazio = sem WhatsApp.
// A conferência vem antes de tirar a máscara: "abc" não pode virar "" e passar como "limpar o campo".
const digitsOf = (v: string) => v.replace(/\D/g, '')
export const whatsappField = z
  .string()
  .trim()
  .refine((v) => v === '' || digitsOf(v).length === 10 || digitsOf(v).length === 11, {
    message: 'Informe o WhatsApp com DDD, 10 ou 11 dígitos.',
  })
  .transform(digitsOf)
