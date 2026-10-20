import { Navigate, Outlet } from 'react-router'
import { ROUTES } from '../../../shared/constants/routes'
import { hasToken } from '../../../shared/lib/session'

// Só UX: a barreira de segurança de verdade é o backend (frontend.md §6).
// Ainda não consulta GET /auth/me: isso entra com o AuthProvider.
export function GuestRoute() {
  return hasToken() ? <Navigate to={ROUTES.categories} replace /> : <Outlet />
}
