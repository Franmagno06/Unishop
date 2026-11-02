import { Navigate, Outlet, useLocation } from 'react-router'
import { ErrorAlert } from '../../../shared/components/ui/Alert'
import { Button } from '../../../shared/components/ui/Button'
import { ROUTES } from '../../../shared/constants/routes'
import { useLogout } from '../../../shared/hooks/use-logout'
import { useSession } from '../../../shared/hooks/use-session'
import { ApiError } from '../../../shared/lib/api'
import { useAuthMe } from '../../../shared/lib/auth-me'
import { isLeaving } from '../../../shared/lib/session'

// Só UX (RN-ACE-11, RN-CAT-04): sem sessão vai ao login guardando o destino; com o aceite dos
// Termos pendente (primeiro acesso por Google, RN-ACE-14) vai a "Completar cadastro". A verificação
// de verdade é do backend em cada rota (403 TERMS_NOT_ACCEPTED, 401).
export function PrivateRoute() {
  const { isLoggedIn } = useSession()
  const location = useLocation()
  const me = useAuthMe(isLoggedIn)
  const logout = useLogout()
  const from = `${location.pathname}${location.search}`

  if (!isLoggedIn) {
    // "Sair": o useLogout navega logo em seguida (tela inicial para o aluno, login para o admin). O
    // guard não guarda destino nem escolhe o lugar: só espera, para não tratar a saída como "sessão
    // ausente".
    if (isLeaving()) return null
    return <Navigate to={ROUTES.login} replace state={{ from }} />
  }

  if (me.isError) {
    // 401 já levou ao login pelo `api()`; aqui sobra conta suspensa (403), limite de requisições
    // (429) e falha de rede ou do servidor. O "Sair" é a saída: /login devolveria quem tem sessão para
    // cá, e esta tela fica fora do cabeçalho do aluno.
    const status = me.error instanceof ApiError ? me.error.status : 0
    const message =
      status === 403
        ? 'Sua conta está suspensa. Fale com o suporte.'
        : status === 429
          ? 'Muitas consultas em pouco tempo. Aguarde um minuto e tente de novo.'
          : 'Confira sua conexão e tente de novo.'
    return (
      <section className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-12">
        <ErrorAlert title="Não foi possível carregar sua conta">{message}</ErrorAlert>
        {status === 403 ? null : <Button onClick={() => void me.refetch()}>Tentar de novo</Button>}
        <Button variant="secondary" onClick={logout}>
          Sair
        </Button>
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
