import { useMutation, useQueryClient } from '@tanstack/react-query'
import { loginWithGoogle } from '../services/auth.service'
import { usePostLogin } from './use-post-login'

// RN-ACE-14: ID token do Google → POST /auth/google → mesma sessão do login comum.
export function useGoogleLogin() {
  const enter = usePostLogin()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: ({ data }) => {
      // A resposta já diz se o aceite dos Termos está pendente: o PrivateRoute não precisa gastar
      // outra consulta do limite do /auth em GET /auth/me.
      queryClient.setQueryData(['auth', 'me', data.token], {
        user: data.user,
        needsTermsAcceptance: data.needsTermsAcceptance,
      })
      enter(data)
    },
  })
}
