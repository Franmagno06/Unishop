import { z } from 'zod'
import { LISTING_LIMITS } from '../../config/constants'
import { paginationSchema } from '../../shared/utils/pagination'

// RN-ADM-02: busca por nome ou e-mail.
export const listAdminUsersQuerySchema = paginationSchema.extend({
  search: z
    .string()
    .trim()
    .max(LISTING_LIMITS.searchMax)
    .transform((v) => v || undefined)
    .optional(),
})

export const adminUserIdParamSchema = z.object({ id: z.coerce.number().int().positive() })
