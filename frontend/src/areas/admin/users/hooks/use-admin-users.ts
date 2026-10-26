import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteUser,
  getUserDetail,
  getUserStats,
  listUsers,
  updateUser,
} from '../services/users.service'
import type { UpdateUserInput, UserListQuery } from '../types/user.types'

const usersKey = ['admin', 'users'] as const

export function useUserStats() {
  return useQuery({ queryKey: [...usersKey, 'stats'], queryFn: ({ signal }) => getUserStats(signal) })
}

export function useUsers(query: UserListQuery) {
  return useQuery({
    queryKey: [...usersKey, 'list', query],
    queryFn: ({ signal }) => listUsers(query, signal),
    // Ao buscar ou trocar de página, a lista anterior fica na tela até a nova chegar.
    placeholderData: keepPreviousData,
  })
}

export function useUserDetail(id: number) {
  return useQuery({
    queryKey: [...usersKey, 'detail', id],
    queryFn: ({ signal }) => getUserDetail(id, signal),
    enabled: Number.isInteger(id) && id > 0,
  })
}

// Editar e excluir mudam a lista, os indicadores e os produtos (o vendedor excluído some deles).
function useInvalidateAdminData() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['admin'] })
}

export function useUpdateUser(id: number) {
  const invalidate = useInvalidateAdminData()
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(id, input),
    onSuccess: invalidate,
  })
}

export function useDeleteUser() {
  const invalidate = useInvalidateAdminData()
  return useMutation({ mutationFn: (id: number) => deleteUser(id), onSuccess: invalidate })
}
