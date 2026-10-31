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

// RN-ADM-08: o admin altera só o status (Ativo ou Pausado); qualquer outra chave dá 400.
// "sold" não entra: o admin não marca como vendido.
export const updateAdminListingSchema = z.strictObject({ status: z.enum(['active', 'paused']) })
