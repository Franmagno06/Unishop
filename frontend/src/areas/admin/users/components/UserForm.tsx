import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { ErrorAlert } from '../../../../shared/components/ui/Alert'
import { Button, ButtonLink } from '../../../../shared/components/ui/Button'
import { Card } from '../../../../shared/components/ui/Card'
import { Field } from '../../../../shared/components/ui/Field'
import { SelectField } from '../../../../shared/components/ui/SelectField'
import { adminPaths } from '../../../../shared/constants/routes'
import { ApiError } from '../../../../shared/lib/api'
import { formatWhatsapp, onlyDigits } from '../../../../shared/utils/whatsapp'
import { SavedChangesModal } from '../../shared/components/SavedChangesModal'
import { useUpdateUser } from '../hooks/use-admin-users'
import { adminUserSchema, type AdminUserFormValues } from '../schemas/user.schemas'
import type { AdminUser } from '../types/user.types'
import { UserPhotoEditor } from './UserPhotoEditor'

function submitErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR') return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    if (error.status === 404) return 'Este usuário não existe mais. Volte à lista e atualize a página.'
  }
  return 'Não foi possível salvar agora. Tente de novo em instantes.'
}

// RF021 · RN-ADM-04 e 05 (Figma A02b). Edita foto, nome, e-mail institucional, curso e WhatsApp e
// suspende ou reativa a conta. Depois de salvar abre o pop-up "Alterações salvas!".
export function UserForm({ user }: { user: AdminUser }) {
  const navigate = useNavigate()
  const save = useUpdateUser(user.id)
  const [saved, setSaved] = useState(false)
  // undefined = foto sem mudança; texto = prévia da foto nova; null = foto removida.
  const [photo, setPhoto] = useState<string | null | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string>()
  const shownPhoto = photo === undefined ? user.avatarUrl : photo

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<AdminUserFormValues>({
    resolver: zodResolver(adminUserSchema),
    mode: 'onTouched',
    defaultValues: {
      name: user.name,
      email: user.email,
      course: user.course,
      whatsapp: formatWhatsapp(user.whatsapp),
      status: user.status,
    },
  })
  const name = useWatch({ control, name: 'name' })

  // Libera a prévia anterior da memória quando troca ou sai da tela.
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])

  function onSubmit(values: AdminUserFormValues) {
    save.mutate(
      {
        name: values.name,
        email: values.email,
        course: values.course,
        whatsapp: onlyDigits(values.whatsapp),
        status: values.status,
        ...(photo !== undefined ? { avatarUrl: photo } : {}),
      },
      {
        onSuccess: () => setSaved(true),
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
            setError('email', { message: 'Este e-mail já está cadastrado.' })
          }
        },
      },
    )
  }

  const emailTaken = save.error instanceof ApiError && save.error.code === 'EMAIL_ALREADY_REGISTERED'

  return (
    <>
      <Card className="max-w-[760px] p-5 sm:p-7">
        <form noValidate onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-5">
          {save.isError && !emailTaken ? <ErrorAlert title="Não foi possível salvar">{submitErrorMessage(save.error)}</ErrorAlert> : null}

          <UserPhotoEditor
            name={name || user.name}
            imageUrl={shownPhoto}
            error={photoError}
            onSelect={(file) => {
              setPhotoError(undefined)
              setPhoto(URL.createObjectURL(file))
            }}
            onRemove={() => {
              setPhotoError(undefined)
              setPhoto(null)
            }}
            onError={setPhotoError}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nome *" autoComplete="off" error={errors.name?.message} {...register('name')} />
            <Field
              label="E-mail institucional *"
              type="email"
              autoComplete="off"
              inputMode="email"
              spellCheck={false}
              error={errors.email?.message}
              {...register('email')}
            />
            <Field label="Curso" autoComplete="off" error={errors.course?.message} {...register('course')} />
            <Field
              label="WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(85) 9 9123-4567"
              error={errors.whatsapp?.message}
              {...register('whatsapp')}
            />
          </div>

          <SelectField label="Status da conta" {...register('status')}>
            <option value="active">Ativa</option>
            <option value="suspended">Suspensa</option>
          </SelectField>
          <p className="-mt-2 text-[13px] text-text-muted">
            Suspender a conta impede o login e oculta os anúncios do usuário, sem apagar os dados.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <ButtonLink to={adminPaths.userDetail(user.id)} variant="secondary">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </Card>

      {saved ? (
        <SavedChangesModal onClose={() => void navigate(adminPaths.userDetail(user.id), { replace: true })} />
      ) : null}
    </>
  )
}
