// Sessão: JWT em memória, com cópia em sessionStorage para sobreviver ao F5 (frontend.md §10).
// Nunca usar localStorage para o token.
const STORAGE_KEY = 'unishop.token'

function readStored(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

let token: string | null = readStored()

export function getToken(): string | null {
  return token
}

export function setToken(value: string): void {
  token = value
  try {
    sessionStorage.setItem(STORAGE_KEY, value)
  } catch {
    // sessionStorage bloqueado: a sessão fica só em memória
  }
}

export function clearToken(): void {
  token = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // nada a limpar
  }
}

export function hasToken(): boolean {
  return token !== null
}
