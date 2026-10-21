import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '../constants/routes'
import { clearToken } from '../lib/session'

// "Sair": apaga o token do navegador (não há logout no servidor nem refresh token, frontend.md §10),
// limpa os dados em cache para nada de um usuário aparecer para o próximo e volta à tela inicial,
// trocando a entrada do histórico para o "Voltar" não reabrir uma tela de quem estava logado.
export function useLogout(): () => void {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useCallback(() => {
    clearToken()
    queryClient.clear()
    navigate(ROUTES.home, { replace: true })
  }, [queryClient, navigate])
}
