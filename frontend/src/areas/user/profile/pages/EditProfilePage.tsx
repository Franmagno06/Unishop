import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { ArrowLink } from '../../../../shared/components/ui/ArrowLink'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { Field } from '../../../../shared/components/ui/Field'
import { ROUTES } from '../../../../shared/constants/routes'
import { useCurrentUser } from '../../../../shared/hooks/use-current-user'
import { useDocumentTitle } from '../../../../shared/hooks/use-document-title'
import { formatWhatsapp, onlyDigits } from '../../../../shared/utils/whatsapp'
import { AvatarUploader } from '../components/AvatarUploader'
import { DeleteAccountModal } from '../components/DeleteAccountModal'
import { useUpdateProfile } from '../hooks/use-update-profile'
import { profileSchema, type ProfileValues } from '../schemas/profile.schemas'

// RF013 · RN-PER-01 a 03, 05 e 07 (Figma 05b). Nome, curso, WhatsApp e foto valem ao salvar; o
// e-mail novo só vale depois de confirmado no novo endereço (RN-PER-02), então a tela avisa e o
// e-mail atual segue valendo. Dados de exemplo; sem guard até a API.
export function EditProfilePage() {
  useDocumentTitle('Editar perfil')
  const user = useCurrentUser()
  const save = useUpdateProfile()
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string>()
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    defaultValues: {
      name: user.name,
      email: user.email,
      course: user.course,
      whatsapp: formatWhatsapp(user.whatsapp),
    },
  })

  function onSubmit(values: ProfileValues) {
    save.mutate({
      name: values.name,
      email: values.email,
      course: values.course,
      whatsapp: onlyDigits(values.whatsapp),
      avatarUrl: photoUrl ?? user.avatarUrl,
    })
  }

  function handlePhoto(file: File) {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoError(undefined)
    setPhotoUrl(URL.createObjectURL(file))
  }

  return (
    <section className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-5 md:pt-12">
      <ArrowLink to={ROUTES.profile}>Voltar ao perfil</ArrowLink>
      <h1 className="font-display text-4xl font-bold text-navy md:text-[40px]">Editar perfil</h1>

      <Card className="p-5 sm:p-8">
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {save.isError ? (
            <ErrorAlert title="Não foi possível salvar">
              Confira sua conexão e tente de novo.
            </ErrorAlert>
          ) : null}

          <AvatarUploader
            name={user.name}
            imageUrl={photoUrl ?? user.avatarUrl}
            error={photoError}
            onSelect={handlePhoto}
            onError={setPhotoError}
          />

          <Field
            label="Nome"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Field
            label="E-mail institucional"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
            <Field
              label="Curso"
              autoComplete="organization-title"
              error={errors.course?.message}
              {...register('course')}
            />
            <Field
              label="WhatsApp"
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="(85) 9 9876-5432"
              error={errors.whatsapp?.message}
              {...register('whatsapp')}
            />
          </div>

          <p className="text-[13px] text-text-muted">
            Ao trocar o e-mail, enviaremos um link de confirmação para o novo endereço
            @edu.unifor.br. O WhatsApp novo passa a valer para todos os seus anúncios ativos.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ButtonLink to={ROUTES.profile} variant="secondary">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Card>

      <section
        aria-labelledby="delete-profile"
        className="flex flex-col items-start gap-3 rounded-2xl border-[1.5px] border-danger bg-danger-soft p-6 sm:p-7"
      >
        <h2 id="delete-profile" className="text-lg font-bold text-danger">
          Excluir perfil
        </h2>
        <p className="text-sm text-text">
          Esta ação é permanente. Seu perfil será anonimizado, seus anúncios saem do ar e a conta não
          poderá ser recuperada. Pedidos já pagos continuam no histórico da outra pessoa.
        </p>
        <Button variant="danger" onClick={() => setDeleting(true)}>
          Excluir meu perfil
        </Button>
      </section>

      {deleting ? <DeleteAccountModal onCancel={() => setDeleting(false)} /> : null}
    </section>
  )
}
