import { useMutation } from '@tanstack/react-query'
import { confirmEmailChange } from '../services/account.service'

// RN-PER-02: confirma a troca de e-mail com o token do link.
export function useConfirmEmailChange() {
  return useMutation({ mutationFn: confirmEmailChange })
}
