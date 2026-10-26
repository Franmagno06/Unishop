import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../../../shared/constants/routes'
import { useSession } from '../../../shared/hooks/use-session'
import { AccessDeniedPage } from './AccessDeniedPage'

// Só UX (RN-ADM-01, RF018.1): sem sessão vai ao login do admin guardando o destino; aluno vê
// "acesso negado". A verificação de verdade é feita pelo backend em cada rota.
export function AdminRoute() {
  const { isLoggedIn, role } = useSession()
  const location = useLocation()

  if (!isLoggedIn) {
    return (
      <Navigate
        to={ROUTES.adminLogin}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }
  if (role !== 'admin') return <AccessDeniedPage />
  return <Outlet />
}
