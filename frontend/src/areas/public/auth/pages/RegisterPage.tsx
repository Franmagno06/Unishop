import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button } from '../../../../shared/components/ui/Button'
import { Checkbox } from '../../../../shared/components/ui/Checkbox'
import { Field } from '../../../../shared/components/ui/Field'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { GoogleButton } from '../components/GoogleButton'
import { MockModeNotice } from '../components/MockModeNotice'
import { OrDivider } from '../components/OrDivider'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { useRegister } from '../hooks/use-register'
import { registerSchema, type RegisterValues } from '../schemas/auth.schemas'
import { authErrorContent } from '../utils/error-messages'

const linkClass =
  'rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const inlineLink = 'font-semibold text-primary underline-offset-2 hover:underline'

// Erros que aparecem no próprio campo do e-mail em vez de uma caixa de alerta.
const EMAIL_FIELD_ERRORS = ['EMAIL_ALREADY_REGISTERED', 'EMAIL_DOMAIN_NOT_ALLOWED']

// RF002 · RN-ACE-01 a 06 e 14. Curso e WhatsApp não são pedidos aqui: entram pelo perfil
// (backend.md §9, cadastro). O Figma os mostra, mas o contrato do backend não os recebe.
export function RegisterPage() {
  useDocumentTitle('Criar conta')
  const requirementsId = useId()

  const {
    register,
    handleSubmit,
    setFocus,
    control,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { acceptTerms: false },
  })
  const password = useWatch({ control, name: 'password', defaultValue: '' })
  const signUp = useRegister()

  const apiError = signUp.error instanceof ApiError ? signUp.error : null
  const emailApiError =
    apiError && EMAIL_FIELD_ERRORS.includes(apiError.code)
      ? authErrorContent(apiError, 'register').message
      : undefined
  const failure =
    signUp.isError && !emailApiError ? authErrorContent(signUp.error, 'register') : null

  function onSubmit(values: RegisterValues) {
    signUp.mutate(values, {
      onError: (error) => {
        if (error instanceof ApiError && EMAIL_FIELD_ERRORS.includes(error.code)) setFocus('email')
      },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Criar conta</h1>
        <p className="text-[15px] text-text-muted">
          Use seu e-mail institucional para entrar na comunidade.
        </p>
      </div>

      {import.meta.env.DEV ? <MockModeNotice page="register" /> : null}
      {failure ? <ErrorAlert title={failure.title}>{failure.message}</ErrorAlert> : null}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Field
          label="Nome completo"
          autoComplete="name"
          placeholder="Seu nome completo"
          error={errors.name?.message}
          {...register('name')}
        />
        <Field
          label="E-mail institucional"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="seunome@edu.unifor.br"
          error={errors.email?.message ?? emailApiError}
          {...register('email')}
        />
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
          <Field
            label="Senha"
            type="password"
            autoComplete="new-password"
            aria-describedby={requirementsId}
            error={errors.password?.message}
            {...register('password')}
          />
          <Field
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            error={errors.passwordConfirmation?.message}
            {...register('passwordConfirmation')}
          />
        </div>
        <PasswordRequirements id={requirementsId} password={password} />

        <Checkbox error={errors.acceptTerms?.message} {...register('acceptTerms')}>
          Li e aceito os{' '}
          <Link to={ROUTES.terms} target="_blank" rel="noopener noreferrer" className={inlineLink}>
            Termos de uso
          </Link>{' '}
          e a{' '}
          <Link
            to={ROUTES.privacy}
            target="_blank"
            rel="noopener noreferrer"
            className={inlineLink}
          >
            Política de privacidade
          </Link>{' '}
          do Unishop, conforme a LGPD. *
        </Checkbox>

        <Button type="submit" fullWidth disabled={signUp.isPending}>
          {signUp.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />

      <Link to={ROUTES.login} className={`${linkClass} self-start`}>
        Já tem conta? Entrar
      </Link>
    </div>
  )
}
