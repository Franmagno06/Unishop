import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ROUTES } from '../../../../shared/constants/routes'
import { register } from '../services/auth.service'

// Com a confirmação de e-mail desligada (MVP, RN-ACE-07), o cadastro leva direto ao login.
export function useRegister() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: register,
    onSuccess: () => navigate(ROUTES.login, { replace: true, state: { registered: true } }),
  })
}
