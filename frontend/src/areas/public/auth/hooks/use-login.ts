import { useMutation } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from '../../../../shared/constants/routes'
import { setToken } from '../../../../shared/lib/session'
import { adminDestination } from '../../../../shared/utils/admin-destination'
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
      // Aluno nunca volta a uma tela "/admin" (sobra de um logout do admin): vai às Categorias.
      const studentFrom = from?.startsWith('/admin') ? undefined : from
      const destination =
        data.user.role === 'admin' ? adminDestination(from) : (studentFrom ?? ROUTES.categories)
      navigate(destination, { replace: true })
    },
  })
}
