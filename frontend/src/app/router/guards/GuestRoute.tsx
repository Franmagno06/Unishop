import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '../../../shared/constants/routes'
import { useSession } from '../../../shared/hooks/use-session'

// Só UX: a barreira de segurança de verdade é o backend (frontend.md §6).
// Ainda não consulta GET /auth/me: isso entra com o AuthProvider.
export function GuestRoute() {
  const { isLoggedIn, role } = useSession()
  if (!isLoggedIn) return <Outlet />
  return <Navigate to={role === 'admin' ? ROUTES.adminUsers : ROUTES.categories} replace />
}
