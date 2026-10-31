import { describe, expect, it } from 'vitest'
import { buildMeta, paginationSchema, toSkipTake } from '../../src/shared/utils/pagination'

describe('pagination (backend.md §9.4)', () => {
  it('limit padrão 20 e página 1', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 20 })
  })

  it('aceita texto da query string e respeita o máximo de 50', () => {
    expect(paginationSchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 })
    expect(paginationSchema.safeParse({ limit: '51' }).success).toBe(false)
    expect(paginationSchema.safeParse({ limit: '0' }).success).toBe(false)
    expect(paginationSchema.safeParse({ page: '0' }).success).toBe(false)
    expect(paginationSchema.safeParse({ page: 'abc' }).success).toBe(false)
  })

  it('monta o meta com o total de páginas', () => {
    expect(buildMeta({ page: 2, limit: 20 }, 45)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    })
    expect(buildMeta({ page: 1, limit: 20 }, 0).totalPages).toBe(0)
  })

  it('converte página em skip/take', () => {
    expect(toSkipTake({ page: 3, limit: 20 })).toEqual({ skip: 40, take: 20 })
  })
})
