import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ErrorAlert, SuccessAlert } from '../../../../shared/components/ui/Alert'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { Field } from '../../../../shared/components/ui/Field'
import { PasswordRequirements } from '../../../../shared/components/ui/PasswordRequirements'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { useCurrentUser } from '../../../../shared/hooks/use-current-user'
import { useChangePassword } from '../hooks/use-change-password'
import { useRequestPasswordReset } from '../hooks/use-request-password-reset'
import { changePasswordSchema, type ChangePasswordValues } from '../schemas/profile.schemas'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    if (error.status < 500) return error.message
  }
  return 'Não foi possível trocar a senha agora. Tente de novo em instantes.'
}

// RN-ACE-15 (provisória: sem quadro no Figma, roteiro-telas.md §5). Exige a senha atual; a nova segue a
// regra do cadastro. O servidor devolve um token novo, que a sessão passa a usar.
export function ChangePasswordPage() {
  useDocumentTitle('Trocar senha')
  const requirementsId = useId()
  const save = useChangePassword()
  const email = useCurrentUser().email
  const sendLink = useRequestPasswordReset()
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmation: '' },
  })
  const newPassword = useWatch({ control, name: 'newPassword', defaultValue: '' })

  // O servidor responde o mesmo código para senha errada e para conta Google que nunca criou senha.
  const wrongCurrent = save.error instanceof ApiError && save.error.code === 'CURRENT_PASSWORD_INVALID'

  function onSubmit(values: ChangePasswordValues) {
    save.mutate(values, { onSuccess: () => reset() })
  }

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-5 md:pt-12">
      <ArrowLink to={ROUTES.profile}>Voltar ao perfil</ArrowLink>
      <h1 className="font-display text-4xl font-bold text-navy md:text-[40px]">Trocar senha</h1>

      <Card className="p-5 sm:p-8">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {save.isSuccess ? (
            <SuccessAlert title="Senha alterada">
              Sua senha foi atualizada. Em outros aparelhos, será preciso entrar de novo.
            </SuccessAlert>
          ) : null}
          {save.isError && !wrongCurrent ? (
            <ErrorAlert title="Não foi possível trocar a senha">{errorMessage(save.error)}</ErrorAlert>
          ) : null}

          <Field
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message ?? (wrongCurrent ? 'A senha atual está incorreta.' : undefined)}
            {...register('currentPassword')}
          />
          {wrongCurrent ? (
            <div className="-mt-3 flex flex-col items-start gap-2 text-[13px] text-text-muted">
              <p>Entrou com o Google e ainda não criou uma senha? Receba um link para criar a primeira.</p>
              {sendLink.isSuccess ? (
                <p role="status" className="font-semibold text-whatsapp">
                  Se a conta existir, enviamos o link para {email}.
                </p>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={sendLink.isPending || !email}
                  onClick={() => sendLink.mutate(email)}
                >
                  {sendLink.isPending ? 'Enviando…' : 'Enviar link para criar senha'}
                </Button>
              )}
              {sendLink.isError ? <p className="text-danger">Não foi possível enviar o link agora. Tente de novo.</p> : null}
            </div>
          ) : null}
          <Field
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            aria-describedby={requirementsId}
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordRequirements id={requirementsId} password={newPassword} />
          <Field
            label="Confirmar nova senha"
            type="password"
            autoComplete="new-password"
            error={errors.confirmation?.message}
            {...register('confirmation')}
          />

          <Button type="submit" fullWidth disabled={save.isPending}>
            {save.isPending ? 'Trocando…' : 'Trocar senha'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
