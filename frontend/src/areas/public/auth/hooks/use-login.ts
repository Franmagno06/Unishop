import { useMutation } from '@tanstack/react-query'
import { login } from '../services/auth.service'
import { usePostLogin } from './use-post-login'

// RF003.4 e RN-ACE-13.
export function useLogin() {
  const enter = usePostLogin()
  return useMutation({ mutationFn: login, onSuccess: ({ data }) => enter(data) })
}
