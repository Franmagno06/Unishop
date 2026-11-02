import { useCurrentUser } from '../../../../shared/hooks/use-current-user'
import { MOCK_MODE } from '../../../../shared/lib/mock-mode'

type AdminProfile = { name: string; initials: string; email: string }

// Conta de teste do modo de demonstração. O e-mail de teste só existe em desenvolvimento: o build
// de produção não leva a conta de teste (roteiro-telas.md §5.4).
export const ADMIN_PROFILE: AdminProfile = {
  name: 'Administrador',
  initials: 'AD',
  email: import.meta.env.DEV ? 'administrador.teste@edu.unifor.br' : '',
}

export function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => Array.from(part)[0]!.toUpperCase())
  if (letters.length === 0) return ADMIN_PROFILE.initials
  return letters.length === 1 ? letters[0]! : letters[0]! + letters[letters.length - 1]!
}

// Quem está logado no painel: no modo de demonstração, a conta de teste; senão, o admin de
// GET /users/me (enquanto carrega, o nome padrão).
export function useAdminProfile(): AdminProfile {
  const user = useCurrentUser()
  if (import.meta.env.DEV && MOCK_MODE) return ADMIN_PROFILE
  const name = user.name || ADMIN_PROFILE.name
  return { name, initials: initialsOf(name), email: user.email }
}
