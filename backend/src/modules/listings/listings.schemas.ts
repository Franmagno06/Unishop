import { z } from 'zod'
import { LISTING_LIMITS } from '../../config/constants'
import { decimalToCents } from '../../shared/utils/money'
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

// RF001.4: o tamanho do carrossel não está definido nos documentos; padrão 10, máximo 20.
export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
})

export const listingIdParamSchema = z.object({ id: z.coerce.number().int().positive() })
