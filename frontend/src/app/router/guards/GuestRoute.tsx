import { Navigate, Outlet, useLocation } from 'react-router'
import { ROUTES } from '../../../shared/constants/routes'
import { useSession } from '../../../shared/hooks/use-session'
import { adminDestination } from '../../../shared/utils/admin-destination'

type LocationState = { from?: string } | null

// Só UX: a barreira de segurança de verdade é o backend (frontend.md §6).
// Ainda não consulta GET /auth/me: isso entra com o AuthProvider.
export function GuestRoute() {
  const { isLoggedIn, role } = useSession()
  const from = (useLocation().state as LocationState)?.from
  if (!isLoggedIn) return <Outlet />
  // Ao entrar, o aluno volta para onde estava (ex.: o produto de onde clicou em "Fazer pedido");
  // sem isso este redirecionamento vence o do login e ele cairia sempre em Categorias.
  const student = from ?? ROUTES.categories
  return <Navigate to={role === 'admin' ? adminDestination(from) : student} replace />
}
