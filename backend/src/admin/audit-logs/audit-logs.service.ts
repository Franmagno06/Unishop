import { buildMeta, type Pagination } from '../../shared/utils/pagination'
import type { AuditLogFilters, AuditLogRepository } from './audit-logs.types'

export function createAuditLogsService({ auditLogs }: { auditLogs: AuditLogRepository }) {
  // RN-ADM-10: consulta do log por responsável, ação e período.
  async function list(filters: AuditLogFilters, pagination: Pagination) {
    const { items, total } = await auditLogs.list(filters, pagination)
    return { data: items, meta: buildMeta(pagination, total) }
  }
  return { list }
}
export type AuditLogsService = ReturnType<typeof createAuditLogsService>
