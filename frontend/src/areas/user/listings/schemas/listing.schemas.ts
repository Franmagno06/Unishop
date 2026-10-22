import { z } from 'zod'
import { parsePriceToCents } from '../utils/price'
import { onlyDigits } from '../utils/whatsapp'

// Limites de campos: Regras de Negócio §9 (RN-ANU-01 a 03 e RN-ANU-12). O backend repete tudo.
export const LISTING_LIMITS = {
  titleMin: 3,
  titleMax: 150,
  descriptionMin: 10,
  descriptionMax: 2000,
  priceMinInCents: 1, // R$ 0,01
  priceMaxInCents: 9_999_999, // R$ 99.999,99
  quantityMin: 1,
  quantityMax: 999,
  imagesMin: 1,
  imagesMax: 5,
  imageMaxBytes: 4 * 1024 * 1024, // 4 MB (desvio do PDF confirmado em 16/10/2026)
} as const

export const IMAGE_TYPES = ['image/jpeg', 'image/png'] as const

// Uma tag de verdade ("<b>", "</p>"); "preço < 50 e > 30" é texto comum e passa.
const containsHtml = (text: string) => /<\/?[a-zA-Z][^>]*>/.test(text)

export const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe o nome do item.')
    .min(LISTING_LIMITS.titleMin, `O nome deve ter pelo menos ${LISTING_LIMITS.titleMin} caracteres.`)
    .max(LISTING_LIMITS.titleMax, `O nome pode ter no máximo ${LISTING_LIMITS.titleMax} caracteres.`),
  categoryId: z.string().min(1, 'Escolha uma categoria.'),
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição.')
    .min(
      LISTING_LIMITS.descriptionMin,
      `A descrição deve ter pelo menos ${LISTING_LIMITS.descriptionMin} caracteres.`,
    )
    .max(
      LISTING_LIMITS.descriptionMax,
      `A descrição pode ter no máximo ${LISTING_LIMITS.descriptionMax} caracteres.`,
    )
    .refine((text) => !containsHtml(text), 'Escreva só texto, sem códigos HTML.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o preço.')
    .refine((text) => parsePriceToCents(text) !== null, 'Digite um preço válido, por exemplo 45,00.')
    .refine((text) => {
      const cents = parsePriceToCents(text)
      return cents === null || cents >= LISTING_LIMITS.priceMinInCents
    }, 'O preço deve ser maior que zero.')
    .refine((text) => {
      const cents = parsePriceToCents(text)
      return cents === null || cents <= LISTING_LIMITS.priceMaxInCents
    }, 'O preço pode ser no máximo R$ 99.999,99.'),
  quantity: z
    .string()
    .trim()
    .min(1, 'Informe a quantidade.')
    .refine((text) => /^\d+$/.test(text), 'Digite só números inteiros.')
    .refine((text) => {
      const value = Number(text)
      return !/^\d+$/.test(text) || (value >= LISTING_LIMITS.quantityMin && value <= LISTING_LIMITS.quantityMax)
    }, `A quantidade deve ser de ${LISTING_LIMITS.quantityMin} a ${LISTING_LIMITS.quantityMax}.`),
  whatsapp: z
    .string()
    .trim()
    .min(1, 'Informe o WhatsApp.')
    .refine((text) => {
      const digits = onlyDigits(text).length
      return digits === 10 || digits === 11
    }, 'Digite o WhatsApp com DDD (10 ou 11 dígitos).'),
  images: z
    .array(z.instanceof(File))
    .min(LISTING_LIMITS.imagesMin, 'Envie pelo menos 1 foto.')
    .max(LISTING_LIMITS.imagesMax, `Envie no máximo ${LISTING_LIMITS.imagesMax} fotos.`),
})

export type ListingFormValues = z.infer<typeof listingSchema>

// Valida um arquivo escolhido para o anúncio. null = pode entrar; texto = motivo da recusa.
export function validateImageFile(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `“${file.name}” não é JPG nem PNG.`
  }
  if (file.size > LISTING_LIMITS.imageMaxBytes) {
    return `“${file.name}” passa de 4 MB.`
  }
  return null
}
