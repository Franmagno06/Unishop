import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '../../../../shared/components/ui/Button'
import { Checkbox } from '../../../../shared/components/ui/Checkbox'
import { Field } from '../../../../shared/components/ui/Field'
import { FormError } from '../../../../shared/components/ui/FormError'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { GoogleButton } from '../components/GoogleButton'
import { OrDivider } from '../components/OrDivider'
import { useRegister } from '../hooks/use-register'
import { registerSchema, type RegisterValues } from '../schemas/auth.schemas'
import { authErrorMessage } from '../utils/error-messages'

const linkClass =
  'rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const inlineLink = 'font-semibold text-primary underline-offset-2 hover:underline'

// RF002 · RN-ACE-01 a 06 e 14. Curso e WhatsApp não são pedidos aqui: entram pelo perfil
// (backend.md §9, cadastro). O Figma os mostra, mas o contrato do backend não os recebe.
export function RegisterPage() {
  useDocumentTitle('Criar conta')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: { acceptTerms: false },
  })
  const signUp = useRegister()

  // E-mail repetido e domínio recusado aparecem no próprio campo.
  const emailApiError =
    signUp.error instanceof ApiError &&
    ['EMAIL_ALREADY_REGISTERED', 'EMAIL_DOMAIN_NOT_ALLOWED'].includes(signUp.error.code)
      ? authErrorMessage(signUp.error)
      : undefined
  const formError = signUp.isError && !emailApiError ? authErrorMessage(signUp.error) : undefined

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Criar conta</h1>
        <p className="text-[15px] text-text-muted">
          Use seu e-mail institucional para entrar na comunidade.
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((values) => signUp.mutate(values))}
        className="flex flex-col gap-5"
      >
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
            hint="8 a 72 caracteres, com 1 número e 1 letra maiúscula."
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

        {formError ? <FormError>{formError}</FormError> : null}

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
