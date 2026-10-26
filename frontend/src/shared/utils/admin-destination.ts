import { ROUTES } from '../constants/routes'

// Depois de entrar, o admin volta à tela do painel onde estava (guardada em `from` pelo AdminRoute);
// qualquer outro destino (ex.: o produto de um aluno) vai para o painel. Só caminhos internos
// "/admin/..." passam: nunca "//" nem endereço externo.
export function adminDestination(from: string | undefined): string {
  return from && /^\/admin\/(?!\/)/.test(from) && from !== ROUTES.adminLogin ? from : ROUTES.adminUsers
}
