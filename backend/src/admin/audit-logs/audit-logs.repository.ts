import type { Prisma } from '../../generated/prisma/client'
import type { Db } from '../../shared/database/prisma'
import { toSkipTake } from '../../shared/utils/pagination'
import type {
  AuditAction,
  AuditEntity,
  AuditLogFilters,
  AuditLogRepository,
  AuditWriter,
} from './audit-logs.types'

// bd.md §4.7 (acao) e §6 (entidade). `editar_usuario` do banco não tem uso: o admin não edita dados (RN-ADM-04).
const ACTION_TO_DB: Record<AuditAction, string> = {
  suspend_user: 'suspender_usuario',
  reactivate_user: 'reativar_usuario',
  delete_user: 'excluir_usuario',
  edit_listing: 'editar_anuncio',
  revert_sold: 'reverter_vendido',
  delete_listing: 'excluir_anuncio',
}
const ENTITY_TO_DB: Record<AuditEntity, string> = { user: 'usuario', listing: 'anuncio' }
const ACTION_FROM_DB = Object.fromEntries(
  Object.entries(ACTION_TO_DB).map(([k, v]) => [v, k]),
) as Record<string, AuditAction>
const ENTITY_FROM_DB = Object.fromEntries(
  Object.entries(ENTITY_TO_DB).map(([k, v]) => [v, k]),
) as Record<string, AuditEntity>

function fromDb<T>(map: Record<string, T>, value: string, what: string): T {
  const found = map[value]
  if (found === undefined) throw new Error(`log_admin.${what} desconhecido: ${value}`)
  return found
}

/** Grava UMA linha em log_admin usando o tx recebido. Nunca abre transação própria (RN-ADM-10). */
export const writeAuditLog: AuditWriter = async (tx, entry) => {
  await tx.auditLog.create({
    data: {
      adminId: entry.adminId,
      action: ACTION_TO_DB[entry.action],
      entity: ENTITY_TO_DB[entry.entity],
      entityId: entry.entityId,
      details: entry.details,
    },
  })
}

function whereOf(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const { adminId, action, from, to } = filters
  return {
    ...(adminId !== undefined && { adminId }),
    ...(action !== undefined && { action: ACTION_TO_DB[action] }),
    ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
  }
}

export function createPrismaAuditLogRepository(db: Db): AuditLogRepository {
  return {
    async list(filters, pagination) {
      const where = whereOf(filters)
      const [rows, total] = await db.$transaction([
        db.auditLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { admin: { select: { id: true, name: true } } },
          ...toSkipTake(pagination),
        }),
        db.auditLog.count({ where }),
      ])
      return {
        items: rows.map((r) => ({
          id: r.id,
          admin: { id: r.admin.id, name: r.admin.name },
          action: fromDb(ACTION_FROM_DB, r.action, 'acao'),
          target: { type: fromDb(ENTITY_FROM_DB, r.entity, 'entidade'), id: r.entityId },
          at: r.createdAt,
          changes: r.details,
        })),
        total,
      }
    },
  }
}
