import { useMutation } from '@tanstack/react-query'
import { loginWithGoogle } from '../services/auth.service'
import { usePostLogin } from './use-post-login'

// RN-ACE-14: ID token do Google → POST /auth/google → mesma sessão do login comum.
export function useGoogleLogin() {
  const enter = usePostLogin()
  return useMutation({ mutationFn: loginWithGoogle, onSuccess: ({ data }) => enter(data) })
}
