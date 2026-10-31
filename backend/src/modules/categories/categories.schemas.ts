import { z } from 'zod'
import { LISTING_LIMITS } from '../../config/constants'

// RN-CAT-03: a busca por texto procura categorias. Limite de 100 caracteres (Regras §9).
export const listCategoriesQuerySchema = z.object({
  search: z.string().trim().max(LISTING_LIMITS.searchMax).optional(),
})
