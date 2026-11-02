import { useMutation } from '@tanstack/react-query'
import { requestPasswordReset } from '../services/account.service'

// RN-ACE-15: envia o link para criar a primeira senha de uma conta Google.
export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset })
}
