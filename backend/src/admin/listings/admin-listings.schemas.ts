import { z } from 'zod'
import { LISTING_LIMITS } from '../../config/constants'
import { paginationSchema } from '../../shared/utils/pagination'

// RN-ADM-07: busca por nome do anúncio ou do vendedor, filtro por categoria e paginação.
export const listAdminListingsQuerySchema = paginationSchema.extend({
  search: z
    .string()
    .trim()
    .max(LISTING_LIMITS.searchMax)
    .transform((v) => v || undefined)
    .optional(),
  category: z.coerce.number().int().positive().optional(),
})

export const adminListingIdParamSchema = z.object({ id: z.coerce.number().int().positive() })
