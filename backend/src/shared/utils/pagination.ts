import { z } from 'zod'
import { PAGINATION } from '../../config/constants'

// `limit` padrão 20, máximo 50 (backend.md §9.4). Chega como texto da query string.
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
})
export type Pagination = z.infer<typeof paginationSchema>

export const toSkipTake = ({ page, limit }: Pagination) => ({
  skip: (page - 1) * limit,
  take: limit,
})

export const buildMeta = ({ page, limit }: Pagination, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
})
