import { describe, expect, it } from 'vitest'
import { toPage } from './admin-api'

describe('toPage', () => {
  it('converte { data, meta } em Page, com limit virando pageSize', () => {
    const page = toPage(
      { data: [{ n: 1 }, { n: 2 }], meta: { page: 2, limit: 7, total: 15, totalPages: 3 } },
      (row) => row.n * 10,
    )
    expect(page).toEqual({ items: [10, 20], total: 15, page: 2, pageSize: 7, totalPages: 3 })
  })

  it('lista vazia: totalPages nunca é menor que 1', () => {
    const page = toPage({ data: [], meta: { page: 1, limit: 7, total: 0, totalPages: 0 } }, (row) => row)
    expect(page).toEqual({ items: [], total: 0, page: 1, pageSize: 7, totalPages: 1 })
  })
})
