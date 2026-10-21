// "Links" de redefinição de senha do modo de demonstração. O e-mail de verdade não existe sem
// API: o botão "Abrir link do e-mail (simulação)" monta uma destas strings e abre a tela.
export const DEMO_EXPIRED_TOKEN = 'expirado'
export const DEMO_INVALID_TOKEN = 'invalido'
const PREFIX = 'demo.'

// Token válido (uso único) para o e-mail informado.
export function demoResetToken(email: string): string {
  return `${PREFIX}${encodeURIComponent(email.trim().toLowerCase())}`
}

// Devolve o e-mail de um token válido, ou null se o token não for um deste modo.
export function emailFromDemoToken(token: string): string | null {
  if (!token.startsWith(PREFIX) || token.length === PREFIX.length) return null
  try {
    return decodeURIComponent(token.slice(PREFIX.length))
  } catch {
    return null
  }
}
