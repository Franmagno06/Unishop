import { z } from 'zod'
import { LISTING_LIMITS, MAX_DB_ID } from '../../config/constants'
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

export const adminUserIdParamSchema = z.object({
  id: z.coerce.number().int().positive().max(MAX_DB_ID),
})

// RN-ADM-04: o admin edita só o status da conta; qualquer outra chave dá 400 (strictObject).
// `excluida` não entra: vem só da ação Excluir.
export const updateAdminUserSchema = z.strictObject({ status: z.enum(['active', 'suspended']) })
