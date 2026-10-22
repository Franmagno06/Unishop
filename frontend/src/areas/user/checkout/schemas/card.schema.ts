import { z } from 'zod'
import { isExpiryInFuture, isLuhnValid } from '../utils/card'

// RN-PAG-03: número, nome impresso, validade e CVV, cada campo validado. O Regras §9 não define
// limite para o nome impresso; 3 a 60 caracteres é um padrão provisório, a confirmar.
export const CARD_LIMITS = { holderMin: 3, holderMax: 60 } as const

export const cardSchema = z.object({
  number: z
    .string()
    .trim()
    .min(1, 'Informe o número do cartão.')
    .refine((text) => {
      const length = text.replace(/\D/g, '').length
      return length >= 13 && length <= 19
    }, 'O número do cartão tem de 13 a 19 dígitos.')
    .refine((text) => {
      const length = text.replace(/\D/g, '').length
      return length < 13 || length > 19 || isLuhnValid(text)
    }, 'Confira o número do cartão: ele parece inválido.'),
  holder: z
    .string()
    .trim()
    .min(1, 'Informe o nome impresso no cartão.')
    .min(CARD_LIMITS.holderMin, `O nome deve ter pelo menos ${CARD_LIMITS.holderMin} caracteres.`)
    .max(CARD_LIMITS.holderMax, `O nome pode ter no máximo ${CARD_LIMITS.holderMax} caracteres.`),
  expiry: z
    .string()
    .trim()
    .min(1, 'Informe a validade.')
    .refine((text) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(text), 'Use o formato MM/AA.')
    .refine((text) => !/^(0[1-9]|1[0-2])\/\d{2}$/.test(text) || isExpiryInFuture(text), 'Este cartão está vencido.'),
  cvv: z
    .string()
    .trim()
    .min(1, 'Informe o CVV.')
    .refine((text) => /^\d{3,4}$/.test(text), 'O CVV tem 3 ou 4 dígitos.'),
})

export type CardFormValues = z.infer<typeof cardSchema>
