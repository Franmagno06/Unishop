import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ROUTES } from '../../../../shared/constants/routes'
import { updateProfile } from '../services/profile.service'

// Avisos que a tela do perfil mostra ao voltar da edição.
export type ProfileNotice = { saved?: boolean; pendingEmail?: string }

export function useUpdateProfile() {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (result) =>
      navigate(ROUTES.profile, {
        state: { saved: true, pendingEmail: result.pendingEmail ?? undefined } satisfies ProfileNotice,
      }),
  })
}
