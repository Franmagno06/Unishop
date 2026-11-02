import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { ROUTES } from '../../../../shared/constants/routes'
import { completeProfile } from '../services/account.service'

type LocationState = { from?: string } | null

// RN-ACE-06, 14: depois do aceite, marca no cache de GET /auth/me que não há mais pendência (senão o
// PrivateRoute devolveria o aluno a esta tela) e volta para onde ele estava, ou para Categorias.
export function useCompleteProfile() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const from = (useLocation().state as LocationState)?.from

  return useMutation({
    mutationFn: completeProfile,
    onSuccess: (state) => {
      queryClient.setQueriesData(
        { queryKey: ['auth', 'me'] },
        (current: object | undefined) => ({ ...current, ...state }),
      )
      navigate(from ?? ROUTES.categories, { replace: true })
    },
  })
}
