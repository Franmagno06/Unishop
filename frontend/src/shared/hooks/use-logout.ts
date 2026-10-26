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
    // Primeiro sai da tela, depois apaga a sessão: se o token sumisse antes, o guard da área em que
    // a pessoa está (ex.: /admin) a mandaria ao login em vez de à tela inicial.
    void (async () => {
      await navigate(ROUTES.home, { replace: true })
      clearToken()
      queryClient.clear()
    })()
  }, [queryClient, navigate])
}
