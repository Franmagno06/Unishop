import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from '../../../../shared/constants/routes'
import { setToken } from '../../../../shared/lib/session'
import { login } from '../services/auth.service'

type LocationState = { from?: string } | null

// RF003.4 e RN-ACE-13: aluno vai para Categorias (ou para onde estava); admin, para o painel.
export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState)?.from

  return useMutation({
    mutationFn: login,
    onSuccess: ({ data }) => {
      setToken(data.token, data.user.role)
      const destination =
        data.user.role === 'admin' ? ROUTES.adminUsers : (from ?? ROUTES.categories)
      navigate(destination, { replace: true })
    },
  })
}
