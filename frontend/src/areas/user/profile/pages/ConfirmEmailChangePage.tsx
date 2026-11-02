import { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { ErrorAlert, SuccessAlert } from '../../../../shared/components/ui/Alert'
import { ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { fromApi, setCurrentUser } from '../../../../shared/lib/current-user'
import { useConfirmEmailChange } from '../hooks/use-confirm-email-change'

function failureMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'TOKEN_EXPIRED') {
      return 'Este link expirou (ele vale 30 minutos). Peça um novo na edição do perfil.'
    }
    if (error.code === 'TOKEN_INVALID') {
      return 'Este link já foi usado ou não é válido. Se você pediu a troca em outra conta, entre nela.'
    }
    if (error.code === 'EMAIL_ALREADY_REGISTERED') {
      return 'Este e-mail já tem cadastro. Escolha outro na edição do perfil.'
    }
    if (error.code === 'NETWORK_ERROR') {
      return 'Sem conexão com o servidor. Confira a internet e abra o link de novo.'
    }
    if (error.status < 500) return error.message
  }
  return 'Não foi possível confirmar agora. Abra o link de novo em instantes.'
}

// RN-PER-02 (provisória: sem quadro no Figma, roteiro-telas.md §5). Abre pelo link que o servidor manda
// ao e-mail novo: /confirmar-troca-email/:token. O token só vale para quem está logado (PrivateRoute leva
// ao login e volta). Confirma uma única vez ao abrir: repetir a chamada gastaria o token.
export function ConfirmEmailChangePage() {
  useDocumentTitle('Confirmar troca de e-mail')
  const { token = '' } = useParams()
  const confirm = useConfirmEmailChange()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    confirm.mutate(token, { onSuccess: (user) => setCurrentUser(fromApi(user)) })
  }, [token, confirm])

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 pb-20 pt-10 sm:px-5 md:pt-16">
      <h1 className="font-display text-4xl font-bold text-navy">Confirmar troca de e-mail</h1>
      <Card className="flex flex-col gap-5 p-5 sm:p-8">
        {confirm.isSuccess ? (
          <>
            <SuccessAlert title="E-mail alterado">
              Seu e-mail agora é <strong>{confirm.data.email}</strong>. Use-o na próxima vez que entrar.
            </SuccessAlert>
            <ButtonLink to={ROUTES.profile}>Ir para o perfil</ButtonLink>
          </>
        ) : confirm.isError ? (
          <>
            <ErrorAlert title="Não foi possível confirmar">{failureMessage(confirm.error)}</ErrorAlert>
            <ButtonLink to={ROUTES.editProfile} variant="secondary">
              Pedir novo link
            </ButtonLink>
          </>
        ) : (
          <p role="status" className="text-text-muted">
            Confirmando seu novo e-mail…
          </p>
        )}
      </Card>
    </section>
  )
}
