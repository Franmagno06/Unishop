import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { BackLink } from '../../../../shared/components/ui/BackLink'
import { Button } from '../../../../shared/components/ui/Button'
import { Field } from '../../../../shared/components/ui/Field'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { useForgotPassword } from '../hooks/use-forgot-password'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/auth.schemas'
import { authErrorContent } from '../utils/error-messages'

// RF004.1 · RN-ACE-10. A resposta é a mesma exista ou não a conta (a tela seguinte nunca diz
// se o e-mail está cadastrado).
export function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha')
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), mode: 'onTouched' })
  const send = useForgotPassword()
  const failure = send.isError ? authErrorContent(send.error, 'forgot') : null

  function onSubmit(values: ForgotPasswordValues) {
    const email = values.email.trim()
    send.mutate(
      { email },
      { onSuccess: () => navigate(ROUTES.forgotPasswordSent, { state: { email } }) },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink fallbackTo={ROUTES.login} />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Esqueceu a senha?</h1>
        <p className="text-[15px] text-text-muted">
          Informe seu e-mail institucional e enviaremos um link para você criar uma nova senha.
        </p>
      </div>

      {failure ? <ErrorAlert title={failure.title}>{failure.message}</ErrorAlert> : null}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Field
          label="E-mail institucional"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="seunome@edu.unifor.br"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" fullWidth disabled={send.isPending}>
          {send.isPending ? 'Enviando…' : 'Enviar link'}
        </Button>
      </form>
    </div>
  )
}
