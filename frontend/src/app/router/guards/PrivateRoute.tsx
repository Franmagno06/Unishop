import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorAlert } from '../../../shared/components/ui/Alert'
import { Button } from '../../../shared/components/ui/Button'
import { ROUTES } from '../../../shared/constants/routes'
import { useSession } from '../../../shared/hooks/use-session'
import { useAuthMe } from '../../../shared/lib/auth-me'
import { isLeaving } from '../../../shared/lib/session'

// Só UX (RN-ACE-11, RN-CAT-04): sem sessão vai ao login guardando o destino; com o aceite dos
// Termos pendente (primeiro acesso por Google, RN-ACE-14) vai a "Completar cadastro". A verificação
// de verdade é do backend em cada rota (403 TERMS_NOT_ACCEPTED, 401).
export function PrivateRoute() {
  const { isLoggedIn } = useSession()
  const location = useLocation()
  const me = useAuthMe(isLoggedIn)
  const from = `${location.pathname}${location.search}`

  if (!isLoggedIn) {
    // "Sair": login comum, sem destino guardado.
    if (isLeaving()) return <Navigate to={ROUTES.login} replace />
    return <Navigate to={ROUTES.login} replace state={{ from }} />
  }

  if (me.isError) {
    // 401 já levou ao login pelo `api()`; aqui sobra falha de rede ou do servidor.
    return (
      <section className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-12">
        <ErrorAlert title="Não foi possível carregar sua conta">
          Confira sua conexão e tente de novo.
        </ErrorAlert>
        <Button onClick={() => void me.refetch()}>Tentar de novo</Button>
      </section>
    )
  }

  if (!me.data) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center text-text-muted">
        Carregando…
      </div>
    )
  }

  if (me.data.needsTermsAcceptance && location.pathname !== ROUTES.completeProfile) {
    return <Navigate to={ROUTES.completeProfile} replace state={{ from }} />
  }
  return <Outlet />
}
