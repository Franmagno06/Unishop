import type { Page } from '../types'

// Lista da API do admin (backend.md §9): { data, meta: { page, limit, total, totalPages } }.
export type ApiPage<R> = {
  data: R[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

// A tela usa `pageSize` onde a API diz `limit`; o service converte aqui, os componentes não mudam.
export function toPage<R, T>({ data, meta }: ApiPage<R>, map: (row: R) => T): Page<T> {
  return {
    items: data.map(map),
    total: meta.total,
    page: meta.page,
    pageSize: meta.limit,
    totalPages: Math.max(1, meta.totalPages),
  }
}
