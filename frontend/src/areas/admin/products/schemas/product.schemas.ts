import { z } from 'zod'
import { parsePriceToCents } from '../../../../shared/utils/price'

// RN-ADM-08: o admin edita o produto com os mesmos limites do anúncio (Regras §9, RN-ANU-01 a 03 e
// RN-ANU-12). O backend repete tudo; o erro final sempre vem dele.
export const PRODUCT_LIMITS = {
  titleMin: 3,
  titleMax: 150,
  descriptionMin: 10,
  descriptionMax: 2000,
  priceMinInCents: 1, // R$ 0,01
  priceMaxInCents: 9_999_999, // R$ 99.999,99
  imageMaxBytes: 4 * 1024 * 1024, // 4 MB (desvio do PDF confirmado em 16/10/2026)
} as const

export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png']

// Uma tag de verdade ("<b>", "</p>"); "preço < 50 e > 30" é texto comum e passa.
const containsHtml = (text: string) => /<\/?[a-zA-Z][^>]*>/.test(text)

export const adminProductSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Informe o nome do produto.')
    .min(PRODUCT_LIMITS.titleMin, `O nome deve ter pelo menos ${PRODUCT_LIMITS.titleMin} caracteres.`)
    .max(PRODUCT_LIMITS.titleMax, `O nome pode ter no máximo ${PRODUCT_LIMITS.titleMax} caracteres.`),
  categoryId: z.string().min(1, 'Escolha uma categoria.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o preço.')
    .refine((text) => parsePriceToCents(text) !== null, 'Digite um preço válido, por exemplo 45,00.')
    .refine((text) => {
      const cents = parsePriceToCents(text)
      return cents === null || cents >= PRODUCT_LIMITS.priceMinInCents
    }, 'O preço deve ser maior que zero.')
    .refine((text) => {
      const cents = parsePriceToCents(text)
      return cents === null || cents <= PRODUCT_LIMITS.priceMaxInCents
    }, 'O preço pode ser no máximo R$ 99.999,99.'),
  description: z
    .string()
    .trim()
    .min(1, 'Informe a descrição.')
    .min(
      PRODUCT_LIMITS.descriptionMin,
      `A descrição deve ter pelo menos ${PRODUCT_LIMITS.descriptionMin} caracteres.`,
    )
    .max(
      PRODUCT_LIMITS.descriptionMax,
      `A descrição pode ter no máximo ${PRODUCT_LIMITS.descriptionMax} caracteres.`,
    )
    .refine((text) => !containsHtml(text), 'Escreva só texto, sem códigos HTML.'),
  // O campo nasce com o vendedor atual e só troca por outro da lista: nunca fica vazio.
  seller: z.object({ id: z.number(), name: z.string(), email: z.string() }),
  whatsapp: z
    .string()
    .trim()
    .min(1, 'Informe o WhatsApp.')
    .refine((text) => [10, 11].includes(text.replace(/\D/g, '').length), 'Digite o WhatsApp com DDD (10 ou 11 dígitos).'),
  status: z.enum(['active', 'paused', 'sold']),
})

export type AdminProductFormValues = z.infer<typeof adminProductSchema>

// Imagem do produto: JPG ou PNG de até 4 MB (RN-ANU-03). Devolve a mensagem de erro ou null.
export function validateProductImage(file: Pick<File, 'type' | 'size'>): string | null {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) return 'Use uma imagem JPG ou PNG.'
  if (file.size > PRODUCT_LIMITS.imageMaxBytes) return 'A imagem pode ter no máximo 4 MB.'
  return null
}
