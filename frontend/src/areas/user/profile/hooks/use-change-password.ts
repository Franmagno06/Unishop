import { useMutation } from '@tanstack/react-query'
import { getRole, setToken } from '../../../../shared/lib/session'
import { changePassword } from '../services/account.service'

// RN-ACE-15: a troca devolve um token novo (o anterior passa a ser recusado). A sessão troca o token
// e segue com o mesmo papel; as outras abas e aparelhos caem no próximo 401.
export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
    onSuccess: (token) => setToken(token, getRole() ?? 'student'),
  })
}
