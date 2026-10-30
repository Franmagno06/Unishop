import { z } from 'zod'
import { LISTING_LIMITS } from '../../config/constants'
import { decimalToCents } from '../../shared/utils/money'
import { whatsappField } from '../../shared/schemas/profile-fields'
import { paginationSchema } from '../../shared/utils/pagination'

// minPrice e maxPrice chegam em reais ("20" ou "20.50"), como no exemplo do backend.md §9.4, e viram
// centavos aqui. O resto do código só conhece centavos.
const priceField = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Informe o valor em reais, por exemplo 20 ou 20.50.')
  .transform(decimalToCents)

// RN-ANU-05 a 07. Filtros opcionais; busca de até 100 caracteres (Regras §9).
export const listListingsQuerySchema = paginationSchema
  .extend({
    category: z.coerce.number().int().positive().optional(),
    search: z
      .string()
      .trim()
      .max(LISTING_LIMITS.searchMax)
      .transform((v) => v || undefined)
      .optional(),
    minPrice: priceField.optional(),
    maxPrice: priceField.optional(),
    sort: z.enum(['recent', 'price_asc', 'price_desc']).default('recent'),
  })
  .refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
    message: 'O preço mínimo não pode ser maior que o máximo.',
    path: ['minPrice'],
  })
  .transform(({ page, limit, category, search, minPrice, maxPrice, sort }) => ({
    pagination: { page, limit },
    filters: {
      categoryId: category,
      search,
      minPriceCents: minPrice,
      maxPriceCents: maxPrice,
      sort,
    },
  }))

// Descrição e título sem HTML (RN-ANU-12). A tela escapa o texto, mas o servidor também recusa.
const noHtml = (v: string) => !/<\/?[a-z][^>]*>/i.test(v)

// POST /listings chega como multipart: todos os campos são texto e viram número aqui (RN-ANU-01, 02,
// RN-EST-01, RN-ANU-12). O preço vem em centavos inteiros, como na resposta. WhatsApp vazio ou
// ausente herda o do perfil.
export const createListingBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(LISTING_LIMITS.nameMin)
    .max(LISTING_LIMITS.nameMax)
    .refine(noHtml, 'O título não pode ter HTML.'),
  categoryId: z.coerce.number().int().positive(),
  description: z
    .string()
    .trim()
    .min(LISTING_LIMITS.descriptionMin)
    .max(LISTING_LIMITS.descriptionMax)
    .refine(noHtml, 'A descrição não pode ter HTML.'),
  priceInCents: z.coerce
    .number()
    .int()
    .min(LISTING_LIMITS.priceMinCents)
    .max(LISTING_LIMITS.priceMaxCents),
  quantity: z.coerce.number().int().min(LISTING_LIMITS.quantityMin).max(LISTING_LIMITS.quantityMax),
  whatsapp: whatsappField.optional(),
})

// RF001.4: o tamanho do carrossel não está definido nos documentos; padrão 10, máximo 20.
export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export const listingIdParamSchema = z.object({ id: z.coerce.number().int().positive() })
export const imageParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
  imageId: z.coerce.number().int().positive(),
})
