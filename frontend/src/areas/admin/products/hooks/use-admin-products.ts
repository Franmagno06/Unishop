import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteProduct,
  getCategories,
  getProductDetail,
  getProductStats,
  listProducts,
  updateProduct,
} from '../services/products.service'
import type { ProductListQuery, UpdateProductInput } from '../types/product.types'

const productsKey = ['admin', 'products'] as const

export function useProductStats() {
  return useQuery({
    queryKey: [...productsKey, 'stats'],
    queryFn: ({ signal }) => getProductStats(signal),
  })
}

export function useAdminCategories() {
  return useQuery({ queryKey: ['admin', 'categories'], queryFn: getCategories, staleTime: Infinity })
}

export function useProducts(query: ProductListQuery) {
  return useQuery({
    queryKey: [...productsKey, 'list', query],
    queryFn: ({ signal }) => listProducts(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useProductDetail(id: number) {
  return useQuery({
    queryKey: [...productsKey, 'detail', id],
    queryFn: ({ signal }) => getProductDetail(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}

function useInvalidateAdminData() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['admin'] })
}

export function useUpdateProduct(id: number) {
  const invalidate = useInvalidateAdminData()
  return useMutation({
    mutationFn: (input: UpdateProductInput) => updateProduct(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteProduct() {
  const invalidate = useInvalidateAdminData()
  return useMutation({ mutationFn: (id: number) => deleteProduct(id), onSuccess: invalidate })
}
