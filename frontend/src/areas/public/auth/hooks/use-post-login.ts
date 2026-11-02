import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from '../../../../shared/constants/routes'
import { setToken } from '../../../../shared/lib/session'
import { adminDestination } from '../../../../shared/utils/admin-destination'
import type { AuthUser } from '../types/auth.types'

type LocationState = { from?: string } | null

// RF003.4 e RN-ACE-13: depois de entrar (por e-mail ou Google), o aluno vai para Categorias (ou
// para onde estava); o admin, para o painel. O aceite pendente dos Termos (RN-ACE-14) é tratado pelo
// PrivateRoute, que leva a "Completar cadastro".
export function usePostLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState)?.from

  return ({ token, user }: { token: string; user: AuthUser }) => {
    setToken(token, user.role)
    // Aluno nunca volta a uma tela "/admin" (sobra de um logout do admin): vai às Categorias.
    const studentFrom = from?.startsWith('/admin') ? undefined : from
    const destination =
      user.role === 'admin' ? adminDestination(from) : (studentFrom ?? ROUTES.categories)
    navigate(destination, { replace: true })
  }
}
