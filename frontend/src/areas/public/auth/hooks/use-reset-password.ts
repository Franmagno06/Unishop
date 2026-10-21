import { useMutation } from '@tanstack/react-query'
import { resetPassword } from '../services/auth.service'

// Define a nova senha com o token do link (POST /auth/reset-password).
export function useResetPassword() {
  return useMutation({ mutationFn: resetPassword })
}
