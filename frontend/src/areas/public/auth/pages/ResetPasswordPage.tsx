import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { BackLink } from '../../../../shared/components/ui/BackLink'
import { Button } from '../../../../shared/components/ui/Button'
import { Field } from '../../../../shared/components/ui/Field'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { useResetPassword } from '../hooks/use-reset-password'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/auth.schemas'
import { authErrorContent } from '../utils/error-messages'

const TOKEN_ERRORS = ['TOKEN_EXPIRED', 'TOKEN_INVALID']

// RF004.4 e RF004.5 · RN-ACE-04 e RN-ACE-10. O link só é conferido no envio: a API não tem uma
// rota para validar o token ao abrir a tela.
export function ResetPasswordPage() {
  useDocumentTitle('Criar nova senha')
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const requirementsId = useId()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), mode: 'onTouched' })
  const password = useWatch({ control, name: 'password', defaultValue: '' })
  const reset = useResetPassword()

  const failure = reset.isError ? authErrorContent(reset.error, 'reset') : null
  const linkProblem = reset.error instanceof ApiError && TOKEN_ERRORS.includes(reset.error.code)

  function onSubmit(values: ResetPasswordValues) {
    reset.mutate(
      { token, ...values },
      { onSuccess: () => navigate(ROUTES.passwordReset, { replace: true }) },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <BackLink fallbackTo={ROUTES.login} />
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Criar nova senha</h1>
        <p className="text-[15px] text-text-muted">
          Escolha uma senha forte que você ainda não usou no Unishop.
        </p>
      </div>

      {failure ? (
        <ErrorAlert title={failure.title}>
          {failure.message}
          {linkProblem ? (
            <>
              {' '}
              <Link
                to={ROUTES.forgotPassword}
                className="font-semibold text-primary underline underline-offset-2"
              >
                Pedir novo link
              </Link>
            </>
          ) : null}
        </ErrorAlert>
      ) : null}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Field
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          aria-describedby={requirementsId}
          error={errors.password?.message}
          {...register('password')}
        />
        <Field
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.passwordConfirmation?.message}
          {...register('passwordConfirmation')}
        />
        <PasswordRequirements id={requirementsId} password={password} />

        <Button type="submit" fullWidth disabled={reset.isPending}>
          {reset.isPending ? 'Redefinindo…' : 'Redefinir senha'}
        </Button>
      </form>
    </div>
  )
}
