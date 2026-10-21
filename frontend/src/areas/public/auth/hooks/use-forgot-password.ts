import { useMutation } from '@tanstack/react-query'
import { forgotPassword } from '../services/auth.service'

// Pede o link de redefinição (POST /auth/forgot-password). Quem usa decide o que fazer depois:
// a tela "Esqueceu a senha?" vai para "Verifique seu e-mail"; o "Reenviar" só avisa.
export function useForgotPassword() {
  return useMutation({ mutationFn: forgotPassword })
}
