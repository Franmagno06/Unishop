import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'
import { Button } from '../../../../shared/components/ui/Button'
import { Field } from '../../../../shared/components/ui/Field'
import { FormError } from '../../../../shared/components/ui/FormError'
import { FormNotice } from '../../../../shared/components/ui/FormNotice'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { GoogleButton } from '../components/GoogleButton'
import { OrDivider } from '../components/OrDivider'
import { useLogin } from '../hooks/use-login'
import { loginSchema, type LoginValues } from '../schemas/auth.schemas'
import { authErrorMessage } from '../utils/error-messages'

const linkClass =
  'rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// RF003 · RN-ACE-08, 09, 12, 13, 14. A rota /admin/login usa esta mesma tela (decisão de 10/10).
export function LoginPage() {
  useDocumentTitle('Entrar')
  const location = useLocation()
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered === true

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: 'onTouched' })
  const login = useLogin()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-bold text-navy">Entrar</h1>
        <p className="text-[15px] text-text-muted">
          Bem-vindo de volta! Acesse com seu e-mail Unifor.
        </p>
      </div>

      {justRegistered ? <FormNotice>Conta criada! Entre com seu e-mail e senha.</FormNotice> : null}

      <form
        noValidate
        onSubmit={handleSubmit((values) => login.mutate(values))}
        className="flex flex-col gap-5"
      >
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
        <Field
          label="Senha"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Link to={ROUTES.forgotPassword} className={`${linkClass} self-start`}>
          Esqueci minha senha
        </Link>

        {login.isError ? <FormError>{authErrorMessage(login.error)}</FormError> : null}

        <Button type="submit" fullWidth disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <OrDivider />
      <GoogleButton />

      <Link to={ROUTES.register} className={`${linkClass} self-start`}>
        Não tem conta? Criar conta
      </Link>
    </div>
  )
}
