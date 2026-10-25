// Dados do aluno logado, enquanto a API não existe (hoje: a conta de teste do modo de demonstração).
// Quando a API chegar, isto vira GET /auth/me e PATCH /users/me (backend.md §9); só este arquivo
// e o hook use-current-user mudam. O WhatsApp é guardado só com dígitos (RN-PER-07).
export type CurrentUser = {
  name: string
  email: string
  course: string
  whatsapp: string
  avatarUrl: string | null
}

const initialUser: CurrentUser = {
  name: 'Aluno Teste',
  email: 'aluno.teste@edu.unifor.br',
  course: 'Ciência da Computação',
  whatsapp: '85991234567',
  avatarUrl: null,
}

let current: CurrentUser = initialUser
const listeners = new Set<() => void>()

export function getCurrentUser(): CurrentUser {
  return current
}

export function updateCurrentUser(changes: Partial<CurrentUser>): void {
  current = { ...current, ...changes }
  listeners.forEach((listener) => listener())
}

export function resetCurrentUser(): void {
  current = initialUser
  listeners.forEach((listener) => listener())
}

export function subscribeCurrentUser(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
