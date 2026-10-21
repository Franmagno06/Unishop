// Sessão: JWT em memória, com cópia em sessionStorage para sobreviver ao F5 (frontend.md §10).
// Nunca usar localStorage para o token. Quem muda a sessão avisa os "ouvintes" (subscribe), para o
// cabeçalho e outras telas reagirem na hora, sem recarregar.
export type Role = 'student' | 'admin'

const TOKEN_KEY = 'unishop.token'
const ROLE_KEY = 'unishop.role'

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key)
    else sessionStorage.setItem(key, value)
  } catch {
    // sessionStorage bloqueado: a sessão fica só em memória
  }
}

function readRole(): Role | null {
  const stored = read(ROLE_KEY)
  return stored === 'student' || stored === 'admin' ? stored : null
}

let token: string | null = read(TOKEN_KEY)
let role: Role | null = token ? (readRole() ?? 'student') : null
const listeners = new Set<() => void>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function getToken(): string | null {
  return token
}

export function getRole(): Role | null {
  return role
}

export function hasToken(): boolean {
  return token !== null
}

// O papel vem da resposta do login (aluno ou admin) e decide o que o cabeçalho mostra.
// O backend continua sendo a barreira de verdade (RNF004).
export function setToken(value: string, newRole: Role = 'student'): void {
  token = value
  role = newRole
  write(TOKEN_KEY, value)
  write(ROLE_KEY, newRole)
  notify()
}

export function clearToken(): void {
  token = null
  role = null
  write(TOKEN_KEY, null)
  write(ROLE_KEY, null)
  notify()
}

// Para o useSyncExternalStore: devolve a função que cancela a inscrição.
export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
