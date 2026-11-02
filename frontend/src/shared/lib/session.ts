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
  clearTimeout(leavingTimer)
  leaving = false
  write(TOKEN_KEY, value)
  write(ROLE_KEY, newRole)
  notify()
}

// Verdadeiro só durante a navegação do "Sair": o guard de área não deve tratar o logout como "sessão
// ausente" e mandar ao login guardando destino. É transitório (expira em LEAVING_MS): depois de sair,
// abrir uma rota privada pela própria SPA volta a levar ao login em vez de mostrar tela em branco.
const LEAVING_MS = 1500
let leaving = false
let leavingTimer: ReturnType<typeof setTimeout> | undefined

export function isLeaving(): boolean {
  return leaving
}

// O guard da área chama ao sair da tela: a navegação do "Sair" terminou e a próxima rota privada aberta
// pela SPA volta a levar ao login.
export function endLeaving(): void {
  clearTimeout(leavingTimer)
  leaving = false
}

export function clearToken(options: { leaving?: boolean } = {}): void {
  token = null
  role = null
  clearTimeout(leavingTimer)
  leaving = options.leaving ?? false
  if (leaving) {
    leavingTimer = setTimeout(() => {
      leaving = false
    }, LEAVING_MS)
  }
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
