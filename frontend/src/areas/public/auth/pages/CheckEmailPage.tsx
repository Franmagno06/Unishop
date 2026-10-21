import { Navigate, useLocation } from 'react-router'
import { ErrorAlert, SuccessAlert } from '../../../../shared/components/ui/Alert'
import { BackLink } from '../../../../shared/components/ui/BackLink'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { DemoResetLinks } from '../components/DemoResetLinks'
import { useForgotPassword } from '../hooks/use-forgot-password'
import { authErrorContent } from '../utils/error-messages'

// RF004.3 · RN-ACE-10 (o link vale 30 minutos). O e-mail vem da tela anterior pelo estado da rota;
// se a pessoa abrir esta tela direto (ou recarregar), volta para pedir o link de novo.
export function CheckEmailPage() {
  useDocumentTitle('Verifique seu e-mail')
  const location = useLocation()
  const email = (location.state as { email?: string } | null)?.email
  const resend = useForgotPassword()

  if (!email) return <Navigate to={ROUTES.forgotPassword} replace />

  const failure = resend.isError ? authErrorContent(resend.error, 'forgot') : null

  return (
    <div className="flex flex-col gap-5">
      <BackLink fallbackTo={ROUTES.forgotPassword} />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Verifique seu e-mail</h1>
        <p className="text-[15px] text-text-muted">
          Enviamos um link para <strong className="break-all font-semibold text-text">{email}</strong>
          . Ele expira em 30 minutos. Confira também a caixa de spam.
        </p>
      </div>

      {resend.isSuccess ? (
        <SuccessAlert>E-mail reenviado. Confira sua caixa de entrada.</SuccessAlert>
      ) : null}
      {failure ? <ErrorAlert title={failure.title}>{failure.message}</ErrorAlert> : null}

      {/* import.meta.env.DEV: a simulação do e-mail sai do build de produção */}
      {import.meta.env.DEV ? <DemoResetLinks email={email} /> : null}

      <button
        type="button"
        disabled={resend.isPending}
        onClick={() => resend.mutate({ email })}
        className="self-start rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50"
      >
        {resend.isPending ? 'Reenviando…' : 'Não recebeu? Reenviar e-mail'}
      </button>
    </div>
  )
}
