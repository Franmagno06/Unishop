import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { Checkbox } from '../../../../shared/components/ui/Checkbox'
import { Field } from '../../../../shared/components/ui/Field'
import { ROUTES } from '../../../../shared/constants/routes'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { ApiError } from '../../../../shared/lib/api'
import { onlyDigits } from '../../../../shared/utils/whatsapp'
import { useCompleteProfile } from '../hooks/use-complete-profile'
import { completeProfileSchema, type CompleteProfileValues } from '../schemas/profile.schemas'

const inlineLink =
  'rounded font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// RN-ACE-06 e 14 (provisória: sem quadro no Figma, roteiro-telas.md §5). Primeiro acesso por Google:
// aceite dos Termos e da Política e, se o aluno quiser, curso e WhatsApp. Até o aceite ser gravado,
// as outras rotas privadas levam para cá (PrivateRoute; o backend responde 403 TERMS_NOT_ACCEPTED).
export function CompleteProfilePage() {
  useDocumentTitle('Completar cadastro')
  const save = useCompleteProfile()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onTouched',
    defaultValues: { course: '', whatsapp: '' },
  })

  function onSubmit(values: CompleteProfileValues) {
    save.mutate({ course: values.course, whatsapp: onlyDigits(values.whatsapp) })
  }

  return (
    <section className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 pb-20 pt-10 sm:px-5 md:pt-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold text-navy">Complete seu cadastro</h1>
        <p className="text-text-muted">
          Você entrou com sua conta Google. Falta aceitar os Termos para usar o Unishop; curso e
          WhatsApp são opcionais e você pode mudar depois no perfil.
        </p>
      </div>

      <Card className="p-5 sm:p-8">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {save.isError ? (
            <ErrorAlert title="Não foi possível salvar">
              {save.error instanceof ApiError && save.error.status < 500
                ? save.error.message
                : 'Confira sua conexão e tente de novo.'}
            </ErrorAlert>
          ) : null}

          <Field label="Curso (opcional)" autoComplete="off" error={errors.course?.message} {...register('course')} />
          <Field
            label="WhatsApp (opcional)"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(85) 99999-0000"
            error={errors.whatsapp?.message}
            {...register('whatsapp')}
          />

          <Checkbox error={errors.acceptTerms?.message} {...register('acceptTerms')}>
            Li e aceito os{' '}
            <Link to={ROUTES.terms} target="_blank" rel="noopener noreferrer" className={inlineLink}>
              Termos de uso
            </Link>{' '}
            e a{' '}
            <Link to={ROUTES.privacy} target="_blank" rel="noopener noreferrer" className={inlineLink}>
              Política de privacidade
            </Link>{' '}
            do Unishop, conforme a LGPD. *
          </Checkbox>

          <Button type="submit" fullWidth disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Continuar'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
