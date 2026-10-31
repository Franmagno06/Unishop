import { z } from 'zod'
import { paginationSchema } from '../../shared/utils/pagination'
import { AUDIT_ACTIONS } from './audit-logs.types'

const instant = z.iso.datetime({ offset: true }).transform((v) => new Date(v))

// RN-ADM-10: filtros por responsável, ação e período.
export const listAuditLogsQuerySchema = paginationSchema
  .extend({
    adminId: z.coerce.number().int().positive().optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    from: instant.optional(),
    to: instant.optional(),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: 'O início não pode ser depois do fim.',
    path: ['from'],
  })
