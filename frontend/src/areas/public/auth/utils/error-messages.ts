import { ApiError } from '../../../../shared/lib/api'

export type AuthContext = 'login' | 'register' | 'forgot' | 'reset'
export type ErrorContent = { title: string; message: string }

// "Tente de novo em 15 minutos" a partir dos segundos que a API manda em `retryAfter`.
export function formatRetryAfter(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`
}

// Título e mensagem de tela por código de erro (frontend.md §12).
// RN-ACE-08: nunca diz qual campo errou (e-mail ou senha).
export function authErrorContent(error: unknown, context: AuthContext = 'login'): ErrorContent {
  const titles: Record<AuthContext, string> = {
    login: 'Não foi possível entrar',
    register: 'Não foi possível criar a conta',
    forgot: 'Não foi possível enviar o link',
    reset: 'Não foi possível redefinir a senha',
  }
  const title = titles[context]

  if (!(error instanceof ApiError)) {
    return { title, message: 'Algo deu errado. Tente de novo.' }
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return { title, message: 'E-mail ou senha incorretos.' }
    case 'ACCOUNT_LOCKED':
      return {
        title: 'Conta bloqueada',
        message:
          error.retryAfter !== undefined
            ? `Muitas tentativas erradas. Tente de novo em ${formatRetryAfter(error.retryAfter)}.`
            : 'Conta bloqueada por 15 minutos por excesso de tentativas.',
      }
    case 'ACCOUNT_SUSPENDED':
      return { title: 'Conta suspensa', message: 'Sua conta está suspensa. Fale com o suporte.' }
    case 'TOKEN_EXPIRED':
      return {
        title: 'Link expirado',
        message: 'Este link expirou (ele vale 30 minutos). Peça um novo link.',
      }
    case 'TOKEN_INVALID':
      return {
        title: 'Link inválido',
        message: 'Este link já foi usado ou não é válido. Peça um novo link.',
      }
    case 'EMAIL_NOT_VERIFIED':
      return { title, message: 'Confirme seu e-mail antes de entrar.' }
    case 'EMAIL_DOMAIN_NOT_ALLOWED':
      return { title, message: 'Use seu e-mail @edu.unifor.br.' }
    case 'EMAIL_ALREADY_REGISTERED':
      return { title, message: 'Este e-mail já tem cadastro. Tente entrar.' }
    case 'TOO_MANY_REQUESTS':
      return { title: 'Muitas tentativas', message: 'Muitas tentativas. Tente de novo em instantes.' }
    case 'NETWORK_ERROR':
      return {
        title: 'Sem conexão',
        message: 'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.',
      }
    default:
      return {
        title: error.status >= 500 ? 'Servidor indisponível' : title,
        message:
          error.status >= 500
            ? 'O servidor não conseguiu responder. Tente de novo em instantes.'
            : error.message,
      }
  }
}

// Só a mensagem, para quem não precisa do título.
export function authErrorMessage(error: unknown, context: AuthContext = 'login'): string {
  return authErrorContent(error, context).message
}
