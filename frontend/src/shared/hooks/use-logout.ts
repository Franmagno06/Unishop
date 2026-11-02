import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { ROUTES } from '../constants/routes'
import { clearToken, getRole } from '../lib/session'

// "Sair": apaga o token do navegador (não há logout no servidor nem refresh token, frontend.md §10),
// limpa os dados em cache para nada de um usuário aparecer para o próximo e troca a entrada do
// histórico para o "Voltar" não reabrir uma tela de quem estava logado.
export function useLogout(): () => void {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useCallback(() => {
    // Admin sai do painel direto para o login comum (sem /admin/login nem destino guardado); aluno
    // volta à tela inicial. Nos dois casos a sessão é marcada como "saindo": o guard da área em que a
    // pessoa está (AdminRoute ou PrivateRoute) vê a saída em andamento, não guarda destino e leva ao
    // mesmo lugar, em vez de tratar o token que sumiu como "sessão ausente".
    const destination = getRole() === 'admin' ? ROUTES.login : ROUTES.home
    clearToken({ leaving: true })
    queryClient.clear()
    void navigate(destination, { replace: true })
  }, [queryClient, navigate])
}
