import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listSupportRequests, updateSupportRequestStatus } from '../services/support.service'
import type { SupportRequestStatus } from '../types/support.types'

const supportKey = ['admin', 'support'] as const

export function useSupportRequests() {
  return useQuery({ queryKey: supportKey, queryFn: listSupportRequests })
}

export function useUpdateSupportRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: SupportRequestStatus }) =>
      updateSupportRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supportKey }),
  })
}
