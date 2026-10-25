import { useMutation } from '@tanstack/react-query'
import { useLogout } from '../../../../shared/hooks/use-logout'
import { deleteAccount } from '../services/profile.service'

// Conta anonimizada: a sessão deixa de valer, então sai e volta à tela inicial (RN-PER-06).
export function useDeleteAccount() {
  const logout = useLogout()

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: logout,
  })
}
